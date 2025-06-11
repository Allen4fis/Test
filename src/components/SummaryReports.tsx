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
      startDate: thirtyDaysAgo.toISOString().split("T")[0],
      endDate: today.toISOString().split("T")[0],
    };
  };

  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all-provinces");
  const [periodFilter, setPeriodFilter] = useState("month"); // Default to last 30 days
  const [includeInvoiced, setIncludeInvoiced] = useState(false); // New toggle for invoiced entries - default to off

  // Quick period filters
  const setQuickPeriod = (period: string) => {
    const today = new Date();
    const startDate = new Date();

    switch (period) {
      case "today":
        setDateFilter({
          startDate: today.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "yesterday":
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        setDateFilter({
          startDate: yesterday.toISOString().split("T")[0],
          endDate: yesterday.toISOString().split("T")[0],
        });
        break;
      case "week":
        startDate.setDate(today.getDate() - 7);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "month":
        startDate.setDate(today.getDate() - 30);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "quarter":
        startDate.setDate(today.getDate() - 90);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "year":
        startDate.setFullYear(today.getFullYear() - 1);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
    }
    setPeriodFilter(period);
  };

  // Reset all filters
  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("");
    setJobFilter("");
    setProvinceFilter("all-provinces");
    setPeriodFilter("month");
    setIncludeInvoiced(false);
  };

  // Helper function to check if a date is invoiced
  const isDateInvoiced = (jobId: string, date: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.invoicedDates?.includes(date) || false;
  };

  // Enhanced filtering logic
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      const matchesDate =
        (!dateFilter.startDate || summary.date >= dateFilter.startDate) &&
        (!dateFilter.endDate || summary.date <= dateFilter.endDate);
      const matchesEmployee =
        !employeeFilter ||
        summary.employeeName
          .toLowerCase()
          .includes(employeeFilter.toLowerCase());
      const matchesJob =
        !jobFilter ||
        summary.jobNumber.toLowerCase().includes(jobFilter.toLowerCase());

      // Check province filter
      const summaryEntry = timeEntries.find((entry) => {
        const entryEmployee = employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const entryJob = jobs.find((job) => job.id === entry.jobId);
        const entryProvince = provinces.find(
          (prov) => prov.id === entry.provinceId,
        );

        return (
          entryEmployee?.name === summary.employeeName &&
          entryJob?.jobNumber === summary.jobNumber &&
          entry.date === summary.date
        );
      });

      const summaryProvince = summaryEntry
        ? provinces.find((prov) => prov.id === summaryEntry.provinceId)
        : null;

      const matchesProvince =
        provinceFilter === "all-provinces" ||
        summaryProvince?.code === provinceFilter;

      // Check if entry is from an invoiced date
      const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
      const entryIsInvoiced = job
        ? isDateInvoiced(job.id, summary.date)
        : false;
      const matchesInvoiceFilter = includeInvoiced || !entryIsInvoiced;

      return (
        matchesDate &&
        matchesEmployee &&
        matchesJob &&
        matchesProvince &&
        matchesInvoiceFilter
      );
    });
  }, [
    timeEntrySummaries,
    timeEntries,
    employees,
    dateFilter,
    employeeFilter,
    jobFilter,
    provinceFilter,
    includeInvoiced,
    jobs,
  ]);

  // Enhanced filtering logic for rental summaries
  const filteredRentalSummaries = useMemo(() => {
    return rentalSummaries.filter((summary) => {
      const matchesDate =
        (!dateFilter.startDate || summary.date >= dateFilter.startDate) &&
        (!dateFilter.endDate || summary.date <= dateFilter.endDate);
      const matchesEmployee =
        !employeeFilter ||
        summary.employeeName
          .toLowerCase()
          .includes(employeeFilter.toLowerCase());
      const matchesJob =
        !jobFilter ||
        summary.jobNumber.toLowerCase().includes(jobFilter.toLowerCase());

      // Find the corresponding rental entry to get jobId
      const rentalEntry = rentalSummaries.find(
        (rental) => rental.id === summary.id,
      );
      const job = jobs.find((j) => j.jobNumber === summary.jobNumber);

      // Check if rental is from an invoiced date
      const entryIsInvoiced = job
        ? isDateInvoiced(job.id, summary.date)
        : false;
      const matchesInvoiceFilter = includeInvoiced || !entryIsInvoiced;

      return (
        matchesDate && matchesEmployee && matchesJob && matchesInvoiceFilter
      );
    });
  }, [
    rentalSummaries,
    dateFilter,
    employeeFilter,
    jobFilter,
    includeInvoiced,
    jobs,
  ]);

  // Calculate aggregated data
  const totalHours = filteredSummaries.reduce(
    (sum, summary) => sum + (summary.totalHours || 0),
    0,
  );
  const totalEffectiveHours = filteredSummaries.reduce(
    (sum, summary) => sum + (summary.totalEffectiveHours || 0),
    0,
  );
  const totalLaborCost = filteredSummaries.reduce(
    (sum, summary) => sum + (summary.totalCost || 0),
    0,
  );
  const totalRentalRevenue = filteredRentalSummaries.reduce(
    (sum, rental) => sum + (rental.totalCost || 0),
    0,
  );
  const totalCost = totalLaborCost + totalRentalRevenue;

  // Employee summaries with hierarchy support
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
        group.totalHours += summary.totalHours || 0;
        group.totalEffectiveHours += summary.totalEffectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.totalLoaCount || 0;
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

    return Object.values(employeeGroups).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );
  }, [filteredSummaries]);

  // Enhanced hierarchical employee summaries with category recognition
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const summariesWithHierarchy: any[] = [];

    // Helper function to get employee by name
    const getEmployeeByName = (name: string) => {
      return employees.find((emp) => emp.name === name);
    };

    // Helper function to get manager name
    const getManagerName = (managerId: string) => {
      return employees.find((emp) => emp.id === managerId)?.name || "Unknown";
    };

    // Helper function to get employee category
    const getEmployeeCategory = (employee: any) => {
      if (employee?.category === "dsp") return "dsp";
      if (employee?.category === "employee") return "employee";
      if (employee?.managerId) return "subordinate";
      return "independent";
    };

    // First, add all independent employees and managers
    employeeSummariesData.forEach((summary) => {
      const employee = getEmployeeByName(summary.employeeName);
      const category = getEmployeeCategory(employee);

      if (
        category === "independent" ||
        category === "dsp" ||
        category === "employee"
      ) {
        summariesWithHierarchy.push({
          ...summary,
          employeeCategory: category,
          isSubordinate: false,
          managerName: null,
        });
      }
    });

    // Then, add subordinates under their managers
    employeeSummariesData.forEach((summary) => {
      const employee = getEmployeeByName(summary.employeeName);
      const category = getEmployeeCategory(employee);

      if (category === "subordinate" && employee?.managerId) {
        const managerName = getManagerName(employee.managerId);
        summariesWithHierarchy.push({
          ...summary,
          employeeCategory: "subordinate",
          isSubordinate: true,
          managerName,
        });
      }
    });

    return summariesWithHierarchy;
  }, [employeeSummariesData, employees]);

  // Title & Job summaries
  const titleJobSummaries = useMemo(() => {
    const titleJobGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.employeeTitle}|${summary.jobNumber}|${summary.jobName}`;
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
        group.totalHours += summary.totalHours || 0;
        group.totalEffectiveHours += summary.totalEffectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.totalLoaCount || 0;
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

  // Date & Name summaries with optimized calculation
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
          (sum, s) => sum + (s.totalHours || 0),
          0,
        );
        const totalEffectiveHours = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.totalEffectiveHours || 0),
          0,
        );
        const totalCost = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.totalCost || 0),
          0,
        );
        const totalLoaCount = summariesForDateEmployee.reduce(
          (sum, s) => sum + (s.totalLoaCount || 0),
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

    return filteredDateNameSummaries.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      return dateCompare !== 0
        ? dateCompare
        : a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredSummaries]);

  // Use the pre-calculated filteredDateNameSummaries
  const filteredTitleJobSummaries = titleJobSummaries;
  const filteredDateNameSummaries = dateNameSummaries;

  // Hour Type Breakdown Display Component
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

  return (
    <div className="space-y-6 print-container">
      {/* Header */}
      <div className="flex items-center justify-between print-hide">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Summary Reports</h1>
          <p className="text-muted-foreground">
            Comprehensive time tracking and cost analysis
          </p>
        </div>
        <Button
          onClick={() => window.print()}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {/* Quick Period Buttons */}
            <div className="space-y-2">
              <Label>Quick Periods</Label>
              <div className="grid grid-cols-3 gap-1">
                <Button
                  size="sm"
                  variant={periodFilter === "today" ? "default" : "outline"}
                  onClick={() => setQuickPeriod("today")}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={periodFilter === "week" ? "default" : "outline"}
                  onClick={() => setQuickPeriod("week")}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={periodFilter === "month" ? "default" : "outline"}
                  onClick={() => setQuickPeriod("month")}
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={periodFilter === "quarter" ? "default" : "outline"}
                  onClick={() => setQuickPeriod("quarter")}
                >
                  Quarter
                </Button>
                <Button
                  size="sm"
                  variant={periodFilter === "year" ? "default" : "outline"}
                  onClick={() => setQuickPeriod("year")}
                >
                  Year
                </Button>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, endDate: e.target.value })
                }
              />
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label>Employee</Label>
              <Input
                placeholder="Filter by employee name..."
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>

            {/* Job Filter */}
            <div className="space-y-2">
              <Label>Job</Label>
              <Input
                placeholder="Filter by job number..."
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
              />
            </div>

            {/* Province Filter */}
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

            {/* Include Invoiced Toggle */}
            <div className="space-y-2">
              <Label>Include Invoiced Entries</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={includeInvoiced}
                  onCheckedChange={setIncludeInvoiced}
                />
                <span className="text-sm text-gray-600">
                  {includeInvoiced ? "Included" : "Excluded"}
                </span>
              </div>
            </div>

            {/* Reset Button */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-summary-stats">
        <Card className="print-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Entries
                </p>
                <p className="text-2xl font-bold">{filteredSummaries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="print-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">
                  {(totalHours || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="print-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Effective Hours
                </p>
                <p className="text-2xl font-bold">
                  {(totalEffectiveHours || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="print-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">
                  ${(totalCost || 0).toFixed(2)}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Labor: ${(totalLaborCost || 0).toFixed(2)}</span>
                  <span>Rentals: ${(totalRentalRevenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="employees" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="employees">
            <Users className="h-4 w-4 mr-2" />
            Employee Summary
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
          <TabsTrigger value="detailed">
            <Receipt className="h-4 w-4 mr-2" />
            Detailed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <div className="print-only print-section-header">
            Employee Summary
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Employee Summary</CardTitle>
              <CardDescription>
                Performance breakdown by employee with hierarchical
                relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hierarchicalEmployeeSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
                  {!includeInvoiced && (
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Note:</span> Invoiced
                      entries are currently hidden. Toggle "Include Invoiced
                      Entries" to show them.
                    </div>
                  )}
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
                    {hierarchicalEmployeeSummaries.map((employee, index) => (
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
                                ) : employee.employeeCategory === "employee" ? (
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
                          {(employee.totalHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {(employee.totalEffectiveHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {(employee.totalLoaCount || 0) > 0
                            ? employee.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${(employee.totalCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            // Find rentals associated with this employee that match the current date filtering
                            const employeeRentals =
                              filteredRentalSummaries.filter(
                                (rental) =>
                                  rental.employeeName === employee.employeeName,
                              );

                            if (employeeRentals.length === 0) {
                              return (
                                <span className="text-gray-400 text-xs">
                                  No rentals
                                </span>
                              );
                            }

                            // Calculate total DSP earnings and show rental details
                            const totalDspEarnings = employeeRentals.reduce(
                              (sum, rental) => {
                                const rentalItem = rentalItems.find(
                                  (item) => item.name === rental.rentalItemName,
                                );
                                const dspRate =
                                  rentalItem?.dspRate ||
                                  (rentalItem as any)?.paidOutDailyRate ||
                                  0;
                                return (
                                  sum +
                                  dspRate * rental.duration * rental.quantity
                                );
                              },
                              0,
                            );

                            return (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-purple-600">
                                  DSP Earnings: ${totalDspEarnings.toFixed(2)}
                                </div>
                                <div className="space-y-1">
                                  {employeeRentals.map((rental, index) => {
                                    const rentalItem = rentalItems.find(
                                      (item) =>
                                        item.name === rental.rentalItemName,
                                    );
                                    const dspRate =
                                      rentalItem?.dspRate ||
                                      (rentalItem as any)?.paidOutDailyRate;

                                    return (
                                      <div
                                        key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${index}`}
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
                                            ({rental.date})
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                            <div>
                              {parseLocalDate(
                                employee.dateRange.earliest,
                              ).toLocaleDateString()}
                            </div>
                            <div>
                              to{" "}
                              {parseLocalDate(
                                employee.dateRange.latest,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.entryCount}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
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
                        $
                        {(() => {
                          // Calculate total DSP earnings across all employees
                          const totalDspEarnings =
                            hierarchicalEmployeeSummaries.reduce(
                              (totalSum, employee) => {
                                const employeeRentals =
                                  filteredRentalSummaries.filter(
                                    (rental) =>
                                      rental.employeeName ===
                                      employee.employeeName,
                                  );

                                const employeeDspEarnings =
                                  employeeRentals.reduce((sum, rental) => {
                                    const rentalItem = rentalItems.find(
                                      (item) =>
                                        item.name === rental.rentalItemName,
                                    );
                                    const dspRate =
                                      rentalItem?.dspRate ||
                                      (rentalItem as any)?.paidOutDailyRate ||
                                      0;
                                    return (
                                      sum +
                                      dspRate *
                                        rental.duration *
                                        rental.quantity
                                    );
                                  }, 0);

                                return totalSum + employeeDspEarnings;
                              },
                              0,
                            );

                          return totalDspEarnings.toFixed(2);
                        })()}
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

        <TabsContent value="title-job">
          <div className="print-only print-section-header">
            Title & Job Summary
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Title & Job Summary</CardTitle>
              <CardDescription>
                Performance breakdown by employee title and job
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTitleJobSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
                  {!includeInvoiced && (
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Note:</span> Invoiced
                      entries are currently hidden. Toggle "Include Invoiced
                      Entries" to show them.
                    </div>
                  )}
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
                    {filteredTitleJobSummaries.map((summary) => (
                      <TableRow
                        key={`${summary.employeeTitle}|${summary.jobNumber}`}
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
                        <TableCell>
                          {(summary.totalHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {(summary.totalEffectiveHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {(summary.totalLoaCount || 0) > 0
                            ? summary.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${(summary.totalCost || 0).toFixed(2)}
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

        <TabsContent value="date-name">
          <div className="print-only print-section-header">
            Date & Name Summary
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Date & Name Summary</CardTitle>
              <CardDescription>
                Daily performance breakdown by employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDateNameSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
                  {!includeInvoiced && (
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Note:</span> Invoiced
                      entries are currently hidden. Toggle "Include Invoiced
                      Entries" to show them.
                    </div>
                  )}
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
                        <TableCell>
                          {(summary.totalHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {(summary.totalEffectiveHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {(summary.totalLoaCount || 0) > 0
                            ? summary.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${(summary.totalCost || 0).toFixed(2)}
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

        <TabsContent value="rentals">
          <div className="print-only print-section-header">Rental Summary</div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Rental Summary</CardTitle>
              <CardDescription>
                Equipment rental usage and revenue breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRentalSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental data matches the current filters for the selected
                  time period.
                  {!includeInvoiced && (
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Note:</span> Invoiced
                      entries are currently hidden. Toggle "Include Invoiced
                      Entries" to show them.
                    </div>
                  )}
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
                        <TableCell>
                          <Badge variant="outline">{rental.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {rental.jobNumber} - {rental.jobName}
                        </TableCell>
                        <TableCell>{rental.employeeName}</TableCell>
                        <TableCell>
                          {rental.duration} {rental.billingUnit}
                          {rental.duration !== 1 ? "s" : ""}
                          {rental.quantity > 1 && ` × ${rental.quantity}`}
                        </TableCell>
                        <TableCell>
                          ${(rental.rateUsed || 0).toFixed(2)}/
                          {rental.billingUnit}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${(rental.totalCost || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow
                      key="rental-summary-total"
                      className="bg-gray-50 font-bold"
                    >
                      <TableCell colSpan={6}>Total Rental Revenue</TableCell>
                      <TableCell className="text-green-600">
                        ${(totalRentalRevenue || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <div className="print-only print-section-header">
            Detailed Time Entries
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Detailed Time Entries</CardTitle>
              <CardDescription>
                Individual time entry details for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No detailed entries match the current filters for the selected
                  time period.
                  {!includeInvoiced && (
                    <div className="mt-2 text-sm">
                      <span className="text-blue-600">Note:</span> Invoiced
                      entries are currently hidden. Toggle "Include Invoiced
                      Entries" to show them.
                    </div>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Job</TableHead>
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
                        <TableCell>{(summary.hours || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          {(summary.effectiveHours || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          ${(summary.totalBillableAmount || 0).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          ${(summary.totalCost || 0).toFixed(2)}
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
