import React, { useState, useMemo, useCallback, memo } from "react";
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
import {
  PerformanceMonitor,
  ErrorBoundaryUtils,
  MemoryOptimizer,
} from "@/utils/comprehensiveSystemTest";

// Memoized components for better performance
const EmployeeCard = memo(({ employee, gstAmount }: any) => {
  return ErrorBoundaryUtils.createSafeWrapper(
    () => (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
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
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-400">
              {employee.totalHours.toFixed(2)}h
            </div>
            <div className="text-xs text-gray-400">Hours</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-400">
              ${employee.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">Labor Cost</div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${gstAmount > 0 ? "text-orange-400" : "text-gray-500"}`}
            >
              ${gstAmount.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">GST</div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${employee.totalDspEarnings > 0 ? "text-cyan-400" : "text-gray-500"}`}
            >
              ${employee.totalDspEarnings.toFixed(2)}
            </div>
            <div className="text-xs text-gray-400">DSP Earnings</div>
          </div>
          <div>
            <div
              className={`text-lg font-bold ${employee.totalLoaCount > 0 ? "text-purple-400" : "text-gray-500"}`}
            >
              {employee.totalLoaCount}
            </div>
            <div className="text-xs text-gray-400">LOA</div>
          </div>
        </div>
      </div>
    ),
    <div className="text-red-400 p-4">Error loading employee card</div>,
    `Failed to render employee card for ${employee.employeeName}`,
  );
});

const SubordinateCard = memo(({ subordinate }: any) => {
  return ErrorBoundaryUtils.createSafeWrapper(
    () => (
      <div className="relative bg-blue-900/10 border border-blue-500/30 rounded-lg p-3 space-y-3">
        <div className="absolute -left-4 top-4 w-3 h-3 border-l-2 border-b-2 border-blue-400"></div>
        <div className="flex items-center justify-between">
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
        <div className="grid grid-cols-6 gap-3 text-center">
          <div className="text-center">
            <div className="font-semibold text-blue-300">
              {subordinate.totalHours.toFixed(2)}h
            </div>
            <div className="text-xs text-blue-400">Hours</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-yellow-300">
              $
              {subordinate.totalHours > 0
                ? (subordinate.totalCost / subordinate.totalHours).toFixed(2)
                : "0.00"}
              /h
            </div>
            <div className="text-xs text-blue-400">Hourly Cost</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-300">
              ${subordinate.totalCost.toFixed(2)}
            </div>
            <div className="text-xs text-blue-400">Labor Cost</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-orange-300">
              ${(subordinate.gstAmount || 0).toFixed(2)}
            </div>
            <div className="text-xs text-blue-400">GST</div>
          </div>
          <div className="text-center">
            <div
              className={`font-semibold ${subordinate.totalDspEarnings > 0 ? "text-cyan-300" : "text-blue-400"}`}
            >
              ${subordinate.totalDspEarnings.toFixed(2)}
            </div>
            <div className="text-xs text-blue-400">DSP Earnings</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-300">
              {subordinate.totalLoaCount || 0}
            </div>
            <div className="text-xs text-blue-400">LOA</div>
          </div>
        </div>
      </div>
    ),
    <div className="text-red-400 p-3">Error loading subordinate</div>,
    `Failed to render subordinate card for ${subordinate.employeeName}`,
  );
});

const HourTypeBreakdown = memo(
  ({ hourTypeBreakdown, employeeName, baseCostWage }: any) => {
    if (!hourTypeBreakdown || Object.keys(hourTypeBreakdown).length === 0) {
      return null;
    }

    return ErrorBoundaryUtils.createSafeWrapper(
      () => (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-300">
            Hour Type Breakdown
          </h4>
          <div className="grid gap-2">
            {Object.entries(hourTypeBreakdown).map(
              ([hourType, data]: [string, any]) => (
                <div key={hourType} className="bg-gray-700/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-200">
                      {hourType}
                    </span>
                    <div className="text-sm text-gray-300">
                      {data.hours.toFixed(2)}h ({data.effectiveHours.toFixed(2)}{" "}
                      effective) - ${data.cost.toFixed(2)}
                    </div>
                  </div>

                  {/* Detailed entries breakdown */}
                  {data.rateEntries && data.rateEntries.length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1">
                        Daily Breakdown ({data.rateEntries.length} entries):
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {MemoryOptimizer.optimizeArray(
                          data.rateEntries,
                          50,
                        ).map((entry: any, index: number) => (
                          <div
                            key={`${entry.date}-${index}`}
                            className="text-xs bg-gray-600/30 px-2 py-1 rounded flex justify-between items-center"
                          >
                            <span className="text-gray-300">{entry.date}</span>
                            <span className="text-gray-200">
                              {entry.hours.toFixed(2)}h
                              {entry.effectiveHours !== entry.hours && (
                                <span className="text-gray-400">
                                  {" "}
                                  ({entry.effectiveHours.toFixed(2)} eff)
                                </span>
                              )}{" "}
                              @ ${entry.hourlyRate.toFixed(2)}/h = $
                              {entry.hourlyCost.toFixed(2)}
                              {entry.loaCount > 0 && (
                                <span className="text-yellow-400">
                                  {" "}
                                  + {entry.loaCount} LOA ($
                                  {entry.loaCost.toFixed(2)})
                                </span>
                              )}
                              {entry.loaCount > 0 && (
                                <span className="text-gray-300">
                                  {" "}
                                  = ${entry.totalCost.toFixed(2)}
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Province breakdown */}
                  {Object.keys(data.provinces).length > 0 && (
                    <div className="mt-2">
                      <div className="text-xs text-gray-400 mb-1">
                        Provinces:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(data.provinces).map(
                          ([provinceName, provinceData]: [string, any]) => (
                            <div
                              key={provinceName}
                              className="text-xs bg-gray-600/50 px-2 py-1 rounded"
                            >
                              {provinceName}: {provinceData.hours.toFixed(2)}h
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      ),
      <div className="text-red-400 text-sm">
        Error loading hour type breakdown
      </div>,
      `Failed to render hour type breakdown for ${employeeName}`,
    );
  },
);

// Helper function to get the last n days
const getLastNDays = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);
  return {
    startDate: formatLocalDate(startDate),
    endDate: formatLocalDate(endDate),
  };
};

const getDateRange = getLastNDays;

export default function SummaryReportsOptimized() {
  PerformanceMonitor.startMeasurement("SummaryReports-render");

  const {
    timeEntries,
    employees,
    jobs,
    hourTypes,
    provinces,
    rentalEntries,
    loading,
  } = useTimeTracking();

  // Optimized state management
  const [dateRange, setDateRange] = useState(() => getLastNDays(30));
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  // Memoized filter functions
  const filteredEntries = useMemo(() => {
    PerformanceMonitor.startMeasurement("filter-entries");

    const filtered = timeEntries.filter((entry) => {
      const entryDate = parseLocalDate(entry.date);
      const startDate = parseLocalDate(dateRange.startDate);
      const endDate = parseLocalDate(dateRange.endDate);

      const dateInRange = entryDate >= startDate && entryDate <= endDate;
      const employeeMatch =
        !employeeFilter || entry.employeeId === employeeFilter;
      const jobMatch = !jobFilter || entry.jobId === jobFilter;

      return dateInRange && employeeMatch && jobMatch;
    });

    PerformanceMonitor.endMeasurement("filter-entries");
    return MemoryOptimizer.optimizeArray(filtered, 5000);
  }, [timeEntries, dateRange, employeeFilter, jobFilter]);

  const filteredRentalEntries = useMemo(() => {
    return rentalEntries.filter((entry) => {
      const entryDate = parseLocalDate(entry.date);
      const startDate = parseLocalDate(dateRange.startDate);
      const endDate = parseLocalDate(dateRange.endDate);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [rentalEntries, dateRange]);

  // Optimized data processing with performance monitoring
  const processedData = useMemo(() => {
    PerformanceMonitor.startMeasurement("process-summary-data");

    try {
      // Create lookup maps for better performance
      const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));
      const jobMap = new Map(jobs.map((job) => [job.name, job]));
      const hourTypeMap = new Map(hourTypes.map((ht) => [ht.name, ht]));
      const provinceMap = new Map(provinces.map((prov) => [prov.name, prov]));

      // Process time entries efficiently
      const summariesData = filteredEntries.reduce(
        (acc, entry) => {
          const employee = employees.find((e) => e.id === entry.employeeId);
          const job = jobs.find((j) => j.id === entry.jobId);
          const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
          const province = provinces.find((p) => p.id === entry.provinceId);

          if (!employee || !job || !hourType || !province) return acc;

          const key = `${employee.name}-${job.name}-${hourType.name}-${province.name}`;

          if (!acc[key]) {
            acc[key] = {
              employeeName: employee.name,
              employeeTitle: employee.title,
              jobNumber: job.jobNumber,
              jobName: job.name,
              hourTypeName: hourType.name,
              provinceName: province.name,
              date: entry.date,
              hours: 0,
              effectiveHours: 0,
              totalCost: 0,
              billableWage: entry.billableWageUsed,
              costWage: entry.costWageUsed,
            };
          }

          acc[key].hours += entry.hours;
          acc[key].effectiveHours += entry.hours * hourType.multiplier;
          acc[key].totalCost +=
            entry.hours * hourType.multiplier * entry.costWageUsed;

          return acc;
        },
        {} as Record<string, any>,
      );

      const summariesArray = Object.values(summariesData);

      PerformanceMonitor.endMeasurement("process-summary-data");
      return summariesArray;
    } catch (error) {
      console.error("Error processing summary data:", error);
      PerformanceMonitor.endMeasurement("process-summary-data");
      return [];
    }
  }, [filteredEntries, employees, jobs, hourTypes, provinces]);

  // Optimized employee summaries with hierarchy
  const hierarchicalEmployeeSummaries = useMemo(() => {
    PerformanceMonitor.startMeasurement("process-hierarchical-summaries");

    try {
      const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

      // Group by employee efficiently
      const employeeSummariesData = processedData.reduce(
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
              totalDspEarnings: 0,
              dspRateInfo: {},
              entries: [],
              hourTypeBreakdown: {},
            };
          }

          const group = acc[key];
          group.totalHours += summary.hours || 0;
          group.totalEffectiveHours += summary.effectiveHours || 0;
          group.totalCost += summary.totalCost || 0;
          group.entries.push(summary);

          // Build hour type breakdown efficiently
          const hourTypeName = summary.hourTypeName;
          if (!group.hourTypeBreakdown[hourTypeName]) {
            group.hourTypeBreakdown[hourTypeName] = {
              hours: 0,
              effectiveHours: 0,
              cost: 0,
              rateEntries: [],
              provinces: {},
            };
          }

          group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
          group.hourTypeBreakdown[hourTypeName].effectiveHours +=
            summary.effectiveHours || 0;
          group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

          // Track rate entries for detailed breakdown
          if (summary.hours > 0) {
            // Calculate the actual hourly rate used for this entry
            // Since totalCost includes LOA costs, we need to calculate just the hourly portion
            const loaCost = (summary.loaCount || 0) * 200;
            const hourlyCost = summary.totalCost - loaCost;
            const hourlyRate = hourlyCost / summary.effectiveHours; // Rate per effective hour

            group.hourTypeBreakdown[hourTypeName].rateEntries.push({
              date: summary.date,
              hours: summary.hours,
              effectiveHours: summary.effectiveHours,
              hourlyRate: hourlyRate,
              hourlyCost: hourlyCost,
              loaCount: summary.loaCount || 0,
              loaCost: loaCost,
              totalCost: summary.totalCost,
            });
          }

          return acc;
        },
        {} as Record<string, any>,
      );

      const employeeSummariesArray = Object.values(employeeSummariesData);

      // Calculate GST function
      const calculateGST = (employee: any, totalCost: number) => {
        if (!employee) return 0;
        if (
          employee.category === "dsp" ||
          (!employee.category && employee.managerId)
        ) {
          return totalCost * 0.05; // 5% GST
        }
        return 0;
      };

      // Enhance employees with hierarchy data
      const enhancedEmployees = employeeSummariesArray.map((emp) => {
        const employee = employeeMap.get(emp.employeeName);
        const manager = employee?.managerId
          ? employees.find((e) => e.id === employee.managerId)
          : null;

        const gstAmount = calculateGST(employee, emp.totalCost);

        return {
          ...emp,
          employeeCategory: employee?.category,
          isSubordinate: !!employee?.managerId,
          managerName: manager?.name,
          managerId: employee?.managerId,
          gstAmount,
          baseCostWage: employee?.costWage || 0,
        };
      });

      // Group subordinates by managers
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

      // Calculate subordinate GST totals
      const managersWithSubordinateGST = enhancedEmployees
        .filter((emp) => !emp.isSubordinate)
        .map((manager) => {
          const subordinates =
            subordinatesByManager[manager.employeeName] || [];
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

      PerformanceMonitor.endMeasurement("process-hierarchical-summaries");
      return managersWithSubordinateGST;
    } catch (error) {
      console.error("Error processing hierarchical summaries:", error);
      PerformanceMonitor.endMeasurement("process-hierarchical-summaries");
      return [];
    }
  }, [processedData, employees]);

  // Optimized summary statistics
  const summaryStats = useMemo(() => {
    const stats = hierarchicalEmployeeSummaries.reduce(
      (acc, employee) => {
        acc.totalHours += employee.totalHours;
        acc.totalCost += employee.totalCost;
        acc.totalGst +=
          employee.gstAmount + (employee.subordinateGstTotal || 0);
        acc.totalDspEarnings += employee.totalDspEarnings;

        if (employee.subordinates) {
          employee.subordinates.forEach((sub: any) => {
            acc.totalHours += sub.totalHours;
            acc.totalCost += sub.totalCost;
            acc.totalDspEarnings += sub.totalDspEarnings;
          });
        }

        return acc;
      },
      {
        totalHours: 0,
        totalCost: 0,
        totalGst: 0,
        totalDspEarnings: 0,
      },
    );

    stats.totalCombinedCost =
      stats.totalCost + stats.totalGst + stats.totalDspEarnings;
    return stats;
  }, [hierarchicalEmployeeSummaries]);

  // Pagination
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pagination = usePagination({
    data: hierarchicalEmployeeSummaries,
    itemsPerPage,
  });

  // Optimized event handlers
  const resetFilters = useCallback(() => {
    setEmployeeFilter("");
    setJobFilter("");
    setIncludeInactive(false);
    setDateRange(getLastNDays(30));
  }, []);

  const handleDateRangeChange = useCallback((days: number) => {
    setDateRange(getLastNDays(days));
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      MemoryOptimizer.performCleanup();
    };
  }, []);

  React.useEffect(() => {
    PerformanceMonitor.endMeasurement("SummaryReports-render");
  });

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return ErrorBoundaryUtils.createSafeWrapper(
    () => (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              Summary Reports
            </h1>
            <p className="text-gray-400">
              Comprehensive payroll and cost analysis with enhanced performance
            </p>
          </div>
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Date Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date Range Selection */}
              <div className="space-y-2">
                <Label className="text-gray-300">Quick Date Ranges</Label>
                <div className="flex flex-wrap gap-2">
                  {[7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      onClick={() => handleDateRangeChange(days)}
                      variant="outline"
                      size="sm"
                      className={`${
                        JSON.stringify(dateRange) ===
                        JSON.stringify(getLastNDays(days))
                          ? "bg-blue-600 text-white"
                          : ""
                      }`}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </div>

              {/* Manual Date Inputs */}
              <div className="space-y-2">
                <Label className="text-gray-300">From Date</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-gray-100"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">To Date</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="bg-gray-800 border-gray-600 text-gray-100"
                />
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label className="text-gray-300">Employee Filter</Label>
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All employees</SelectItem>
                    {employees
                      .filter((employee) => includeInactive || employee.name)
                      .map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-inactive"
                  checked={includeInactive}
                  onCheckedChange={setIncludeInactive}
                />
                <Label htmlFor="include-inactive" className="text-gray-300">
                  Include inactive records
                </Label>
              </div>
              <Button onClick={resetFilters} variant="outline" size="sm">
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="payroll-info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="payroll-info">Payroll Information</TabsTrigger>
          </TabsList>

          {/* Payroll Information Tab */}
          <TabsContent value="payroll-info">
            <div className="space-y-6">
              {hierarchicalEmployeeSummaries.length === 0 ? (
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
                      <div className="text-2xl font-bold text-cyan-400">
                        ${summaryStats.totalDspEarnings.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-300">DSP Earnings</div>
                    </div>
                  </div>

                  {/* Employee Cards */}
                  <div className="space-y-6">
                    {pagination.currentItems.map(
                      (employee: any, index: number) => {
                        const totalGst =
                          (employee.gstAmount || 0) +
                          (employee.subordinateGstTotal || 0);

                        return (
                          <div
                            key={employee.employeeName}
                            className="space-y-4"
                          >
                            <EmployeeCard
                              employee={employee}
                              gstAmount={totalGst}
                            />

                            {/* Hour Type Breakdown */}
                            {employee.hourTypeBreakdown &&
                              Object.keys(employee.hourTypeBreakdown).length >
                                0 && (
                                <HourTypeBreakdown
                                  hourTypeBreakdown={employee.hourTypeBreakdown}
                                  employeeName={employee.employeeName}
                                  baseCostWage={employee.baseCostWage}
                                />
                              )}

                            {/* Subordinates */}
                            {employee.subordinates &&
                              employee.subordinates.length > 0 && (
                                <div className="ml-6">
                                  <div className="flex items-center gap-2 mb-4">
                                    <Users className="h-4 w-4 text-blue-400" />
                                    <h3 className="text-lg font-semibold text-gray-200">
                                      Team Members
                                    </h3>
                                    <Badge
                                      variant="secondary"
                                      className="bg-blue-900/30 text-blue-300"
                                    >
                                      {employee.subordinates.length} subordinate
                                      {employee.subordinates.length !== 1
                                        ? "s"
                                        : ""}
                                    </Badge>
                                  </div>
                                  <div className="space-y-3">
                                    {employee.subordinates.map(
                                      (subordinate: any) => (
                                        <div key={subordinate.employeeName}>
                                          <SubordinateCard
                                            subordinate={subordinate}
                                          />

                                          {/* Subordinate Hour Type Breakdown */}
                                          {subordinate.hourTypeBreakdown &&
                                            Object.keys(
                                              subordinate.hourTypeBreakdown,
                                            ).length > 0 && (
                                              <div className="mt-2 ml-6">
                                                <HourTypeBreakdown
                                                  hourTypeBreakdown={
                                                    subordinate.hourTypeBreakdown
                                                  }
                                                  employeeName={
                                                    subordinate.employeeName
                                                  }
                                                  baseCostWage={
                                                    subordinate.baseCostWage
                                                  }
                                                />
                                              </div>
                                            )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Pagination */}
                  <div className="mt-6">
                    <PaginationControls pagination={pagination} />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    ),
    <div className="p-6">
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-100 mb-2">
          Summary Reports Error
        </h3>
        <p className="text-gray-400 mb-4">
          An error occurred while loading the summary reports. Please try
          refreshing the page.
        </p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Refresh Page
        </Button>
      </div>
    </div>,
    "SummaryReports component failed to render",
  );
}
