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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Users,
  Briefcase,
  Calendar,
  FileText,
  Truck,
  RotateCcw,
  DollarSign,
  MapPin,
  Clock,
  CalendarIcon,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";
import { format } from "date-fns";

// Helper function to safely calculate DSP earnings for an employee
const calculateDSPEarnings = (
  employeeRentals: any[],
  rentalItems: any[],
): number => {
  return employeeRentals.reduce((sum, rental) => {
    // Use the DSP rate from the rental entry itself, not from the rental item template
    const dspRate = rental.dspRate || 0;
    return sum + dspRate * rental.duration * rental.quantity;
  }, 0);
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
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
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
      if (jobFilter !== "all-jobs" && summary.jobNumber !== jobFilter) {
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
  ]);

  // Filter rental summaries based on selected criteria
  const filteredRentalSummaries = useMemo(() => {
    return rentalSummaries.filter((rental) => {
      // Date filter
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
      if (jobFilter !== "all-jobs" && rental.jobNumber !== jobFilter) {
        return false;
      }

      return true;
    });
  }, [rentalSummaries, dateFilter, employeeFilter, jobFilter]);

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
            costWage: summary.costWage,
            loaCount: summary.loaCount || 0,
          });
        }

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

    // Add DSP earnings to each employee's total cost
    const employeeGroupsWithDSP = Object.values(employeeGroups).map(
      (employee) => {
        // Calculate DSP earnings for this employee
        const employeeRentals = filteredRentalSummaries.filter(
          (rental) => rental.employeeName === employee.employeeName,
        );

        const dspEarnings = employeeRentals.reduce((sum, rental) => {
          const dspRate = rental.dspRate || 0;
          return sum + dspRate * rental.duration * rental.quantity;
        }, 0);

        // Add DSP earnings to total cost
        return {
          ...employee,
          totalCost: employee.totalCost + dspEarnings,
          dspEarnings, // Keep track of DSP earnings separately for display purposes
        };
      },
    );

    return employeeGroupsWithDSP.sort((a, b) => b.totalHours - a.totalHours);
  }, [filteredSummaries, filteredRentalSummaries]);

  // Optimized hierarchical employee processing with proper grouping
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
        <Button
          onClick={resetFilters}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>

      <Tabs defaultValue="employee-performance" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="employee-performance">
            Payroll Information
          </TabsTrigger>
          <TabsTrigger value="time-analysis">Time Analysis</TabsTrigger>
          <TabsTrigger value="job-performance">Job Performance</TabsTrigger>
        </TabsList>

        {/* Payroll Information Tab */}
        <TabsContent value="employee-performance">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Users className="h-5 w-5 text-orange-400" />
                Payroll Information For Selected Dates And Times
              </CardTitle>
              <CardDescription className="text-gray-300">
                Hierarchical view of employee and subordinates, with hours,
                costs, and DSP Rental earnings breakdown across jobs and
                provinces.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 overflow-hidden"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {dateFilter.start
                            ? format(
                                parseLocalDate(dateFilter.start),
                                "MMM d, yyyy",
                              )
                            : "Pick a date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-gray-800 border-gray-600"
                      align="start"
                    >
                      <CalendarComponent
                        mode="single"
                        selected={
                          dateFilter.start
                            ? parseLocalDate(dateFilter.start)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            setDateFilter({
                              ...dateFilter,
                              start: format(date, "yyyy-MM-dd"),
                            });
                          }
                        }}
                        initialFocus
                        className="bg-gray-800 text-gray-100"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 overflow-hidden"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">
                          {dateFilter.end
                            ? format(
                                parseLocalDate(dateFilter.end),
                                "MMM d, yyyy",
                              )
                            : "Pick a date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-auto p-0 bg-gray-800 border-gray-600"
                      align="start"
                    >
                      <CalendarComponent
                        mode="single"
                        selected={
                          dateFilter.end
                            ? parseLocalDate(dateFilter.end)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            setDateFilter({
                              ...dateFilter,
                              end: format(date, "yyyy-MM-dd"),
                            });
                          }
                        }}
                        initialFocus
                        className="bg-gray-800 text-gray-100"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Options</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="include-invoiced"
                      checked={includeInvoiced}
                      onCheckedChange={setIncludeInvoiced}
                    />
                    <Label
                      htmlFor="include-invoiced"
                      className="text-sm text-gray-300"
                    >
                      Include invoiced
                    </Label>
                  </div>
                </div>
              </div>

              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data found for the selected filters. Try adjusting your
                  date range or filter criteria.
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
                        ${summaryStats.totalCost.toFixed(2)}
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

                  {/* Employee Cards */}
                  <div className="space-y-4">
                    {hierarchicalEmployeeSummaries.map((employee, index) => {
                      const dspCalc = {
                        dspEarnings: employee.dspEarnings || 0,
                      };

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
                                  {index + 1}
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
                              <div className="text-xs text-gray-400">
                                {employee.entries.length} entries
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                              <div className="text-center">
                                <div className="text-xl font-bold text-blue-400">
                                  {employee.totalHours.toFixed(2)}h
                                </div>
                                <div className="text-xs text-gray-400">
                                  Hours
                                </div>
                                {employee.totalEffectiveHours !==
                                  employee.totalHours && (
                                  <div className="text-xs text-gray-500">
                                    ({employee.totalEffectiveHours.toFixed(2)}h
                                    eff)
                                  </div>
                                )}
                              </div>

                              <div className="text-center">
                                <div className="text-xl font-bold text-green-400">
                                  ${employee.totalCost.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Cost
                                </div>
                              </div>

                              <div className="text-center">
                                {totalGst > 0 ? (
                                  <>
                                    <div className="text-xl font-bold text-orange-400">
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
                                        from team
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="text-xl text-gray-500">
                                      -
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      GST
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="text-center">
                                {dspCalc && dspCalc.dspEarnings > 0 ? (
                                  <>
                                    <div className="text-xl font-bold text-purple-400">
                                      ${dspCalc.dspEarnings.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      DSP Rentals
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="text-xl text-gray-500">
                                      -
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      DSP Rentals
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Hour Types Compact */}
                            {employee.hourTypeBreakdown &&
                              Object.keys(employee.hourTypeBreakdown).length >
                                0 && (
                                <div className="border-t border-gray-700 pt-3">
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(employee.hourTypeBreakdown)
                                      .sort(([, a], [, b]) => b.hours - a.hours)
                                      .slice(0, 4)
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
                                            {data.cost.toFixed(2)}
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
                                                  )
                                                    .sort(
                                                      ([, a], [, b]) =>
                                                        b.hours - a.hours,
                                                    )
                                                    .map(
                                                      ([
                                                        provinceName,
                                                        provinceData,
                                                      ]) => (
                                                        <div
                                                          key={provinceName}
                                                          className="flex justify-between"
                                                        >
                                                          <span className="text-orange-400/80">
                                                            {provinceName}:
                                                          </span>
                                                          <span>
                                                            {provinceData.hours.toFixed(
                                                              2,
                                                            )}
                                                            h
                                                          </span>
                                                        </div>
                                                      ),
                                                    )}
                                                </div>
                                              </div>
                                            )}
                                        </div>
                                      ))}
                                    {Object.keys(employee.hourTypeBreakdown)
                                      .length > 4 && (
                                      <div className="text-sm text-gray-400 self-center px-2">
                                        +
                                        {Object.keys(employee.hourTypeBreakdown)
                                          .length - 4}{" "}
                                        more
                                      </div>
                                    )}
                                  </div>
                                  {employee.totalLoaCount > 0 && (
                                    <div className="mt-2">
                                      <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-sm">
                                        LOA: {employee.totalLoaCount}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                          </div>

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
                                        <div className="text-xs text-blue-400">
                                          {subordinate.entries.length} entries
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-4 gap-3 text-sm">
                                        <div className="text-center">
                                          <div className="font-semibold text-blue-300">
                                            {subordinate.totalHours.toFixed(2)}h
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            Hours
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-semibold text-green-300">
                                            ${subordinate.totalCost.toFixed(2)}
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
                      );
                    })}
                  </div>
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
                <Briefcase className="h-5 w-5 text-green-400" />
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
