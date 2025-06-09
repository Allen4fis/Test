import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Users,
  Briefcase,
  Clock,
  Calendar,
  TrendingUp,
  MapPin,
  RotateCcw,
  Award,
  Target,
  Zap,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function Dashboard() {
  const {
    employees,
    jobs,
    timeEntries,
    hourTypes,
    provinces,
    timeEntrySummaries,
    summaryByTitleAndJob,
  } = useTimeTracking();

  const summaries = timeEntrySummaries;
  const titleJobSummaries = summaryByTitleAndJob;

  // Calculate statistics (excluding LOA from hours totals)
  const totalHours = summaries
    .filter((summary) => summary.hourTypeName !== "LOA")
    .reduce((sum, summary) => sum + summary.hours, 0);
  const totalEffectiveHours = summaries
    .filter((summary) => summary.hourTypeName !== "LOA")
    .reduce((sum, summary) => sum + summary.effectiveHours, 0);
  const totalCost = summaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const activeJobs = jobs.filter((job) => job.isActive);

  // Recent activity (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentEntries = timeEntries
    .filter((entry) => new Date(entry.date) >= threeDaysAgo)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  // Top employees by hours this month (excluding LOA from hours totals)
  const monthStart = new Date();
  monthStart.setDate(1);
  const thisMonthEntries = summaries.filter(
    (summary) => new Date(summary.date) >= monthStart,
  );

  const employeeHours = thisMonthEntries.reduce(
    (acc, summary) => {
      if (!acc[summary.employeeName]) {
        acc[summary.employeeName] = {
          name: summary.employeeName,
          title: summary.employeeTitle,
          hours: 0,
          effectiveHours: 0,
          cost: 0,
        };
      }
      // Don't include LOA hours in employee hours totals
      if (summary.hourTypeName !== "LOA") {
        acc[summary.employeeName].hours += summary.hours;
        acc[summary.employeeName].effectiveHours += summary.effectiveHours;
      }
      acc[summary.employeeName].cost += summary.totalCost;
      return acc;
    },
    {} as Record<
      string,
      {
        name: string;
        title: string;
        hours: number;
        effectiveHours: number;
        cost: number;
      }
    >,
  );

  const topEmployees = Object.values(employeeHours)
    .sort((a, b) => b.effectiveHours - a.effectiveHours)
    .slice(0, 5);

  // Top jobs by hours this month (excluding LOA from hours totals)
  const jobHours = thisMonthEntries.reduce(
    (acc, summary) => {
      if (!acc[summary.jobNumber]) {
        acc[summary.jobNumber] = {
          jobNumber: summary.jobNumber,
          jobName: summary.jobName,
          hours: 0,
          effectiveHours: 0,
          cost: 0,
        };
      }
      // Don't include LOA hours in job hours totals
      if (summary.hourTypeName !== "LOA") {
        acc[summary.jobNumber].hours += summary.hours;
        acc[summary.jobNumber].effectiveHours += summary.effectiveHours;
      }
      acc[summary.jobNumber].cost += summary.totalCost;
      return acc;
    },
    {} as Record<
      string,
      {
        jobNumber: string;
        jobName: string;
        hours: number;
        effectiveHours: number;
        cost: number;
      }
    >,
  );

  const topJobs = Object.values(jobHours)
    .sort((a, b) => b.effectiveHours - a.effectiveHours)
    .slice(0, 5);

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    return employee ? employee.name : "Unknown Employee";
  };

  const getJobNumber = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.jobNumber : "Unknown Job";
  };

  const getHourTypeName = (hourTypeId: string) => {
    const hourType = hourTypes.find((ht) => ht.id === hourTypeId);
    return hourType ? hourType.name : "Unknown Type";
  };

  const getProvinceName = (provinceId: string) => {
    const province = provinces.find((p) => p.id === provinceId);
    return province ? province.code : "Unknown";
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    description,
    gradient,
    iconColor,
  }: {
    icon: any;
    title: string;
    value: string | number;
    description: string;
    gradient: string;
    iconColor: string;
  }) => (
    <Card className="modern-card border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Dashboard Overview
        </h1>
        <p className="text-muted-foreground">
          Monitor your team's productivity and project performance
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={employees.length}
          description="Active team members"
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          iconColor="text-white"
        />
        <StatCard
          icon={Briefcase}
          title="Active Jobs"
          value={activeJobs.length}
          description="Current projects"
          gradient="bg-gradient-to-br from-green-500 to-green-600"
          iconColor="text-white"
        />
        <StatCard
          icon={Clock}
          title="Total Hours"
          value={totalHours.toFixed(0)}
          description="Hours logged"
          gradient="orange-gradient"
          iconColor="text-white"
        />
        <StatCard
          icon={TrendingUp}
          title="Total Cost"
          value={`$${totalCost.toFixed(0)}`}
          description="Labor expenses"
          gradient="dark-gradient"
          iconColor="text-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Employees This Month */}
        <Card className="modern-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Award className="h-5 w-5 text-primary" />
              Top Employees This Month
            </CardTitle>
            <CardDescription>Ranked by effective hours worked</CardDescription>
          </CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time entries this month.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEmployees.map((employee, index) => (
                    <TableRow
                      key={employee.name}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                                : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                                  : index === 2
                                    ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                                    : "bg-gradient-to-br from-blue-400 to-blue-500 text-blue-900"
                            } shadow-md`}
                          >
                            {index + 1}
                          </span>
                          <span>{employee.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-muted text-muted-foreground"
                        >
                          {employee.title}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {employee.effectiveHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ${employee.cost.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Jobs This Month */}
        <Card className="modern-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Target className="h-5 w-5 text-primary" />
              Top Jobs This Month
            </CardTitle>
            <CardDescription>Ranked by effective hours worked</CardDescription>
          </CardHeader>
          <CardContent>
            {topJobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No time entries this month.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topJobs.map((job, index) => (
                    <TableRow
                      key={job.jobNumber}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0
                                ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-yellow-900"
                                : index === 1
                                  ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800"
                                  : index === 2
                                    ? "bg-gradient-to-br from-orange-400 to-orange-500 text-orange-900"
                                    : "bg-gradient-to-br from-blue-400 to-blue-500 text-blue-900"
                            } shadow-md`}
                          >
                            {index + 1}
                          </span>
                          <span>{job.jobNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">
                          {job.jobName}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">
                        {job.effectiveHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        ${job.cost.toFixed(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="modern-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest time entries from the past 3 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity in the past 3 days.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-purple-600">
                    Live Out Allowance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {getEmployeeName(entry.employeeId)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-primary/20 text-primary"
                      >
                        {getJobNumber(entry.jobId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground"
                      >
                        {getHourTypeName(entry.hourTypeId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{getProvinceName(entry.provinceId)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {entry.hours.toFixed(2)}h
                    </TableCell>
                    <TableCell>
                      {entry.loaCount && entry.loaCount > 0 ? (
                        <div className="flex items-center gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-purple-100 text-purple-800"
                          >
                            {entry.loaCount} × $200
                          </Badge>
                          <span className="text-xs text-purple-600 font-medium">
                            = ${(entry.loaCount * 200).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
