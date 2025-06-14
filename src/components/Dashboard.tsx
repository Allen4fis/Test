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
  TrendingDown,
  MapPin,
  RotateCcw,
  Award,
  Target,
  Zap,
  BarChart3,
  Activity,
  DollarSign,
  PiggyBank,
  Calculator,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";
import {
  safeNumber,
  safeDivide,
  safeArray,
  safeArrayReduce,
  withErrorBoundary,
} from "@/utils/systemReliability";

interface DashboardProps {
  autosaveInfo?: {
    isEnabled: boolean;
    lastSaveTime: string | null;
    autosaveCount: number;
  };
  triggerManualSave?: () => {
    success: boolean;
    timestamp?: string;
    error?: string;
  };
}

export function Dashboard({
  autosaveInfo,
  triggerManualSave,
}: DashboardProps = {}) {
  const {
    employees,
    jobs,
    timeEntries,
    hourTypes,
    provinces,
    timeEntrySummaries,
    rentalSummaries,
    summaryByTitleAndJob,
    getAutosaveInfo,
  } = useTimeTracking();

  // Get recent entries (last 7 days) with safe array operations
  const getRecentEntries = () => {
    return withErrorBoundary(
      () => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        return safeArray(timeEntrySummaries)
          .filter((summary) => {
            try {
              const entryDate = parseLocalDate(summary?.date);
              return entryDate >= sevenDaysAgo;
            } catch {
              return false;
            }
          })
          .sort((a, b) => {
            try {
              return (
                new Date(b?.date || 0).getTime() -
                new Date(a?.date || 0).getTime()
              );
            } catch {
              return 0;
            }
          })
          .slice(0, 5);
      },
      [],
      "Error getting recent entries",
    );
  };

  // Get top 5 invoices by billable total with safe calculations
  const getTopInvoices = () => {
    return withErrorBoundary(
      () => {
        const jobInvoiceData = safeArray(jobs)
          .filter((job) => job?.isBillable !== false) // Only include billable jobs
          .map((job) => {
            // Get time entries for this job with safe operations
            const jobTimeEntries = safeArray(timeEntrySummaries).filter(
              (entry) => entry?.jobNumber === job?.jobNumber,
            );

            // Get rental entries for this job with safe operations
            const jobRentalEntries = safeArray(rentalSummaries).filter(
              (entry) => entry?.jobNumber === job?.jobNumber,
            );

            // Calculate total billable (labor + rentals) with safe operations
            const laborBillable = safeArrayReduce(
              jobTimeEntries,
              (sum, entry) =>
                sum +
                safeNumber(entry?.totalBillableAmount || entry?.totalCost, 0),
              0,
            );

            const rentalBillable = safeArrayReduce(
              jobRentalEntries,
              (sum, entry) => sum + safeNumber(entry?.totalBillable, 0),
              0,
            );

            const totalBillable =
              safeNumber(laborBillable) + safeNumber(rentalBillable);

            // Calculate total cost (for profit calculation) with safe operations
            const laborCost = safeArrayReduce(
              jobTimeEntries,
              (sum, entry) => sum + safeNumber(entry?.totalCost, 0),
              0,
            );

            const rentalCost = safeArrayReduce(
              jobRentalEntries,
              (sum, entry) => sum + safeNumber(entry?.totalCost, 0),
              0,
            );

            const totalCost = safeNumber(laborCost) + safeNumber(rentalCost);

            // Calculate profit percentage with safe division
            const profitAmount = totalBillable - totalCost;
            const profitPercentage = safeDivide(
              profitAmount * 100,
              totalBillable,
              0,
            );

            return {
              jobNumber: job?.jobNumber || "Unknown",
              jobName: job?.name || "Unknown Job",
              totalBillable,
              totalCost,
              profitAmount,
              profitPercentage,
            };
          })
          .filter((invoice) => safeNumber(invoice?.totalBillable) > 0) // Only jobs with billable amounts
          .sort(
            (a, b) =>
              safeNumber(b?.totalBillable) - safeNumber(a?.totalBillable),
          ) // Sort by highest billable
          .slice(0, 5); // Top 5

        return jobInvoiceData;
      },
      [],
      "Error calculating top invoices",
    );
  };

  // Calculate active metrics with safe operations
  const todaysEntries = withErrorBoundary(
    () =>
      safeArray(timeEntrySummaries).filter(
        (summary) => summary?.date === getTodayString(),
      ),
    [],
    "Error filtering today's entries",
  );

  const thisWeekEntries = withErrorBoundary(
    () =>
      safeArray(timeEntrySummaries).filter((summary) => {
        try {
          const entryDate = parseLocalDate(summary?.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return entryDate >= weekAgo;
        } catch {
          return false;
        }
      }),
    [],
    "Error filtering this week's entries",
  );

  const totalHours = withErrorBoundary(
    () =>
      safeArrayReduce(
        safeArray(timeEntrySummaries).filter(
          (summary) => summary?.hourTypeName !== "Live Out Allowance",
        ),
        (sum, summary) => sum + safeNumber(summary?.hours, 0),
        0,
      ),
    0,
    "Error calculating total hours",
  );

  // Filter for billable jobs only
  const billableJobNumbers = jobs
    .filter((job) => job.isBillable !== false)
    .map((job) => job.jobNumber);

  const billableTimeEntrySummaries = timeEntrySummaries.filter((summary) =>
    billableJobNumbers.includes(summary.jobNumber),
  );

  const billableRentalSummaries = rentalSummaries.filter((rental) =>
    billableJobNumbers.includes(rental.jobNumber),
  );

  // Calculate all-time totals including LOA and rentals (billable jobs only)
  const allTimeTotalCost = billableTimeEntrySummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const allTimeRentalBillable = billableRentalSummaries.reduce(
    (sum, rental) => sum + rental.totalBillable,
    0,
  );
  const allTimeRentalCost = billableRentalSummaries.reduce(
    (sum, rental) => sum + rental.totalCost,
    0,
  );
  const allTimeTotalBillable =
    billableTimeEntrySummaries.reduce(
      (sum, summary) =>
        sum + (summary.totalBillableAmount || summary.totalCost),
      0,
    ) + allTimeRentalBillable;
  const allTimeCombinedCost = allTimeTotalCost + allTimeRentalCost;

  // Calculate profit percentage
  const allTimeProfitAmount = allTimeTotalBillable - allTimeCombinedCost;
  const allTimeProfitPercentage =
    allTimeTotalBillable > 0
      ? (allTimeProfitAmount / allTimeTotalBillable) * 100
      : 0;

  // Calculate cost of non-billable jobs
  const nonBillableJobNumbers = jobs
    .filter((job) => job.isBillable === false)
    .map((job) => job.jobNumber);

  const nonBillableJobCosts = timeEntrySummaries
    .filter((summary) => nonBillableJobNumbers.includes(summary.jobNumber))
    .reduce((sum, summary) => sum + summary.totalCost, 0);

  const nonBillableRentalCosts = rentalSummaries
    .filter((rental) => {
      const job = jobs.find((j) => j.jobNumber === rental.jobNumber);
      return job?.isBillable === false;
    })
    .reduce((sum, rental) => sum + rental.totalBillable, 0); // For non-billable, use billable amount as cost

  const totalNonBillableCosts = nonBillableJobCosts + nonBillableRentalCosts;
  const activeEmployees = employees.length;

  // Most overworked employees (by hours this month)
  const performersArray = Object.values(
    timeEntrySummaries
      .filter((summary) => {
        const entryDate = parseLocalDate(summary.date);
        const monthAgo = new Date();
        monthAgo.setDate(monthAgo.getDate() - 30);
        return (
          entryDate >= monthAgo && summary.hourTypeName !== "Live Out Allowance"
        );
      })
      .reduce(
        (acc, summary) => {
          const key = summary.employeeName;
          if (!acc[key]) {
            acc[key] = { name: key, hours: 0, cost: 0 };
          }
          acc[key].hours += summary.hours;
          acc[key].cost += summary.totalCost;
          return acc;
        },
        {} as Record<string, { name: string; hours: number; cost: number }>,
      ),
  )
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5);

  const getHourTypeName = (hourTypeId: string) => {
    const hourType = hourTypes.find((ht) => ht.id === hourTypeId);
    return hourType ? hourType.name : "Unknown Type";
  };

  const currentAutosaveInfo = autosaveInfo || getAutosaveInfo();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gradient flex items-center justify-center gap-3">
          <div className="p-3 orange-gradient rounded-2xl shadow-2xl">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          Dashboard Overview
        </h1>
        <p className="text-gray-400 text-lg">
          Real-time insights into your workforce and project metrics
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Total Hours
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
              <Clock className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {totalHours.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 text-blue-400" />
              {thisWeekEntries.length} entries this week
            </p>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              All-Time Profit
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg group-hover:shadow-green-500/25 transition-all duration-300">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Cost:</span>
                <span className="text-lg font-bold text-red-400">
                  ${allTimeCombinedCost.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-gray-400">Billable:</span>
                <span className="text-lg font-bold text-green-400">
                  ${allTimeTotalBillable.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-gray-700 pt-2">
                <div
                  className={`text-2xl font-bold ${allTimeProfitPercentage >= 0 ? "text-blue-400" : "text-red-400"}`}
                >
                  {allTimeProfitPercentage >= 0 ? "+" : ""}
                  {allTimeProfitPercentage.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-400 mt-1 flex items-center">
                  <PiggyBank className="h-3 w-3 mr-1 text-blue-400" />
                  Including LOA & rentals
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Active Employees
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
              <Users className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              {activeEmployees}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <Target className="h-3 w-3 mr-1 text-purple-400" />
              Team members
            </p>
          </CardContent>
        </Card>

        <Card className="modern-card hover-scale group">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-gray-200">
              Cost of Non Billable Jobs
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
              <Calculator className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-400">
              ${totalNonBillableCosts.toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center">
              <TrendingDown className="h-3 w-3 mr-1 text-purple-400" />
              Internal project costs
            </p>
            {nonBillableJobNumbers.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {nonBillableJobNumbers.length} non-billable job
                {nonBillableJobNumbers.length !== 1 ? "s" : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* High Score - Top 5 Invoices */}
        <Card className="modern-card">
          <CardHeader
            className="border-b border-gray-700/50"
            style={{
              background:
                "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
            }}
          >
            <CardTitle className="flex items-center gap-3 text-gray-100">
              <PiggyBank className="h-5 w-5 text-pink-400" />
              Prize Piggies
            </CardTitle>
            <CardDescription className="text-gray-300">
              Oink Oink!
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {getTopInvoices().length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                <p>No invoice data available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {getTopInvoices().map((invoice, index) => (
                  <div
                    key={`${invoice.jobNumber}-${index}`}
                    className="p-4 hover:bg-gray-800/50 smooth-transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                            index === 0
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900"
                              : index === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900"
                                : index === 2
                                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                  : "bg-gradient-to-br from-gray-600 to-gray-800 text-white"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-100">
                            {invoice.jobNumber}
                          </div>
                          <div className="text-sm text-gray-400">
                            {invoice.jobName}
                          </div>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold text-green-400">
                          ${invoice.totalBillable.toFixed(2)}
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            invoice.profitPercentage >= 0
                              ? "text-blue-400"
                              : "text-red-400"
                          }`}
                        >
                          {invoice.profitPercentage >= 0 ? "+" : ""}
                          {invoice.profitPercentage.toFixed(2)}% profit
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Overworked Employees */}
        <Card className="modern-card">
          <CardHeader
            className="border-b border-gray-700/50"
            style={{
              background:
                "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
            }}
          >
            <CardTitle className="flex items-center gap-3 text-gray-100">
              <Award className="h-5 w-5 text-yellow-400" />
              Most Overworked Employees This Month
            </CardTitle>
            <CardDescription className="text-gray-300">
              Employees with the most hours worked in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {performersArray.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No data available</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {performersArray.map((performer, index) => (
                  <div
                    key={performer.name}
                    className="p-4 hover:bg-gray-800/50 smooth-transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                            index === 0
                              ? "bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900"
                              : index === 1
                                ? "bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900"
                                : index === 2
                                  ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                  : "bg-gradient-to-br from-gray-600 to-gray-800 text-white"
                          }`}
                        >
                          {index + 1}
                        </span>
                        <span className="font-semibold text-gray-100">
                          {performer.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-400">
                          {performer.hours.toFixed(2)}h
                        </div>
                        <div className="text-sm text-green-400">
                          ${performer.cost.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="modern-card">
        <CardHeader
          className="border-b border-gray-700/50"
          style={{
            background:
              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
          }}
        >
          <CardTitle className="flex items-center gap-3 text-gray-100">
            <Zap className="h-5 w-5 text-green-400" />
            System Status
          </CardTitle>
          <CardDescription className="text-gray-300">
            Application health and data insights
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Data Storage</p>
                  <p className="text-lg font-bold text-green-400">Healthy</p>
                </div>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Last Autosave</p>
                  <p className="text-lg font-bold text-blue-400">
                    {currentAutosaveInfo.lastSaveTime
                      ? new Date(
                          currentAutosaveInfo.lastSaveTime,
                        ).toLocaleTimeString()
                      : "Never"}
                  </p>
                </div>
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="glass-card p-4 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Records</p>
                  <p className="text-lg font-bold text-purple-400">
                    {timeEntries.length}
                  </p>
                </div>
                <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="bg-gray-800/50 border-gray-600 text-gray-100 hover:bg-orange-500/20 hover:border-orange-400 smooth-transition"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
