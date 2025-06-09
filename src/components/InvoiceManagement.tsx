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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Job } from "@/types";

interface JobDateInfo {
  date: string;
  isInvoiced: boolean;
  timeEntries: any[];
  rentalEntries: any[];
  totalHours: number;
  totalLoaCount: number;
  laborCost: number;
  rentalCost: number;
  totalCost: number;
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

  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Get unique dates that have time entries or rental entries for the selected job
  const getJobDates = (job: Job) => {
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
      const rentalCost = dayRentalEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const totalCost = laborCost + rentalCost;

      return {
        date,
        isInvoiced: invoicedDates.includes(date),
        timeEntries: dayTimeEntries,
        rentalEntries: dayRentalEntries,
        totalHours,
        totalLoaCount,
        laborCost,
        rentalCost,
        totalCost,
      };
    });
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
        const totalCost = jobDates.reduce((sum, d) => sum + d.totalCost, 0);
        const invoicedCost = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalCost, 0);

        return {
          job,
          totalDates,
          invoicedDates,
          uninvoicedDates: totalDates - invoicedDates,
          totalHours,
          invoicedHours,
          uninvoicedHours: totalHours - invoicedHours,
          totalCost,
          invoicedCost,
          uninvoicedCost: totalCost - invoicedCost,
          invoicePercentage:
            totalDates > 0 ? (invoicedDates / totalDates) * 100 : 0,
        };
      })
      .filter((stat) => stat.totalDates > 0); // Only show jobs with time entries
  }, [jobs, timeEntrySummaries]);

  const handleBulkInvoice = () => {
    if (!selectedJob || !dateRange.startDate || !dateRange.endDate) return;

    const jobDates = getJobDates(selectedJob);
    const datesToInvoice = jobDates
      .filter(
        (d) =>
          d.date >= dateRange.startDate &&
          d.date <= dateRange.endDate &&
          !d.isInvoiced,
      )
      .map((d) => d.date);

    if (datesToInvoice.length > 0) {
      addInvoicedDates(selectedJob.id, datesToInvoice);
    }

    setIsDialogOpen(false);
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
                                      LOA Count
                                    </TableHead>
                                    <TableHead>Labor Cost</TableHead>
                                    <TableHead>Rental Cost</TableHead>
                                    <TableHead>Total Cost</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getJobDates(stat.job).map((dateInfo) => (
                                    <TableRow key={dateInfo.date}>
                                      <TableCell className="font-medium">
                                        {new Date(
                                          dateInfo.date,
                                        ).toLocaleDateString()}
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
                                      <TableCell className="font-medium text-blue-600">
                                        ${dateInfo.laborCost.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="font-medium text-orange-600">
                                        ${dateInfo.rentalCost.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="font-medium text-green-600">
                                        ${dateInfo.totalCost.toFixed(2)}
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
                                          onClick={() =>
                                            toggleDateInvoiced(
                                              stat.job,
                                              dateInfo.date,
                                              dateInfo.isInvoiced,
                                            )
                                          }
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Invoiced
                </p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.invoicedCost, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Invoice
                </p>
                <p className="text-2xl font-bold text-red-600">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.uninvoicedCost, 0)
                    .toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Invoiced Days
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {jobStats.reduce((sum, stat) => sum + stat.invoicedDates, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Days
                </p>
                <p className="text-2xl font-bold text-foreground">
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
    </div>
  );
}
