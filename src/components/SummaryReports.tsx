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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

// Helper function to parse date string as local date (fixes timezone issues)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

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

  // Optimized hierarchical employee processing
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

    return employeeSummariesData
      .map((emp) => {
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
      })
      .sort((a, b) => {
        // Sort by manager first, then subordinates
        if (a.isSubordinate && !b.isSubordinate) return 1;
        if (!a.isSubordinate && b.isSubordinate) return -1;
        if (a.isSubordinate && b.isSubordinate) {
          const managerCompare = (a.managerName || "").localeCompare(
            b.managerName || "",
          );
          if (managerCompare !== 0) return managerCompare;
        }
        return b.totalHours - a.totalHours;
      });
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
      return <span className="text-gray-400 text-sm">No breakdown</span>;
    }

    const sortedEntries = Object.entries(breakdown)
      .sort(([, a]: [string, any], [, b]: [string, any]) => b.hours - a.hours)
      .slice(0, 3); // Show top 3

    return (
      <div className="space-y-1">
        {sortedEntries.map(([hourType, data]: [string, any]) => (
          <div
            key={hourType}
            className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded"
          >
            <span className="font-medium text-gray-700">{hourType}:</span>
            <div className="flex items-center gap-2">
              <div className="text-blue-600">
                {(data.hours || 0).toFixed(1)}h
              </div>
              {data.effectiveHours !== data.hours && (
                <div className="text-orange-600">
                  ({(data.effectiveHours || 0).toFixed(1)}h effective)
                </div>
              )}
            </div>
          </div>
        ))}

        {Object.keys(breakdown).length > 3 && (
          <div className="text-xs text-gray-500 italic">
            +{Object.keys(breakdown).length - 3} more types...
          </div>
        )}

        {/* Province breakdown if available */}
        {sortedEntries.some(
          ([, data]) =>
            data.provinces && Object.keys(data.provinces).length > 0,
        ) && (
          <div className="mt-2 pt-1 border-t border-gray-200">
            <div className="text-xs font-medium text-gray-600 mb-1">
              By Province:
            </div>
            {sortedEntries.slice(0, 1).map(
              ([hourType, data]: [string, any]) =>
                data.provinces && (
                  <div key={`province-breakdown-${hourType}`}>
                    {Object.entries(data.provinces).map(
                      ([province, provinceData]: [string, any]) => (
                        <div
                          key={`${hourType}-${province}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-600">{province}:</span>
                          <div className="flex items-center gap-1">
                            <span className="text-blue-600">
                              {(provinceData.hours || 0).toFixed(1)}h
                            </span>
                            {provinceData.effectiveHours !==
                              provinceData.hours && (
                              <span className="text-orange-600">
                                ({(provinceData.effectiveHours || 0).toFixed(1)}
                                h eff.)
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
    <div className="space-y-6 print-container">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.hours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {totals.effectiveHours.toFixed(1)} effective hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totals.cost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              LOA Count: {totals.loaCount}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rental Revenue
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.rentalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              DSP: ${totalDspEarnings.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totals.totalCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredSummaries.length} entries
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter the summary reports by date range, employee, job, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-employees">All Employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job</Label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-jobs">All Jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.id} value={job.jobNumber}>
                      {job.jobNumber} - {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Province</Label>
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-provinces">All Provinces</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province.id} value={province.code}>
                      {province.name} ({province.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-invoiced"
                checked={includeInvoiced}
                onCheckedChange={setIncludeInvoiced}
              />
              <Label htmlFor="include-invoiced">Include Invoiced</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-empty"
                checked={showEmptyResults}
                onCheckedChange={setShowEmptyResults}
              />
              <Label htmlFor="show-empty">Show Empty Results</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Summary Views */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 no-print">
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="title-job">
            <Briefcase className="h-4 w-4 mr-2" />
            Title & Job
          </TabsTrigger>
          <TabsTrigger value="date-name">
            <Calendar className="h-4 w-4 mr-2" />
            Date & Name
          </TabsTrigger>
          <TabsTrigger value="rentals">
            <Truck className="h-4 w-4 mr-2" />
            Rentals
          </TabsTrigger>
          <TabsTrigger value="entries">
            <FileText className="h-4 w-4 mr-2" />
            Entries
          </TabsTrigger>
        </TabsList>

        {/* Employee Summary Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Summary</CardTitle>
              <CardDescription>
                Summary of hours and costs by employee with hierarchical
                relationships and rental DSP information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hierarchicalEmployeeSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No employee data found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Hour Type Breakdown</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>LOA Count</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Rental DSP</TableHead>
                      <TableHead>Date Range</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hierarchicalEmployeeSummaries.map((employee, index) => {
                      const dspCalc = dspCalculations.find(
                        (calc) => calc.employeeName === employee.employeeName,
                      );

                      return (
                        <TableRow
                          key={`${employee.employeeName}|${employee.employeeTitle}|${index}`}
                          className={employee.isSubordinate ? "bg-blue-25" : ""}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {employee.isSubordinate ? (
                                // Subordinate employee - indented with different styling
                                <div className="flex items-center gap-2 ml-4">
                                  <div className="w-4 h-4 border-l-2 border-b-2 border-gray-300"></div>
                                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                    ↳
                                  </span>
                                  <span className="text-blue-700">
                                    {employee.employeeName}
                                  </span>
                                  <span className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                                    Employee of {employee.managerName}
                                  </span>
                                </div>
                              ) : (
                                // Independent employee or manager
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      index < 3
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {index + 1}
                                  </span>
                                  <span className="font-semibold">
                                    {employee.employeeName}
                                  </span>
                                  {employee.employeeCategory === "dsp" ? (
                                    <span className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200">
                                      DSP
                                    </span>
                                  ) : employee.employeeCategory ===
                                    "employee" ? (
                                    <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">
                                      Employee
                                    </span>
                                  ) : (
                                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                      Independent
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{employee.employeeTitle}</TableCell>
                          <TableCell>
                            <HourTypeBreakdownDisplay
                              breakdown={employee.hourTypeBreakdown}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {employee.totalHours.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {employee.totalEffectiveHours.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-purple-600">
                            {employee.totalLoaCount}
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            ${employee.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {dspCalc && dspCalc.rentals.length > 0 ? (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-purple-600">
                                  DSP Earnings: $
                                  {dspCalc.dspEarnings.toFixed(2)}
                                </div>
                                <div className="space-y-1">
                                  {dspCalc.rentals.map(
                                    (rental, rentalIndex) => {
                                      const rentalItem = rentalItems.find(
                                        (item) =>
                                          item.name === rental.rentalItemName,
                                      );
                                      const dspRate =
                                        rentalItem?.dspRate ||
                                        (rentalItem as any)?.paidOutDailyRate;

                                      return (
                                        <div
                                          key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${rentalIndex}`}
                                          className="text-xs bg-purple-50 px-2 py-1 rounded"
                                        >
                                          <div className="font-medium text-purple-700">
                                            {rental.rentalItemName}
                                          </div>
                                          <div className="text-purple-600">
                                            {dspRate
                                              ? `$${dspRate.toFixed(2)}/day`
                                              : "No DSP rate"}
                                            {rental.duration > 1 &&
                                              ` × ${rental.duration} days`}
                                            {rental.quantity > 1 &&
                                              ` × ${rental.quantity} units`}
                                            <div className="text-xs text-gray-500">
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
                              <span className="text-gray-400 text-sm">
                                No rentals
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {employee.dateRange.earliest} to{" "}
                            {employee.dateRange.latest}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.entryCount}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow
                      key="employee-summary-total"
                      className="bg-gray-50 font-bold"
                    >
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell>
                        {hierarchicalEmployeeSummaries
                          .reduce((sum, emp) => sum + (emp.totalHours || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {hierarchicalEmployeeSummaries
                          .reduce(
                            (sum, emp) => sum + (emp.totalEffectiveHours || 0),
                            0,
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-purple-600">
                        {hierarchicalEmployeeSummaries.reduce(
                          (sum, emp) => sum + (emp.totalLoaCount || 0),
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {hierarchicalEmployeeSummaries
                          .reduce((sum, emp) => sum + (emp.totalCost || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-purple-600 font-medium">
                        ${totalDspEarnings.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        {hierarchicalEmployeeSummaries.reduce(
                          (sum, emp) => sum + emp.entryCount,
                          0,
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Title & Job Summary Tab */}
        <TabsContent value="title-job">
          <Card>
            <CardHeader>
              <CardTitle>Title & Job Summary</CardTitle>
              <CardDescription>
                Summary of hours and costs grouped by employee title and job.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTitleJobSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No title & job data found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Hour Type Breakdown</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>LOA Count</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTitleJobSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.employeeTitle}|${summary.jobNumber}|${index}`}
                      >
                        <TableCell className="font-medium">
                          {summary.employeeTitle}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{summary.jobNumber}</p>
                            <p className="text-sm text-gray-500">
                              {summary.jobName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(summary.hourTypeBreakdown || {})
                              .sort(([, a], [, b]) => b.hours - a.hours)
                              .map(([hourType, data]) => (
                                <div
                                  key={hourType}
                                  className="flex justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                                >
                                  <span className="font-medium text-gray-700">
                                    {hourType}:
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {(data.hours || 0).toFixed(1)}h
                                  </span>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>{summary.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {summary.totalLoaCount}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ${summary.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow
                      key="title-job-summary-total"
                      className="bg-gray-50 font-bold"
                    >
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell>
                        {filteredTitleJobSummaries
                          .reduce((sum, s) => sum + (s.totalHours || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredTitleJobSummaries
                          .reduce(
                            (sum, s) => sum + (s.totalEffectiveHours || 0),
                            0,
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {filteredTitleJobSummaries
                          .reduce((sum, s) => sum + (s.totalCost || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredTitleJobSummaries.reduce(
                          (sum, s) => sum + s.entries.length,
                          0,
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Date & Name Summary Tab */}
        <TabsContent value="date-name">
          <Card>
            <CardHeader>
              <CardTitle>Date & Name Summary</CardTitle>
              <CardDescription>
                Summary of hours and costs grouped by date and employee name.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDateNameSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No date & name data found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Hour Type Breakdown</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>LOA Count</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDateNameSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.date}|${summary.employeeName}|${index}`}
                      >
                        <TableCell className="font-medium">
                          {parseLocalDate(summary.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{summary.employeeName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(summary.hourTypeBreakdown || {})
                              .sort(([, a], [, b]) => b.hours - a.hours)
                              .map(([hourType, data]) => (
                                <div
                                  key={hourType}
                                  className="flex justify-between text-xs bg-gray-50 px-2 py-1 rounded"
                                >
                                  <span className="font-medium text-gray-700">
                                    {hourType}:
                                  </span>
                                  <span className="font-bold text-gray-900">
                                    {(data.hours || 0).toFixed(1)}h
                                  </span>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell>{summary.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-purple-600">
                          {summary.totalLoaCount}
                        </TableCell>
                        <TableCell className="text-green-600 font-medium">
                          ${summary.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow
                      key="date-name-summary-total"
                      className="bg-gray-50 font-bold"
                    >
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell>
                        {filteredDateNameSummaries
                          .reduce((sum, s) => sum + (s.totalHours || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredDateNameSummaries
                          .reduce(
                            (sum, s) => sum + (s.totalEffectiveHours || 0),
                            0,
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-purple-600">
                        {filteredDateNameSummaries.reduce(
                          (sum, s) => sum + (s.totalLoaCount || 0),
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {filteredDateNameSummaries
                          .reduce((sum, s) => sum + (s.totalCost || 0), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredDateNameSummaries.reduce(
                          (sum, s) => sum + s.entries.length,
                          0,
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rentals Tab */}
        <TabsContent value="rentals">
          <Card>
            <CardHeader>
              <CardTitle>Rental Summary</CardTitle>
              <CardDescription>
                Summary of rental items with costs and duration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRentalSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental data found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRentalSummaries.map((rental, index) => (
                      <TableRow
                        key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${index}`}
                      >
                        <TableCell className="font-medium">
                          {rental.rentalItemName}
                        </TableCell>
                        <TableCell>{rental.category}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rental.jobNumber}</p>
                            <p className="text-sm text-gray-500">
                              {rental.jobName}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {rental.employeeName || "Unassigned"}
                        </TableCell>
                        <TableCell>
                          {rental.duration}{" "}
                          {rental.duration === 1 ? "day" : "days"}
                          {rental.quantity > 1 && ` × ${rental.quantity}`}
                        </TableCell>
                        <TableCell>
                          ${rental.rateUsed.toFixed(2)}/ day
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${rental.totalCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow
                      key="rental-summary-total"
                      className="bg-gray-50 font-bold"
                    >
                      <TableCell colSpan={6}>Total Rental Revenue</TableCell>
                      <TableCell className="text-green-600">
                        ${totals.rentalRevenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Individual Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Individual Time Entries</CardTitle>
              <CardDescription>
                Detailed view of all individual time entries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No time entries found for the selected filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Hour Type</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.employeeName}-${summary.date}-${summary.hourTypeName}-${index}`}
                      >
                        <TableCell>{summary.date}</TableCell>
                        <TableCell>{summary.employeeName}</TableCell>
                        <TableCell>
                          {summary.jobNumber} - {summary.jobName}
                        </TableCell>
                        <TableCell>{summary.hourTypeName}</TableCell>
                        <TableCell>{summary.provinceName}</TableCell>
                        <TableCell>{summary.hours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.effectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          ${summary.totalCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
