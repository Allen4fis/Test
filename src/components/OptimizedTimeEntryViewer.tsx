import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Search,
  Download,
  RefreshCw,
  TrendingUp,
  Activity,
  Clock,
  DollarSign,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useDataVirtualization } from "@/hooks/useDataVirtualization";
import { useOptimizedCalculations } from "@/hooks/useOptimizedCalculations";
import { VirtualizedTimeEntryList } from "@/components/VirtualizedTimeEntryList";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface OptimizedTimeEntryViewerProps {
  maxVisibleEntries?: number;
  enableVirtualization?: boolean;
}

export function OptimizedTimeEntryViewer({
  maxVisibleEntries = 1000,
  enableVirtualization = true,
}: OptimizedTimeEntryViewerProps) {
  const {
    employees,
    jobs,
    timeEntries,
    rentalEntries,
    hourTypes,
    provinces,
    deleteTimeEntry,
    deleteRentalEntry,
  } = useTimeTracking();

  const { getTimeEntrySummaries, getCacheStats, clearCache } =
    useOptimizedCalculations();

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState("all-employees");
  const [jobFilter, setJobFilter] = useState("all-jobs");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "employee" | "job" | "hours">(
    "date",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Performance tracking
  const [lastFilterTime, setLastFilterTime] = useState(0);
  const [isFiltering, setIsFiltering] = useState(false);

  // Combine and process entries
  const combinedEntries = useMemo(() => {
    const startTime = performance.now();
    setIsFiltering(true);

    const combined = [
      ...timeEntries.map((entry) => ({ ...entry, entryType: "time" as const })),
      ...rentalEntries.map((entry) => ({
        ...entry,
        entryType: "rental" as const,
      })),
    ];

    const processingTime = performance.now() - startTime;
    setLastFilterTime(processingTime);
    setIsFiltering(false);

    return combined;
  }, [timeEntries, rentalEntries]);

  // Optimized filtering with debouncing
  const filteredEntries = useMemo(() => {
    const startTime = performance.now();

    let filtered = combinedEntries;

    // Date range filter
    if (dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter((entry) => {
        const entryDate =
          entry.entryType === "time" ? entry.date : entry.startDate;
        return (
          entryDate >= dateFilter.startDate && entryDate <= dateFilter.endDate
        );
      });
    }

    // Employee filter
    if (employeeFilter !== "all-employees") {
      filtered = filtered.filter((entry) => {
        const employee = employees.find((emp) => emp.id === entry.employeeId);
        return employee?.name === employeeFilter;
      });
    }

    // Job filter
    if (jobFilter !== "all-jobs") {
      filtered = filtered.filter((entry) => {
        const job = jobs.find((j) => j.id === entry.jobId);
        return job?.jobNumber === jobFilter;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((entry) => {
        const employee = employees.find((emp) => emp.id === entry.employeeId);
        const job = jobs.find((j) => j.id === entry.jobId);

        return (
          employee?.name?.toLowerCase().includes(query) ||
          job?.jobNumber?.toLowerCase().includes(query) ||
          job?.name?.toLowerCase().includes(query) ||
          entry.description?.toLowerCase().includes(query)
        );
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "date":
          aValue = a.entryType === "time" ? a.date : a.startDate;
          bValue = b.entryType === "time" ? b.date : b.startDate;
          break;
        case "employee":
          const aEmployee = employees.find((emp) => emp.id === a.employeeId);
          const bEmployee = employees.find((emp) => emp.id === b.employeeId);
          aValue = aEmployee?.name || "";
          bValue = bEmployee?.name || "";
          break;
        case "job":
          const aJob = jobs.find((j) => j.id === a.jobId);
          const bJob = jobs.find((j) => j.id === b.jobId);
          aValue = aJob?.jobNumber || "";
          bValue = bJob?.jobNumber || "";
          break;
        case "hours":
          aValue = a.entryType === "time" ? a.hours : 0;
          bValue = b.entryType === "time" ? b.hours : 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (typeof aValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortDirection === "asc" ? comparison : -comparison;
      }
    });

    const processingTime = performance.now() - startTime;
    setLastFilterTime(processingTime);

    return filtered;
  }, [
    combinedEntries,
    dateFilter,
    employeeFilter,
    jobFilter,
    searchQuery,
    sortBy,
    sortDirection,
    employees,
    jobs,
  ]);

  // Data virtualization for large datasets
  const virtualizedData = useDataVirtualization(filteredEntries, {
    pageSize: 100,
    bufferSize: 50,
    maxCachePages: 20,
  });

  // Quick stats
  const stats = useMemo(() => {
    const timeEntriesCount = filteredEntries.filter(
      (e) => e.entryType === "time",
    ).length;
    const rentalEntriesCount = filteredEntries.filter(
      (e) => e.entryType === "rental",
    ).length;
    const totalHours = filteredEntries
      .filter((e) => e.entryType === "time")
      .reduce((sum: number, entry: any) => sum + entry.hours, 0);

    return {
      timeEntriesCount,
      rentalEntriesCount,
      totalEntries: filteredEntries.length,
      totalHours,
    };
  }, [filteredEntries]);

  // Event handlers
  const handleEdit = useCallback((entry: any) => {
    // Edit functionality would be implemented here
    console.log("Edit entry:", entry);
  }, []);

  const handleDelete = useCallback(
    (entry: any) => {
      if (entry.entryType === "time") {
        deleteTimeEntry(entry.id);
      } else {
        deleteRentalEntry(entry.id);
      }
    },
    [deleteTimeEntry, deleteRentalEntry],
  );

  const resetFilters = useCallback(() => {
    setEmployeeFilter("all-employees");
    setJobFilter("all-jobs");
    setDateFilter({ startDate: "", endDate: "" });
    setSearchQuery("");
    setSortBy("date");
    setSortDirection("desc");
    clearCache();
  }, [clearCache]);

  const cacheStats = getCacheStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center justify-center gap-3">
          <Activity className="h-8 w-8 text-purple-400" />
          Optimized Time Entry Viewer
        </h1>
        <p className="text-gray-400">
          High-performance viewing for large datasets
        </p>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Entries</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stats.totalEntries}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Filter Time</p>
                <p className="text-2xl font-bold text-green-400">
                  {lastFilterTime.toFixed(1)}ms
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cache Hit Rate</p>
                <p className="text-2xl font-bold text-purple-400">
                  {cacheStats.hitRate.toFixed(1)}%
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Hours</p>
                <p className="text-2xl font-bold text-orange-400">
                  {stats.totalHours.toFixed(1)}h
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Advanced Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search entries..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="job">Job</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={sortDirection}
                onValueChange={(value: any) => setSortDirection(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                onClick={resetFilters}
                variant="outline"
                className="w-full"
              >
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtualized Entry List */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Entry List</span>
            <div className="flex items-center gap-2">
              {isFiltering && (
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-400">Filtering...</span>
                </div>
              )}
              <Badge variant="outline">
                {enableVirtualization ? "Virtualized" : "Standard"}
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Showing {filteredEntries.length} entries • Performance optimized for
            large datasets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enableVirtualization ? (
            <VirtualizedTimeEntryList
              entries={virtualizedData.items}
              onEdit={handleEdit}
              onDelete={handleDelete}
              itemHeight={60}
              containerHeight={600}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">
                Standard list view disabled for performance
              </p>
              <p className="text-sm text-gray-500">
                Use virtualized view for large datasets
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Info */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Last Filter:</span>
              <span className="ml-2 font-mono">
                {lastFilterTime.toFixed(2)}ms
              </span>
            </div>
            <div>
              <span className="text-gray-400">Cache Size:</span>
              <span className="ml-2 font-mono">{cacheStats.size} items</span>
            </div>
            <div>
              <span className="text-gray-400">Hit Rate:</span>
              <span className="ml-2 font-mono">
                {cacheStats.hitRate.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">Cache Version:</span>
              <span className="ml-2 font-mono">v{cacheStats.version}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
