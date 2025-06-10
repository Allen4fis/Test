import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Save,
  Upload,
  Download,
  Database,
  Clock,
  FileText,
  Trash2,
  RefreshCw,
  Shield,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { AppData } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  dataSize: number;
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
    hourTypes: number;
    provinces: number;
  };
}

interface StoredBackup extends BackupMetadata {
  data: AppData;
}

const BACKUP_STORAGE_KEY = "trackity-doo-backups";

export function BackupManagement() {
  const timeTracking = useTimeTracking();
  const {
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    hourTypes,
    provinces,
    restoreFromBackup,
    getAutosaveInfo,
  } = timeTracking;

  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [backupDescription, setBackupDescription] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBackup, setSelectedBackup] = useState<BackupMetadata | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importConfirmationData, setImportConfirmationData] =
    useState<any>(null);
  const [restoreConfirmStep, setRestoreConfirmStep] = useState(0);
  const [restoreConfirmText, setRestoreConfirmText] = useState("");
  const [warningsAccepted, setWarningsAccepted] = useState({
    warning1: false,
    warning2: false,
    warning3: false,
  });

  // Get stored backups from localStorage
  const storedBackups = useMemo(() => {
    try {
      const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (stored) {
        const backups: StoredBackup[] = JSON.parse(stored);
        return backups.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );
      }
    } catch (error) {
      console.error("Error loading backups:", error);
      toast({
        title: "Error Loading Backups",
        description: "Could not load backup list. Storage may be corrupted.",
        variant: "destructive",
      });
    }
    return [];
  }, [refreshKey]); // Re-evaluate when refresh key changes

  // Current data summary
  const currentDataSummary = useMemo(() => {
    const data: AppData = {
      employees,
      jobs,
      timeEntries,
      rentalItems,
      rentalEntries,
      hourTypes,
      provinces,
    };

    const dataSize = new Blob([JSON.stringify(data)]).size;

    return {
      recordCounts: {
        employees: employees.length,
        jobs: jobs.length,
        timeEntries: timeEntries.length,
        rentalItems: rentalItems.length,
        rentalEntries: rentalEntries.length,
        hourTypes: hourTypes.length,
        provinces: provinces.length,
      },
      dataSize,
      totalRecords:
        employees.length +
        jobs.length +
        timeEntries.length +
        rentalItems.length +
        rentalEntries.length,
    };
  }, [
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    hourTypes,
    provinces,
  ]);

  // Create a new backup
  const createBackup = async () => {
    if (!backupName.trim()) {
      toast({
        title: "Backup Name Required",
        description: "Please enter a name for this backup.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBackup(true);

    try {
      const timestamp = new Date().toISOString();
      const data: AppData = {
        employees,
        jobs,
        timeEntries,
        rentalItems,
        rentalEntries,
        hourTypes,
        provinces,
      };

      const backup: StoredBackup = {
        id: `backup_${Date.now()}`,
        name: backupName.trim(),
        description: backupDescription.trim() || undefined,
        timestamp,
        dataSize: new Blob([JSON.stringify(data)]).size,
        recordCounts: currentDataSummary.recordCounts,
        data,
      };

      // Get existing backups
      const existing = storedBackups;
      const updated = [backup, ...existing];

      // Keep only the most recent 20 backups to prevent storage overflow
      const trimmed = updated.slice(0, 20);

      // Save to localStorage
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));

      toast({
        title: "Backup Created Successfully",
        description: `"${backupName}" has been saved with ${currentDataSummary.totalRecords} records.`,
      });

      // Reset form and trigger refresh
      setBackupName("");
      setBackupDescription("");
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Backup creation failed:", error);
      toast({
        title: "Backup Failed",
        description:
          "Could not create backup. Storage may be full or unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Reset restore confirmation state
  const resetRestoreConfirmation = () => {
    setRestoreConfirmStep(0);
    setRestoreConfirmText("");
    setWarningsAccepted({
      warning1: false,
      warning2: false,
      warning3: false,
    });
  };

  // Restore from backup
  const restoreBackup = async (backup: BackupMetadata) => {
    setIsRestoring(true);

    try {
      // Find the full backup data
      const fullBackup = storedBackups.find((b) => b.id === backup.id);
      if (!fullBackup) {
        throw new Error("Backup data not found");
      }

      // Restore all data using the time tracking methods
      // Note: We'll need to clear existing data and restore from backup
      // This is a destructive operation, so we should be careful

      // Multi-step confirmation process is handled in the UI

      toast({
        title: "Restore Initiated",
        description: `Restoring from "${backup.name}"...`,
      });

      // Restore the data using the time tracking hook
      restoreFromBackup(fullBackup.data);

      toast({
        title: "Restore Completed",
        description: `Successfully restored ${Object.values(backup.recordCounts).reduce((a, b) => a + b, 0)} records from "${backup.name}".`,
      });

      setSelectedBackup(null);
      resetRestoreConfirmation();
    } catch (error) {
      console.error("Restore failed:", error);
      toast({
        title: "Restore Failed",
        description: "Could not restore from backup. Data may be corrupted.",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Delete a backup
  const deleteBackup = (backupId: string) => {
    try {
      const updated = storedBackups.filter((b) => b.id !== backupId);
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));

      toast({
        title: "Backup Deleted",
        description: "Backup has been removed from storage.",
      });

      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("Delete backup failed:", error);
      toast({
        title: "Delete Failed",
        description: "Could not delete backup.",
        variant: "destructive",
      });
    }
  };

  // Export backup to file
  const exportBackup = (backup: StoredBackup) => {
    try {
      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `4front-trackity-doo-backup-${backup.name.replace(/[^a-zA-Z0-9]/g, "-")}-${backup.timestamp.split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Exported",
        description: "Backup file has been downloaded.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not export backup file.",
        variant: "destructive",
      });
    }
  };

  // Step 1: Select file and validate
  const selectImportFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedData: StoredBackup = JSON.parse(text);

        // Validate the backup structure
        if (
          !importedData.data ||
          !importedData.id ||
          !importedData.name ||
          !importedData.timestamp
        ) {
          throw new Error("Invalid backup file format");
        }

        // Store file and data for confirmation
        setSelectedFile(file);
        setImportConfirmationData(importedData);
      } catch (error) {
        console.error("File validation failed:", error);
        toast({
          title: "Invalid File",
          description:
            "Could not read backup file. File may be corrupted or invalid.",
          variant: "destructive",
        });
      }
    };

    input.click();
  };

  // Step 2: Perform actual import after confirmation
  const performImport = async (confirmationId: string) => {
    if (!importConfirmationData) return;

    setIsImporting(true);

    try {
      // Add to stored backups
      const existing = storedBackups;
      const updated = [importConfirmationData, ...existing];
      const trimmed = updated.slice(0, 20);

      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(trimmed));

      toast({
        title: "Backup Imported",
        description: `Successfully imported "${importConfirmationData.name}" from file.`,
      });

      setRefreshKey((prev) => prev + 1);

      // Clear confirmation data
      setSelectedFile(null);
      setImportConfirmationData(null);
    } catch (error) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: "Could not import backup file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Backup & Restore Management
            <Badge variant="secondary" className="ml-2">
              {storedBackups.length} backups
            </Badge>
          </CardTitle>
          <CardDescription>
            Create and manage backups of your 4Front Trackity-doo data for
            safety and recovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Database className="h-5 w-5" />
                <span className="font-medium">Total Records</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {currentDataSummary.totalRecords}
              </p>
              <p className="text-sm text-gray-600">Ready for backup</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Shield className="h-5 w-5" />
                <span className="font-medium">Data Size</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatFileSize(currentDataSummary.dataSize)}
              </p>
              <p className="text-sm text-gray-600">Current data size</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Last Backup</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                {storedBackups.length > 0
                  ? new Date(storedBackups[0].timestamp).toLocaleDateString()
                  : "Never"}
              </p>
              <p className="text-sm text-gray-600">Most recent backup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Backup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Create New Backup
          </CardTitle>
          <CardDescription>
            Save a snapshot of all your current data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="backup-name">Backup Name *</Label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., End of Month - December 2024"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="backup-description">Description (Optional)</Label>
              <Textarea
                id="backup-description"
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                placeholder="Add notes about this backup..."
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Current Data Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Data to be backed up:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <span>
                  👥 {currentDataSummary.recordCounts.employees} Employees
                </span>
                <span>💼 {currentDataSummary.recordCounts.jobs} Jobs</span>
                <span>
                  ⏰ {currentDataSummary.recordCounts.timeEntries} Time Entries
                </span>
                <span>
                  🚛 {currentDataSummary.recordCounts.rentalItems} Rental Items
                </span>
                <span>
                  📋 {currentDataSummary.recordCounts.rentalEntries} Rental
                  Entries
                </span>
                <span>
                  🕐 {currentDataSummary.recordCounts.hourTypes} Hour Types
                </span>
                <span>
                  📍 {currentDataSummary.recordCounts.provinces} Provinces
                </span>
                <span className="font-medium">
                  📊 {currentDataSummary.totalRecords} Total Records
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={createBackup}
                disabled={isCreatingBackup || !backupName.trim()}
              >
                {isCreatingBackup ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Backup
                  </>
                )}
              </Button>
              {importConfirmationData ? (
                <DeleteConfirmationDialog
                  item={{
                    id: importConfirmationData.id,
                    name: importConfirmationData.name,
                    type: "import",
                    associatedData: {
                      backupSize: `${((selectedFile?.size || 0) / 1024).toFixed(2)} KB`,
                      recordCounts: [
                        `${importConfirmationData.recordCounts?.employees || 0} employees`,
                        `${importConfirmationData.recordCounts?.jobs || 0} jobs`,
                        `${importConfirmationData.recordCounts?.timeEntries || 0} time entries`,
                        `${importConfirmationData.recordCounts?.rentalItems || 0} rental items`,
                        `${importConfirmationData.recordCounts?.rentalEntries || 0} rental entries`,
                      ],
                    },
                  }}
                  trigger={
                    <Button
                      disabled={isImporting}
                      variant="outline"
                      className="border-2 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Confirm Import: "{importConfirmationData.name}"
                        </>
                      )}
                    </Button>
                  }
                  onConfirm={performImport}
                  isDeleting={isImporting}
                />
              ) : (
                <Button
                  onClick={selectImportFile}
                  disabled={isImporting}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import from File
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Available Backups
          </CardTitle>
          <CardDescription>
            Manage and restore from your saved backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {storedBackups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">
                No backups created yet
              </p>
              <p className="text-gray-400 text-sm">
                Create your first backup above to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storedBackups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{backup.name}</p>
                          {backup.description && (
                            <p className="text-sm text-gray-500">
                              {backup.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>
                            {new Date(backup.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500">
                            {new Date(backup.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">
                            {Object.values(backup.recordCounts).reduce(
                              (a, b) => a + b,
                              0,
                            )}{" "}
                            total
                          </p>
                          <p className="text-gray-500">
                            {backup.recordCounts.timeEntries} entries,{" "}
                            {backup.recordCounts.employees} employees
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {formatFileSize(backup.dataSize)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog
                            open={selectedBackup?.id === backup.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setSelectedBackup(null);
                                resetRestoreConfirmation();
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBackup(backup);
                                  resetRestoreConfirmation();
                                }}
                              >
                                <Upload className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <AlertCircle className="h-6 w-6 text-red-500" />
                                  {restoreConfirmStep === 0 &&
                                    "⚠️ CRITICAL WARNING: Data Restore"}
                                  {restoreConfirmStep === 1 &&
                                    "🚨 SECOND WARNING: Permanent Data Loss"}
                                  {restoreConfirmStep === 2 &&
                                    "🔥 FINAL WARNING: Confirm Destructive Action"}
                                  {restoreConfirmStep === 3 &&
                                    "🔒 Type RESTORE to Confirm"}
                                </DialogTitle>
                                <DialogDescription>
                                  {restoreConfirmStep === 0 &&
                                    "You are about to perform a DESTRUCTIVE operation that will replace ALL current data."}
                                  {restoreConfirmStep === 1 &&
                                    "This action is IRREVERSIBLE and will permanently delete all existing data."}
                                  {restoreConfirmStep === 2 &&
                                    "Last chance to cancel before data destruction begins."}
                                  {restoreConfirmStep === 3 &&
                                    "Type 'RESTORE' exactly to confirm you understand the consequences."}
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                {/* Step 0: First Warning */}
                                {restoreConfirmStep === 0 && (
                                  <div className="space-y-4">
                                    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <h4 className="font-bold text-red-800 text-lg">
                                            ⚠️ CRITICAL WARNING ⚠️
                                          </h4>
                                          <p className="text-red-700 mt-2 font-medium">
                                            You are about to PERMANENTLY DELETE
                                            all current data and replace it with
                                            backup "{backup.name}".
                                          </p>
                                          <ul className="text-red-700 mt-3 space-y-1 text-sm">
                                            <li>
                                              • All current time entries will be
                                              LOST FOREVER
                                            </li>
                                            <li>
                                              • All current employee data will
                                              be REPLACED
                                            </li>
                                            <li>
                                              • All current job information will
                                              be OVERWRITTEN
                                            </li>
                                            <li>
                                              • All current rental data will be
                                              DESTROYED
                                            </li>
                                            <li>
                                              • This action CANNOT BE UNDONE
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-lg p-4">
                                      <h5 className="font-medium mb-2">
                                        Backup Details:
                                      </h5>
                                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                        <div>
                                          <p>
                                            <strong>Name:</strong> {backup.name}
                                          </p>
                                          <p>
                                            <strong>Created:</strong>{" "}
                                            {new Date(
                                              backup.timestamp,
                                            ).toLocaleString()}
                                          </p>
                                          <p>
                                            <strong>Size:</strong>{" "}
                                            {formatFileSize(backup.dataSize)}
                                          </p>
                                        </div>
                                        <div>
                                          <p>
                                            <strong>Records:</strong>{" "}
                                            {Object.values(
                                              backup.recordCounts,
                                            ).reduce((a, b) => a + b, 0)}{" "}
                                            total
                                          </p>
                                          <p>
                                            <strong>Time Entries:</strong>{" "}
                                            {backup.recordCounts.timeEntries}
                                          </p>
                                          <p>
                                            <strong>Employees:</strong>{" "}
                                            {backup.recordCounts.employees}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="warning1"
                                        checked={warningsAccepted.warning1}
                                        onChange={(e) =>
                                          setWarningsAccepted((prev) => ({
                                            ...prev,
                                            warning1: e.target.checked,
                                          }))
                                        }
                                        className="h-4 w-4"
                                      />
                                      <Label
                                        htmlFor="warning1"
                                        className="text-sm font-medium"
                                      >
                                        I understand this will PERMANENTLY
                                        DELETE all current data
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                {/* Step 1: Second Warning */}
                                {restoreConfirmStep === 1 && (
                                  <div className="space-y-4">
                                    <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <AlertCircle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                          <h4 className="font-bold text-red-900 text-lg">
                                            🚨 SECOND WARNING - NO RECOVERY
                                            POSSIBLE 🚨
                                          </h4>
                                          <p className="text-red-800 mt-2 font-medium">
                                            Once you proceed, there is NO WAY to
                                            recover your current data.
                                          </p>
                                          <div className="mt-3 p-3 bg-red-200 rounded border-l-4 border-red-500">
                                            <p className="text-red-900 font-semibold text-sm">
                                              Current data summary that will be
                                              LOST:
                                            </p>
                                            <ul className="text-red-800 mt-2 space-y-1 text-sm">
                                              <li>
                                                •{" "}
                                                {
                                                  currentDataSummary
                                                    .recordCounts.timeEntries
                                                }{" "}
                                                time entries
                                              </li>
                                              <li>
                                                •{" "}
                                                {
                                                  currentDataSummary
                                                    .recordCounts.employees
                                                }{" "}
                                                employees
                                              </li>
                                              <li>
                                                •{" "}
                                                {
                                                  currentDataSummary
                                                    .recordCounts.jobs
                                                }{" "}
                                                jobs
                                              </li>
                                              <li>
                                                •{" "}
                                                {
                                                  currentDataSummary
                                                    .recordCounts.rentalEntries
                                                }{" "}
                                                rental entries
                                              </li>
                                              <li>
                                                • Total:{" "}
                                                {
                                                  currentDataSummary.totalRecords
                                                }{" "}
                                                records
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="warning2"
                                        checked={warningsAccepted.warning2}
                                        onChange={(e) =>
                                          setWarningsAccepted((prev) => ({
                                            ...prev,
                                            warning2: e.target.checked,
                                          }))
                                        }
                                        className="h-4 w-4"
                                      />
                                      <Label
                                        htmlFor="warning2"
                                        className="text-sm font-medium"
                                      >
                                        I acknowledge there is NO RECOVERY
                                        possible after this action
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                {/* Step 2: Final Warning */}
                                {restoreConfirmStep === 2 && (
                                  <div className="space-y-4">
                                    <div className="bg-red-200 border-2 border-red-400 rounded-lg p-4">
                                      <div className="flex items-start gap-3">
                                        <AlertCircle className="h-6 w-6 text-red-700 mt-0.5 flex-shrink-0 animate-pulse" />
                                        <div>
                                          <h4 className="font-bold text-red-900 text-lg">
                                            🔥 FINAL WARNING - LAST CHANCE 🔥
                                          </h4>
                                          <p className="text-red-900 mt-2 font-bold">
                                            This is your FINAL CHANCE to cancel
                                            before data destruction begins.
                                          </p>
                                          <div className="mt-3 p-4 bg-yellow-100 border-2 border-yellow-400 rounded">
                                            <p className="text-yellow-900 font-bold text-center">
                                              ��� CLICKING NEXT WILL IMMEDIATELY
                                              START THE DESTRUCTIVE PROCESS ⚡
                                            </p>
                                          </div>
                                          <p className="text-red-900 mt-3 font-medium">
                                            Are you absolutely certain you want
                                            to:
                                          </p>
                                          <ul className="text-red-900 mt-2 space-y-1 font-medium">
                                            <li>
                                              • Delete ALL current data
                                              permanently?
                                            </li>
                                            <li>
                                              • Replace it with backup "
                                              {backup.name}"?
                                            </li>
                                            <li>
                                              • Accept that this CANNOT be
                                              undone?
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="checkbox"
                                        id="warning3"
                                        checked={warningsAccepted.warning3}
                                        onChange={(e) =>
                                          setWarningsAccepted((prev) => ({
                                            ...prev,
                                            warning3: e.target.checked,
                                          }))
                                        }
                                        className="h-4 w-4"
                                      />
                                      <Label
                                        htmlFor="warning3"
                                        className="text-sm font-medium"
                                      >
                                        I am absolutely certain and accept full
                                        responsibility for this destructive
                                        action
                                      </Label>
                                    </div>
                                  </div>
                                )}

                                {/* Step 3: Type RESTORE */}
                                {restoreConfirmStep === 3 && (
                                  <div className="space-y-4">
                                    <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
                                      <div className="text-center">
                                        <h4 className="font-bold text-gray-900 text-lg mb-3">
                                          🔒 TYPE "RESTORE" TO CONFIRM
                                        </h4>
                                        <p className="text-gray-700 mb-4">
                                          To confirm you understand the
                                          consequences, type{" "}
                                          <strong>RESTORE</strong> exactly in
                                          the box below:
                                        </p>
                                        <Input
                                          value={restoreConfirmText}
                                          onChange={(e) =>
                                            setRestoreConfirmText(
                                              e.target.value,
                                            )
                                          }
                                          placeholder="Type RESTORE here"
                                          className="text-center font-mono text-lg"
                                          autoFocus
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                          Must match exactly: RESTORE (all
                                          capitals)
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <DialogFooter className="flex justify-between">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedBackup(null);
                                    resetRestoreConfirmation();
                                  }}
                                >
                                  Cancel (Safe Choice)
                                </Button>

                                <div className="flex gap-2">
                                  {restoreConfirmStep > 0 && (
                                    <Button
                                      variant="ghost"
                                      onClick={() =>
                                        setRestoreConfirmStep(
                                          (prev) => prev - 1,
                                        )
                                      }
                                    >
                                      Back
                                    </Button>
                                  )}

                                  {restoreConfirmStep < 3 ? (
                                    <Button
                                      onClick={() =>
                                        setRestoreConfirmStep(
                                          (prev) => prev + 1,
                                        )
                                      }
                                      disabled={
                                        (restoreConfirmStep === 0 &&
                                          !warningsAccepted.warning1) ||
                                        (restoreConfirmStep === 1 &&
                                          !warningsAccepted.warning2) ||
                                        (restoreConfirmStep === 2 &&
                                          !warningsAccepted.warning3)
                                      }
                                      className="bg-orange-500 hover:bg-orange-600"
                                    >
                                      {restoreConfirmStep === 2
                                        ? "Continue to Final Step"
                                        : "Next Warning"}
                                    </Button>
                                  ) : (
                                    <Button
                                      onClick={() => restoreBackup(backup)}
                                      disabled={
                                        isRestoring ||
                                        restoreConfirmText !== "RESTORE"
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {isRestoring ? (
                                        <>
                                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          DESTROYING DATA...
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="h-4 w-4 mr-2" />
                                          RESTORE BACKUP
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              exportBackup(
                                storedBackups.find((b) => b.id === backup.id)!,
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <DeleteConfirmationDialog
                            item={{
                              id: backup.id,
                              name: backup.name,
                              type: "backup",
                              associatedData: {
                                backupSize: `${(backup.dataSize / 1024).toFixed(2)} KB`,
                                recordCounts: [
                                  `${backup.recordCounts.employees} employees`,
                                  `${backup.recordCounts.jobs} jobs`,
                                  `${backup.recordCounts.timeEntries} time entries`,
                                  `${backup.recordCounts.rentalItems} rental items`,
                                  `${backup.recordCounts.rentalEntries} rental entries`,
                                ],
                              },
                            }}
                            trigger={
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            }
                            onConfirm={deleteBackup}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Storage Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Backup Storage:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Backups are stored locally in your browser</li>
                <li>• Maximum 20 backups kept (oldest auto-deleted)</li>
                <li>• Export backups to files for long-term storage</li>
                <li>• Clearing browser data will remove backups</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Best Practices:</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Create backups before major changes</li>
                <li>• Export important backups to files</li>
                <li>• Use descriptive names and descriptions</li>
                <li>• Test restore process occasionally</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
