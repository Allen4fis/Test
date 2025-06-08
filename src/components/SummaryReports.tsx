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

export function SummaryReports() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    timeEntrySummaries,
    summaryByTitleAndJob,
    summaryByDateAndName,
  } = useTimeTracking();

  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all"); // New quick period filter

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

  // Filtered summaries for Title & Job view
  const filteredTitleJobSummaries = useMemo(() => {
    // Group filtered entries by title and job
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
            entries: [],
          };
        }

        acc[key].totalHours += summary.hours;
        acc[key].totalEffectiveHours += summary.effectiveHours;
        acc[key].totalCost += summary.totalCost;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped).sort((a: any, b: any) =>
      a.title.localeCompare(b.title),
    );
  }, [filteredSummaries]);

  // Filtered summaries for Date & Name view
  const filteredDateNameSummaries = useMemo(() => {
    // Group filtered entries by date and name
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
            entries: [],
          };
        }

        acc[key].totalHours += summary.hours;
        acc[key].totalEffectiveHours += summary.effectiveHours;
        acc[key].totalCost += summary.totalCost;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(grouped).sort((a: any, b: any) => {
      const dateComparison = b.date.localeCompare(a.date); // Most recent first
      return dateComparison !== 0
        ? dateComparison
        : a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredSummaries]);

  // Calculate totals for filtered data
  const totalHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.hours,
    0,
  );
  const totalEffectiveHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );
  const totalCost = filteredSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );

  const clearFilters = () => {
    setDateFilter({ startDate: "", endDate: "" });
    setEmployeeFilter("");
    setJobFilter("");
    setProvinceFilter("");
    setPeriodFilter("all");
  };

  const uniqueProvinceNames = [
    ...new Set(timeEntrySummaries.map((s) => s.provinceName)),
  ].sort();

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
                  variant={periodFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("all")}
                >
                  All Time
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
                  variant={periodFilter === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickPeriod("month")}
                >
                  Last 30 Days
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
      <Tabs defaultValue="titleJob" className="space-y-4">
        <TabsList>
          <TabsTrigger value="titleJob">By Title & Job</TabsTrigger>
          <TabsTrigger value="dateName">By Date & Name</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Entries</TabsTrigger>
        </TabsList>

        <TabsContent value="titleJob">
          <Card>
            <CardHeader>
              <CardTitle>Summary by Title and Job Number</CardTitle>
              <CardDescription>
                Total hours grouped by employee title and job number for
                selected period
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
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTitleJobSummaries.map((summary: any, index) => (
                      <TableRow
                        key={`${summary.title}-${summary.jobNumber}-${index}`}
                      >
                        <TableCell className="font-medium">
                          {summary.title}
                        </TableCell>
                        <TableCell>{summary.jobNumber}</TableCell>
                        <TableCell>{summary.jobName}</TableCell>
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
                Total hours grouped by date and employee name for selected
                period
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
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Total Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDateNameSummaries.map((summary: any, index) => (
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
