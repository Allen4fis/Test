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
  const [includeInvoiced, setIncludeInvoiced] = useState(true); // New toggle for invoiced entries

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
      case "week":
        startDate.setDate(today.getDate() - 7);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "month":
        startDate.setMonth(today.getMonth() - 1);
        setDateFilter({
          startDate: startDate.toISOString().split("T")[0],
          endDate: today.toISOString().split("T")[0],
        });
        break;
      case "quarter":
        startDate.setMonth(today.getMonth() - 3);
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
      default:
        setDateFilter({ startDate: "", endDate: "" });
    }
    setPeriodFilter(period);
  };

  // Helper function to check if a date is invoiced for a specific job
  const isDateInvoiced = (jobId: string, date: string): boolean => {
    const job = jobs.find((j) => j.id === jobId);
    return job ? (job.invoicedDates || []).includes(date) : false;
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
      const matchesProvince =
        !provinceFilter ||
        provinceFilter === "all-provinces" ||
        summary.provinceName === provinceFilter;

      // Find the corresponding time entry to get jobId
      const timeEntry = timeEntries.find(
        (entry) =>
          entry.date === summary.date &&
          entry.employeeId ===
            employees.find((emp) => emp.name === summary.employeeName)?.id,
      );

      // Check if entry is from an invoiced date
      const entryIsInvoiced = timeEntry
        ? isDateInvoiced(timeEntry.jobId, summary.date)
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

  // Helper function to create hour type breakdown
  const createHourTypeBreakdown = (
    summaries: typeof filteredSummaries,
  ): HourTypeBreakdown => {
    const breakdown: HourTypeBreakdown = {};

    summaries.forEach((summary) => {
      if (!breakdown[summary.hourTypeName]) {
        breakdown[summary.hourTypeName] = {
          hours: 0,
          effectiveHours: 0,
          cost: 0,
        };
      }
      breakdown[summary.hourTypeName].hours += summary.hours;
      breakdown[summary.hourTypeName].effectiveHours += summary.effectiveHours;
      breakdown[summary.hourTypeName].cost += summary.totalCost;
    });

    return breakdown;
  };

  // Enhanced summaries by employee with hour type breakdown
  const employeeSummariesWithHourTypes = useMemo(() => {
    const grouped = filteredSummaries.reduce(
      (acc, summary) => {
        if (!acc[summary.employeeName]) {
          acc[summary.employeeName] = {
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            hourTypeBreakdown: {},
            entryCount: 0,
            dateRange: { earliest: summary.date, latest: summary.date },
          };
        }

        const emp = acc[summary.employeeName];
        emp.totalHours += summary.hours;
        emp.totalEffectiveHours += summary.effectiveHours;
        emp.totalCost += summary.totalCost;
        emp.totalLoaCount += summary.loaCount || 0;
        emp.entryCount += 1;

        // Update date range
        if (summary.date < emp.dateRange.earliest) {
          emp.dateRange.earliest = summary.date;
        }
        if (summary.date > emp.dateRange.latest) {
          emp.dateRange.latest = summary.date;
        }

        // Update hour type breakdown
        if (!emp.hourTypeBreakdown[summary.hourTypeName]) {
          emp.hourTypeBreakdown[summary.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        emp.hourTypeBreakdown[summary.hourTypeName].hours += summary.hours;
        emp.hourTypeBreakdown[summary.hourTypeName].effectiveHours +=
          summary.effectiveHours;
        emp.hourTypeBreakdown[summary.hourTypeName].cost += summary.totalCost;

        return acc;
      },
      {} as Record<
        string,
        EnhancedSummary & {
          employeeName: string;
          employeeTitle: string;
          entryCount: number;
          dateRange: { earliest: string; latest: string };
        }
      >,
    );

    return Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredSummaries]);

  // Enhanced filtering for title/job summaries with hour type breakdown
  const filteredTitleJobSummaries = useMemo(() => {
    // First filter the base summaries
    const filtered = summaryByTitleAndJob.filter((summary) => {
      const matchesJob =
        !jobFilter ||
        summary.jobNumber.toLowerCase().includes(jobFilter.toLowerCase());

      // Check if any entries in this summary are from invoiced dates
      const hasInvoicedEntries = summary.entries.some((entry) => {
        return isDateInvoiced(entry.jobId, entry.date);
      });

      const matchesInvoiceFilter = includeInvoiced || !hasInvoicedEntries;

      return matchesJob && matchesInvoiceFilter;
    });

    // Then add hour type breakdown to each summary
    return filtered.map((summary) => {
      const hourTypeBreakdown: HourTypeBreakdown = {};

      // Get the relevant filtered summaries for this title/job combination
      const relevantSummaries = filteredSummaries.filter(
        (fs) =>
          fs.employeeTitle === summary.title &&
          fs.jobNumber === summary.jobNumber,
      );

      relevantSummaries.forEach((fs) => {
        if (!hourTypeBreakdown[fs.hourTypeName]) {
          hourTypeBreakdown[fs.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        hourTypeBreakdown[fs.hourTypeName].hours += fs.hours;
        hourTypeBreakdown[fs.hourTypeName].effectiveHours += fs.effectiveHours;
        hourTypeBreakdown[fs.hourTypeName].cost += fs.totalCost;
      });

      // Calculate total LOA count for this title/job combination
      const totalLoaCount = relevantSummaries.reduce(
        (sum, fs) => sum + (fs.loaCount || 0),
        0,
      );

      return {
        ...summary,
        hourTypeBreakdown,
        totalLoaCount,
      };
    });
  }, [
    summaryByTitleAndJob,
    jobFilter,
    includeInvoiced,
    jobs,
    filteredSummaries,
  ]);

  // Enhanced filtering for date/name summaries with hour type breakdown
  const filteredDateNameSummaries = useMemo(() => {
    // First filter the base summaries
    const filtered = summaryByDateAndName.filter((summary) => {
      const matchesDate =
        (!dateFilter.startDate || summary.date >= dateFilter.startDate) &&
        (!dateFilter.endDate || summary.date <= dateFilter.endDate);
      const matchesEmployee =
        !employeeFilter ||
        summary.employeeName
          .toLowerCase()
          .includes(employeeFilter.toLowerCase());

      // Check if any entries in this summary are from invoiced dates
      const hasInvoicedEntries = summary.entries.some((entry) => {
        return isDateInvoiced(entry.jobId, entry.date);
      });

      const matchesInvoiceFilter = includeInvoiced || !hasInvoicedEntries;

      return matchesDate && matchesEmployee && matchesInvoiceFilter;
    });

    // Then add hour type breakdown to each summary
    return filtered.map((summary) => {
      const hourTypeBreakdown: HourTypeBreakdown = {};

      // Get the relevant filtered summaries for this date/employee combination
      const relevantSummaries = filteredSummaries.filter(
        (fs) =>
          fs.date === summary.date && fs.employeeName === summary.employeeName,
      );

      relevantSummaries.forEach((fs) => {
        if (!hourTypeBreakdown[fs.hourTypeName]) {
          hourTypeBreakdown[fs.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        hourTypeBreakdown[fs.hourTypeName].hours += fs.hours;
        hourTypeBreakdown[fs.hourTypeName].effectiveHours += fs.effectiveHours;
        hourTypeBreakdown[fs.hourTypeName].cost += fs.totalCost;
      });

      return {
        ...summary,
        hourTypeBreakdown,
      };
    });
  }, [
    summaryByDateAndName,
    dateFilter,
    employeeFilter,
    includeInvoiced,
    jobs,
    filteredSummaries,
  ]);

  // Calculate summary statistics
  const totalHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.hours,
    0,
  );
  const totalEffectiveHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );
  const totalLaborCost = filteredSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalRentalRevenue = filteredRentalSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalCost = totalLaborCost; // Only labor costs, rentals are revenue

  const clearFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("");
    setJobFilter("");
    setProvinceFilter("all-provinces");
    setPeriodFilter("month");
    setIncludeInvoiced(true);
  };

  const handlePrint = () => {
    // Add print-specific class to body for styling
    document.body.classList.add("printing");

    // Trigger print dialog
    window.print();

    // Remove print class after printing
    setTimeout(() => {
      document.body.classList.remove("printing");
    }, 1000);
  };

  // Format current filters for print header
  const getFilterSummaryForPrint = () => {
    const filters = [];
    if (dateFilter.startDate)
      filters.push(
        `From: ${new Date(dateFilter.startDate).toLocaleDateString()}`,
      );
    if (dateFilter.endDate)
      filters.push(`To: ${new Date(dateFilter.endDate).toLocaleDateString()}`);
    if (employeeFilter) filters.push(`Employee: ${employeeFilter}`);
    if (jobFilter) filters.push(`Job: ${jobFilter}`);
    if (provinceFilter && provinceFilter !== "all-provinces")
      filters.push(`Province: ${provinceFilter}`);
    if (!includeInvoiced) filters.push(`Excluding invoiced entries`);
    return filters.length > 0 ? filters.join(" | ") : "All data";
  };

  const uniqueProvinceNames = [
    ...new Set(timeEntrySummaries.map((s) => s.provinceName)),
  ].sort();

  // Helper component to render hour type breakdown
  const HourTypeBreakdownDisplay = ({
    breakdown,
  }: {
    breakdown: HourTypeBreakdown;
  }) => (
    <div className="space-y-1">
      {Object.entries(breakdown).map(([hourType, data]) => (
        <div key={hourType} className="flex justify-between text-xs">
          <span className="text-gray-600">{hourType}:</span>
          <span className="font-medium">{data.hours.toFixed(1)}h</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Print Header - Only visible when printing */}
      <div className="print-only">
        <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
          <h1 className="text-2xl font-bold">4Front Trackity-doo</h1>
          <h2 className="text-xl">Time Tracking Summary Report</h2>
          <p className="text-sm text-gray-600 mt-2">
            Generated on {new Date().toLocaleDateString()} at{" "}
            {new Date().toLocaleTimeString()}
          </p>
          <p className="text-sm text-gray-600">
            Filters: {getFilterSummaryForPrint()}
          </p>
        </div>
      </div>

      {/* Enhanced Filters */}
      <Card className="print-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Filter reports by time period, employee, job, province, or invoice
            status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Include Invoiced Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-blue-600" />
                <div>
                  <Label
                    htmlFor="include-invoiced"
                    className="text-sm font-medium text-blue-900"
                  >
                    Include Invoiced Entries
                  </Label>
                  <p className="text-xs text-blue-700">
                    Show entries from dates that have already been invoiced
                  </p>
                </div>
              </div>
              <Switch
                id="include-invoiced"
                checked={includeInvoiced}
                onCheckedChange={setIncludeInvoiced}
              />
            </div>

            {/* Quick Period Filters */}
            <div className="space-y-2">
              <Label>Quick Time Periods</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={periodFilter === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("month")}
                >
                  Last 30 Days
                </Button>
                <Button
                  variant={periodFilter === "today" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("today")}
                >
                  Today
                </Button>
                <Button
                  variant={periodFilter === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("week")}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant={periodFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("all")}
                >
                  All Time
                </Button>
                <Button
                  variant={periodFilter === "quarter" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("quarter")}
                >
                  Last 3 Months
                </Button>
                <Button
                  variant={periodFilter === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("year")}
                >
                  Last Year
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) =>
                    setDateFilter({
                      ...dateFilter,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) =>
                    setDateFilter({ ...dateFilter, endDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeFilter">Employee</Label>
                <Input
                  id="employeeFilter"
                  placeholder="Filter by employee name"
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobFilter">Job</Label>
                <Input
                  id="jobFilter"
                  placeholder="Filter by job number"
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provinceFilter">Province</Label>
                <Select
                  value={provinceFilter}
                  onValueChange={setProvinceFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All provinces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-provinces">All Provinces</SelectItem>
                    {uniqueProvinceNames.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print-stats">
        <Card className="print-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Filtered Entries
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
                <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
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
                  {totalEffectiveHours.toFixed(2)}
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
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Labor: ${totalLaborCost.toFixed(2)}</span>
                  <span>Rentals: ${totalRentalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="employee" className="space-y-4">
        <TabsList className="print-hidden">
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="titleJob">By Title & Job</TabsTrigger>
          <TabsTrigger value="dateName">By Date & Name</TabsTrigger>
          <TabsTrigger value="rentals">Rentals</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="employee">
          <div className="print-only print-section-header">
            Summary by Employee
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Summary by Employee</CardTitle>
              <CardDescription>
                Total hours by employee with hour type breakdown for selected
                period {!includeInvoiced && "(excluding invoiced entries)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeeSummariesWithHourTypes.length === 0 ? (
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
                      <TableHead>Date Range</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeSummariesWithHourTypes.map((employee, index) => (
                      <TableRow key={employee.employeeName}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index < 3
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {index + 1}
                            </span>
                            {employee.employeeName}
                          </div>
                        </TableCell>
                        <TableCell>{employee.employeeTitle}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {Object.entries(employee.hourTypeBreakdown)
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
                                    {data.hours.toFixed(1)}h
                                  </span>
                                </div>
                              ))}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {employee.totalHours.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {employee.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-purple-600">
                          {employee.totalLoaCount > 0
                            ? employee.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${employee.totalCost.toFixed(2)}
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
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell>
                        {employeeSummariesWithHourTypes
                          .reduce((sum, emp) => sum + emp.totalHours, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {employeeSummariesWithHourTypes
                          .reduce(
                            (sum, emp) => sum + emp.totalEffectiveHours,
                            0,
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-purple-600">
                        {employeeSummariesWithHourTypes.reduce(
                          (sum, emp) => sum + emp.totalLoaCount,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {employeeSummariesWithHourTypes
                          .reduce((sum, emp) => sum + emp.totalCost, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                      <TableCell>
                        {employeeSummariesWithHourTypes.reduce(
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

        <TabsContent value="titleJob">
          <div className="print-only print-section-header">
            Summary by Title and Job Number
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Summary by Title and Job Number</CardTitle>
              <CardDescription>
                Hours breakdown by employee title and job number with hour type
                details {!includeInvoiced && "(excluding invoiced entries)"}
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
                      <TableHead>Job Number</TableHead>
                      <TableHead>Job Name</TableHead>
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
                      <TableRow key={`${summary.title}-${summary.jobNumber}`}>
                        <TableCell className="font-medium">
                          {summary.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{summary.jobNumber}</Badge>
                        </TableCell>
                        <TableCell>{summary.jobName}</TableCell>
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
                                    {data.hours.toFixed(1)}h
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
                          {summary.totalLoaCount > 0
                            ? summary.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${summary.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell>
                        {filteredTitleJobSummaries
                          .reduce((sum, s) => sum + s.totalHours, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredTitleJobSummaries
                          .reduce((sum, s) => sum + s.totalEffectiveHours, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {filteredTitleJobSummaries
                          .reduce((sum, s) => sum + s.totalCost, 0)
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

        <TabsContent value="dateName">
          <div className="print-only print-section-header">
            Summary by Date and Employee Name
          </div>
          <Card className="page-break-avoid">
            <CardHeader>
              <CardTitle>Summary by Date and Employee Name</CardTitle>
              <CardDescription>
                Daily hours breakdown by employee name sorted by most recent
                {!includeInvoiced && " (excluding invoiced entries)"}
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
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Hour Type Breakdown</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead className="text-purple-600">
                        LOA Count
                      </TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDateNameSummaries.map((summary) => (
                      <TableRow key={`${summary.date}-${summary.employeeName}`}>
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
                                    {data.hours.toFixed(1)}h
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
                          {summary.totalLoaCount > 0
                            ? summary.totalLoaCount
                            : "—"}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${summary.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell>
                        {filteredDateNameSummaries
                          .reduce((sum, s) => sum + s.totalHours, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {filteredDateNameSummaries
                          .reduce((sum, s) => sum + s.totalEffectiveHours, 0)
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
                          .reduce((sum, s) => sum + s.totalCost, 0)
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
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Rental Summary
              </CardTitle>
              <CardDescription>
                Equipment and rental revenue for the selected period
                {!includeInvoiced && " (excluding invoiced entries)"}
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
                    {filteredRentalSummaries.map((rental) => (
                      <TableRow key={rental.id}>
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
                          ${rental.rateUsed.toFixed(2)}/{rental.billingUnit}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${rental.totalCost.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={6}>Total Rental Revenue</TableCell>
                      <TableCell className="text-green-600">
                        ${totalRentalRevenue.toFixed(2)}
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
                Individual time entries matching the current filters
                {!includeInvoiced && " (excluding invoiced entries)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No detailed entries match the current filters.
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
                      <TableHead>Title</TableHead>
                      <TableHead>Job</TableHead>
                      <TableHead>Hour Type</TableHead>
                      <TableHead>Province</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Billable</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaries
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((summary, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {parseLocalDate(summary.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium">
                            {summary.employeeName}
                          </TableCell>
                          <TableCell>{summary.employeeTitle}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {summary.jobNumber}
                              </div>
                              <div className="text-xs text-gray-500">
                                {summary.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {summary.hourTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>{summary.provinceName}</TableCell>
                          <TableCell>{summary.hours.toFixed(2)}</TableCell>
                          <TableCell>
                            {summary.effectiveHours.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${summary.totalBillableAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium text-red-600">
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

      {/* Print Footer - Only visible when printing */}
      <div className="print-only print-footer">
        <p>
          4Front Trackity-doo Time Tracking Report | Generated:{" "}
          {new Date().toLocaleDateString()} | Page {"{page}"}
        </p>
      </div>
    </div>
  );
}
