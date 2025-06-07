import { useState } from "react";
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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function SummaryReports() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    getTimeEntrySummaries,
    getSummaryByTitleAndJob,
    getSummaryByDateAndName,
  } = useTimeTracking();

  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: "",
  });
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [jobFilter, setJobFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  const summaries = getTimeEntrySummaries();
  const titleJobSummaries = getSummaryByTitleAndJob();
  const dateNameSummaries = getSummaryByDateAndName();

  // Apply filters
  const filteredSummaries = summaries.filter((summary) => {
    const matchesDate =
      (!dateFilter.startDate || summary.date >= dateFilter.startDate) &&
      (!dateFilter.endDate || summary.date <= dateFilter.endDate);
    const matchesEmployee =
      !employeeFilter ||
      summary.employeeName.toLowerCase().includes(employeeFilter.toLowerCase());
    const matchesJob =
      !jobFilter ||
      summary.jobNumber.toLowerCase().includes(jobFilter.toLowerCase());
    const matchesProvince =
      !provinceFilter ||
      provinceFilter === "all" ||
      summary.provinceName === provinceFilter;

    return matchesDate && matchesEmployee && matchesJob && matchesProvince;
  });

  const filteredTitleJobSummaries = titleJobSummaries.filter((summary) => {
    const hasMatchingEntries = summary.entries.some((entry) => {
      const entrySummary = summaries.find(
        (s) =>
          s.date === entry.date &&
          employees.find((e) => e.id === entry.employeeId)?.name ===
            s.employeeName,
      );
      return entrySummary && filteredSummaries.includes(entrySummary);
    });
    return hasMatchingEntries;
  });

  const filteredDateNameSummaries = dateNameSummaries.filter((summary) => {
    const hasMatchingEntries = summary.entries.some((entry) => {
      const entrySummary = summaries.find(
        (s) =>
          s.date === entry.date &&
          employees.find((e) => e.id === entry.employeeId)?.name ===
            s.employeeName,
      );
      return entrySummary && filteredSummaries.includes(entrySummary);
    });
    return hasMatchingEntries;
  });

  // Calculate totals
  const totalHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.hours,
    0,
  );
  const totalEffectiveHours = filteredSummaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );

  const clearFilters = () => {
    setDateFilter({ startDate: "", endDate: "" });
    setEmployeeFilter("");
    setJobFilter("");
    setProvinceFilter("");
  };

  const uniqueProvinceNames = [
    ...new Set(summaries.map((s) => s.provinceName)),
  ].sort();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter reports by date range, employee, job, or province
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, startDate: e.target.value })
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
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
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
          <div className="mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
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
              <Users className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Unique Employees
                </p>
                <p className="text-2xl font-bold">
                  {new Set(filteredSummaries.map((s) => s.employeeName)).size}
                </p>
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
                Total hours grouped by employee title and job number
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTitleJobSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters.
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
                      <TableHead>Entries</TableHead>
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
                        <TableCell>{summary.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          {summary.totalEffectiveHours.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
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

        <TabsContent value="dateName">
          <Card>
            <CardHeader>
              <CardTitle>Summary by Date and Employee Name</CardTitle>
              <CardDescription>
                Total hours grouped by date and employee name
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredDateNameSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee Name</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Entries</TableHead>
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
                        <TableCell>
                          <Badge variant="outline">
                            {summary.entries.length}
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
                All individual time entries with full details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No data matches the current filters.
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
