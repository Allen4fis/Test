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
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Trash2,
  Filter,
  Eye,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntry } from "@/types";

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TimeEntryViewer() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    deleteTimeEntry,
  } = useTimeTracking();

  // Date filter states
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [dateRange, setDateRange] = useState("today");

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

  // Filtered time entries based on selected date range
  const filteredEntries = useMemo(() => {
    const { startDate, endDate } = getDateRange(dateRange);

    return timeEntries
      .filter((entry) => {
        if (dateRange === "custom") {
          return entry.date === selectedDate;
        }
        return entry.date >= startDate && entry.date <= endDate;
      })
      .sort((a, b) => {
        // Sort by date (most recent first) then by creation time (most recent first)
        const dateComparison = b.date.localeCompare(a.date);
        if (dateComparison !== 0) return dateComparison;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [timeEntries, dateRange, selectedDate]);

  // Calculate summary statistics
  const totalEntries = filteredEntries.length;
  const totalHours = filteredEntries.reduce(
    (sum, entry) => sum + entry.hours,
    0,
  );
  const totalBillableAmount = filteredEntries.reduce((sum, entry) => {
    const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
    const effectiveHours = entry.hours * (hourType?.multiplier || 1);
    let adjustedBillableWage = entry.billableWageUsed || 0;

    // Add $3 for NS hour types
    if (hourType?.name.startsWith("NS ")) {
      adjustedBillableWage += 3;
    }

    return hourType?.name === "LOA"
      ? sum + 200
      : sum + effectiveHours * adjustedBillableWage;
  }, 0);

  const totalCost = filteredEntries.reduce((sum, entry) => {
    const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
    const effectiveHours = entry.hours * (hourType?.multiplier || 1);
    let adjustedCostWage = entry.costWageUsed || 0;

    // Add $3 for NS hour types
    if (hourType?.name.startsWith("NS ")) {
      adjustedCostWage += 3;
    }

    return hourType?.name === "LOA"
      ? sum + 200
      : sum + effectiveHours * adjustedCostWage;
  }, 0);

  const handleDelete = async (entry: TimeEntry) => {
    try {
      await deleteTimeEntry(entry.id);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    if (range !== "custom") {
      setSelectedDate(getLocalDateString());
    }
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

  return (
    <div className="space-y-6">
      {/* Date Range Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Time Entry Viewer
          </CardTitle>
          <CardDescription>
            View and manage time entries by date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Quick Date Range Buttons */}
            <div className="space-y-2">
              <Label>Date Range</Label>
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

            {/* Custom Date Picker */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label>Current Filter</Label>
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {getDateRangeLabel()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {totalEntries} entries found for the selected date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No time entries found</p>
              <p className="text-sm">
                No entries exist for the selected date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Hour Type</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Billable Rate</TableHead>
                    <TableHead>Cost Rate</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
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
                          {new Date(entry.date).toLocaleDateString()}
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
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-600">
                                  ⚠️ Delete Time Entry
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-lg font-semibold text-red-700">
                                  If Deleted, This Time Entry Will Be Gone
                                  FOREVER AND EVER AND EVER!
                                </AlertDialogDescription>
                                <AlertDialogDescription className="text-sm text-gray-600 mt-2">
                                  Time entry for {employee?.name} on{" "}
                                  {new Date(entry.date).toLocaleDateString()} -{" "}
                                  {entry.hours} hours
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(entry)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete Forever
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
}
