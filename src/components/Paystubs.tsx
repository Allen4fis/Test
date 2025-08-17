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
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Clock,
  DollarSign,
  Filter,
  Receipt,
  User,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";

// Helper function to get the last n days
const getLastNDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

const getInitialDateFilter = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: getTodayString(),
  };
};

export const Paystubs = () => {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    timeEntrySummaries,
  } = useTimeTracking();

  // State for filters
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");

  // Filter summaries based on date range and employee selection
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      // Date filter
      if (
        summary.date < dateFilter.start ||
        summary.date > dateFilter.end
      ) {
        return false;
      }

      // Employee filter
      if (selectedEmployee !== "all" && summary.employeeName !== selectedEmployee) {
        return false;
      }

      return true;
    });
  }, [timeEntrySummaries, dateFilter, selectedEmployee]);

  // Group summaries by employee for paystub display
  const employeePaystubs = useMemo(() => {
    const grouped = filteredSummaries.reduce((acc, summary) => {
      const key = summary.employeeName;
      
      if (!acc[key]) {
        acc[key] = {
          employeeName: summary.employeeName,
          employeeTitle: summary.employeeTitle,
          totalHours: 0,
          totalCost: 0,
          entries: [],
        };
      }

      acc[key].totalHours += summary.hours || 0;
      acc[key].totalCost += summary.totalCost || 0;
      acc[key].entries.push(summary);

      return acc;
    }, {} as Record<string, {
      employeeName: string;
      employeeTitle: string;
      totalHours: number;
      totalCost: number;
      entries: typeof summary[];
    }>);

    return Object.values(grouped).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [filteredSummaries]);

  // Get unique employee names for dropdown
  const employeeNames = useMemo(() => {
    const names = new Set(timeEntrySummaries.map(summary => summary.employeeName));
    return Array.from(names).sort();
  }, [timeEntrySummaries]);

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setSelectedEmployee("all");
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-green-600" />
            Paystubs
          </h1>
          <p className="text-gray-600 mt-1">
            Employee paystub information excluding taxes and remittances
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">End Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button onClick={resetFilters} variant="outline" className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateFilter({
                  start: getLastNDays(7),
                  end: getTodayString(),
                })
              }
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateFilter({
                  start: getLastNDays(30),
                  end: getTodayString(),
                })
              }
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                setDateFilter({
                  start: startOfMonth.toISOString().split("T")[0],
                  end: getTodayString(),
                });
              }}
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employeePaystubs.length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold text-gray-900">
                  {employeePaystubs.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${employeePaystubs.reduce((sum, emp) => sum + emp.totalCost, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Paystubs */}
      <div className="space-y-6">
        {employeePaystubs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No paystub data found</p>
              <p className="text-sm text-gray-500 mt-1">
                No entries match your current filters and date range.
              </p>
            </CardContent>
          </Card>
        ) : (
          employeePaystubs.map((paystub) => (
            <Card key={paystub.employeeName} className="border-l-4 border-l-blue-500">
              <CardHeader className="bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600" />
                      {paystub.employeeName}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      {paystub.employeeTitle} • {formatLocalDate(dateFilter.start)} to {formatLocalDate(dateFilter.end)}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${paystub.totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {paystub.totalHours.toFixed(1)} hours
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Hour Type</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paystub.entries
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry, index) => (
                        <TableRow key={`${entry.date}-${entry.jobNumber}-${entry.hourTypeName}-${index}`}>
                          <TableCell className="font-medium">
                            {formatLocalDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.jobNumber}</div>
                              <div className="text-sm text-gray-500 truncate max-w-32">
                                {entry.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {entry.hourTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {entry.provinceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {entry.hours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right">
                            ${entry.costWage.toFixed(2)}/h
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${entry.totalCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
