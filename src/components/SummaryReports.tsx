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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

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
  const [provinceFilter, setProvinceFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("month"); // Default to last 30 days

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
        provinceFilter === "all" ||
        summary.provinceName === provinceFilter;

      return matchesDate && matchesEmployee && matchesJob && matchesProvince;
    });
  }, [
    timeEntrySummaries,
    dateFilter,
    employeeFilter,
    jobFilter,
    provinceFilter,
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

  // Filtered summaries for Title & Job view with hour type breakdown
  const filteredTitleJobSummaries = useMemo(() => {
    const grouped = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.employeeTitle}-${summary.jobNumber}`;

        if (!acc[key]) {
          acc[key] = {
            title: summary.employeeTitle,
            jobNumber: summary.jobNumber,
            jobName: summary.jobName,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            hourTypeBreakdown: {},
          };
        }

        // Don't include LOA hours in total hours calculations
        if (summary.hourTypeName !== "LOA") {
          acc[key].totalHours += summary.hours;
          acc[key].totalEffectiveHours += summary.effectiveHours;
        }
        acc[key].totalCost += summary.totalCost;

        // Add to hour type breakdown
        if (!acc[key].hourTypeBreakdown[summary.hourTypeName]) {
          acc[key].hourTypeBreakdown[summary.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        acc[key].hourTypeBreakdown[summary.hourTypeName].hours += summary.hours;
        acc[key].hourTypeBreakdown[summary.hourTypeName].effectiveHours +=
          summary.effectiveHours;
        acc[key].hourTypeBreakdown[summary.hourTypeName].cost +=
          summary.totalCost;

        return acc;
      },
      {} as Record<string, EnhancedSummary>,
    );

    return Object.values(grouped).sort((a, b) =>
      a.title!.localeCompare(b.title!),
    );
  }, [filteredSummaries]);

  // Filtered summaries for Date & Name view with hour type breakdown
  const filteredDateNameSummaries = useMemo(() => {
    const grouped = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.date}-${summary.employeeName}`;

        if (!acc[key]) {
          acc[key] = {
            date: summary.date,
            employeeName: summary.employeeName,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            hourTypeBreakdown: {},
          };
        }

        // Don't include LOA hours in total hours calculations
        if (summary.hourTypeName !== "LOA") {
          acc[key].totalHours += summary.hours;
          acc[key].totalEffectiveHours += summary.effectiveHours;
        }
        acc[key].totalCost += summary.totalCost;

        // Add to hour type breakdown
        if (!acc[key].hourTypeBreakdown[summary.hourTypeName]) {
          acc[key].hourTypeBreakdown[summary.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        acc[key].hourTypeBreakdown[summary.hourTypeName].hours += summary.hours;
        acc[key].hourTypeBreakdown[summary.hourTypeName].effectiveHours +=
          summary.effectiveHours;
        acc[key].hourTypeBreakdown[summary.hourTypeName].cost +=
          summary.totalCost;

        return acc;
      },
      {} as Record<string, EnhancedSummary>,
    );

    return Object.values(grouped).sort((a, b) => {
      const dateComparison = b.date!.localeCompare(a.date!);
      return dateComparison !== 0
        ? dateComparison
        : a.employeeName!.localeCompare(b.employeeName!);
    });
  }, [filteredSummaries]);

  // New: Employee summary with hour type totals (filterable by date)
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
            hourTypeBreakdown: {},
            dateRange: { earliest: summary.date, latest: summary.date },
            entryCount: 0,
          };
        }

        // Don't include LOA hours in total hours calculations
        if (summary.hourTypeName !== "LOA") {
          acc[summary.employeeName].totalHours += summary.hours;
          acc[summary.employeeName].totalEffectiveHours +=
            summary.effectiveHours;
        }
        acc[summary.employeeName].totalCost += summary.totalCost;
        acc[summary.employeeName].entryCount += 1;

        // Update date range
        if (summary.date < acc[summary.employeeName].dateRange.earliest) {
          acc[summary.employeeName].dateRange.earliest = summary.date;
        }
        if (summary.date > acc[summary.employeeName].dateRange.latest) {
          acc[summary.employeeName].dateRange.latest = summary.date;
        }

        // Add to hour type breakdown
        if (
          !acc[summary.employeeName].hourTypeBreakdown[summary.hourTypeName]
        ) {
          acc[summary.employeeName].hourTypeBreakdown[summary.hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }
        acc[summary.employeeName].hourTypeBreakdown[
          summary.hourTypeName
        ].hours += summary.hours;
        acc[summary.employeeName].hourTypeBreakdown[
          summary.hourTypeName
        ].effectiveHours += summary.effectiveHours;
        acc[summary.employeeName].hourTypeBreakdown[
          summary.hourTypeName
        ].cost += summary.totalCost;

        return acc;
      },
      {} as Record<
        string,
        EnhancedSummary & {
          employeeTitle: string;
          dateRange: { earliest: string; latest: string };
          entryCount: number;
        }
      >,
    );

    return Object.values(grouped).sort((a, b) =>
      a.employeeName!.localeCompare(b.employeeName!),
    );
  }, [filteredSummaries]);

  // Overall hour type breakdown for filtered period
  const overallHourTypeBreakdown = useMemo(() => {
    return createHourTypeBreakdown(filteredSummaries);
  }, [filteredSummaries]);

  // Calculate totals for filtered data (excluding LOA from hours totals)
  const totalHours = filteredSummaries
    .filter((summary) => summary.hourTypeName !== "LOA")
    .reduce((sum, summary) => sum + summary.hours, 0);
  const totalEffectiveHours = filteredSummaries
    .filter((summary) => summary.hourTypeName !== "LOA")
    .reduce((sum, summary) => sum + summary.effectiveHours, 0);
  const totalCost = filteredSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );

  const clearFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("");
    setJobFilter("");
    setProvinceFilter("");
    setPeriodFilter("month");
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
      {/* Enhanced Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>
            Filter reports by time period, employee, job, or province
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                  onChange={(e) => {
                    setDateFilter({ ...dateFilter, startDate: e.target.value });
                    setPeriodFilter("custom");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => {
                    setDateFilter({ ...dateFilter, endDate: e.target.value });
                    setPeriodFilter("custom");
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee">Employee</Label>
                <Input
                  id="employee"
                  placeholder="Search employee..."
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job">Job Number</Label>
                <Input
                  id="job"
                  placeholder="Search job..."
                  value={jobFilter}
                  onChange={(e) => setJobFilter(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Select
                  value={provinceFilter}
                  onValueChange={setProvinceFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All provinces" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {uniqueProvinceNames.map((province) => (
                      <SelectItem key={province} value={province}>
                        {province}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
              {(dateFilter.startDate ||
                dateFilter.endDate ||
                employeeFilter ||
                jobFilter ||
                provinceFilter) && (
                <Badge variant="secondary">
                  {filteredSummaries.length} of {timeEntrySummaries.length}{" "}
                  entries
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats for Filtered Period */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Filtered Entries
                </p>
                <p className="text-2xl font-bold">{filteredSummaries.length}</p>
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
                <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
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
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="employee" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employee">By Employee</TabsTrigger>
          <TabsTrigger value="titleJob">By Title & Job</TabsTrigger>
          <TabsTrigger value="dateName">By Date & Name</TabsTrigger>
          <TabsTrigger value="hourTypes">By Hour Type</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="employee">
          <Card>
            <CardHeader>
              <CardTitle>Summary by Employee</CardTitle>
              <CardDescription>
                Total hours by employee with hour type breakdown for selected
                period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeeSummariesWithHourTypes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
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
                      <TableHead>Total Cost</TableHead>
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
                        <TableCell className="font-medium text-green-600">
                          ${employee.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                            <div>
                              {new Date(
                                employee.dateRange.earliest,
                              ).toLocaleDateString()}
                            </div>
                            <div>
                              to{" "}
                              {new Date(
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
          <Card>
            <CardHeader>
              <CardTitle>Summary by Title and Job Number</CardTitle>
              <CardDescription>
                Hours breakdown by employee title and job number with hour type
                details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTitleJobSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
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
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTitleJobSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.title}-${summary.jobNumber}-${index}`}
                      >
                        <TableCell className="font-medium">
                          {summary.title}
                        </TableCell>
                        <TableCell>{summary.jobNumber}</TableCell>
                        <TableCell>{summary.jobName}</TableCell>
                        <TableCell>
                          <HourTypeBreakdownDisplay
                            breakdown={summary.hourTypeBreakdown}
                          />
                        </TableCell>
                        <TableCell>{summary.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
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

        <TabsContent value="dateName">
          <Card>
            <CardHeader>
              <CardTitle>Summary by Date and Employee Name</CardTitle>
              <CardDescription>
                Hours breakdown by date and employee with hour type details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDateNameSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
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
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDateNameSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.date}-${summary.employeeName}-${index}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(summary.date!).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {summary.employeeName}
                        </TableCell>
                        <TableCell>
                          <HourTypeBreakdownDisplay
                            breakdown={summary.hourTypeBreakdown}
                          />
                        </TableCell>
                        <TableCell>{summary.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
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

        <TabsContent value="hourTypes">
          <Card>
            <CardHeader>
              <CardTitle>Summary by Hour Type</CardTitle>
              <CardDescription>
                Overall breakdown of hours by type for selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(overallHourTypeBreakdown).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hour Type</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>% of Total Hours</TableHead>
                      <TableHead>% of Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(overallHourTypeBreakdown)
                      .sort(([, a], [, b]) => b.hours - a.hours)
                      .map(([hourType, data]) => (
                        <TableRow key={hourType}>
                          <TableCell className="font-medium">
                            <Badge variant="outline">{hourType}</Badge>
                          </TableCell>
                          <TableCell>{data.hours.toFixed(2)}</TableCell>
                          <TableCell>
                            {data.effectiveHours.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${data.cost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {((data.hours / totalHours) * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {((data.cost / totalCost) * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Time Entries</CardTitle>
              <CardDescription>
                All individual time entries with full details for selected
                period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters for the selected time
                  period.
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
                      <TableHead>Effective</TableHead>
                      <TableHead>Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummaries.map((summary, index) => (
                      <TableRow
                        key={`${summary.date}-${summary.employeeName}-${index}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(summary.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {summary.employeeName}
                        </TableCell>
                        <TableCell>{summary.employeeTitle}</TableCell>
                        <TableCell>{summary.jobNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.hourTypeName}
                          </Badge>
                        </TableCell>
                        <TableCell>{summary.provinceName}</TableCell>
                        <TableCell>{summary.hours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.effectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
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
