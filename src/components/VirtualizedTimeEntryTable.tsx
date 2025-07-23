import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { FixedSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  Archive,
  Database,
  Activity,
  Clock,
  Users,
  Briefcase,
} from "lucide-react";
import { useEnterpriseTimeTracking } from "@/hooks/useEnterpriseTimeTracking";
import { TimeEntry } from "@/types";

interface VirtualizedTimeEntryTableProps {
  height?: number;
  onEntryClick?: (entry: TimeEntry) => void;
  filters?: {
    dateRange?: { start: string; end: string };
    employeeId?: string;
    jobId?: string;
  };
}

// Row component for virtual list
const TimeEntryRow = React.memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      entries: TimeEntry[];
      employees: any[];
      jobs: any[];
      onEntryClick?: (entry: TimeEntry) => void;
    };
  }) => {
    const entry = data.entries[index];
    if (!entry) {
      return (
        <div style={style} className="flex items-center px-4 border-b">
          <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>
        </div>
      );
    }

    const employee = data.employees.find((emp) => emp.id === entry.employeeId);
    const job = data.jobs.find((j) => j.id === entry.jobId);

    return (
      <div
        style={style}
        className="flex items-center px-4 border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => data.onEntryClick?.(entry)}
      >
        <div className="flex-1 grid grid-cols-6 gap-4 py-2 text-sm">
          <div>
            <div className="font-medium">{entry.date}</div>
          </div>
          <div>
            <div className="font-medium">{employee?.name || "Unknown"}</div>
            <div className="text-gray-500 text-xs">
              {entry.title || employee?.title}
            </div>
          </div>
          <div>
            <div className="font-medium">{job?.jobNumber || "Unknown"}</div>
            <div className="text-gray-500 text-xs">{job?.name}</div>
          </div>
          <div>
            <Badge variant="outline">{entry.hours}h</Badge>
          </div>
          <div>
            <div className="text-green-600 font-medium">
              ${(entry.billableWageUsed || 0).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-red-600 font-medium">
              ${(entry.costWageUsed || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

TimeEntryRow.displayName = "TimeEntryRow";

export function VirtualizedTimeEntryTable({
  height = 600,
  onEntryClick,
  filters,
}: VirtualizedTimeEntryTableProps) {
  const {
    isInitialized,
    isLoading,
    totalEntries,
    performanceMetrics,
    employees,
    jobs,
    currentView,
    loadTimeEntriesWindow,
    searchEntries,
    bulkImportEntries,
    exportData,
  } = useEnterpriseTimeTracking();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TimeEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [selectedFilters, setSelectedFilters] = useState(filters || {});

  // Virtual list ref
  const listRef = useRef<List>(null);

  // Load initial window
  useEffect(() => {
    if (isInitialized && !isLoading) {
      loadTimeEntriesWindow(0, 100, selectedFilters);
    }
  }, [isInitialized, isLoading, selectedFilters, loadTimeEntriesWindow]);

  // Handle search
  const handleSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchEntries(query, selectedFilters);
        setSearchResults(results);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [searchEntries, selectedFilters],
  );

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Handle export
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const data = await exportData(selectedFilters, setExportProgress);

      // Create and download CSV
      const csvContent = generateCSV(data, employees, jobs);
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `time-entries-${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [exportData, selectedFilters, employees, jobs]);

  // Handle virtual list scroll
  const handleItemsRendered = useCallback(
    ({ visibleStartIndex, visibleStopIndex }: any) => {
      if (!isSearching && searchResults.length === 0) {
        // Load more data if approaching end of visible range
        const buffer = 50;
        if (visibleStopIndex + buffer > currentView.endIndex) {
          const newStart = Math.max(0, visibleStartIndex - buffer);
          const newEnd = Math.min(totalEntries, visibleStopIndex + buffer * 2);
          loadTimeEntriesWindow(newStart, newEnd, selectedFilters);
        }
      }
    },
    [
      isSearching,
      searchResults.length,
      currentView.endIndex,
      totalEntries,
      loadTimeEntriesWindow,
      selectedFilters,
    ],
  );

  // Determine data source
  const displayData = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults;
    }
    return currentView.entries;
  }, [searchResults, currentView.entries]);

  const displayTotal = useMemo(() => {
    if (searchResults.length > 0) {
      return searchResults.length;
    }
    return totalEntries;
  }, [searchResults.length, totalEntries]);

  // Generate CSV content
  const generateCSV = (data: TimeEntry[], employees: any[], jobs: any[]) => {
    const headers = [
      "Date",
      "Employee",
      "Job Number",
      "Job Name",
      "Hours",
      "Billable Rate",
      "Cost Rate",
      "Description",
    ];

    const rows = data.map((entry) => {
      const employee = employees.find((emp) => emp.id === entry.employeeId);
      const job = jobs.find((j) => j.id === entry.jobId);

      return [
        entry.date,
        employee?.name || "Unknown",
        job?.jobNumber || "Unknown",
        job?.name || "",
        entry.hours,
        entry.billableWageUsed || 0,
        entry.costWageUsed || 0,
        entry.description || "",
      ];
    });

    return [headers, ...rows].map((row) => row.join(",")).join("\n");
  };

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-2">
            <Database className="h-6 w-6 animate-spin" />
            <span>Initializing enterprise database...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Total Entries</p>
                <p className="text-lg font-bold">
                  {totalEntries.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Query Time</p>
                <p className="text-lg font-bold">
                  {performanceMetrics.queryTime.toFixed(0)}ms
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Loaded</p>
                <p className="text-lg font-bold">
                  {displayData.length.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Employees</p>
                <p className="text-lg font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Enterprise Time Entries</span>
            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
                size="sm"
              >
                {isExporting ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Exporting... {exportProgress.toFixed(0)}%
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {isSearching && (
                  <Activity className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {/* Filters */}
              <Select
                value={selectedFilters.employeeId || ""}
                onValueChange={(value) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    employeeId: value || undefined,
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Employees</SelectItem>
                  {employees
                    .filter((employee) => employee.isActive !== false)
                    .map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedFilters.jobId || ""}
                onValueChange={(value) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    jobId: value || undefined,
                  }))
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.jobNumber} - {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Progress */}
            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting data...</span>
                  <span>{exportProgress.toFixed(0)}%</span>
                </div>
                <Progress value={exportProgress} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Virtual Table */}
      <Card>
        <CardContent className="p-0">
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 p-4 border-b bg-gray-50 text-sm font-medium text-gray-700">
            <div>Date</div>
            <div>Employee</div>
            <div>Job</div>
            <div>Hours</div>
            <div>Billable Rate</div>
            <div>Cost Rate</div>
          </div>

          {/* Virtual List */}
          {displayData.length > 0 ? (
            <List
              ref={listRef}
              height={height}
              itemCount={displayTotal}
              itemSize={60}
              itemData={{
                entries: displayData,
                employees,
                jobs,
                onEntryClick,
              }}
              onItemsRendered={handleItemsRendered}
              overscanCount={5}
            >
              {TimeEntryRow}
            </List>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 animate-spin" />
                  <span>Loading entries...</span>
                </div>
              ) : (
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No entries found</p>
                  <p className="text-sm">
                    {searchQuery
                      ? "Try adjusting your search criteria"
                      : "Import data to get started"}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Bar */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>
          Showing {displayData.length.toLocaleString()} of{" "}
          {displayTotal.toLocaleString()} entries
        </span>
        <span>
          Last query: {performanceMetrics.queryTime.toFixed(0)}ms | Memory
          usage: {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
        </span>
      </div>
    </div>
  );
}
