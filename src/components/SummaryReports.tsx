import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Users,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  RotateCcw,
  Truck,
  Receipt,
  Printer,
  TrendingUp,
  Activity,
  Target,
  BarChart3,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { parseLocalDate, formatLocalDate } from "@/utils/dateUtils";

interface HourTypeBreakdown {
  [hourTypeName: string]: {
    hours: number;
    effectiveHours: number;
    cost: number;
    provinces: {
      [provinceName: string]: {
        hours: number;
        effectiveHours: number;
        cost: number;
      };
    };
  };
}

interface EnhancedSummary {
  title?: string;
  jobNumber?: string;
  jobName?: string;
  date?: string;
  employeeName?: string;
  totalHours: number;
  totalEffectiveHours: number;
  totalCost: number;
  totalLoaCount: number;
  hourTypeBreakdown: HourTypeBreakdown;
}

// Optimized DSP calculation helper
const calculateDspEarnings = (employeeRentals: any[], rentalItems: any[]) => {
  return employeeRentals.reduce((sum, rental) => {
    const rentalItem = rentalItems.find(
      (item) => item.name === rental.rentalItemName,
    );
    const dspRate =
      rentalItem?.dspRate || (rentalItem as any)?.paidOutDailyRate || 0;
    return sum + dspRate * rental.duration * rental.quantity;
  }, 0);
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
    rentalItems,
    summaryByTitleAndJob,
    summaryByDateAndName,
  } = useTimeTracking();

  // Initialize with last 30 days
  const getInitialDateFilter = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      start: thirtyDaysAgo.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  };

  const [dateFilter, setDateFilter] = useState(getInitialDateFilter);
  const [employeeFilter, setEmployeeFilter] = useState("all-employees");
  const [jobFilter, setJobFilter] = useState("all-jobs");
  const [provinceFilter, setProvinceFilter] = useState("all-provinces");
  const [includeInvoiced, setIncludeInvoiced] = useState(false);
  const [showEmptyResults, setShowEmptyResults] = useState(true);

  // Optimized filtering with memoization
  const { filteredSummaries, filteredRentalSummaries } = useMemo(() => {
    const filteredSummaries = timeEntrySummaries.filter((summary) => {
      const summaryDate = parseLocalDate(summary.date);
      const startDate = parseLocalDate(dateFilter.start);
      const endDate = parseLocalDate(dateFilter.end);

      const withinDateRange =
        summaryDate >= startDate && summaryDate <= endDate;

      const matchesEmployee =
        employeeFilter === "all-employees" ||
        summary.employeeName === employeeFilter;

      const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
      const matchesJob =
        jobFilter === "all-jobs" || summary.jobNumber === jobFilter;

      const matchesProvince =
        provinceFilter === "all-provinces" ||
        summary.provinceName === provinceFilter;

      const matchesInvoiced =
        includeInvoiced || !job?.invoicedDates?.includes(summary.date);

      return (
        withinDateRange &&
        matchesEmployee &&
        matchesJob &&
        matchesProvince &&
        matchesInvoiced
      );
    });

    const filteredRentalSummaries = rentalSummaries.filter((rental) => {
      const rentalDate = parseLocalDate(rental.startDate);
      const startDate = parseLocalDate(dateFilter.start);
      const endDate = parseLocalDate(dateFilter.end);

      const withinDateRange = rentalDate >= startDate && rentalDate <= endDate;

      const matchesEmployee =
        employeeFilter === "all-employees" ||
        rental.employeeName === employeeFilter;

      const matchesJob =
        jobFilter === "all-jobs" || rental.jobNumber === jobFilter;

      return withinDateRange && matchesEmployee && matchesJob;
    });

    return { filteredSummaries, filteredRentalSummaries };
  }, [
    timeEntrySummaries,
    rentalSummaries,
    dateFilter,
    employeeFilter,
    jobFilter,
    provinceFilter,
    includeInvoiced,
    jobs,
  ]);

  // Optimized aggregated calculations with single pass
  const totals = useMemo(() => {
    const laborTotals = filteredSummaries.reduce(
      (acc, summary) => ({
        hours: acc.hours + (summary.hours || 0),
        effectiveHours: acc.effectiveHours + (summary.effectiveHours || 0),
        cost: acc.cost + (summary.totalCost || 0),
        loaCount: acc.loaCount + (summary.loaCount || 0),
      }),
      { hours: 0, effectiveHours: 0, cost: 0, loaCount: 0 },
    );

    const rentalRevenue = filteredRentalSummaries.reduce(
      (sum, rental) => sum + (rental.totalCost || 0),
      0,
    );

    return {
      ...laborTotals,
      rentalRevenue,
      totalCost: laborTotals.cost + rentalRevenue,
    };
  }, [filteredSummaries, filteredRentalSummaries]);

  // Optimized employee summaries with single pass grouping
  const employeeSummariesData = useMemo(() => {
    const employeeGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.employeeName}|${summary.employeeTitle}`;
        if (!acc[key]) {
          acc[key] = {
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            totalBillableAmount: 0,
            entryCount: 0,
            hourTypeBreakdown: {},
            dateRange: {
              earliest: summary.date,
              latest: summary.date,
            },
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.totalBillableAmount += summary.totalBillableAmount || 0;
        group.entryCount += 1;

        // Update date range
        if (summary.date < group.dateRange.earliest) {
          group.dateRange.earliest = summary.date;
        }
        if (summary.date > group.dateRange.latest) {
          group.dateRange.latest = summary.date;
        }

        // Build hour type breakdown from individual summary data
        const hourTypeName = summary.hourTypeName || "Unknown";
        const provinceName = summary.provinceName || "Unknown";

        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
            provinces: {},
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

        // Add province breakdown
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

    return Object.values(employeeGroups).sort(
      (a, b) => b.totalHours - a.totalHours,
    );
  }, [filteredSummaries]);

  // Optimized title & job summaries
  const titleJobSummaries = useMemo(() => {
    const titleJobGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.employeeTitle}|${summary.jobNumber}`;
        if (!acc[key]) {
          acc[key] = {
            employeeTitle: summary.employeeTitle,
            jobNumber: summary.jobNumber,
            jobName: summary.jobName,
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
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

        // Add province breakdown
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

    return Object.values(titleJobGroups).sort((a, b) =>
      a.employeeTitle.localeCompare(b.employeeTitle),
    );
  }, [filteredSummaries]);

  // Optimized date & name summaries
  const dateNameSummaries = useMemo(() => {
    // Pre-group filteredSummaries by date-employee key for O(1) lookup
    const summariesByDateEmployee = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.date}-${summary.employeeName}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(summary);
        return acc;
      },
      {} as Record<string, typeof filteredSummaries>,
    );

    const filteredDateNameSummaries = Object.keys(summariesByDateEmployee).map(
      (key) => {
        const [date, employeeName] = key.split("-", 2);
        const summariesForDateEmployee = summariesByDateEmployee[key];

        // Calculate totals for this date-employee combination
        const totalHours = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.hours || 0),
          0,
        );
        const totalEffectiveHours = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.effectiveHours || 0),
          0,
        );
        const totalCost = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.totalCost || 0),
          0,
        );
        const totalLoaCount = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.loaCount || 0),
          0,
        );

        // Build hour type breakdown from individual summary data
        const hourTypeBreakdown: HourTypeBreakdown = {};
        summariesForDateEmployee.forEach((summary) => {
          const hourTypeName = summary.hourTypeName || "Unknown";
          const provinceName = summary.provinceName || "Unknown";

          if (!hourTypeBreakdown[hourTypeName]) {
            hourTypeBreakdown[hourTypeName] = {
              hours: 0,
              effectiveHours: 0,
              cost: 0,
              provinces: {},
            };
          }

          hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
          hourTypeBreakdown[hourTypeName].effectiveHours +=
            summary.effectiveHours || 0;
          hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

          // Add province breakdown
          if (!hourTypeBreakdown[hourTypeName].provinces[provinceName]) {
            hourTypeBreakdown[hourTypeName].provinces[provinceName] = {
              hours: 0,
              effectiveHours: 0,
              cost: 0,
            };
          }

          hourTypeBreakdown[hourTypeName].provinces[provinceName].hours +=
            summary.hours || 0;
          hourTypeBreakdown[hourTypeName].provinces[
            provinceName
          ].effectiveHours += summary.effectiveHours || 0;
          hourTypeBreakdown[hourTypeName].provinces[provinceName].cost +=
            summary.totalCost || 0;
        });

        return {
          date,
          employeeName,
          totalHours,
          totalEffectiveHours,
          totalCost,
          totalLoaCount,
          entries: summariesForDateEmployee,
          hourTypeBreakdown,
        };
      },
    );

    // Sort by date (newest first), then by employee name
    return filteredDateNameSummaries.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0
        ? dateCompare
        : a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredSummaries]);

  // Use the pre-calculated summaries
  const filteredTitleJobSummaries = titleJobSummaries;
  const filteredDateNameSummaries = dateNameSummaries;

  // Optimized hierarchical employee processing with proper grouping
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

    // First, enhance all employees with hierarchy data
    const enhancedEmployees = employeeSummariesData.map((emp) => {
      const employee = employeeMap.get(emp.employeeName);
      const manager = employee?.managerId
        ? employees.find((e) => e.id === employee.managerId)
        : null;

      return {
        ...emp,
        employeeCategory: employee?.category,
        isSubordinate: !!employee?.managerId,
        managerName: manager?.name,
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
        {} as Record<string, typeof enhancedEmployees>,
      );

    // Sort subordinates within each group by total hours
    Object.keys(subordinatesByManager).forEach((managerName) => {
      subordinatesByManager[managerName].sort(
        (a, b) => b.totalHours - a.totalHours,
      );
    });

    // Get all managers (employees without managerId) and sort by total hours
    const managers = enhancedEmployees
      .filter((emp) => !emp.isSubordinate)
      .sort((a, b) => b.totalHours - a.totalHours);

    // Build final hierarchical list: manager followed by their subordinates
    const hierarchicalList: typeof enhancedEmployees = [];

    managers.forEach((manager) => {
      // Add the manager
      hierarchicalList.push(manager);

      // Add their subordinates immediately after
      const subordinates = subordinatesByManager[manager.employeeName] || [];
      hierarchicalList.push(...subordinates);
    });

    // Add any orphaned subordinates (whose managers aren't in the current data)
    const managersInData = new Set(managers.map((m) => m.employeeName));
    const orphanedSubordinates = enhancedEmployees
      .filter(
        (emp) =>
          emp.isSubordinate && !managersInData.has(emp.managerName || ""),
      )
      .sort((a, b) => b.totalHours - a.totalHours);

    hierarchicalList.push(...orphanedSubordinates);

    return hierarchicalList;
  }, [employeeSummariesData, employees]);

  // Optimized DSP calculations with memoization
  const dspCalculations = useMemo(() => {
    const rentalItemMap = new Map(rentalItems.map((item) => [item.name, item]));

    return hierarchicalEmployeeSummaries.map((employee) => {
      const employeeRentals = filteredRentalSummaries.filter(
        (rental) => rental.employeeName === employee.employeeName,
      );

      const dspEarnings = employeeRentals.reduce((sum, rental) => {
        const rentalItem = rentalItemMap.get(rental.rentalItemName);
        const dspRate =
          rentalItem?.dspRate || (rentalItem as any)?.paidOutDailyRate || 0;
        return sum + dspRate * rental.duration * rental.quantity;
      }, 0);

      return {
        employeeName: employee.employeeName,
        rentals: employeeRentals,
        dspEarnings,
      };
    });
  }, [hierarchicalEmployeeSummaries, filteredRentalSummaries, rentalItems]);

  // Optimized total DSP calculation
  const totalDspEarnings = useMemo(() => {
    return dspCalculations.reduce((sum, calc) => sum + calc.dspEarnings, 0);
  }, [dspCalculations]);

  // Memoized Hour Type Breakdown Display Component
  const HourTypeBreakdownDisplay = ({ breakdown }: { breakdown: any }) => {
    if (!breakdown || Object.keys(breakdown).length === 0) {
      return <span className="text-gray-500 text-sm italic">No breakdown</span>;
    }

    const sortedEntries = Object.entries(breakdown)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.hours - a.hours)
      .slice(0, 3); // Show top 3

    return (
      <div className="space-y-2">
        {sortedEntries.map(([hourType, data]: [string, any]) => (
          <div
            key={hourType}
            className="flex items-center justify-between text-xs bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-700/50"
          >
            <span className="font-semibold text-gray-200">{hourType}:</span>
            <div className="flex items-center gap-2">
              <div className="bg-orange-600 text-white px-2 py-1 rounded-md text-xs font-bold shadow-sm">
                {(data.hours || 0).toFixed(1)}h
              </div>
              {data.effectiveHours !== data.hours && (
                <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-medium shadow-sm">
                  ({(data.effectiveHours || 0).toFixed(1)}h eff)
                </div>
              )}
            </div>
          </div>
        ))}

        {Object.keys(breakdown).length > 3 && (
          <div className="text-xs text-gray-500 italic text-center py-1">
            +{Object.keys(breakdown).length - 3} more types...
          </div>
        )}

        {/* Province breakdown if available */}
        {sortedEntries.some(
          ([, data]) =>
            data.provinces && Object.keys(data.provinces).length > 0,
        ) && (
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="text-xs font-semibold text-blue-400 mb-2">
              By Province:
            </div>
            {sortedEntries.slice(0, 1).map(
              ([hourType, data]: [string, any]) =>
                data.provinces && (
                  <div
                    key={`province-breakdown-${hourType}`}
                    className="space-y-1"
                  >
                    {Object.entries(data.provinces).map(
                      ([province, provinceData]: [string, any]) => (
                        <div
                          key={`${hourType}-${province}`}
                          className="flex items-center justify-between text-xs bg-gray-800/30 px-2 py-1 rounded-md"
                        >
                          <span className="text-gray-400 font-medium">
                            {province}:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs font-medium">
                              {(provinceData.hours || 0).toFixed(1)}h
                            </span>
                            {provinceData.effectiveHours !==
                              provinceData.hours && (
                              <span className="bg-gray-600 text-gray-200 px-2 py-0.5 rounded text-xs">
                                ({(provinceData.effectiveHours || 0).toFixed(1)}
                                h eff)
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ),
            )}
          </div>
        )}
      </div>
    );
  };

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("all-employees");
    setJobFilter("all-jobs");
    setProvinceFilter("all-provinces");
    setIncludeInvoiced(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Total Hours
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {totals.hours.toFixed(1)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-blue-400" />
              {totals.effectiveHours.toFixed(1)} effective hours
            </p>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Labor Cost
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              ${totals.cost.toFixed(0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <Activity className="h-3 w-3 mr-1 text-green-400" />
              LOA Count: {totals.loaCount}
            </p>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Rental Revenue
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
              <Truck className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ${totals.rentalRevenue.toFixed(0)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <Target className="h-3 w-3 mr-1 text-purple-400" />
              DSP: ${totalDspEarnings.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Total Cost
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-lg group-hover:shadow-orange-500/25 transition-all duration-300">
              <Receipt className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">
              ${totals.totalCost.toFixed(0)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {filteredSummaries.length} entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="modern-card no-print">
        <CardHeader
          className="border-b border-gray-700/50"
          style={{
            background:
              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
          }}
        >
          <CardTitle className="flex items-center gap-3 text-xl text-gray-100">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            Advanced Filters
          </CardTitle>
          <CardDescription className="text-gray-300">
            Fine-tune your data analysis with precision filters and real-time
            results.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-200">
                Start Date
              </Label>
              <Input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
                className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-orange-400 focus:ring-orange-400/30 smooth-transition"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-200">
                End Date
              </Label>
              <Input
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
                className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-orange-400 focus:ring-orange-400/30 smooth-transition"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-200">
                Employee
              </Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-orange-400">
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
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-200">Job</Label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-orange-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem
                    value="all-jobs"
                    className="text-gray-100 focus:bg-orange-500/20"
                  >
                    All Jobs
                  </SelectItem>
                  {jobs.map((job) => (
                    <SelectItem
                      key={job.id}
                      value={job.jobNumber}
                      className="text-gray-100 focus:bg-orange-500/20"
                    >
                      {job.jobNumber} - {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-gray-200">
                Province
              </Label>
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger className="bg-gray-800/50 border-gray-600 text-gray-100 focus:border-orange-400">
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
                      value={province.code}
                      className="text-gray-100 focus:bg-orange-500/20"
                    >
                      {province.name} ({province.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                id="include-invoiced"
                checked={includeInvoiced}
                onCheckedChange={setIncludeInvoiced}
                className="data-[state=checked]:bg-orange-500"
              />
              <Label
                htmlFor="include-invoiced"
                className="text-sm font-medium text-gray-200"
              >
                Include Invoiced
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                id="show-empty"
                checked={showEmptyResults}
                onCheckedChange={setShowEmptyResults}
                className="data-[state=checked]:bg-orange-500"
              />
              <Label
                htmlFor="show-empty"
                className="text-sm font-medium text-gray-200"
              >
                Show Empty Results
              </Label>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={resetFilters}
                className="bg-gray-800/50 border-gray-600 text-gray-100 hover:bg-orange-500/20 hover:border-orange-400 smooth-transition"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                className="bg-gray-800/50 border-gray-600 text-gray-100 hover:bg-orange-500/20 hover:border-orange-400 smooth-transition"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Summary Views */}
      <div className="modern-card rounded-2xl overflow-hidden">
        <Tabs defaultValue="employees" className="space-y-6 p-6">
          <TabsList
            className="grid w-full grid-cols-5 no-print rounded-xl p-1 bg-gray-800/50"
            style={{
              background:
                "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
              border: "1px solid hsl(24, 100%, 50%, 0.1)",
            }}
          >
            <TabsTrigger
              value="employees"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger
              value="title-job"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Title & Job
            </TabsTrigger>
            <TabsTrigger
              value="date-name"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Date & Name
            </TabsTrigger>
            <TabsTrigger
              value="rentals"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <Truck className="h-4 w-4 mr-2" />
              Rentals
            </TabsTrigger>
            <TabsTrigger
              value="entries"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <FileText className="h-4 w-4 mr-2" />
              Entries
            </TabsTrigger>
          </TabsList>

          {/* Employee Summary Tab */}
          <TabsContent value="employees">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-orange-400" />
                  Employee Performance Dashboard
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Comprehensive analysis of employee hours, costs, and rental
                  DSP earnings with hierarchical relationships.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {hierarchicalEmployeeSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No employee data found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50 hover:bg-orange-500/5"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Employee Name
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Title
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hour Type Breakdown
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Effective Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            LOA Count
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Revenue
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Rental DSP
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Date Range
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Entries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hierarchicalEmployeeSummaries.map(
                          (employee, index) => {
                            const dspCalc = dspCalculations.find(
                              (calc) =>
                                calc.employeeName === employee.employeeName,
                            );

                            return (
                              <TableRow
                                key={`${employee.employeeName}|${employee.employeeTitle}|${index}`}
                                className={`
                                border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition
                                ${employee.isSubordinate ? "bg-blue-900/10" : ""}
                              `}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    {employee.isSubordinate ? (
                                      <div className="flex items-center gap-3 ml-6">
                                        <div className="w-4 h-4 border-l-2 border-b-2 border-blue-400"></div>
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg">
                                          ↳
                                        </span>
                                        <span className="text-blue-300 font-semibold">
                                          {employee.employeeName}
                                        </span>
                                        <span className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-500/30">
                                          Employee of {employee.managerName}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3">
                                        <span
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                                            index < 3
                                              ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                              : "bg-gradient-to-br from-gray-500 to-gray-700 text-white"
                                          }`}
                                        >
                                          {index + 1}
                                        </span>
                                        <span className="font-bold text-gray-100">
                                          {employee.employeeName}
                                        </span>
                                        {employee.employeeCategory === "dsp" ? (
                                          <span className="text-xs text-purple-200 bg-gradient-to-r from-purple-600 to-purple-700 px-3 py-1 rounded-full border border-purple-400/30 shadow-md">
                                            DSP
                                          </span>
                                        ) : employee.employeeCategory ===
                                          "employee" ? (
                                          <span className="text-xs text-gray-200 bg-gradient-to-r from-gray-600 to-gray-700 px-3 py-1 rounded-full shadow-md">
                                            Employee
                                          </span>
                                        ) : (
                                          <span className="text-xs text-green-200 bg-gradient-to-r from-green-600 to-green-700 px-3 py-1 rounded-full border border-green-400/30 shadow-md">
                                            Independent
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-200">
                                  {employee.employeeTitle}
                                </TableCell>
                                <TableCell>
                                  <HourTypeBreakdownDisplay
                                    breakdown={employee.hourTypeBreakdown}
                                  />
                                </TableCell>
                                <TableCell className="font-bold text-blue-400">
                                  {employee.totalHours.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-gray-200">
                                  {employee.totalEffectiveHours.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-purple-400 font-semibold">
                                  {employee.totalLoaCount}
                                </TableCell>
                                <TableCell className="text-green-400 font-bold">
                                  ${employee.totalCost.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {dspCalc && dspCalc.rentals.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="text-xs font-bold text-purple-300 bg-purple-900/30 px-2 py-1 rounded-md">
                                        DSP Earnings: $
                                        {dspCalc.dspEarnings.toFixed(2)}
                                      </div>
                                      <div className="space-y-1">
                                        {dspCalc.rentals.map(
                                          (rental, rentalIndex) => {
                                            const rentalItem = rentalItems.find(
                                              (item) =>
                                                item.name ===
                                                rental.rentalItemName,
                                            );
                                            const dspRate =
                                              rentalItem?.dspRate ||
                                              (rentalItem as any)
                                                ?.paidOutDailyRate;

                                            return (
                                              <div
                                                key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${rentalIndex}`}
                                                className="text-xs bg-gradient-to-r from-purple-800/30 to-purple-900/30 px-2 py-1 rounded-md border border-purple-500/20"
                                              >
                                                <div className="font-semibold text-purple-200">
                                                  {rental.rentalItemName}
                                                </div>
                                                <div className="text-purple-300">
                                                  {dspRate
                                                    ? `$${dspRate.toFixed(2)}/day`
                                                    : "No DSP rate"}
                                                  {rental.duration > 1 &&
                                                    ` × ${rental.duration} days`}
                                                  {rental.quantity > 1 &&
                                                    ` × ${rental.quantity} units`}
                                                  <div className="text-xs text-gray-400">
                                                    ({rental.startDate})
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm italic">
                                      No rentals
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-gray-300">
                                  {employee.dateRange.earliest} to{" "}
                                  {employee.dateRange.latest}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-800/50 border-gray-600 text-gray-200"
                                  >
                                    {employee.entryCount}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        <TableRow
                          key="employee-summary-total"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                          }}
                          className="border-t-2 border-orange-500/50 font-bold"
                        >
                          <TableCell
                            colSpan={3}
                            className="text-orange-200 font-bold text-lg"
                          >
                            Total
                          </TableCell>
                          <TableCell className="text-blue-400 font-bold text-lg">
                            {hierarchicalEmployeeSummaries
                              .reduce(
                                (sum, emp) => sum + (emp.totalHours || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-gray-200 font-bold">
                            {hierarchicalEmployeeSummaries
                              .reduce(
                                (sum, emp) =>
                                  sum + (emp.totalEffectiveHours || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-purple-400">
                            {hierarchicalEmployeeSummaries.reduce(
                              (sum, emp) => sum + (emp.totalLoaCount || 0),
                              0,
                            )}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-lg">
                            $
                            {hierarchicalEmployeeSummaries
                              .reduce(
                                (sum, emp) => sum + (emp.totalCost || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-purple-400 font-bold text-lg">
                            ${totalDspEarnings.toFixed(2)}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-orange-200 font-bold">
                            {hierarchicalEmployeeSummaries.reduce(
                              (sum, emp) => sum + emp.entryCount,
                              0,
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Similar structure for other tabs with refined styling */}
          <TabsContent value="title-job">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <Briefcase className="h-6 w-6 text-blue-400" />
                  Title & Job Analysis
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Detailed breakdown of hours and costs organized by employee
                  title and job assignments.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredTitleJobSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No title & job data found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Title
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Job
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hour Type Breakdown
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Effective Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            LOA Count
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Cost
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Entries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTitleJobSummaries.map((summary, index) => (
                          <TableRow
                            key={`${summary.employeeTitle}|${summary.jobNumber}|${index}`}
                            className="border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition"
                          >
                            <TableCell className="font-bold text-gray-100">
                              {summary.employeeTitle}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-blue-400">
                                  {summary.jobNumber}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {summary.jobName}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <HourTypeBreakdownDisplay
                                breakdown={summary.hourTypeBreakdown}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-blue-400">
                              {summary.totalHours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.totalEffectiveHours.toFixed(2)}
                            </TableCell>
                            <TableCell className="font-semibold text-purple-400">
                              {summary.totalLoaCount}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold">
                              ${summary.totalCost.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-gray-800/50 border-gray-600 text-gray-200"
                              >
                                {summary.entries.length}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          key="title-job-summary-total"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                          }}
                          className="border-t-2 border-orange-500/50 font-bold"
                        >
                          <TableCell
                            colSpan={4}
                            className="text-orange-200 font-bold text-lg"
                          >
                            Total
                          </TableCell>
                          <TableCell className="text-blue-400 font-bold text-lg">
                            {filteredTitleJobSummaries
                              .reduce((sum, s) => sum + (s.totalHours || 0), 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-gray-200 font-bold">
                            {filteredTitleJobSummaries
                              .reduce(
                                (sum, s) => sum + (s.totalEffectiveHours || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-lg">
                            $
                            {filteredTitleJobSummaries
                              .reduce((sum, s) => sum + (s.totalCost || 0), 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-orange-200 font-bold">
                            {filteredTitleJobSummaries.reduce(
                              (sum, s) => sum + s.entries.length,
                              0,
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Date & Name Summary Tab */}
          <TabsContent value="date-name">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <Calendar className="h-6 w-6 text-green-400" />
                  Date & Name Timeline
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Chronological analysis of hours and costs organized by date
                  and employee name.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredDateNameSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No date & name data found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Date
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Employee
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hour Type Breakdown
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Effective Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            LOA Count
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Cost
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Entries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDateNameSummaries.map((summary, index) => (
                          <TableRow
                            key={`${summary.date}|${summary.employeeName}|${index}`}
                            className="border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition"
                          >
                            <TableCell className="font-bold text-green-400">
                              {formatLocalDate(summary.date)}
                            </TableCell>
                            <TableCell className="text-gray-100 font-semibold">
                              {summary.employeeName}
                            </TableCell>
                            <TableCell>
                              <HourTypeBreakdownDisplay
                                breakdown={summary.hourTypeBreakdown}
                              />
                            </TableCell>
                            <TableCell className="font-bold text-blue-400">
                              {summary.totalHours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.totalEffectiveHours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-purple-400 font-semibold">
                              {summary.totalLoaCount}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold">
                              ${summary.totalCost.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="bg-gray-800/50 border-gray-600 text-gray-200"
                              >
                                {summary.entries.length}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          key="date-name-summary-total"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                          }}
                          className="border-t-2 border-orange-500/50 font-bold"
                        >
                          <TableCell
                            colSpan={3}
                            className="text-orange-200 font-bold text-lg"
                          >
                            Total
                          </TableCell>
                          <TableCell className="text-blue-400 font-bold text-lg">
                            {filteredDateNameSummaries
                              .reduce((sum, s) => sum + (s.totalHours || 0), 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-gray-200 font-bold">
                            {filteredDateNameSummaries
                              .reduce(
                                (sum, s) => sum + (s.totalEffectiveHours || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-purple-400 font-semibold">
                            {filteredDateNameSummaries.reduce(
                              (sum, s) => sum + (s.totalLoaCount || 0),
                              0,
                            )}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-lg">
                            $
                            {filteredDateNameSummaries
                              .reduce((sum, s) => sum + (s.totalCost || 0), 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-orange-200 font-bold">
                            {filteredDateNameSummaries.reduce(
                              (sum, s) => sum + s.entries.length,
                              0,
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rentals Tab */}
          <TabsContent value="rentals">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <Truck className="h-6 w-6 text-purple-400" />
                  Rental Equipment Dashboard
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Comprehensive overview of rental items with costs, duration,
                  and utilization metrics.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRentalSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No rental data found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Item
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Category
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Job
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Employee
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Duration
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Rate
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Cost
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRentalSummaries.map((rental, index) => (
                          <TableRow
                            key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${index}`}
                            className="border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition"
                          >
                            <TableCell className="font-bold text-gray-100">
                              {rental.rentalItemName}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {rental.category}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold text-blue-400">
                                  {rental.jobNumber}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {rental.jobName}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {rental.employeeName || (
                                <span className="text-gray-500 italic">
                                  Unassigned
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {rental.duration}{" "}
                              {rental.duration === 1 ? "day" : "days"}
                              {rental.quantity > 1 && ` × ${rental.quantity}`}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              ${rental.rateUsed.toFixed(2)}/day
                            </TableCell>
                            <TableCell className="font-bold text-green-400">
                              ${rental.totalCost.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow
                          key="rental-summary-total"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                          }}
                          className="border-t-2 border-orange-500/50 font-bold"
                        >
                          <TableCell
                            colSpan={6}
                            className="text-orange-200 font-bold text-lg"
                          >
                            Total Rental Revenue
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-lg">
                            ${totals.rentalRevenue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Individual Entries Tab */}
          <TabsContent value="entries">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-yellow-400" />
                  Individual Time Entries
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Granular view of all individual time entries with detailed
                  breakdown and analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {filteredSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No time entries found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Date
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Employee
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Job
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hour Type
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Province
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Effective Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Cost
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSummaries.map((summary, index) => (
                          <TableRow
                            key={`${summary.employeeName}-${summary.date}-${summary.hourTypeName}-${index}`}
                            className="border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition"
                          >
                            <TableCell className="text-yellow-400 font-semibold">
                              {summary.date}
                            </TableCell>
                            <TableCell className="text-gray-100">
                              {summary.employeeName}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.jobNumber} - {summary.jobName}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.hourTypeName}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.provinceName}
                            </TableCell>
                            <TableCell className="font-bold text-blue-400">
                              {summary.hours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-gray-200">
                              {summary.effectiveHours.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-green-400 font-bold">
                              ${summary.totalCost.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
