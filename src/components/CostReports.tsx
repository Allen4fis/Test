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
  Banknote,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function CostReports() {
  const {
    costSummaryByEmployee,
    costSummaryByJob,
    timeEntrySummaries,
    rentalSummaries,
    employees,
  } = useTimeTracking();

  // Calculate total costs and billable amounts including rentals
  const totalLaborCost = timeEntrySummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalBillableAmount = timeEntrySummaries.reduce(
    (sum, summary) => sum + summary.totalBillableAmount,
    0,
  );
  const totalRentalRevenue = rentalSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const totalCost = totalLaborCost; // Only labor costs, rentals are revenue
  const totalRevenue = totalBillableAmount + totalRentalRevenue; // Labor billable + rental revenue
  const profit = totalRevenue - totalCost;
  const totalEffectiveHours = timeEntrySummaries.reduce(
    (sum, summary) => sum + summary.effectiveHours,
    0,
  );
  const totalLoaCount = timeEntrySummaries.reduce(
    (sum, summary) => sum + (summary.loaCount || 0),
    0,
  );
  const totalLoaAmount = totalLoaCount * 200;
  const averageCostRate =
    totalEffectiveHours > 0 ? totalLaborCost / totalEffectiveHours : 0;
  const averageBillableRate =
    totalEffectiveHours > 0 ? totalBillableAmount / totalEffectiveHours : 0;

  return (
    <div className="space-y-6">
      {/* Cost Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Rental Revenue
                </p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalRentalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-red-600">
                  ${totalCost.toFixed(2)}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  Labor Costs Only (Rentals are Revenue)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp
                className={`h-5 w-5 ${profit >= 0 ? "text-green-500" : "text-red-500"}`}
              />
              <div>
                <p className="text-sm font-medium text-gray-600">Profit</p>
                <p
                  className={`text-2xl font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  ${profit.toFixed(2)}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  {totalRevenue > 0
                    ? ((profit / totalRevenue) * 100).toFixed(1)
                    : "0.0"}
                  % margin
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
                  Avg Cost Rate
                </p>
                <p className="text-2xl font-bold text-red-600">
                  ${averageCostRate.toFixed(2)}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  Billable: ${averageBillableRate.toFixed(2)}
                </div>
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
                <div className="text-xs text-gray-500 mt-1">
                  Jobs: {costSummaryByJob.length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Live Out Allowance
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalLoaCount}
                </p>
                <div className="text-xs text-gray-500 mt-1">
                  ${totalLoaAmount.toFixed(2)} total
                </div>
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
          <TabsTrigger value="rentals">Rental Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Labor Costs by Employee</CardTitle>
              <CardDescription>
                Total costs and billable amounts for each employee including
                wage rates and multipliers
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
                      <TableHead>Billable Rate</TableHead>
                      <TableHead>Cost Rate</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Effective Hours</TableHead>
                      <TableHead className="text-purple-600">
                        LOA Count
                      </TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>Entries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costSummaryByEmployee.map((employee, index) => {
                      const employeeProfit =
                        employee.totalBillableAmount - employee.totalCost;
                      const employeeLoaCount = employee.entries.reduce(
                        (sum, entry) => sum + (entry.loaCount || 0),
                        0,
                      );
                      return (
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
                            ${(employee.billableWage || 0).toFixed(2)}/hr
                          </TableCell>
                          <TableCell className="font-medium text-red-600">
                            ${(employee.costWage || 0).toFixed(2)}/hr
                          </TableCell>
                          <TableCell>
                            {employee.totalHours.toFixed(1)}
                          </TableCell>
                          <TableCell>
                            {employee.totalEffectiveHours.toFixed(1)}
                          </TableCell>
                          <TableCell>
                            {employeeLoaCount > 0 ? (
                              <div className="flex items-center gap-1">
                                <Badge
                                  variant="secondary"
                                  className="bg-purple-100 text-purple-800"
                                >
                                  {employeeLoaCount}
                                </Badge>
                                <span className="text-xs text-purple-600">
                                  ${(employeeLoaCount * 200).toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            ${employee.totalBillableAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-bold text-red-600">
                            ${employee.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell
                            className={`font-bold ${employeeProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            ${employeeProfit.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {employee.entries.length}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell colSpan={5}>Total</TableCell>
                      <TableCell>
                        {costSummaryByEmployee
                          .reduce(
                            (sum, emp) => sum + emp.totalEffectiveHours,
                            0,
                          )
                          .toFixed(1)}
                      </TableCell>
                      <TableCell className="text-purple-600">
                        {costSummaryByEmployee.reduce((sum, emp) => {
                          const loaCount = emp.entries.reduce(
                            (entrySum, entry) =>
                              entrySum + (entry.loaCount || 0),
                            0,
                          );
                          return sum + loaCount;
                        }, 0)}
                      </TableCell>
                      <TableCell className="text-green-600">
                        $
                        {costSummaryByEmployee
                          .reduce(
                            (sum, emp) => sum + emp.totalBillableAmount,
                            0,
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell className="text-red-600">
                        $
                        {costSummaryByEmployee
                          .reduce((sum, emp) => sum + emp.totalCost, 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        $
                        {(
                          costSummaryByEmployee.reduce(
                            (sum, emp) => sum + emp.totalBillableAmount,
                            0,
                          ) -
                          costSummaryByEmployee.reduce(
                            (sum, emp) => sum + emp.totalCost,
                            0,
                          )
                        ).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {costSummaryByEmployee.reduce(
                            (sum, emp) => sum + emp.entries.length,
                            0,
                          )}
                        </Badge>
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
              <CardTitle>Costs by Job</CardTitle>
              <CardDescription>
                Labor costs breakdown for each job including employee details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {costSummaryByJob.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No cost data available. Add time entries to see job costs.
                </div>
              ) : (
                <div className="space-y-4">
                  {costSummaryByJob.map((job, index) => (
                    <Card key={job.jobId}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                            <div>
                              <span className="text-lg">
                                {job.jobNumber} - {job.jobName}
                              </span>
                              <div className="text-sm text-gray-500 font-normal">
                                {job.totalHours.toFixed(1)} hours •{" "}
                                {job.totalEffectiveHours.toFixed(1)} effective
                                hours
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">
                              ${job.totalCost.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {job.entries.length} entries
                            </div>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Employee</TableHead>
                              <TableHead>Hours</TableHead>
                              <TableHead>Effective Hours</TableHead>
                              <TableHead className="text-purple-600">
                                LOA Count
                              </TableHead>
                              <TableHead>Cost</TableHead>
                              <TableHead>% of Job</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {job.employees.map((emp) => {
                              // Calculate LOA count for this employee in this job
                              const empLoaCount = job.entries
                                .filter((entry) => {
                                  const employee = employees.find(
                                    (e) => e.id === entry.employeeId,
                                  );
                                  return employee?.name === emp.employeeName;
                                })
                                .reduce(
                                  (sum, entry) => sum + (entry.loaCount || 0),
                                  0,
                                );

                              return (
                                <TableRow key={emp.employeeName}>
                                  <TableCell>{emp.employeeName}</TableCell>
                                  <TableCell>{emp.hours.toFixed(1)}</TableCell>
                                  <TableCell>
                                    {emp.effectiveHours.toFixed(1)}
                                  </TableCell>
                                  <TableCell>
                                    {empLoaCount > 0 ? (
                                      <div className="flex items-center gap-1">
                                        <Badge
                                          variant="secondary"
                                          className="bg-purple-100 text-purple-800"
                                        >
                                          {empLoaCount}
                                        </Badge>
                                        <span className="text-xs text-purple-600">
                                          ${(empLoaCount * 200).toFixed(2)}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 text-sm">
                                        —
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium text-red-600">
                                    ${emp.cost.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">
                                      {(
                                        (emp.cost / job.totalCost) *
                                        100
                                      ).toFixed(1)}
                                      %
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rentals">
          <Card>
            <CardHeader>
              <CardTitle>Rental Revenue Analysis</CardTitle>
              <CardDescription>
                Equipment and rental revenue breakdown by job and category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rentalSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental data available. Add rental entries to see costs.
                </div>
              ) : (
                <Tabs defaultValue="jobs" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="jobs">By Job</TabsTrigger>
                    <TabsTrigger value="categories">By Category</TabsTrigger>
                  </TabsList>

                  <TabsContent value="jobs">
                    <div className="space-y-4">
                      {Object.entries(
                        rentalSummaries.reduce(
                          (acc, rental) => {
                            const key = `${rental.jobNumber}-${rental.jobName}`;
                            if (!acc[key]) {
                              acc[key] = {
                                jobNumber: rental.jobNumber,
                                jobName: rental.jobName,
                                totalCost: 0,
                                rentalCount: 0,
                                rentals: [],
                              };
                            }
                            acc[key].totalCost += rental.totalCost;
                            acc[key].rentalCount += 1;
                            acc[key].rentals.push(rental);
                            return acc;
                          },
                          {} as Record<string, any>,
                        ),
                      )
                        .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                        .map(([key, summary]) => (
                          <Card key={key}>
                            <CardHeader>
                              <CardTitle className="flex items-center justify-between">
                                <div>
                                  <span className="text-lg">
                                    {summary.jobNumber} - {summary.jobName}
                                  </span>
                                  <div className="text-sm text-gray-500 font-normal">
                                    {summary.rentalCount} rentals
                                  </div>
                                </div>
                                <div className="text-2xl font-bold text-orange-600">
                                  ${summary.totalCost.toFixed(2)}
                                </div>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Cost</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {summary.rentals.map((rental: any) => (
                                    <TableRow key={rental.id}>
                                      <TableCell>
                                        {rental.rentalItemName}
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline">
                                          {rental.category}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {rental.duration} {rental.billingUnit}
                                        {rental.duration !== 1 ? "s" : ""}
                                        {rental.quantity > 1 &&
                                          ` × ${rental.quantity}`}
                                      </TableCell>
                                      <TableCell>
                                        ${rental.rateUsed.toFixed(2)}/
                                        {rental.billingUnit}
                                      </TableCell>
                                      <TableCell className="font-medium text-orange-600">
                                        ${rental.totalCost.toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="categories">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(
                        rentalSummaries.reduce(
                          (acc, rental) => {
                            const key = rental.category;
                            if (!acc[key]) {
                              acc[key] = {
                                category: rental.category,
                                totalCost: 0,
                                rentalCount: 0,
                              };
                            }
                            acc[key].totalCost += rental.totalCost;
                            acc[key].rentalCount += 1;
                            return acc;
                          },
                          {} as Record<string, any>,
                        ),
                      )
                        .sort(([, a], [, b]) => b.totalCost - a.totalCost)
                        .map(([key, summary]) => (
                          <Card key={key}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">
                                    {summary.category}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    {summary.rentalCount} rentals
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-orange-600">
                                    ${summary.totalCost.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {totalRentalCost > 0
                                      ? (
                                          (summary.totalCost /
                                            totalRentalCost) *
                                          100
                                        ).toFixed(1)
                                      : "0.0"}
                                    %
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
