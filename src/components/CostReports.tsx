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
import {
  DollarSign,
  Users,
  Briefcase,
  TrendingUp,
  Calculator,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function CostReports() {
  const {
    costSummaryByEmployee,
    costSummaryByJob,
    timeEntrySummaries,
    rentalSummaries,
  } = useTimeTracking();

  // Calculate total costs including rentals
  const totalLaborCost = timeEntrySummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalRentalCost = rentalSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalCost = totalLaborCost + totalRentalCost;
  const totalEffectiveHours = timeEntrySummaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );
  const averageHourlyRate =
    totalEffectiveHours > 0 ? totalLaborCost / totalEffectiveHours : 0;

  return (
    <div className="space-y-6">
      {/* Cost Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
                <div className="text-xs text-gray-500 mt-1">
                  Labor: ${totalLaborCost.toFixed(2)} | Rentals: $
                  {totalRentalCost.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Hourly Rate
                </p>
                <p className="text-2xl font-bold">
                  ${averageHourlyRate.toFixed(2)}
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
                  Active Employees
                </p>
                <p className="text-2xl font-bold">
                  {costSummaryByEmployee.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold">{costSummaryByJob.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Reports Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">Cost by Employee</TabsTrigger>
          <TabsTrigger value="jobs">Cost by Job</TabsTrigger>
          <TabsTrigger value="rentals">Rental Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Labor Costs by Employee</CardTitle>
              <CardDescription>
                Total costs for each employee including hourly wages and
                multipliers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costSummaryByEmployee.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cost data available. Add time entries to see employee
                  costs.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Hourly Wage</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costSummaryByEmployee.map((employee, index) => (
                      <TableRow key={employee.employeeId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                index === 0
                                  ? "bg-green-100 text-green-800"
                                  : index === 1
                                    ? "bg-blue-100 text-blue-800"
                                    : index === 2
                                      ? "bg-purple-100 text-purple-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {index + 1}
                            </span>
                            {employee.employeeName}
                          </div>
                        </TableCell>
                        <TableCell>{employee.employeeTitle}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          ${employee.hourlyWage.toFixed(2)}/hr
                        </TableCell>
                        <TableCell>{employee.totalHours.toFixed(1)}</TableCell>
                        <TableCell>
                          {employee.totalEffectiveHours.toFixed(1)}
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ${employee.totalCost.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {employee.entries.length}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={4}>Total</TableCell>
                      <TableCell>
                        {costSummaryByEmployee
                          .reduce(
                            (sum, emp) => sum + emp.totalEffectiveHours,
                            0,
                          )
                          .toFixed(1)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {costSummaryByEmployee
                          .reduce((sum, emp) => sum + emp.totalCost, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {costSummaryByEmployee.reduce(
                          (sum, emp) => sum + emp.entries.length,
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

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle>Labor Costs by Job</CardTitle>
              <CardDescription>
                Total labor costs for each job with employee breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costSummaryByJob.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cost data available. Add time entries to see job costs.
                </div>
              ) : (
                <div className="space-y-6">
                  {costSummaryByJob.map((job, index) => (
                    <Card
                      key={job.jobId}
                      className="border-l-4 border-l-blue-500"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {job.jobNumber} - {job.jobName}
                            </CardTitle>
                            <CardDescription>
                              {job.totalHours.toFixed(1)} hours (
                              {job.totalEffectiveHours.toFixed(1)} effective) •{" "}
                              {job.employees.length} employees
                            </CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${job.totalCost.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              Total Labor Cost
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Effective Hours</TableHead>
                              <TableHead>Cost</TableHead>
                              <TableHead>% of Job</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {job.employees
                              .sort((a, b) => b.cost - a.cost)
                              .map((employee) => (
                                <TableRow key={employee.employeeName}>
                                  <TableCell className="font-medium">
                                    {employee.employeeName}
                                  </TableCell>
                                  <TableCell>
                                    {employee.hours.toFixed(1)}
                                  </TableCell>
                                  <TableCell>
                                    {employee.effectiveHours.toFixed(1)}
                                  </TableCell>
                                  <TableCell className="font-medium text-green-600">
                                    ${employee.cost.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {(
                                        (employee.cost / job.totalCost) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Summary totals */}
                  <Card className="bg-gray-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">
                            Total Across All Jobs
                          </h3>
                          <p className="text-sm text-gray-600">
                            {costSummaryByJob
                              .reduce((sum, job) => sum + job.totalHours, 0)
                              .toFixed(1)}{" "}
                            hours (
                            {costSummaryByJob
                              .reduce(
                                (sum, job) => sum + job.totalEffectiveHours,
                                0,
                              )
                              .toFixed(1)}{" "}
                            effective)
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">
                            $
                            {costSummaryByJob
                              .reduce((sum, job) => sum + job.totalCost, 0)
                              .toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Total Labor Cost
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
