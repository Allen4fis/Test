import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  Database,
  Activity,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  Play,
  Pause,
} from "lucide-react";
import { useEnterpriseTimeTracking } from "@/hooks/useEnterpriseTimeTracking";
import { TimeEntry } from "@/types";

interface ImportProgress {
  totalRows: number;
  processedRows: number;
  validRows: number;
  errorRows: number;
  currentBatch: number;
  totalBatches: number;
  isProcessing: boolean;
  isPaused: boolean;
  errors: Array<{ row: number; message: string; data: any }>;
  estimatedTimeRemaining: number;
}

interface ColumnMapping {
  [key: string]: string;
}

export function EnterpriseDataImport() {
  const { bulkImportEntries, employees, jobs } = useEnterpriseTimeTracking();

  // File handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [mappingComplete, setMappingComplete] = useState(false);

  // Import progress
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    totalRows: 0,
    processedRows: 0,
    validRows: 0,
    errorRows: 0,
    currentBatch: 0,
    totalBatches: 0,
    isProcessing: false,
    isPaused: false,
    errors: [],
    estimatedTimeRemaining: 0,
  });

  // Processing control
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  // Required columns for time entries
  const requiredColumns = [
    { key: "date", label: "Date", required: true },
    { key: "employeeId", label: "Employee ID", required: true },
    { key: "jobId", label: "Job ID", required: true },
    { key: "hours", label: "Hours", required: true },
    { key: "hourTypeId", label: "Hour Type ID", required: false },
    { key: "provinceId", label: "Province ID", required: false },
    { key: "billableWageUsed", label: "Billable Rate", required: false },
    { key: "costWageUsed", label: "Cost Rate", required: false },
    { key: "title", label: "Title", required: false },
    { key: "description", label: "Description", required: false },
    { key: "loaCount", label: "LOA Count", required: false },
  ];

  // Handle file selection
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
        alert("Please select a CSV file");
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        // 100MB limit
        alert("File too large. Maximum size is 100MB");
        return;
      }

      setSelectedFile(file);
      parseCSVFile(file);
    },
    [],
  );

  // Parse CSV file
  const parseCSVFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().replace(/"/g, ""));
        const data = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) =>
            line.split(",").map((cell) => cell.trim().replace(/"/g, "")),
          );

        setHeaders(headers);
        setCsvData(data);

        // Auto-map obvious columns
        const autoMapping: ColumnMapping = {};
        headers.forEach((header, index) => {
          const lowerHeader = header.toLowerCase();
          const matchedColumn = requiredColumns.find(
            (col) =>
              lowerHeader.includes(col.key.toLowerCase()) ||
              lowerHeader.includes(col.label.toLowerCase()),
          );
          if (matchedColumn) {
            autoMapping[matchedColumn.key] = index.toString();
          }
        });

        setColumnMapping(autoMapping);
      } catch (error) {
        console.error("Failed to parse CSV:", error);
        alert("Failed to parse CSV file. Please check the format.");
      }
    };
    reader.readAsText(file);
  }, []);

  // Validate column mapping
  const validateMapping = useCallback(() => {
    const requiredMapped = requiredColumns
      .filter((col) => col.required)
      .every((col) => columnMapping[col.key]);

    setMappingComplete(requiredMapped);
    return requiredMapped;
  }, [columnMapping]);

  // Validate and transform row data
  const validateRow = useCallback(
    (rowData: string[], rowIndex: number): TimeEntry | null => {
      try {
        const entry: Partial<TimeEntry> = {
          id: `import-${Date.now()}-${rowIndex}`,
          createdAt: new Date().toISOString(),
        };

        // Map columns
        for (const [key, columnIndex] of Object.entries(columnMapping)) {
          const value = rowData[parseInt(columnIndex)]?.trim();
          if (
            !value &&
            requiredColumns.find((col) => col.key === key)?.required
          ) {
            throw new Error(`Missing required field: ${key}`);
          }

          switch (key) {
            case "date":
              if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                throw new Error("Date must be in YYYY-MM-DD format");
              }
              entry.date = value;
              break;
            case "hours":
              const hours = parseFloat(value);
              if (isNaN(hours) || hours < 0 || hours > 24) {
                throw new Error("Hours must be a number between 0 and 24");
              }
              entry.hours = hours;
              break;
            case "billableWageUsed":
            case "costWageUsed":
              const wage = value ? parseFloat(value) : 0;
              if (isNaN(wage) || wage < 0) {
                throw new Error(`${key} must be a positive number`);
              }
              (entry as any)[key] = wage;
              break;
            case "loaCount":
              const loa = value ? parseInt(value) : 0;
              if (isNaN(loa) || loa < 0) {
                throw new Error("LOA count must be a positive integer");
              }
              entry.loaCount = loa;
              break;
            default:
              (entry as any)[key] = value;
          }
        }

        // Validate references
        if (
          entry.employeeId &&
          !employees.find((emp) => emp.id === entry.employeeId)
        ) {
          throw new Error(`Employee ID not found: ${entry.employeeId}`);
        }

        if (entry.jobId && !jobs.find((job) => job.id === entry.jobId)) {
          throw new Error(`Job ID not found: ${entry.jobId}`);
        }

        return entry as TimeEntry;
      } catch (error) {
        return null;
      }
    },
    [columnMapping, employees, jobs],
  );

  // Process import in batches
  const processImport = useCallback(async () => {
    if (!validateMapping()) {
      alert("Please complete the column mapping first");
      return;
    }

    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();

    const batchSize = 1000;
    const totalBatches = Math.ceil(csvData.length / batchSize);
    const validEntries: TimeEntry[] = [];
    const errors: Array<{ row: number; message: string; data: any }> = [];

    setImportProgress((prev) => ({
      ...prev,
      totalRows: csvData.length,
      totalBatches,
      isProcessing: true,
      isPaused: false,
      processedRows: 0,
      validRows: 0,
      errorRows: 0,
      errors: [],
    }));

    try {
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        // Check if paused or aborted
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min(startIdx + batchSize, csvData.length);
        const batch = csvData.slice(startIdx, endIdx);

        // Process batch
        const batchEntries: TimeEntry[] = [];
        for (let i = 0; i < batch.length; i++) {
          const rowIndex = startIdx + i;
          const rowData = batch[i];

          try {
            const entry = validateRow(rowData, rowIndex);
            if (entry) {
              batchEntries.push(entry);
            } else {
              errors.push({
                row: rowIndex + 2, // +2 for header and 0-based index
                message: "Validation failed",
                data: rowData,
              });
            }
          } catch (error) {
            errors.push({
              row: rowIndex + 2,
              message: error instanceof Error ? error.message : "Unknown error",
              data: rowData,
            });
          }
        }

        validEntries.push(...batchEntries);

        // Update progress
        const processedRows = endIdx;
        const elapsedTime = Date.now() - startTimeRef.current;
        const estimatedTotal = (elapsedTime / processedRows) * csvData.length;
        const estimatedTimeRemaining = estimatedTotal - elapsedTime;

        setImportProgress((prev) => ({
          ...prev,
          processedRows,
          validRows: validEntries.length,
          errorRows: errors.length,
          currentBatch: batchIndex + 1,
          errors: errors.slice(-100), // Keep last 100 errors
          estimatedTimeRemaining,
        }));

        // Allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      // Import valid entries
      if (validEntries.length > 0) {
        await bulkImportEntries(validEntries, (progress) => {
          setImportProgress((prev) => ({
            ...prev,
            importProgress: progress,
          }));
        });
      }

      setImportProgress((prev) => ({
        ...prev,
        isProcessing: false,
      }));
    } catch (error) {
      console.error("Import failed:", error);
      setImportProgress((prev) => ({
        ...prev,
        isProcessing: false,
      }));
    }
  }, [csvData, validateMapping, validateRow, bulkImportEntries]);

  // Control functions
  const pauseImport = useCallback(() => {
    setImportProgress((prev) => ({ ...prev, isPaused: true }));
  }, []);

  const resumeImport = useCallback(() => {
    setImportProgress((prev) => ({ ...prev, isPaused: false }));
  }, []);

  const cancelImport = useCallback(() => {
    abortControllerRef.current?.abort();
    setImportProgress((prev) => ({
      ...prev,
      isProcessing: false,
      isPaused: false,
    }));
  }, []);

  // Download error report
  const downloadErrorReport = useCallback(() => {
    const errorCsv = [
      ["Row", "Error", "Data"],
      ...importProgress.errors.map((error) => [
        error.row,
        error.message,
        error.data.join("|"),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([errorCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import-errors.csv";
    link.click();
    URL.revokeObjectURL(url);
  }, [importProgress.errors]);

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enterprise Data Import
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select CSV File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importProgress.isProcessing}
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum file size: 100MB. Supports up to 300,000 entries.
              </p>
            </div>

            {selectedFile && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-medium">{selectedFile.name}</span>
                  <Badge variant="outline">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  <p>Rows detected: {csvData.length.toLocaleString()}</p>
                  <p>Columns detected: {headers.length}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Column Mapping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Map your CSV columns to the required fields. Required fields
                  are marked with an asterisk (*).
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredColumns.map((column) => (
                  <div key={column.key}>
                    <Label>
                      {column.label} {column.required && "*"}
                    </Label>
                    <Select
                      value={columnMapping[column.key] || ""}
                      onValueChange={(value) => {
                        setColumnMapping((prev) => ({
                          ...prev,
                          [column.key]: value,
                        }));
                        setTimeout(validateMapping, 100);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {headers.map((header, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            {header} (Column {index + 1})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {mappingComplete ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Mapping Complete
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <X className="h-3 w-3 mr-1" />
                    Mapping Incomplete
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {importProgress.totalRows > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Import Progress</span>
              <div className="flex gap-2">
                {importProgress.isProcessing && (
                  <>
                    <Button
                      onClick={
                        importProgress.isPaused ? resumeImport : pauseImport
                      }
                      variant="outline"
                      size="sm"
                    >
                      {importProgress.isPaused ? (
                        <Play className="h-4 w-4" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={cancelImport}
                      variant="destructive"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {importProgress.errors.length > 0 && (
                  <Button
                    onClick={downloadErrorReport}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Errors
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {importProgress.processedRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {importProgress.validRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Valid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {importProgress.errorRows.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {Math.ceil(importProgress.estimatedTimeRemaining / 1000)}s
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Batch {importProgress.currentBatch} of{" "}
                    {importProgress.totalBatches}
                  </span>
                  <span>
                    {(
                      (importProgress.processedRows /
                        importProgress.totalRows) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (importProgress.processedRows / importProgress.totalRows) *
                    100
                  }
                />
              </div>

              {importProgress.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium text-red-600 mb-2">
                    Recent Errors (showing last 5):
                  </h4>
                  <div className="space-y-1">
                    {importProgress.errors.slice(-5).map((error, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-red-50 border border-red-200 rounded"
                      >
                        <span className="font-medium">Row {error.row}:</span>{" "}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <Button
              onClick={processImport}
              disabled={!mappingComplete || importProgress.isProcessing}
              size="lg"
              className="w-full max-w-md"
            >
              {importProgress.isProcessing ? (
                <>
                  <Activity className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Start Import ({csvData.length.toLocaleString()} rows)
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
