import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  FileText,
  DollarSign,
  Check,
  X,
  Plus,
  Minus,
  Eye,
  ArrowUpDown,
  Filter,
  EyeOff,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { Job } from "@/types";

import { parseLocalDate, formatLocalDate } from "@/utils/dateUtils";

interface JobDateInfo {
  date: string;
  isInvoiced: boolean;
  timeEntries: any[];
  rentalEntries: any[];
  totalHours: number;
  totalLoaCount: number;
  laborCost: number;
  laborBillable: number;
  rentalBillable: number;
  loaCost: number;
  totalCost: number;
  totalBillable: number;
}

export function InvoiceManagement() {
  const {
    jobs,
    timeEntries,
    timeEntrySummaries,
    rentalSummaries,
    addInvoicedDates,
    removeInvoicedDates,
  } = useTimeTracking();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [selectedDateForBreakdown, setSelectedDateForBreakdown] = useState<
    string | null
  >(null);
  const [selectedJobForBreakdown, setSelectedJobForBreakdown] =
    useState<Job | null>(null);
  const [isBreakdownDialogOpen, setIsBreakdownDialogOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // Get unique dates that have time entries or rental entries for the selected job
  const getJobDates = (job: Job): JobDateInfo[] => {
    const jobTimeEntries = timeEntrySummaries.filter(
      (entry) => entry.jobNumber === job.jobNumber,
    );
    const jobRentalEntries = rentalSummaries.filter(
      (entry) => entry.jobNumber === job.jobNumber,
    );

    // Get all unique dates from both time entries and rental entries
    const timeDates = jobTimeEntries.map((entry) => entry.date);
    const rentalDates = jobRentalEntries.map((entry) => entry.date);
    const dates = [...new Set([...timeDates, ...rentalDates])].sort();

    const invoicedDates = job.invoicedDates || []; // Safe fallback for existing jobs

    return dates.map((date) => {
      const dayTimeEntries = jobTimeEntries.filter(
        (entry) => entry.date === date,
      );
      const dayRentalEntries = jobRentalEntries.filter(
        (entry) => entry.date === date,
      );

      const totalHours = dayTimeEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0,
      );
      const totalLoaCount = dayTimeEntries.reduce(
        (sum, entry) => sum + (entry.loaCount || 0),
        0,
      );
      const laborCost = dayTimeEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const laborBillable = dayTimeEntries.reduce(
        (sum, entry) => sum + entry.totalBillableAmount,
        0,
      );
      const rentalBillable = dayRentalEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const loaCost = totalLoaCount * 200; // Live Out Allowance is billable at $200 each
      const totalCost = laborCost; // Only labor is a cost, rentals are billable revenue
      // CRITICAL FIX: Live Out Allowance is already included in laborBillable from timeEntrySummaries
      // So we should NOT add loaCost again to avoid double-counting
      const totalBillable = laborBillable + rentalBillable; // Labor billable (includes Live Out Allowance) + rental revenue

      return {
        date,
        isInvoiced: invoicedDates.includes(date),
        timeEntries: dayTimeEntries,
        rentalEntries: dayRentalEntries,
        totalHours,
        totalLoaCount,
        laborCost,
        laborBillable,
        rentalBillable,
        loaCost,
        totalCost,
        totalBillable,
      };
    });
  };

  // Get detailed breakdown for a specific date and job
  const getDayBreakdown = (job: Job, date: string) => {
    const jobTimeEntries = timeEntrySummaries.filter(
      (entry) => entry.jobNumber === job.jobNumber && entry.date === date,
    );
    const jobRentalEntries = rentalSummaries.filter(
      (entry) => entry.jobNumber === job.jobNumber && entry.date === date,
    );

    // Group time entries by employee title
    const timeEntriesByTitle = jobTimeEntries.reduce(
      (acc, entry) => {
        const title = entry.employeeTitle;
        if (!acc[title]) {
          acc[title] = [];
        }
        acc[title].push(entry);
        return acc;
      },
      {} as Record<string, typeof jobTimeEntries>,
    );

    // Group rental entries by category
    const rentalsByCategory = jobRentalEntries.reduce(
      (acc, entry) => {
        const category = entry.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(entry);
        return acc;
      },
      {} as Record<string, typeof jobRentalEntries>,
    );

    return {
      timeEntriesByTitle,
      rentalsByCategory,
      totalTimeEntries: jobTimeEntries.length,
      totalRentalEntries: jobRentalEntries.length,
      totalHours: jobTimeEntries.reduce((sum, entry) => sum + entry.hours, 0),
      totalLaborCost: jobTimeEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      ),
      totalRentalCost: jobRentalEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      ),
      totalLoaCount: jobTimeEntries.reduce(
        (sum, entry) => sum + (entry.loaCount || 0),
        0,
      ),
    };
  };

  // Calculate invoice statistics for each job
  const jobStats = useMemo(() => {
    return jobs
      .map((job) => {
        const jobDates = getJobDates(job);
        const totalDates = jobDates.length;
        const invoicedDates = jobDates.filter((d) => d.isInvoiced).length;
        const totalHours = jobDates.reduce((sum, d) => sum + d.totalHours, 0);
        const invoicedHours = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalHours, 0);
        const totalLoaCount = jobDates.reduce(
          (sum, d) => sum + d.totalLoaCount,
          0,
        );
        const invoicedLoaCount = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalLoaCount, 0);
        const totalCost = jobDates.reduce((sum, d) => sum + d.totalCost, 0);
        const invoicedCost = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalCost, 0);
        const totalBillable = jobDates.reduce(
          (sum, d) => sum + d.totalBillable,
          0,
        );
        const invoicedBillable = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalBillable, 0);

        return {
          job,
          totalDates,
          invoicedDates,
          uninvoicedDates: totalDates - invoicedDates,
          totalHours,
          invoicedHours,
          uninvoicedHours: totalHours - invoicedHours,
          totalLoaCount,
          invoicedLoaCount,
          uninvoicedLoaCount: totalLoaCount - invoicedLoaCount,
          totalCost,
          invoicedCost,
          uninvoicedCost: totalCost - invoicedCost,
          totalBillable,
          invoicedBillable,
          uninvoicedBillable: totalBillable - invoicedBillable,
          invoicePercentage:
            totalDates > 0 ? (invoicedDates / totalDates) * 100 : 0,
        };
      })
      .filter((stat) => stat.totalDates > 0); // Only show jobs with time entries
  }, [jobs, timeEntrySummaries]);

  const handleBulkInvoice = () => {
    if (!selectedJob || !dateRange.startDate || !dateRange.endDate) return;

    // Parse dates safely to avoid timezone issues
    const parseDate = (dateString: string) => {
      const [year, month, day] = dateString.split("-").map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    };

    const startDate = parseDate(dateRange.startDate);
    const endDate = parseDate(dateRange.endDate);
    const allDatesInRange: string[] = [];

    // Generate all dates in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
      const day = currentDate.getDate().toString().padStart(2, "0");
      allDatesInRange.push(`${year}-${month}-${day}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get existing invoiced dates for this job
    const existingInvoicedDates = selectedJob.invoicedDates || [];

    // Filter out dates that are already invoiced
    const datesToInvoice = allDatesInRange.filter(
      (date) => !existingInvoicedDates.includes(date),
    );

    if (datesToInvoice.length > 0) {
      addInvoicedDates(selectedJob.id, datesToInvoice);

      toast({
        title: "✅ Dates Marked as Invoiced",
        description: `Successfully marked ${datesToInvoice.length} date${datesToInvoice.length !== 1 ? "s" : ""} as invoiced for ${selectedJob.jobNumber} - ${selectedJob.name}`,
      });
    } else {
      toast({
        title: "ℹ️ No Dates to Invoice",
        description:
          "All dates in the selected range are already marked as invoiced.",
        variant: "default",
      });
    }

    // Clear the date range inputs after invoicing
    setDateRange({ startDate: "", endDate: "" });
  };

  const toggleDateInvoiced = (
    job: Job,
    date: string,
    isCurrentlyInvoiced: boolean,
  ) => {
    if (isCurrentlyInvoiced) {
      removeInvoicedDates(job.id, [date]);
    } else {
      addInvoicedDates(job.id, [date]);
    }
  };

  const getInvoiceStatusColor = (percentage: number) => {
    if (percentage === 100)
      return "bg-green-100 text-green-800 border-green-200";
    if (percentage >= 75) return "bg-blue-100 text-blue-800 border-blue-200";
    if (percentage >= 50)
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (percentage > 0)
      return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Invoice Overview */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Invoice Management
          </CardTitle>
          <CardDescription>
            Manage invoiced dates for each job and track billing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs with time entries found. Add time entries to manage
              invoicing.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Number</TableHead>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Invoice Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-purple-600">
                    Live Out Allowance Count
                  </TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobStats.map((stat) => (
                  <TableRow key={stat.job.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {stat.job.jobNumber}
                    </TableCell>
                    <TableCell>{stat.job.name}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge
                          className={getInvoiceStatusColor(
                            stat.invoicePercentage,
                          )}
                        >
                          {stat.invoicePercentage.toFixed(0)}% Invoiced
                        </Badge>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stat.invoicePercentage}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3 text-green-600" />
                          <span className="text-green-600 font-medium">
                            {stat.invoicedDates}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <X className="h-3 w-3 text-red-600" />
                          <span className="text-red-600">
                            {stat.uninvoicedDates}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          {stat.invoicedHours.toFixed(1)}h
                        </div>
                        <div className="text-red-600">
                          {stat.uninvoicedHours.toFixed(1)}h
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {stat.totalLoaCount > 0 ? (
                          <>
                            <div className="text-green-600 font-medium">
                              {stat.invoicedLoaCount > 0 && (
                                <span>{stat.invoicedLoaCount} LOA</span>
                              )}
                            </div>
                            <div className="text-red-600">
                              {stat.uninvoicedLoaCount > 0 && (
                                <span>{stat.uninvoicedLoaCount} LOA</span>
                              )}
                            </div>
                            <div className="text-xs text-purple-600 mt-1">
                              Total: {stat.totalLoaCount} ($
                              {(stat.totalLoaCount * 200).toFixed(2)})
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-green-600 font-medium">
                          ${stat.invoicedCost.toFixed(2)}
                        </div>
                        <div className="text-red-600">
                          ${stat.uninvoicedCost.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total: ${stat.totalCost.toFixed(2)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(stat.job)}
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl">
                          <DialogHeader>
                            <DialogTitle>
                              Manage Invoicing for {stat.job.jobNumber} -{" "}
                              {stat.job.name}
                            </DialogTitle>
                            <DialogDescription>
                              Select individual dates or use bulk actions to
                              manage invoicing status
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {/* Financial Summary Cards */}
                            {(() => {
                              const jobDates = getJobDates(stat.job);
                              const totalBillable = jobDates.reduce(
                                (sum, d) => sum + d.totalBillable,
                                0,
                              );
                              const totalCost = jobDates.reduce(
                                (sum, d) => sum + d.totalCost,
                                0,
                              );
                              const profitAmount = totalBillable - totalCost;
                              const profitMargin =
                                totalBillable > 0
                                  ? (profitAmount / totalBillable) * 100
                                  : 0;

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <Card className="modern-card">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-green-500" />
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground">
                                            Total Billable
                                          </p>
                                          <p className="text-xl font-bold text-green-600">
                                            ${totalBillable.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Labor + Rental Revenue + Live Out
                                            Allowance
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  <Card className="modern-card">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-2">
                                        <DollarSign className="h-5 w-5 text-red-500" />
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground">
                                            Total Cost
                                          </p>
                                          <p className="text-xl font-bold text-red-600">
                                            ${totalCost.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Labor Costs Only
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  <Card className="modern-card">
                                    <CardContent className="p-4">
                                      <div className="flex items-center gap-2">
                                        <DollarSign
                                          className={`h-5 w-5 ${profitMargin >= 0 ? "text-blue-500" : "text-red-500"}`}
                                        />
                                        <div>
                                          <p className="text-sm font-medium text-muted-foreground">
                                            Profit Margin
                                          </p>
                                          <p
                                            className={`text-xl font-bold ${profitMargin >= 0 ? "text-blue-600" : "text-red-600"}`}
                                          >
                                            {profitMargin.toFixed(1)}%
                                          </p>
                                          <p
                                            className={`text-xs ${profitAmount >= 0 ? "text-blue-600" : "text-red-600"}`}
                                          >
                                            ${profitAmount >= 0 ? "+" : ""}$
                                            {profitAmount.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>
                              );
                            })()}

                            {/* Bulk Actions */}
                            <Card className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="space-y-2">
                                  <Label>Start Date</Label>
                                  <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) =>
                                      setDateRange({
                                        ...dateRange,
                                        startDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>End Date</Label>
                                  <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) =>
                                      setDateRange({
                                        ...dateRange,
                                        endDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>&nbsp;</Label>
                                  <Button
                                    onClick={handleBulkInvoice}
                                    disabled={
                                      !dateRange.startDate || !dateRange.endDate
                                    }
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Mark Range as Invoiced
                                  </Button>
                                </div>
                              </div>
                            </Card>

                            {/* Individual Dates */}
                            <div className="max-h-96 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Hours</TableHead>
                                    <TableHead className="text-purple-600">
                                      Live Out Allowance Count
                                    </TableHead>
                                    <TableHead className="text-green-600">
                                      Billable
                                    </TableHead>
                                    <TableHead className="text-red-600">
                                      Cost
                                    </TableHead>
                                    <TableHead className="text-blue-600">
                                      Profit
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getJobDates(stat.job).map((dateInfo) => (
                                    <TableRow
                                      key={dateInfo.date}
                                      className="cursor-pointer hover:bg-blue-50 transition-colors"
                                      onClick={() => {
                                        setSelectedDateForBreakdown(
                                          dateInfo.date,
                                        );
                                        setSelectedJobForBreakdown(stat.job);
                                        setIsBreakdownDialogOpen(true);
                                      }}
                                    >
                                      <TableCell className="font-medium text-blue-600 hover:text-blue-800">
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {formatLocalDate(dateInfo.date)}
                                          </span>
                                          <Eye className="h-4 w-4 opacity-50" />
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        {dateInfo.totalHours.toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        {dateInfo.totalLoaCount > 0 ? (
                                          <div className="flex items-center gap-1">
                                            <Badge
                                              variant="secondary"
                                              className="bg-purple-100 text-purple-800"
                                            >
                                              {dateInfo.totalLoaCount}
                                            </Badge>
                                            <span className="text-xs text-purple-600">
                                              $
                                              {(
                                                dateInfo.totalLoaCount * 200
                                              ).toFixed(2)}
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 text-sm">
                                            —
                                          </span>
                                        )}
                                      </TableCell>
                                      <TableCell className="font-medium text-green-600">
                                        <div className="text-sm">
                                          <div>
                                            ${dateInfo.totalBillable.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Labor: $
                                            {dateInfo.laborBillable.toFixed(2)}{" "}
                                            + Rentals: $
                                            {dateInfo.rentalBillable.toFixed(2)}{" "}
                                            + Live Out Allowance: $
                                            {dateInfo.loaCost.toFixed(2)}
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium text-red-600">
                                        <div className="text-sm">
                                          <div>
                                            ${dateInfo.totalCost.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            Labor Cost Only
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell
                                        className={`font-medium ${dateInfo.totalBillable - dateInfo.totalCost >= 0 ? "text-blue-600" : "text-red-600"}`}
                                      >
                                        <div className="text-sm">
                                          <div>
                                            $
                                            {(
                                              dateInfo.totalBillable -
                                              dateInfo.totalCost
                                            ).toFixed(2)}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            {dateInfo.totalBillable > 0
                                              ? (
                                                  ((dateInfo.totalBillable -
                                                    dateInfo.totalCost) /
                                                    dateInfo.totalBillable) *
                                                  100
                                                ).toFixed(1)
                                              : "0.0"}
                                            %
                                          </div>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            dateInfo.isInvoiced
                                              ? "default"
                                              : "destructive"
                                          }
                                        >
                                          {dateInfo.isInvoiced
                                            ? "Invoiced"
                                            : "Not Invoiced"}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDateInvoiced(
                                              stat.job,
                                              dateInfo.date,
                                              dateInfo.isInvoiced,
                                            );
                                          }}
                                        >
                                          {dateInfo.isInvoiced ? (
                                            <>
                                              <Minus className="h-4 w-4 mr-1" />
                                              Uninvoice
                                            </>
                                          ) : (
                                            <>
                                              <Plus className="h-4 w-4 mr-1" />
                                              Invoice
                                            </>
                                          )}
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Total Billable
                </p>
                <p className="text-lg font-bold text-green-600 break-words">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + (stat.totalBillable || 0), 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Total Cost
                </p>
                <p className="text-lg font-bold text-red-600 break-words">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.totalCost, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <DollarSign
                className={`h-5 w-5 mt-1 flex-shrink-0 ${(() => {
                  const totalBillable = jobStats.reduce(
                    (sum, stat) => sum + (stat.totalBillable || 0),
                    0,
                  );
                  const totalCost = jobStats.reduce(
                    (sum, stat) => sum + stat.totalCost,
                    0,
                  );
                  return totalBillable - totalCost >= 0
                    ? "text-blue-500"
                    : "text-red-500";
                })()} `}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Profit Margin
                </p>
                <p
                  className={`text-lg font-bold break-words ${(() => {
                    const totalBillable = jobStats.reduce(
                      (sum, stat) => sum + (stat.totalBillable || 0),
                      0,
                    );
                    const totalCost = jobStats.reduce(
                      (sum, stat) => sum + stat.totalCost,
                      0,
                    );
                    return totalBillable - totalCost >= 0
                      ? "text-blue-600"
                      : "text-red-600";
                  })()}`}
                >
                  {(() => {
                    const totalBillable = jobStats.reduce(
                      (sum, stat) => sum + (stat.totalBillable || 0),
                      0,
                    );
                    const totalCost = jobStats.reduce(
                      (sum, stat) => sum + stat.totalCost,
                      0,
                    );
                    const profitMargin =
                      totalBillable > 0
                        ? ((totalBillable - totalCost) / totalBillable) * 100
                        : 0;
                    return profitMargin.toFixed(1);
                  })()}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Invoiced Revenue
                </p>
                <p className="text-lg font-bold text-green-600 break-words">
                  $
                  {jobStats
                    .reduce(
                      (sum, stat) => sum + (stat.invoicedBillable || 0),
                      0,
                    )
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Invoiced Days
                </p>
                <p className="text-lg font-bold text-foreground break-words">
                  {jobStats.reduce((sum, stat) => sum + stat.invoicedDates, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <X className="h-5 w-5 text-red-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Pending Days
                </p>
                <p className="text-lg font-bold text-foreground break-words">
                  {jobStats.reduce(
                    (sum, stat) => sum + stat.uninvoicedDates,
                    0,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day Breakdown Dialog */}
      <Dialog
        open={isBreakdownDialogOpen}
        onOpenChange={setIsBreakdownDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Day Breakdown -{" "}
              {selectedDateForBreakdown &&
                parseLocalDate(selectedDateForBreakdown).toLocaleDateString()}
            </DialogTitle>
            <DialogDescription>
              {selectedJobForBreakdown &&
                `Detailed breakdown for ${selectedJobForBreakdown.jobNumber} - ${selectedJobForBreakdown.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedDateForBreakdown && selectedJobForBreakdown && (
            <div className="space-y-6">
              {(() => {
                const breakdown = getDayBreakdown(
                  selectedJobForBreakdown,
                  selectedDateForBreakdown,
                );

                return (
                  <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Total Hours</p>
                            <p className="text-2xl font-bold text-blue-600">
                              {(breakdown.totalHours || 0).toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Labor Cost</p>
                            <p className="text-2xl font-bold text-green-600">
                              ${(breakdown.totalLaborCost || 0).toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Rental Cost</p>
                            <p className="text-2xl font-bold text-orange-600">
                              ${(breakdown.totalRentalCost || 0).toFixed(2)}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-center">
                            <p className="text-sm text-gray-600">
                              Live Out Allowance Count
                            </p>
                            <p className="text-2xl font-bold text-purple-600">
                              {breakdown.totalLoaCount}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Time Entries by Title */}
                    {Object.keys(breakdown.timeEntriesByTitle).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Time Entries by Employee Title
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(breakdown.timeEntriesByTitle).map(
                              ([title, entries]) => (
                                <div
                                  key={title}
                                  className="border rounded-lg p-4"
                                >
                                  <h4 className="font-semibold text-blue-700 mb-3">
                                    {title}
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Hour Type</TableHead>
                                        <TableHead>Hours</TableHead>
                                        <TableHead className="text-purple-600">
                                          Live Out Allowance
                                        </TableHead>
                                        <TableHead>Billable Rate</TableHead>
                                        <TableHead>Cost Rate</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {entries.map((entry, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium">
                                            {entry.employeeName}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="secondary">
                                              {entry.hourTypeName}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>
                                            {(entry.hours || 0).toFixed(2)}h
                                          </TableCell>
                                          <TableCell>
                                            {entry.loaCount &&
                                            entry.loaCount > 0 ? (
                                              <Badge
                                                variant="secondary"
                                                className="bg-purple-100 text-purple-800"
                                              >
                                                {entry.loaCount}
                                              </Badge>
                                            ) : (
                                              <span className="text-gray-400">
                                                —
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-green-600">
                                            <div className="text-sm">
                                              <div className="font-medium">
                                                $
                                                {(
                                                  entry.billableWage || 0
                                                ).toFixed(2)}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Billable/hr
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-red-600">
                                            <div className="text-sm">
                                              <div className="font-medium">
                                                $
                                                {(entry.costWage || 0).toFixed(
                                                  2,
                                                )}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                Cost/hr
                                              </div>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="text-sm">
                                              <div className="font-bold">
                                                $
                                                {(entry.totalCost || 0).toFixed(
                                                  2,
                                                )}
                                              </div>
                                              <div
                                                className={`text-xs ${(() => {
                                                  const profitMargin =
                                                    entry.billableWage > 0
                                                      ? ((entry.billableWage -
                                                          entry.costWage) /
                                                          entry.billableWage) *
                                                        100
                                                      : 0;
                                                  return profitMargin >= 0
                                                    ? "text-blue-600"
                                                    : "text-red-600";
                                                })()}`}
                                              >
                                                {(() => {
                                                  const profitMargin =
                                                    (entry.billableWage || 0) >
                                                    0
                                                      ? (((entry.billableWage ||
                                                          0) -
                                                          (entry.costWage ||
                                                            0)) /
                                                          (entry.billableWage ||
                                                            1)) *
                                                        100
                                                      : 0;
                                                  return `${(profitMargin || 0).toFixed(1)}% margin`;
                                                })()}
                                              </div>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-gray-50 font-bold border-t-2 border-orange-500/30">
                                        <TableCell
                                          colSpan={2}
                                          className="text-orange-400 font-semibold"
                                        >
                                          Subtotal for {title}
                                        </TableCell>
                                        <TableCell>
                                          {entries
                                            .reduce(
                                              (sum, e) => sum + (e.hours || 0),
                                              0,
                                            )
                                            .toFixed(2)}
                                          h
                                        </TableCell>
                                        <TableCell className="text-purple-600">
                                          {entries.reduce(
                                            (sum, e) => sum + (e.loaCount || 0),
                                            0,
                                          )}
                                        </TableCell>
                                        <TableCell className="text-green-600">
                                          <div className="text-sm">
                                            <div className="font-medium">
                                              $
                                              {entries
                                                .reduce(
                                                  (sum, e) =>
                                                    sum +
                                                    (e.totalBillableAmount ||
                                                      0),
                                                  0,
                                                )
                                                .toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Total Billable
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-red-600">
                                          <div className="text-sm">
                                            <div className="font-medium">
                                              $
                                              {entries
                                                .reduce(
                                                  (sum, e) =>
                                                    sum + (e.totalCost || 0),
                                                  0,
                                                )
                                                .toFixed(2)}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              Total Cost
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="text-sm">
                                            <div className="font-bold">
                                              $
                                              {(
                                                entries.reduce(
                                                  (sum, e) =>
                                                    sum +
                                                    (e.totalBillableAmount ||
                                                      0),
                                                  0,
                                                ) -
                                                entries.reduce(
                                                  (sum, e) =>
                                                    sum + (e.totalCost || 0),
                                                  0,
                                                )
                                              ).toFixed(2)}
                                            </div>
                                            <div
                                              className={`text-xs ${(() => {
                                                const totalBillable =
                                                  entries.reduce(
                                                    (sum, e) =>
                                                      sum +
                                                      e.totalBillableAmount,
                                                    0,
                                                  );
                                                const totalCost =
                                                  entries.reduce(
                                                    (sum, e) =>
                                                      sum + e.totalCost,
                                                    0,
                                                  );
                                                const profitMargin =
                                                  totalBillable > 0
                                                    ? ((totalBillable -
                                                        totalCost) /
                                                        totalBillable) *
                                                      100
                                                    : 0;
                                                return profitMargin >= 0
                                                  ? "text-blue-600"
                                                  : "text-red-600";
                                              })()}`}
                                            >
                                              {(() => {
                                                const totalBillable =
                                                  entries.reduce(
                                                    (sum, e) =>
                                                      sum +
                                                      (e.totalBillableAmount ||
                                                        0),
                                                    0,
                                                  );
                                                const totalCost =
                                                  entries.reduce(
                                                    (sum, e) =>
                                                      sum + (e.totalCost || 0),
                                                    0,
                                                  );
                                                const profitMargin =
                                                  totalBillable > 0
                                                    ? ((totalBillable -
                                                        totalCost) /
                                                        totalBillable) *
                                                      100
                                                    : 0;
                                                return `${(profitMargin || 0).toFixed(1)}% margin`;
                                              })()}
                                            </div>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Rental Entries by Category */}
                    {Object.keys(breakdown.rentalsByCategory).length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Rental Entries by Category
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(breakdown.rentalsByCategory).map(
                              ([category, rentals]) => (
                                <div
                                  key={category}
                                  className="border rounded-lg p-4"
                                >
                                  <h4 className="font-semibold text-orange-700 mb-3">
                                    {category}
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Duration</TableHead>
                                        <TableHead>Rate</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Total Cost</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {rentals.map((rental, index) => (
                                        <TableRow key={index}>
                                          <TableCell className="font-medium">
                                            {rental.rentalItemName}
                                          </TableCell>
                                          <TableCell>
                                            {rental.employeeName}
                                          </TableCell>
                                          <TableCell>
                                            {rental.duration}{" "}
                                            {rental.billingUnit}
                                            {rental.duration !== 1 ? "s" : ""}
                                          </TableCell>
                                          <TableCell>
                                            ${(rental.rateUsed || 0).toFixed(2)}
                                            /{rental.billingUnit}
                                          </TableCell>
                                          <TableCell>
                                            {rental.quantity}
                                          </TableCell>
                                          <TableCell className="font-bold text-orange-600">
                                            $
                                            {(rental.totalCost || 0).toFixed(2)}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      <TableRow className="bg-gray-50 font-bold border-t-2 border-orange-500/30">
                                        <TableCell
                                          colSpan={5}
                                          className="text-orange-400 font-semibold"
                                        >
                                          Subtotal for {category}
                                        </TableCell>
                                        <TableCell>
                                          $
                                          {rentals
                                            .reduce(
                                              (sum, r) => sum + r.totalCost,
                                              0,
                                            )
                                            .toFixed(2)}
                                        </TableCell>
                                      </TableRow>
                                    </TableBody>
                                  </Table>
                                </div>
                              ),
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* No Data Message */}
                    {Object.keys(breakdown.timeEntriesByTitle).length === 0 &&
                      Object.keys(breakdown.rentalsByCategory).length === 0 && (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <p className="text-gray-500">
                              No time entries or rentals found for this date.
                            </p>
                          </CardContent>
                        </Card>
                      )}
                  </>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBreakdownDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
