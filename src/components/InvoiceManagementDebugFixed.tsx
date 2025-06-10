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
  Bug,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { Job } from "@/types";

// Helper function to parse date string as local date (fixes timezone issues)
const parseLocalDate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in JavaScript
};

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
  debugInfo: {
    timeEntriesCount: number;
    rentalEntriesCount: number;
    laborBillableCalc: string;
    rentalBillableCalc: string;
    loaCostCalc: string;
    totalBillableCalc: string;
  };
}

export function InvoiceManagementDebugFixed() {
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
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Enhanced getJobDates with debug information
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
      const loaCost = totalLoaCount * 200; // LOA is billable at $200 each
      const totalCost = laborCost; // Only labor is a cost, rentals are billable revenue

      // CRITICAL FIX: The issue might be here - we should NOT double-count LOA
      // LOA is already included in laborBillable from timeEntrySummaries
      // So we should NOT add loaCost again
      const totalBillable = laborBillable + rentalBillable; // LOA already included in laborBillable

      // Debug information
      const debugInfo = {
        timeEntriesCount: dayTimeEntries.length,
        rentalEntriesCount: dayRentalEntries.length,
        laborBillableCalc: `${dayTimeEntries.length} entries = $${laborBillable.toFixed(2)}`,
        rentalBillableCalc: `${dayRentalEntries.length} rentals = $${rentalBillable.toFixed(2)}`,
        loaCostCalc: `${totalLoaCount} LOA × $200 = $${loaCost.toFixed(2)} (already in labor)`,
        totalBillableCalc: `$${laborBillable.toFixed(2)} + $${rentalBillable.toFixed(2)} = $${totalBillable.toFixed(2)}`,
      };

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
        debugInfo,
      };
    });
  };

  // Memoize job statistics to prevent excessive recalculation
  const jobStats = useMemo(() => {
    return jobs.map((job) => {
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
          totalBillable > 0 ? (invoicedBillable / totalBillable) * 100 : 0,
      };
    });
  }, [jobs, timeEntrySummaries, rentalSummaries]);

  const isDateInvoiced = (jobId: string, date: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.invoicedDates?.includes(date) || false;
  };

  const handleJobSelect = (job: Job) => {
    setSelectedJob(job);
  };

  const handleMarkRange = async () => {
    if (!selectedJob || !dateRange.startDate || !dateRange.endDate) {
      toast({
        title: "Missing Information",
        description: "Please select a job and date range.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse dates properly to avoid timezone issues
      const parseDate = (dateString: string) => {
        const [year, month, day] = dateString.split("-").map(Number);
        return new Date(year, month - 1, day);
      };

      const startDate = parseDate(dateRange.startDate);
      const endDate = parseDate(dateRange.endDate);

      if (startDate > endDate) {
        toast({
          title: "Invalid Date Range",
          description: "Start date must be before or equal to end date.",
          variant: "destructive",
        });
        return;
      }

      // Generate all dates in the range
      const allDatesInRange: string[] = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        const day = currentDate.getDate().toString().padStart(2, "0");
        allDatesInRange.push(`${year}-${month}-${day}`);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      await addInvoicedDates(selectedJob.id, allDatesInRange);

      toast({
        title: "Range Marked as Invoiced",
        description: `Marked ${allDatesInRange.length} dates as invoiced for ${selectedJob.jobNumber}`,
      });

      // Reset form
      setDateRange({ startDate: "", endDate: "" });
    } catch (error) {
      console.error("Error marking range as invoiced:", error);
      toast({
        title: "Error",
        description: "Failed to mark range as invoiced.",
        variant: "destructive",
      });
    }
  };

  const handleMarkSingle = async (job: Job, date: string) => {
    try {
      if (isDateInvoiced(job.id, date)) {
        await removeInvoicedDates(job.id, [date]);
        toast({
          title: "Date Unmarked",
          description: `${date} unmarked as invoiced for ${job.jobNumber}`,
        });
      } else {
        await addInvoicedDates(job.id, [date]);
        toast({
          title: "Date Marked as Invoiced",
          description: `${date} marked as invoiced for ${job.jobNumber}`,
        });
      }
    } catch (error) {
      console.error("Error toggling invoice status:", error);
      toast({
        title: "Error",
        description: "Failed to update invoice status.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const openBreakdownDialog = (job: Job, date: string) => {
    setSelectedJobForBreakdown(job);
    setSelectedDateForBreakdown(date);
    setIsBreakdownDialogOpen(true);
  };

  const renderBreakdownDialog = () => {
    if (!selectedJobForBreakdown || !selectedDateForBreakdown) return null;

    const jobDates = getJobDates(selectedJobForBreakdown);
    const dateInfo = jobDates.find((d) => d.date === selectedDateForBreakdown);

    if (!dateInfo) return null;

    return (
      <Dialog
        open={isBreakdownDialogOpen}
        onOpenChange={setIsBreakdownDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Daily Breakdown - {selectedJobForBreakdown.jobNumber} on{" "}
              {parseLocalDate(selectedDateForBreakdown).toLocaleDateString()}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of time entries and rentals for this date
            </DialogDescription>
          </DialogHeader>

          {showDebugInfo && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <Bug className="h-4 w-4" />
                  Debug Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>
                    <strong>Time Entries:</strong>{" "}
                    {dateInfo.debugInfo.laborBillableCalc}
                  </p>
                  <p>
                    <strong>Rentals:</strong>{" "}
                    {dateInfo.debugInfo.rentalBillableCalc}
                  </p>
                  <p>
                    <strong>LOA:</strong> {dateInfo.debugInfo.loaCostCalc}
                  </p>
                  <p>
                    <strong>Total Billable:</strong>{" "}
                    {dateInfo.debugInfo.totalBillableCalc}
                  </p>
                  <p>
                    <strong>Expected Individual Sum:</strong> $
                    {(
                      dateInfo.timeEntries.reduce(
                        (sum, entry) => sum + entry.totalBillableAmount,
                        0,
                      ) +
                      dateInfo.rentalEntries.reduce(
                        (sum, entry) => sum + entry.totalCost,
                        0,
                      )
                    ).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Time Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Time Entries</CardTitle>
                <CardDescription>
                  Labor hours and LOA for this date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dateInfo.timeEntries.length === 0 ? (
                  <p className="text-gray-500">No time entries for this date</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>LOA</TableHead>
                        <TableHead>Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateInfo.timeEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{entry.employeeName}</TableCell>
                          <TableCell>{entry.hours.toFixed(2)}</TableCell>
                          <TableCell>{entry.loaCount || 0}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${entry.totalBillableAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell>
                          {dateInfo.timeEntries
                            .reduce((sum, e) => sum + e.hours, 0)
                            .toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {dateInfo.timeEntries.reduce(
                            (sum, e) => sum + (e.loaCount || 0),
                            0,
                          )}
                        </TableCell>
                        <TableCell className="text-green-600">
                          $
                          {dateInfo.timeEntries
                            .reduce((sum, e) => sum + e.totalBillableAmount, 0)
                            .toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Rental Entries */}
            <Card>
              <CardHeader>
                <CardTitle>Rental Entries</CardTitle>
                <CardDescription>
                  Equipment rentals for this date
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dateInfo.rentalEntries.length === 0 ? (
                  <p className="text-gray-500">
                    No rental entries for this date
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateInfo.rentalEntries.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{entry.rentalItemName}</TableCell>
                          <TableCell>
                            {entry.quantity} {entry.billingUnit}
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${entry.totalCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell>Total</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-green-600">
                          $
                          {dateInfo.rentalEntries
                            .reduce((sum, e) => sum + e.totalCost, 0)
                            .toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Labor Billable</p>
                  <p className="text-lg font-bold text-green-600">
                    ${dateInfo.laborBillable.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Rental Revenue</p>
                  <p className="text-lg font-bold text-green-600">
                    ${dateInfo.rentalBillable.toFixed(2)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Billable</p>
                  <p className="text-xl font-bold text-green-600">
                    ${dateInfo.totalBillable.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      {/* Debug Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Mode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="debug-mode"
              checked={showDebugInfo}
              onCheckedChange={setShowDebugInfo}
            />
            <Label htmlFor="debug-mode">Show debug information</Label>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="modern-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground truncate">
                  Total Revenue
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
              <FileText className="h-5 w-5 text-orange-500 mt-1 flex-shrink-0" />
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
                      ? "text-green-600"
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
      </div>

      {/* Rest of the component remains the same... */}

      {/* Job Statistics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Invoice Status
          </CardTitle>
          <CardDescription>
            Track invoicing progress and financial details for each job
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>LOA</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobStats.map((stat) => (
                <TableRow
                  key={stat.job.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleJobSelect(stat.job)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{stat.job.jobNumber}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {stat.job.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>
                          {stat.invoicedDates}/{stat.totalDates} dates
                        </span>
                        <span>{stat.invoicePercentage.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${stat.invoicePercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div>
                        <Badge variant="outline" className="text-xs">
                          {stat.totalHours.toFixed(1)}h total
                        </Badge>
                      </div>
                      <div className="text-muted-foreground">
                        {stat.uninvoicedHours.toFixed(1)}h uninvoiced
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="font-medium">
                        {stat.totalLoaCount} total
                      </div>
                      <div className="text-muted-foreground">
                        ({(stat.totalLoaCount * 200).toFixed(2)})
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-green-600">
                        ${stat.totalBillable.toFixed(2)}
                      </div>
                      <div className="text-muted-foreground">
                        ${stat.uninvoicedBillable.toFixed(2)} uninvoiced
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div className="font-medium text-red-600">
                        ${stat.totalCost.toFixed(2)}
                      </div>
                      <div className="text-muted-foreground">
                        ${stat.uninvoicedCost.toFixed(2)} uninvoiced
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-1">
                      <div
                        className={`font-medium ${
                          stat.totalBillable - stat.totalCost >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        ${(stat.totalBillable - stat.totalCost).toFixed(2)}
                      </div>
                      <div className="text-muted-foreground">
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
                              ? ((totalBillable - totalCost) / totalBillable) *
                                100
                              : 0;
                          return profitMargin.toFixed(1);
                        })()}
                        %
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJobSelect(stat.job);
                      }}
                    >
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Selected Job Details */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle>
              Job Details: {selectedJob.jobNumber} - {selectedJob.name}
            </CardTitle>
            <CardDescription>
              Mark individual dates or date ranges as invoiced
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bulk Date Range Marking */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Mark Date Range as Invoiced
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 items-end">
                  <div>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      id="start-date"
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
                  <div>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, endDate: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleMarkRange} className="w-full">
                    Mark Range as Invoiced
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Individual Date Management */}
            <div>
              <h4 className="text-sm font-medium mb-2">Individual Dates</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>LOA</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getJobDates(selectedJob).map((dateInfo) => (
                    <TableRow key={dateInfo.date}>
                      <TableCell className="font-medium">
                        {parseLocalDate(dateInfo.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{dateInfo.totalHours.toFixed(2)}</TableCell>
                      <TableCell>
                        {dateInfo.totalLoaCount > 0 && (
                          <Badge variant="outline">
                            {dateInfo.totalLoaCount} × $200 = $
                            {(dateInfo.totalLoaCount * 200).toFixed(2)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${dateInfo.totalBillable.toFixed(2)}
                        {showDebugInfo && (
                          <div className="text-xs text-gray-500 mt-1">
                            Labor: ${dateInfo.laborBillable.toFixed(2)}
                            <br />
                            Rental: ${dateInfo.rentalBillable.toFixed(2)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        ${dateInfo.totalCost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${dateInfo.totalBillable - dateInfo.totalCost >= 0 ? "text-blue-600" : "text-red-600"}`}
                        >
                          $
                          {(
                            dateInfo.totalBillable - dateInfo.totalCost
                          ).toFixed(2)}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {dateInfo.totalBillable > 0
                            ? (
                                ((dateInfo.totalBillable - dateInfo.totalCost) /
                                  dateInfo.totalBillable) *
                                100
                              ).toFixed(1)
                            : "0.0"}
                          %
                        </div>
                      </TableCell>
                      <TableCell>
                        {dateInfo.isInvoiced ? (
                          <Badge className="bg-green-100 text-green-800">
                            Invoiced
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleMarkSingle(selectedJob, dateInfo.date)
                            }
                          >
                            {dateInfo.isInvoiced ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openBreakdownDialog(selectedJob, dateInfo.date)
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {renderBreakdownDialog()}
    </div>
  );
}
