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
          totalLoaCount: 0,
          totalLoaAmount: 0,
          entries: [],
        };
      }

      acc[key].totalHours += summary.hours || 0;
      acc[key].totalCost += summary.totalCost || 0;
      acc[key].totalLoaCount += summary.loaCount || 0;
      acc[key].totalLoaAmount += (summary.loaCount || 0) * 200; // Default LOA amount
      acc[key].entries.push(summary);

      return acc;
    }, {} as Record<string, {
      employeeName: string;
      employeeTitle: string;
      totalHours: number;
      totalCost: number;
      totalLoaCount: number;
      totalLoaAmount: number;
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
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-orange-400" />
            Paystubs
          </h1>
          <p className="text-gray-300 mt-1">
            Employee paystub information including LOAs, excluding taxes and remittances
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Filter className="h-5 w-5 text-orange-400" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">Start Date</Label>
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
              <Label className="text-sm font-medium text-gray-200">End Date</Label>
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
              <Label className="text-sm font-medium text-gray-200">Employee</Label>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Employees</p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs.length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Hours</p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h
                </p>
              </div>
              <Clock className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total LOAs</p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs.reduce((sum, emp) => sum + emp.totalLoaCount, 0)}
                </p>
                <p className="text-sm text-amber-400">
                  ${employeePaystubs.reduce((sum, emp) => sum + emp.totalLoaAmount, 0).toFixed(2)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Cost</p>
                <p className="text-2xl font-bold text-gray-100">
                  ${employeePaystubs.reduce((sum, emp) => sum + emp.totalCost, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Paystubs */}
      <div className="space-y-6">
        {employeePaystubs.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg font-medium text-gray-200">No paystub data found</p>
              <p className="text-sm text-gray-400 mt-1">
                No entries match your current filters and date range.
              </p>
            </CardContent>
          </Card>
        ) : (
          employeePaystubs.map((paystub) => (
            <Card key={paystub.employeeName} className="border-l-4 border-l-orange-400 shadow-lg bg-gray-800/50 border-gray-700">
              <CardHeader className="bg-gray-700/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
                      <User className="h-5 w-5 text-orange-400" />
                      {paystub.employeeName}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {paystub.employeeTitle} • {formatLocalDate(dateFilter.start)} to {formatLocalDate(dateFilter.end)}
                    </CardDescription>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-2xl font-bold text-emerald-400">
                      ${paystub.totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-300 flex items-center gap-4">
                      <span>{paystub.totalHours.toFixed(1)} hours</span>
                      {paystub.totalLoaCount > 0 && (
                        <span className="text-amber-400">
                          {paystub.totalLoaCount} LOA${paystub.totalLoaCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-700/50 border-b-2 border-gray-600">
                      <TableHead className="font-semibold text-gray-200">Date</TableHead>
                      <TableHead className="font-semibold text-gray-200">Job</TableHead>
                      <TableHead className="font-semibold text-gray-200">Hour Type</TableHead>
                      <TableHead className="font-semibold text-gray-200">Province</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Hours</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">LOA</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Rate</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paystub.entries
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry, index) => (
                        <TableRow key={`${entry.date}-${entry.jobNumber}-${entry.hourTypeName}-${index}`} className="hover:bg-gray-700/30 border-gray-700">
                          <TableCell className="font-medium text-gray-200">
                            {formatLocalDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-100">{entry.jobNumber}</div>
                              <div className="text-sm text-gray-400 truncate max-w-32">
                                {entry.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-300 border-blue-500/50">
                              {entry.hourTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs bg-purple-900/30 text-purple-300 border-purple-500/50">
                              {entry.provinceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-200">
                            {entry.hours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {(entry.loaCount || 0) > 0 ? (
                              <div className="text-amber-400 font-medium">
                                {entry.loaCount} × $200
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            ${entry.costWage.toFixed(2)}/h
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-400">
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
