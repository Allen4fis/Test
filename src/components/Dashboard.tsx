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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Briefcase,
  Clock,
  Calendar,
  TrendingUp,
  MapPin,
  RotateCcw,
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
    resetData,
  } = useTimeTracking();

  const summaries = timeEntrySummaries;
  const titleJobSummaries = summaryByTitleAndJob;

  // Calculate statistics
  const totalHours = summaries.reduce((sum, summary) => sum + summary.hours, 0);
  const totalEffectiveHours = summaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );
  const activeJobs = jobs.filter((job) => job.isActive);

  // Recent activity (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentEntries = timeEntries.filter(entry =>
    new Date(entry.date) >= threeDaysAgo
  ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    .slice(0, 10);

  // Top employees by hours this month
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
        };
      }
      acc[summary.employeeName].hours += summary.hours;
      acc[summary.employeeName].effectiveHours += summary.effectiveHours;
      return acc;
    },
    {} as Record<
      string,
      { name: string; title: string; hours: number; effectiveHours: number }
    >,
  );

  const topEmployees = Object.values(employeeHours)
    .sort((a, b) => b.effectiveHours - a.effectiveHours)
    .slice(0, 5);

  // Top jobs by hours this month
  const jobHours = thisMonthEntries.reduce(
    (acc, summary) => {
      if (!acc[summary.jobNumber]) {
        acc[summary.jobNumber] = {
          jobNumber: summary.jobNumber,
          jobName: summary.jobName,
          hours: 0,
          effectiveHours: 0,
        };
      }
      acc[summary.jobNumber].hours += summary.hours;
      acc[summary.jobNumber].effectiveHours += summary.effectiveHours;
      return acc;
    },
    {} as Record<
      string,
      {
        jobNumber: string;
        jobName: string;
        hours: number;
        effectiveHours: number;
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

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Employees
                </p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold">{activeJobs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Effective Hours
                </p>
                <p className="text-2xl font-bold">
                  {totalEffectiveHours.toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Management */}
      {hourTypes.length > 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              You have old hour types data. Reset to use the new simplified hour
              types.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Current hour types: {hourTypes.length} (Expected: 5)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Reset will clear all data and apply the new simplified hour
                  types: Regular Time, Overtime, Double Time, Travel Hours, and
                  LOA.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all employees, jobs, and time
                      entries, and apply the new simplified hour types. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={resetData}>
                      Reset Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Employees This Month */}
        <Card>
          <CardHeader>
            <CardTitle>Top Employees This Month</CardTitle>
            <CardDescription>Ranked by effective hours worked</CardDescription>
          </CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No time entries this month.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topEmployees.map((employee, index) => (
                    <TableRow key={employee.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-800"
                                : index === 1
                                  ? "bg-gray-100 text-gray-800"
                                  : index === 2
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {employee.name}
                        </div>
                      </TableCell>
                      <TableCell>{employee.title}</TableCell>
                      <TableCell>{employee.hours.toFixed(1)}</TableCell>
                      <TableCell>
                        {employee.effectiveHours.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Jobs This Month */}
        <Card>
          <CardHeader>
            <CardTitle>Top Jobs This Month</CardTitle>
            <CardDescription>Ranked by effective hours worked</CardDescription>
          </CardHeader>
          <CardContent>
            {topJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No time entries this month.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job Number</TableHead>
                    <TableHead>Job Name</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Effective</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topJobs.map((job, index) => (
                    <TableRow key={job.jobNumber}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-800"
                                : index === 1
                                  ? "bg-gray-100 text-gray-800"
                                  : index === 2
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {index + 1}
                          </span>
                          {job.jobNumber}
                        </div>
                      </TableCell>
                      <TableCell>{job.jobName}</TableCell>
                      <TableCell>{job.hours.toFixed(1)}</TableCell>
                      <TableCell>{job.effectiveHours.toFixed(1)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest time entries from the past 3 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getEmployeeName(entry.employeeId)}
                    </TableCell>
                    <TableCell>{getJobNumber(entry.jobId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getHourTypeName(entry.hourTypeId)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getProvinceName(entry.provinceId)}
                      </div>
                    </TableCell>
                    <TableCell>{entry.hours.toFixed(2)}</TableCell>
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