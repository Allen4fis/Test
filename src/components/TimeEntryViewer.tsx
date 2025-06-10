import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Trash2,
  Edit,
  Filter,
  Eye,
  Clock,
  Users,
  DollarSign,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntry } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to parse date string as local date (fixes timezone issues)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

type SortField = "date" | "employee" | "job" | "hours" | "title" | "hourType";
type SortDirection = "asc" | "desc";

export function TimeEntryViewer() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    deleteTimeEntry,
    updateTimeEntry,
  } = useTimeTracking();

  // Filter states
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dateRange, setDateRange] = useState("today");
  const [employeeFilter, setEmployeeFilter] = useState("all-employees");
  const [jobFilter, setJobFilter] = useState("all-jobs");

  // Sorting states
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Edit states
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    employeeId: "",
    jobId: "",
    hourTypeId: "",
    provinceId: "",
    date: "",
    hours: "",
    loaCount: "",
    description: "",
    title: "",
  });

  // Calculate date ranges
  const getDateRange = (range: string) => {
    const today = new Date();
    const endDate = getLocalDateString(today);
    let startDate = endDate;

    switch (range) {
      case "today":
        startDate = endDate;
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        startDate = getLocalDateString(yesterday);
        break;
      case "last3":
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(today.getDate() - 2);
        startDate = getLocalDateString(threeDaysAgo);
        break;
      case "last7":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        startDate = getLocalDateString(sevenDaysAgo);
        break;
      case "last14":
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(today.getDate() - 13);
        startDate = getLocalDateString(fourteenDaysAgo);
        break;
      case "last30":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 29);
        startDate = getLocalDateString(thirtyDaysAgo);
        break;
      case "custom":
        startDate = selectedDate;
        break;
      default:
        startDate = endDate;
    }

    return { startDate, endDate };
  };

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Get sort icon for column headers
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 text-blue-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-blue-600" />
    );
  };

  // Filtered and sorted time entries
  const filteredAndSortedEntries = useMemo(() => {
    const { startDate, endDate } = getDateRange(dateRange);

    // First, filter the entries
    let filtered = timeEntries.filter((entry) => {
      // Date filter
      const matchesDate =
        dateRange === "custom"
          ? entry.date === selectedDate
          : entry.date >= startDate && entry.date <= endDate;

      // Employee filter
      const employee = employees.find((emp) => emp.id === entry.employeeId);
      const matchesEmployee =
        !employeeFilter ||
        employeeFilter === "all-employees" ||
        employee?.name.toLowerCase().includes(employeeFilter.toLowerCase());

      // Job filter
      const job = jobs.find((j) => j.id === entry.jobId);
      const matchesJob =
        !jobFilter ||
        jobFilter === "all-jobs" ||
        job?.jobNumber.toLowerCase().includes(jobFilter.toLowerCase()) ||
        job?.name.toLowerCase().includes(jobFilter.toLowerCase());
      job?.name.toLowerCase().includes(jobFilter.toLowerCase());

      return matchesDate && matchesEmployee && matchesJob;
    });

    // Then, sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "date":
          aValue = a.date;
          bValue = b.date;
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
          aValue = a.hours;
          bValue = b.hours;
          break;
        case "title":
          aValue = a.title || "";
          bValue = b.title || "";
          break;
        case "hourType":
          const aHourType = hourTypes.find((ht) => ht.id === a.hourTypeId);
          const bHourType = hourTypes.find((ht) => ht.id === b.hourTypeId);
          aValue = aHourType?.name || "";
          bValue = bHourType?.name || "";
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      // Handle string vs number comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = aValue.localeCompare(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      } else {
        const comparison = Number(aValue) - Number(bValue);
        return sortDirection === "asc" ? comparison : -comparison;
      }
    });

    return filtered;
  }, [
    timeEntries,
    dateRange,
    selectedDate,
    employeeFilter,
    jobFilter,
    sortField,
    sortDirection,
    employees,
    jobs,
    hourTypes,
  ]);

  // Calculate summary statistics
  const totalEntries = filteredAndSortedEntries.length;
  const totalHours = filteredAndSortedEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0,
  );
  const totalLoaCount = filteredAndSortedEntries.reduce(
    (sum, entry) => sum + (entry.loaCount || 0),
    0,
  );
  const totalLoaAmount = totalLoaCount * 200;
  const totalBillableAmount = filteredAndSortedEntries.reduce((sum, entry) => {
    const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
    const effectiveHours = entry.hours * (hourType?.multiplier || 1);
    let adjustedBillableWage = entry.billableWageUsed || 0;

    // Add $3 for NS hour types
    if (hourType?.name.startsWith("NS ")) {
      adjustedBillableWage += 3;
    }

    // Calculate hourly billable amount
    const hourlyBillable = effectiveHours * adjustedBillableWage;

    // Add LOA amount separately (fixed $200 per LOA count)
    const loaBillable = (entry.loaCount || 0) * 200;

    return sum + hourlyBillable + loaBillable;
  }, 0);

  const totalCost = filteredAndSortedEntries.reduce((sum, entry) => {
    const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
    const effectiveHours = entry.hours * (hourType?.multiplier || 1);
    let adjustedCostWage = entry.costWageUsed || 0;

    // Add $3 for NS hour types
    if (hourType?.name.startsWith("NS ")) {
      adjustedCostWage += 3;
    }

    // Calculate hourly cost
    const hourlyCost = effectiveHours * adjustedCostWage;

    // Add LOA cost separately (fixed $200 per LOA count)
    const loaCost = (entry.loaCount || 0) * 200;

    return sum + hourlyCost + loaCost;
  }, 0);

  const handleDelete = async (entryId: string) => {
    try {
      await deleteTimeEntry(entryId);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setEditForm({
      employeeId: entry.employeeId,
      jobId: entry.jobId,
      hourTypeId: entry.hourTypeId,
      provinceId: entry.provinceId,
      date: entry.date,
      hours: entry.hours.toString(),
      loaCount: (entry.loaCount || 0).toString(),
      description: entry.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!editingEntry) return;

    const employee = employees.find((emp) => emp.id === editForm.employeeId);
    if (!employee) return;

    const updatedEntry: Partial<TimeEntry> = {
      employeeId: editForm.employeeId,
      jobId: editForm.jobId,
      hourTypeId: editForm.hourTypeId,
      provinceId: editForm.provinceId,
      date: editForm.date,
      hours: parseFloat(editForm.hours) || 0,
      loaCount: parseInt(editForm.loaCount) || 0,
      title: employee.title,
      billableWageUsed: employee.billableWage,
      costWageUsed: employee.costWage,
      description: editForm.description,
    };

    updateTimeEntry(editingEntry.id, updatedEntry);
    setIsEditDialogOpen(false);
    setEditingEntry(null);
  };

  const handleEditCancel = () => {
    setIsEditDialogOpen(false);
    setEditingEntry(null);
    setEditForm({
      employeeId: "",
      jobId: "",
      hourTypeId: "",
      provinceId: "",
      date: "",
      hours: "",
      loaCount: "",
      description: "",
    });
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range !== "custom") {
      setSelectedDate(getLocalDateString());
    }
  };

  const clearFilters = () => {
    setEmployeeFilter("all-employees");
    setJobFilter("all-jobs");
    setDateRange("today");
    setSelectedDate(getLocalDateString());
    setSortField("date");
    setSortDirection("desc");
  };

  const getDateRangeLabel = () => {
    const { startDate, endDate } = getDateRange(dateRange);
    if (dateRange === "today") return "Today";
    if (dateRange === "yesterday") return "Yesterday";
    if (dateRange === "custom")
      return `Selected Date: ${new Date(selectedDate).toLocaleDateString()}`;
    if (startDate === endDate) {
      return new Date(startDate).toLocaleDateString();
    }
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  };

  // Get unique employee and job lists for filter dropdowns
  const uniqueEmployees = [...new Set(employees.map((emp) => emp.name))].sort();
  const uniqueJobs = [
    ...new Set(jobs.map((job) => `${job.jobNumber} - ${job.name}`)),
  ].sort();

  return (
    <div className="space-y-6">
      {/* Enhanced Filters and Sorting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Time Entry Viewer & Manager
          </CardTitle>
          <CardDescription>
            View, filter, sort, and manage time entries with comprehensive
            controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Date Range Filters */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">
                Date Range Selection
              </Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={dateRange === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("today")}
                >
                  <Calendar className="h-4 w-4 mr-1" />
                  Today
                </Button>
                <Button
                  variant={dateRange === "yesterday" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("yesterday")}
                >
                  Last Day
                </Button>
                <Button
                  variant={dateRange === "last3" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("last3")}
                >
                  Last 3 Days
                </Button>
                <Button
                  variant={dateRange === "last7" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("last7")}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={dateRange === "last14" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("last14")}
                >
                  Last 14 Days
                </Button>
                <Button
                  variant={dateRange === "last30" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleDateRangeChange("last30")}
                >
                  Last 30 Days
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customDate">Custom Date</Label>
                <Input
                  id="customDate"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setDateRange("custom");
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeFilter">Filter by Employee</Label>
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-employees">All Employees</SelectItem>
                    {uniqueEmployees.map((employee) => (
                      <SelectItem key={employee} value={employee}>
                        {employee}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jobFilter">Filter by Job</Label>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-jobs">All Jobs</SelectItem>
                    {uniqueJobs.map((job) => (
                      <SelectItem key={job} value={job.split(" - ")[0]}>
                        {job}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Current View</Label>
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {getDateRangeLabel()}
                  </span>
                </div>
              </div>
            </div>

            {/* Sorting Controls */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Sorting Options</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                <Button
                  variant={sortField === "date" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("date")}
                  className="justify-between"
                >
                  Date
                  {getSortIcon("date")}
                </Button>
                <Button
                  variant={sortField === "employee" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("employee")}
                  className="justify-between"
                >
                  Employee
                  {getSortIcon("employee")}
                </Button>
                <Button
                  variant={sortField === "job" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("job")}
                  className="justify-between"
                >
                  Job #{getSortIcon("job")}
                </Button>
                <Button
                  variant={sortField === "title" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("title")}
                  className="justify-between"
                >
                  Title
                  {getSortIcon("title")}
                </Button>
                <Button
                  variant={sortField === "hourType" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("hourType")}
                  className="justify-between"
                >
                  Hour Type
                  {getSortIcon("hourType")}
                </Button>
                <Button
                  variant={sortField === "hours" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleSort("hours")}
                  className="justify-between"
                >
                  Hours
                  {getSortIcon("hours")}
                </Button>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters & Sorting
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Entries
                </p>
                <p className="text-2xl font-bold">{totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Live Out Allowance
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalLoaCount}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  ${totalLoaAmount.toFixed(2)} total
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Billable Amount
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalBillableAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  ${totalCost.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time Entries ({getDateRangeLabel()})
          </CardTitle>
          <CardDescription>
            {totalEntries} entries found • Sorted by {sortField} (
            {sortDirection === "asc" ? "ascending" : "descending"})
            {((employeeFilter && employeeFilter !== "all-employees") ||
              (jobFilter && jobFilter !== "all-jobs")) && (
              <span>
                {" "}
                • Filtered by{" "}
                {employeeFilter &&
                  employeeFilter !== "all-employees" &&
                  `Employee: ${employeeFilter}`}
                {employeeFilter &&
                  employeeFilter !== "all-employees" &&
                  jobFilter &&
                  jobFilter !== "all-jobs" &&
                  ", "}
                {jobFilter && jobFilter !== "all-jobs" && `Job: ${jobFilter}`}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAndSortedEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No time entries found</p>
              <p className="text-sm">
                No entries match your current filters and date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center gap-2">
                        Date
                        {getSortIcon("date")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("employee")}
                    >
                      <div className="flex items-center gap-2">
                        Employee
                        {getSortIcon("employee")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center gap-2">
                        Title
                        {getSortIcon("title")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("job")}
                    >
                      <div className="flex items-center gap-2">
                        Job
                        {getSortIcon("job")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("hourType")}
                    >
                      <div className="flex items-center gap-2">
                        Hour Type
                        {getSortIcon("hourType")}
                      </div>
                    </TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort("hours")}
                    >
                      <div className="flex items-center gap-2">
                        Hours
                        {getSortIcon("hours")}
                      </div>
                    </TableHead>
                    <TableHead className="text-purple-600">
                      Live Out Allowance
                    </TableHead>
                    <TableHead>Billable Rate</TableHead>
                    <TableHead>Cost Rate</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEntries.map((entry) => {
                    const employee = employees.find(
                      (emp) => emp.id === entry.employeeId,
                    );
                    const job = jobs.find((j) => j.id === entry.jobId);
                    const hourType = hourTypes.find(
                      (ht) => ht.id === entry.hourTypeId,
                    );
                    const province = provinces.find(
                      (p) => p.id === entry.provinceId,
                    );

                    const billableWageChanged =
                      employee &&
                      entry.billableWageUsed !== employee.billableWage;
                    const costWageChanged =
                      employee && entry.costWageUsed !== employee.costWage;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {parseLocalDate(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{employee?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>
                              {entry.title || employee?.title || "Unknown"}
                            </span>
                            {entry.title && entry.title !== employee?.title && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {job?.jobNumber || "Unknown"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {job?.name || "Unknown Job"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {hourType?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>{province?.name || "Unknown"}</TableCell>
                        <TableCell className="font-medium">
                          {entry.hours}h
                        </TableCell>
                        <TableCell>
                          {entry.loaCount && entry.loaCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-800"
                              >
                                {entry.loaCount} × $200
                              </Badge>
                              <span className="text-xs text-purple-600 font-medium">
                                = ${(entry.loaCount * 200).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600 font-medium">
                              ${entry.billableWageUsed?.toFixed(2) || "0.00"}
                            </span>
                            {billableWageChanged && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">
                              ${entry.costWageUsed?.toFixed(2) || "0.00"}
                            </span>
                            {costWageChanged && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="max-w-32 truncate"
                            title={entry.description}
                          >
                            {entry.description || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              item={{
                                id: entry.id,
                                name: `${employee?.name || "Unknown Employee"} - ${parseLocalDate(entry.date).toLocaleDateString()}`,
                                type: "time-entry",
                                associatedData: {
                                  additionalInfo: [
                                    `Date: ${parseLocalDate(entry.date).toLocaleDateString()}`,
                                    `Hours: ${entry.hours}`,
                                    `Job: ${job?.jobNumber} - ${job?.name}`,
                                    `Hour Type: ${hourType?.name}`,
                                    `Province: ${province?.name}`,
                                    entry.loaCount
                                      ? `LOA Count: ${entry.loaCount}`
                                      : null,
                                    entry.description
                                      ? `Description: ${entry.description}`
                                      : null,
                                  ].filter(Boolean) as string[],
                                },
                              }}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              onConfirm={handleDelete}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
            <DialogDescription>
              Modify the details of this time entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-employee">Employee</Label>
              <Select
                value={editForm.employeeId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, employeeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name} - {employee.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-job">Job</Label>
              <Select
                value={editForm.jobId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, jobId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select job" />
                </SelectTrigger>
                <SelectContent>
                  {jobs
                    .filter((job) => job.isActive)
                    .map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.jobNumber} - {job.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hourType">Hour Type</Label>
              <Select
                value={editForm.hourTypeId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, hourTypeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hour type" />
                </SelectTrigger>
                <SelectContent>
                  {hourTypes.map((hourType) => (
                    <SelectItem key={hourType.id} value={hourType.id}>
                      {hourType.name} (x{hourType.multiplier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-province">Province</Label>
              <Select
                value={editForm.provinceId}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, provinceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={province.id}>
                      {province.name} ({province.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                type="date"
                value={editForm.date}
                onChange={(e) =>
                  setEditForm({ ...editForm, date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-hours">Hours</Label>
              <Input
                id="edit-hours"
                type="number"
                step="0.25"
                min="0"
                value={editForm.hours}
                onChange={(e) =>
                  setEditForm({ ...editForm, hours: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-loa">LOA Count</Label>
              <Input
                id="edit-loa"
                type="number"
                min="0"
                value={editForm.loaCount}
                onChange={(e) =>
                  setEditForm({ ...editForm, loaCount: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
