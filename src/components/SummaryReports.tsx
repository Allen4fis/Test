import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/usePagination";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CalendarIcon,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Download,
  Filter,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";

// Helper function to get the last n days
const getLastNDays = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
};

// Alias for quick date range buttons
const getDateRange = getLastNDays;

// Helper function to format date range for display
const formatDateRange = (start: string, end: string) => {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  return `${formatLocalDate(startDate, { month: "short", day: "numeric" })} - ${formatLocalDate(endDate, { month: "short", day: "numeric" })}`;
};

// Helper function to sum values by hour type
const sumByHourType = (
  entries: any[],
  hourTypeField: string,
  valueField: string,
) => {
  return entries.reduce(
    (acc, entry) => {
      const hourType = entry[hourTypeField] || "Unknown";
      acc[hourType] = (acc[hourType] || 0) + (entry[valueField] || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
};

// Helper function to calculate 5% GST for non-employee categories
const calculateGST = (employee: any, totalCost: number): number => {
  // Apply 5% GST to DSPs and contractors (anyone not explicitly marked as "employee")
  if (employee?.category === "dsp") {
    return totalCost * 0.05;
  }
  // Also apply GST to employees who have managers but no explicit category (subordinate contractors)
  if (
    employee?.managerId &&
    (!employee.category || employee.category !== "employee")
  ) {
    return totalCost * 0.05;
  }
  return 0;
};

export function SummaryReports() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    timeEntrySummaries,
    rentalSummaries,
  } = useTimeTracking();

  // Get initial date range (last 30 days)
  const getInitialDateFilter = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    return {
      start: startDate.toISOString().split("T")[0],
      end: endDate.toISOString().split("T")[0],
    };
  };

  // State for filters
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());
  const [employeeFilter, setEmployeeFilter] = useState("all-employees");
  const [jobFilter, setJobFilter] = useState("all-jobs");
  const [provinceFilter, setProvinceFilter] = useState("all-provinces");
  const [includeInvoiced, setIncludeInvoiced] = useState(false);
  const [showEmptyResults, setShowEmptyResults] = useState(false);

  // Filter summaries based on selected criteria
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      // Date filter
      const summaryDate = parseLocalDate(summary.date);
      const startDate = parseLocalDate(dateFilter.start);
      const endDate = parseLocalDate(dateFilter.end);

      if (summaryDate < startDate || summaryDate > endDate) {
        return false;
      }

      // Employee filter
      if (
        employeeFilter !== "all-employees" &&
        summary.employeeName !== employeeFilter
      ) {
        return false;
      }

      // Job filter
      if (jobFilter === "billable-only") {
        const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
        if (job?.isBillable === false) {
          return false;
        }
      } else if (jobFilter === "non-billable-only") {
        const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
        if (job?.isBillable !== false) {
          return false;
        }
      } else if (jobFilter !== "all-jobs" && summary.jobNumber !== jobFilter) {
        return false;
      }

      // Province filter
      if (
        provinceFilter !== "all-provinces" &&
        summary.provinceName !== provinceFilter
      ) {
        return false;
      }

      return true;
    });
  }, [
    timeEntrySummaries,
    dateFilter,
    employeeFilter,
    jobFilter,
    provinceFilter,
    jobs,
  ]);

  // Filter rental summaries
  const filteredRentalSummaries = useMemo(() => {
    return rentalSummaries.filter((rental) => {
      // Date filter - use start date for filtering
      const rentalDate = parseLocalDate(rental.startDate);
      const startDate = parseLocalDate(dateFilter.start);
      const endDate = parseLocalDate(dateFilter.end);

      if (rentalDate < startDate || rentalDate > endDate) {
        return false;
      }

      // Employee filter (if rental has employee assigned)
      if (
        employeeFilter !== "all-employees" &&
        rental.employeeName &&
        rental.employeeName !== employeeFilter
      ) {
        return false;
      }

      // Job filter
      if (jobFilter === "billable-only") {
        const job = jobs.find((j) => j.jobNumber === rental.jobNumber);
        if (job?.isBillable === false) {
          return false;
        }
      } else if (jobFilter === "non-billable-only") {
        const job = jobs.find((j) => j.jobNumber === rental.jobNumber);
        if (job?.isBillable !== false) {
          return false;
        }
      } else if (jobFilter !== "all-jobs" && rental.jobNumber !== jobFilter) {
        return false;
      }

      return true;
    });
  }, [rentalSummaries, dateFilter, employeeFilter, jobFilter, jobs]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalHours = filteredSummaries.reduce(
      (sum, summary) => sum + summary.hours,
      0,
    );
    const totalCost = filteredSummaries.reduce(
      (sum, summary) => sum + summary.totalCost,
      0,
    );
    const totalGst = filteredSummaries.reduce((sum, summary) => {
      const employee = employees.find(
        (emp) => emp.name === summary.employeeName,
      );
      return sum + calculateGST(employee, summary.totalCost);
    }, 0);
    const rentalCost = filteredRentalSummaries.reduce(
      (sum, rental) => sum + rental.totalCost,
      0,
    );
    const totalDspEarnings = filteredRentalSummaries.reduce((sum, rental) => {
      const dspRate = rental.dspRate || 0;
      return sum + dspRate * rental.duration * rental.quantity;
    }, 0);

    return {
      totalHours,
      totalCost,
      totalGst,
      rentalCost,
      totalDspEarnings,
      totalCombinedCost: totalCost + rentalCost + totalDspEarnings,
    };
  }, [filteredSummaries, filteredRentalSummaries, employees]);

  // Optimized employee summaries with single pass calculation
  const employeeSummariesData = useMemo(() => {
    const employeeGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = summary.employeeName;
        if (!acc[key]) {
          acc[key] = {
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            entries: [],
            hourTypeBreakdown: {},
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.entries.push(summary);

        // Build hour type breakdown from individual summary data
        const hourTypeName = summary.hourTypeName || "Unknown";
        const provinceName = summary.provinceName || "Unknown";

        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
            provinces: {},
            rateEntries: [],
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

        // Track individual rate entries for this hour type
        if (summary.hours > 0) {
          // Calculate hourly cost excluding LOA and other non-hourly costs
          const hourlyCost = summary.effectiveHours * summary.costWage;
          const hourlyRate = hourlyCost / summary.hours;

          group.hourTypeBreakdown[hourTypeName].rateEntries.push({
            date: summary.date,
            hours: summary.hours,
            effectiveHours: summary.effectiveHours,
            hourlyRate: hourlyRate,
            hourlyCost: hourlyCost,
            totalCost: summary.totalCost,
          });
        }

        // Track province breakdown for this hour type
        if (!group.hourTypeBreakdown[hourTypeName].provinces[provinceName]) {
          group.hourTypeBreakdown[hourTypeName].provinces[provinceName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }

        group.hourTypeBreakdown[hourTypeName].provinces[provinceName].hours +=
          summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].provinces[
          provinceName
        ].effectiveHours += summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].provinces[provinceName].cost +=
          summary.totalCost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(employeeGroups).filter(
      (group) => showEmptyResults || group.totalHours > 0,
    );
  }, [filteredSummaries, showEmptyResults]);

  // Calculate hierarchical employee summaries (managers and subordinates)
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

    // First, enhance all employees with hierarchy data and GST calculations
    const enhancedEmployees = employeeSummariesData.map((emp) => {
      const employee = employeeMap.get(emp.employeeName);
      const manager = employee?.managerId
        ? employees.find((e) => e.id === employee.managerId)
        : null;

      // Calculate GST for non-employee categories
      const gstAmount = calculateGST(employee, emp.totalCost);

      return {
        ...emp,
        employeeCategory: employee?.category,
        isSubordinate: !!employee?.managerId,
        managerName: manager?.name,
        managerId: employee?.managerId,
        gstAmount,
      };
    });

    // Group subordinates by their managers
    const subordinatesByManager = enhancedEmployees
      .filter((emp) => emp.isSubordinate)
      .reduce(
        (acc, emp) => {
          const managerName = emp.managerName || "Unknown";
          if (!acc[managerName]) {
            acc[managerName] = [];
          }
          acc[managerName].push(emp);
          return acc;
        },
        {} as Record<string, any[]>,
      );

    // Calculate subordinate GST totals for managers
    const managersWithSubordinateGST = enhancedEmployees
      .filter((emp) => !emp.isSubordinate)
      .map((manager) => {
        const subordinates = subordinatesByManager[manager.employeeName] || [];
        const subordinateGstTotal = subordinates.reduce(
          (sum, sub) => sum + (sub.gstAmount || 0),
          0,
        );

        return {
          ...manager,
          subordinates,
          subordinateGstTotal,
        };
      });

    return managersWithSubordinateGST;
  }, [employeeSummariesData, employees]);

  // Pagination for employee summaries
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pagination = usePagination({
    data: hierarchicalEmployeeSummaries,
    itemsPerPage,
  });

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("all-employees");
    setJobFilter("all-jobs");
    setProvinceFilter("all-provinces");
    setIncludeInvoiced(false);
    setShowEmptyResults(false);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100">
            Summary Reports
          </h1>
          <p className="text-gray-400 mt-1">
            Comprehensive analysis of time entries, costs, and performance
            metrics
          </p>
        </div>
        <Button onClick={resetFilters} variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>

      <Tabs defaultValue="payroll-info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payroll-info">Payroll Information</TabsTrigger>
          <TabsTrigger value="time-analysis">Time Analysis</TabsTrigger>
          <TabsTrigger value="job-performance">Job Performance</TabsTrigger>
        </TabsList>

        {/* Payroll Information Tab */}
        <TabsContent value="payroll-info">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Users className="h-5 w-5 text-orange-400" />
                Payroll Information
              </CardTitle>
              <CardDescription className="text-gray-300">
                Employee cost breakdown with hierarchical reporting structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-6 p-4 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg">
                {/* Date Range Section */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Date Range</Label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Manual Date Input Controls */}
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex-1">
                        <Label
                          htmlFor="start-date"
                          className="text-xs text-gray-400 mb-1 block"
                        >
                          From
                        </Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={dateFilter.start}
                          onChange={(e) =>
                            setDateFilter({
                              ...dateFilter,
                              start: e.target.value,
                            })
                          }
                          className="bg-gray-800 border-gray-600 text-gray-100"
                        />
                      </div>
                      <span className="text-gray-400 px-1 mt-5">to</span>
                      <div className="flex-1">
                        <Label
                          htmlFor="end-date"
                          className="text-xs text-gray-400 mb-1 block"
                        >
                          To
                        </Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={dateFilter.end}
                          onChange={(e) =>
                            setDateFilter({
                              ...dateFilter,
                              end: e.target.value,
                            })
                          }
                          className="bg-gray-800 border-gray-600 text-gray-100"
                        />
                      </div>
                    </div>

                    {/* Quick Date Range Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateFilter(getDateRange(7))}
                        className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700"
                      >
                        7 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateFilter(getDateRange(30))}
                        className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700"
                      >
                        30 Days
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateFilter(getDateRange(90))}
                        className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700"
                      >
                        90 Days
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Other Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Employee</Label>
                    <Select
                      value={employeeFilter}
                      onValueChange={setEmployeeFilter}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all-employees"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All Employees
                        </SelectItem>
                        {employees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.name}
                            className="text-gray-100 focus:bg-orange-500/20"
                          >
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Job</Label>
                    <Select value={jobFilter} onValueChange={setJobFilter}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all-jobs"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All Jobs
                        </SelectItem>
                        <SelectItem
                          value="billable-only"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          Billable Jobs Only
                        </SelectItem>
                        <SelectItem
                          value="non-billable-only"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          Non-Billable Jobs Only
                        </SelectItem>
                        {jobs.map((job) => (
                          <SelectItem
                            key={job.id}
                            value={job.jobNumber}
                            className="text-gray-100 focus:bg-orange-500/20"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {job.jobNumber} - {job.name}
                              </span>
                              {job.isBillable === false && (
                                <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded ml-2">
                                  Non-Billable
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Province</Label>
                    <Select
                      value={provinceFilter}
                      onValueChange={setProvinceFilter}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all-provinces"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All Provinces
                        </SelectItem>
                        {provinces.map((province) => (
                          <SelectItem
                            key={province.id}
                            value={province.name}
                            className="text-gray-100 focus:bg-orange-500/20"
                          >
                            {province.name} ({province.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {filteredSummaries.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-100 mb-2">
                      No Data Available
                    </h3>
                    <p className="text-gray-400 mb-4">
                      No time entries found for the selected filters.
                    </p>
                    <Button onClick={resetFilters} variant="outline">
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6">
                    {/* Summary Statistics */}
                    <div className="grid grid-cols-4 gap-4 p-4 mb-6 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {summaryStats.totalHours.toFixed(2)}h
                        </div>
                        <div className="text-sm text-gray-300">Total Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          ${summaryStats.totalCombinedCost.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">Total Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          ${summaryStats.totalGst.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">Total GST</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          ${summaryStats.totalDspEarnings.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">
                          Total DSP Rentals
                        </div>
                      </div>
                    </div>

                    {/* Hierarchical Employee Display */}
                    {pagination.paginatedData.map((employee, index) => {
                      const totalGst =
                        (employee.gstAmount || 0) +
                        (employee.subordinateGstTotal || 0);

                      return (
                        <div key={employee.employeeName}>
                          {/* Manager Card */}
                          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                                    index < 3
                                      ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                      : index < 10
                                        ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                                        : "bg-gradient-to-br from-gray-500 to-gray-700 text-white"
                                  }`}
                                >
                                  {employee.employeeName.charAt(0)}
                                </span>
                                <div>
                                  <div className="font-semibold text-gray-100">
                                    {employee.employeeName}
                                  </div>
                                  <div className="text-sm text-gray-300">
                                    {employee.employeeTitle}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-lg font-bold text-blue-400">
                                    {employee.totalHours.toFixed(2)}h
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Hours
                                  </div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-green-400">
                                    ${employee.totalCost.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Cost
                                  </div>
                                </div>
                                {totalGst > 0 ? (
                                  <div>
                                    <div className="text-lg font-bold text-orange-400">
                                      ${totalGst.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      GST
                                    </div>
                                    {employee.gstAmount > 0 &&
                                    employee.subordinateGstTotal > 0 ? (
                                      <div className="text-xs">
                                        <span className="text-orange-300">
                                          ${employee.gstAmount.toFixed(2)}{" "}
                                          personal
                                        </span>
                                        <span className="text-blue-300">
                                          {" "}
                                          + $
                                          {employee.subordinateGstTotal.toFixed(
                                            2,
                                          )}{" "}
                                          team
                                        </span>
                                      </div>
                                    ) : employee.gstAmount > 0 ? (
                                      <div className="text-xs text-orange-300">
                                        Personal GST
                                      </div>
                                    ) : (
                                      <div className="text-xs text-blue-300">
                                        Team GST
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-lg font-bold text-gray-500">
                                      $0.00
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      GST
                                    </div>
                                  </div>
                                )}
                                <div>
                                  {employee.totalLoaCount > 0 ? (
                                    <div>
                                      <div className="text-lg font-bold text-purple-400">
                                        {employee.totalLoaCount}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        LOA
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-lg font-bold text-gray-500">
                                        0
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        LOA
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hour Type Breakdown */}
                            {employee.hourTypeBreakdown &&
                              Object.keys(employee.hourTypeBreakdown).length >
                                0 && (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-300 mb-2">
                                    Hour Type Breakdown:
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(employee.hourTypeBreakdown)
                                      .sort(([, a], [, b]) => b.hours - a.hours)
                                      .map(([hourType, data]) => (
                                        <div
                                          key={hourType}
                                          className="bg-orange-600/20 border border-orange-500/30 rounded px-3 py-1"
                                        >
                                          <div className="text-sm font-medium text-orange-200">
                                            {hourType}
                                          </div>
                                          <div className="text-xs text-orange-300">
                                            {data.hours.toFixed(2)}h • $
                                            {data.rateEntries &&
                                            data.rateEntries.length > 0
                                              ? (() => {
                                                  const avgRate =
                                                    data.rateEntries.reduce(
                                                      (sum, entry) =>
                                                        sum +
                                                        entry.hourlyRate *
                                                          entry.hours,
                                                      0,
                                                    ) /
                                                    data.rateEntries.reduce(
                                                      (sum, entry) =>
                                                        sum + entry.hours,
                                                      0,
                                                    );
                                                  return (
                                                    data.hours * avgRate
                                                  ).toFixed(2);
                                                })()
                                              : data.cost.toFixed(2)}
                                            {data.rateEntries &&
                                              data.rateEntries.length > 0 && (
                                                <div className="text-orange-400">
                                                  @$
                                                  {(
                                                    data.rateEntries.reduce(
                                                      (sum, entry) =>
                                                        sum +
                                                        entry.hourlyRate *
                                                          entry.hours,
                                                      0,
                                                    ) /
                                                    data.rateEntries.reduce(
                                                      (sum, entry) =>
                                                        sum + entry.hours,
                                                      0,
                                                    )
                                                  ).toFixed(2)}
                                                  /hr
                                                </div>
                                              )}
                                          </div>
                                          {/* Province Breakdown */}
                                          {data.provinces &&
                                            Object.keys(data.provinces).length >
                                              0 && (
                                              <div className="mt-1 pt-1 border-t border-orange-500/20">
                                                <div className="text-xs text-orange-400 space-y-0.5">
                                                  {Object.entries(
                                                    data.provinces,
                                                  ).map(
                                                    ([
                                                      provinceName,
                                                      provinceData,
                                                    ]) => (
                                                      <div
                                                        key={provinceName}
                                                        className="truncate"
                                                      >
                                                        {provinceName}:{" "}
                                                        {provinceData.hours.toFixed(
                                                          2,
                                                        )}
                                                        h
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      ))}
                                  </div>
                                  {Object.keys(employee.hourTypeBreakdown)
                                    .length > 0 && (
                                    <div className="text-xs text-gray-400 mt-2">
                                      Total:{" "}
                                      {
                                        Object.keys(employee.hourTypeBreakdown)
                                          .length
                                      }{" "}
                                      hour type
                                      {Object.keys(employee.hourTypeBreakdown)
                                        .length !== 1
                                        ? "s"
                                        : ""}
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Subordinates */}
                            {employee.subordinates &&
                              employee.subordinates.length > 0 && (
                                <div className="ml-8 space-y-2 mt-2">
                                  {employee.subordinates.map((subordinate) => {
                                    const subDspCalc = {
                                      dspEarnings: subordinate.dspEarnings || 0,
                                    };

                                    return (
                                      <div
                                        key={subordinate.employeeName}
                                        className="relative bg-blue-900/10 border border-blue-500/30 rounded-lg p-3"
                                      >
                                        <div className="absolute -left-4 top-4 w-3 h-3 border-l-2 border-b-2 border-blue-400"></div>
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                              ↳
                                            </span>
                                            <div>
                                              <div className="font-medium text-blue-300">
                                                {subordinate.employeeName}
                                              </div>
                                              <div className="text-xs text-blue-200">
                                                {subordinate.employeeTitle}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-3 text-center">
                                          <div className="text-center">
                                            <div className="font-semibold text-blue-300">
                                              {subordinate.totalHours.toFixed(
                                                2,
                                              )}
                                              h
                                            </div>
                                            <div className="text-xs text-blue-400">
                                              Hours
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-semibold text-green-300">
                                              $
                                              {subordinate.totalCost.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-blue-400">
                                              Cost
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="font-semibold text-orange-300">
                                              $
                                              {(
                                                subordinate.gstAmount || 0
                                              ).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-blue-400">
                                              GST
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            {subDspCalc.dspEarnings > 0 ? (
                                              <div className="font-semibold text-purple-300">
                                                $
                                                {subDspCalc.dspEarnings.toFixed(
                                                  2,
                                                )}
                                              </div>
                                            ) : (
                                              <div className="text-blue-400">
                                                -
                                              </div>
                                            )}
                                            <div className="text-xs text-blue-400">
                                              DSP
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {hierarchicalEmployeeSummaries.length > 0 && (
                <div className="mt-6">
                  <PaginationControls
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    totalItems={pagination.totalItems}
                    pageInfo={pagination.pageInfo}
                    canGoNext={pagination.canGoNext}
                    canGoPrevious={pagination.canGoPrevious}
                    onPageChange={pagination.goToPage}
                    onNextPage={pagination.goToNextPage}
                    onPreviousPage={pagination.goToPreviousPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPage(newItemsPerPage);
                      pagination.goToPage(1);
                    }}
                    itemsPerPageOptions={[5, 10, 20, 50]}
                    className="border-t border-gray-700/50 pt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Analysis Tab */}
        <TabsContent value="time-analysis">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Clock className="h-5 w-5 text-blue-400" />
                Time Analysis
              </CardTitle>
              <CardDescription className="text-gray-300">
                Detailed breakdown of time entries by various categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Time analysis content will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Performance Tab */}
        <TabsContent value="job-performance">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <TrendingUp className="h-5 w-5 text-green-400" />
                Job Performance
              </CardTitle>
              <CardDescription className="text-gray-300">
                Analysis of job costs, efficiency, and profitability
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Job performance content will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
