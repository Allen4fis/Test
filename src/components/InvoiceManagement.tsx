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
import { Switch } from "@/components/ui/switch";
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
  Settings,
  CreditCard,
  Clock,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { Job } from "@/types";

import { parseLocalDate, formatLocalDate } from "@/utils/dateUtils";

interface JobDateInfo {
  date: string;
  isInvoiced: boolean;
  isPaid: boolean;
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
    addPaidDates,
    removePaidDates,
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

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<
    | "jobNumber"
    | "jobName"
    | "invoicePercentage"
    | "paidPercentage"
    | "uninvoicedDates"
    | "unpaidDates"
    | "uninvoicedBillable"
    | "unpaidBillable"
  >("jobNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFullyInvoiced, setShowFullyInvoiced] = useState(true);
  const [showPartiallyInvoiced, setShowPartiallyInvoiced] = useState(true);
  const [showUninvoiced, setShowUninvoiced] = useState(true);
  const [showFullyPaid, setShowFullyPaid] = useState(true);
  const [showPartiallyPaid, setShowPartiallyPaid] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(true);

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

    const invoicedDates = job.invoicedDates || [];
    const paidDates = job.paidDates || [];

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
      const loaCost = totalLoaCount * 200;
      const totalCost = laborCost;
      const totalBillable = laborBillable + rentalBillable;

      return {
        date,
        isInvoiced: invoicedDates.includes(date),
        isPaid: paidDates.includes(date),
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

    return {
      timeEntries: jobTimeEntries,
      rentalEntries: jobRentalEntries,
    };
  };

  // Calculate payment-focused summary statistics for all jobs
  const jobStats = useMemo(() => {
    return jobs
      .map((job) => {
        const jobDates = getJobDates(job);
        const totalDates = jobDates.length;
        const invoicedDates = jobDates.filter((d) => d.isInvoiced).length;
        const uninvoicedDates = totalDates - invoicedDates;
        const paidDates = jobDates.filter((d) => d.isPaid).length;
        const unpaidDates = totalDates - paidDates;

        const totalHours = jobDates.reduce((sum, d) => sum + d.totalHours, 0);
        const totalLoaCount = jobDates.reduce(
          (sum, d) => sum + d.totalLoaCount,
          0,
        );
        const totalCost = jobDates.reduce((sum, d) => sum + d.totalCost, 0);
        const totalBillable = jobDates.reduce(
          (sum, d) => sum + d.totalBillable,
          0,
        );

        const invoicedHours = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalHours, 0);
        const uninvoicedHours = totalHours - invoicedHours;

        const invoicedLoaCount = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalLoaCount, 0);
        const uninvoicedLoaCount = totalLoaCount - invoicedLoaCount;

        const invoicedCost = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalCost, 0);
        const uninvoicedCost = totalCost - invoicedCost;

        const invoicedBillable = jobDates
          .filter((d) => d.isInvoiced)
          .reduce((sum, d) => sum + d.totalBillable, 0);
        const uninvoicedBillable = totalBillable - invoicedBillable;

        const paidBillable = jobDates
          .filter((d) => d.isPaid)
          .reduce((sum, d) => sum + d.totalBillable, 0);
        const unpaidBillable = totalBillable - paidBillable;

        return {
          job,
          totalDates,
          invoicedDates,
          uninvoicedDates,
          paidDates,
          unpaidDates,
          totalHours,
          invoicedHours,
          uninvoicedHours,
          totalLoaCount,
          invoicedLoaCount,
          uninvoicedLoaCount,
          totalCost,
          invoicedCost,
          uninvoicedCost,
          totalBillable,
          invoicedBillable,
          uninvoicedBillable,
          paidBillable,
          unpaidBillable,
          invoicePercentage:
            totalDates > 0 ? (invoicedDates / totalDates) * 100 : 0,
          paidPercentage: totalDates > 0 ? (paidDates / totalDates) * 100 : 0,
        };
      })
      .filter((stat) => stat.totalDates > 0);
  }, [jobs, timeEntrySummaries]);

  // Filtered and sorted job stats
  const filteredAndSortedJobStats = useMemo(() => {
    let filtered = jobStats;

    // Apply invoice status filters
    if (!showFullyInvoiced || !showPartiallyInvoiced || !showUninvoiced) {
      filtered = filtered.filter((stat) => {
        const isFullyInvoiced = stat.invoicePercentage >= 100;
        const isUninvoiced = stat.invoicePercentage === 0;
        const isPartiallyInvoiced =
          stat.invoicePercentage > 0 && stat.invoicePercentage < 100;

        if (!showFullyInvoiced && isFullyInvoiced) return false;
        if (!showUninvoiced && isUninvoiced) return false;
        if (!showPartiallyInvoiced && isPartiallyInvoiced) return false;
        return true;
      });
    }

    // Apply paid status filters
    if (!showFullyPaid || !showPartiallyPaid || !showUnpaid) {
      filtered = filtered.filter((stat) => {
        const isFullyPaid = stat.paidPercentage >= 100;
        const isUnpaid = stat.paidPercentage === 0;
        const isPartiallyPaid =
          stat.paidPercentage > 0 && stat.paidPercentage < 100;

        if (!showFullyPaid && isFullyPaid) return false;
        if (!showUnpaid && isUnpaid) return false;
        if (!showPartiallyPaid && isPartiallyPaid) return false;
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "jobNumber":
          aValue = a.job.jobNumber.toLowerCase();
          bValue = b.job.jobNumber.toLowerCase();
          break;
        case "jobName":
          aValue = a.job.name.toLowerCase();
          bValue = b.job.name.toLowerCase();
          break;
        case "invoicePercentage":
          aValue = a.invoicePercentage;
          bValue = b.invoicePercentage;
          break;
        case "paidPercentage":
          aValue = a.paidPercentage;
          bValue = b.paidPercentage;
          break;
        case "uninvoicedDates":
          aValue = a.uninvoicedDates;
          bValue = b.uninvoicedDates;
          break;
        case "unpaidDates":
          aValue = a.unpaidDates;
          bValue = b.unpaidDates;
          break;
        case "uninvoicedBillable":
          aValue = a.uninvoicedBillable;
          bValue = b.uninvoicedBillable;
          break;
        case "unpaidBillable":
          aValue = a.unpaidBillable;
          bValue = b.unpaidBillable;
          break;
        default:
          aValue = a.job.jobNumber.toLowerCase();
          bValue = b.job.jobNumber.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [
    jobStats,
    showFullyInvoiced,
    showPartiallyInvoiced,
    showUninvoiced,
    showFullyPaid,
    showPartiallyPaid,
    showUnpaid,
    sortBy,
    sortDirection,
  ]);

  const toggleJobPaidStatus = (job: Job) => {
    const jobDates = getJobDates(job);
    const allDates = jobDates.map((d) => d.date);
    const paidDates = jobDates.filter((d) => d.isPaid).map((d) => d.date);

    if (paidDates.length === allDates.length) {
      // All dates are paid, mark all as unpaid
      removePaidDates(job.id, allDates);
    } else {
      // Not all dates are paid, mark all as paid
      addPaidDates(job.id, allDates);
    }
  };

  const handleInvoiceToggle = (job: Job, dates: string[]) => {
    const invoicedDates = job.invoicedDates || [];
    const allDatesInvoiced = dates.every((date) =>
      invoicedDates.includes(date),
    );

    if (allDatesInvoiced) {
      removeInvoicedDates(job.id, dates);
    } else {
      addInvoicedDates(job.id, dates);
    }
  };

  const handleFileUpload = () => {
    if (
      selectedFile &&
      selectedJob &&
      dateRange.startDate &&
      dateRange.endDate
    ) {
      const dates = getJobDates(selectedJob)
        .filter(
          (d) => d.date >= dateRange.startDate && d.date <= dateRange.endDate,
        )
        .map((d) => d.date);

      if (dates.length > 0) {
        addInvoicedDates(selectedJob.id, dates);
        toast({
          title: "Invoice processed",
          description: `Marked ${dates.length} dates as invoiced for ${selectedJob.jobNumber}`,
        });
      }

      setSelectedFile(null);
      setSelectedJob(null);
      setDateRange({ startDate: "", endDate: "" });
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100">
            Invoice Management
          </h1>
          <p className="text-muted-foreground text-gray-300">
            Manage invoicing and payment tracking for your jobs.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Process Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-gray-100">
                Process New Invoice
              </DialogTitle>
              <DialogDescription className="text-gray-300">
                Upload an invoice file and select the job and date range it
                covers.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="invoice-file" className="text-gray-200">
                  Invoice File
                </Label>
                <Input
                  id="invoice-file"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-gray-800 border-gray-600 text-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="job-select" className="text-gray-200">
                  Job
                </Label>
                <Select
                  value={selectedJob?.id || ""}
                  onValueChange={(value) => {
                    const job = jobs.find((j) => j.id === value);
                    setSelectedJob(job || null);
                  }}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {jobs.map((job) => (
                      <SelectItem
                        key={job.id}
                        value={job.id}
                        className="text-gray-100 focus:bg-orange-500/20"
                      >
                        {job.jobNumber} - {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start-date" className="text-gray-200">
                    Start Date
                  </Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="end-date" className="text-gray-200">
                    End Date
                  </Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-gray-100"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="border-gray-600 text-gray-100 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFileUpload}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Process Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Invoices
                </p>
                <p className="text-2xl font-bold text-blue-400">
                  {jobStats.reduce((sum, stat) => sum + stat.invoicedDates, 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Total Invoiced
                </p>
                <p className="text-2xl font-bold text-green-400">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.invoicedBillable, 0)
                    .toFixed(0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-purple-400">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.paidBillable, 0)
                    .toFixed(0)}
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Pending Payment
                </p>
                <p className="text-2xl font-bold text-orange-400">
                  $
                  {jobStats
                    .reduce((sum, stat) => sum + stat.unpaidBillable, 0)
                    .toFixed(0)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Card */}
      <Card className="modern-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-100">
                Job Invoice Status
              </CardTitle>
              <CardDescription className="text-gray-300">
                Track invoicing and payment status for all active jobs
              </CardDescription>
            </div>

            {/* Compact Controls */}
            <div className="flex items-center gap-2 text-sm">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as any)}
              >
                <SelectTrigger className="w-40 h-8 bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="jobNumber" className="text-gray-100">
                    Job Number
                  </SelectItem>
                  <SelectItem value="jobName" className="text-gray-100">
                    Job Name
                  </SelectItem>
                  <SelectItem
                    value="invoicePercentage"
                    className="text-gray-100"
                  >
                    Invoice %
                  </SelectItem>
                  <SelectItem value="paidPercentage" className="text-gray-100">
                    Paid %
                  </SelectItem>
                  <SelectItem
                    value="uninvoicedBillable"
                    className="text-gray-100"
                  >
                    Uninvoiced $
                  </SelectItem>
                  <SelectItem value="unpaidBillable" className="text-gray-100">
                    Unpaid $
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
                className="h-8 px-2"
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </Button>

              <div className="flex gap-1">
                <Button
                  variant={showUninvoiced ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUninvoiced(!showUninvoiced)}
                  className="h-7 px-2 text-xs"
                >
                  Uninvoiced
                </Button>
                <Button
                  variant={showUnpaid ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowUnpaid(!showUnpaid)}
                  className="h-7 px-2 text-xs"
                >
                  Unpaid
                </Button>
              </div>

              <span className="text-xs text-gray-500">
                {filteredAndSortedJobStats.length} jobs
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {jobStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs with time entries found. Add time entries to manage
              invoicing.
            </div>
          ) : filteredAndSortedJobStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jobs match the current filters. Try adjusting your filter
              settings.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {filteredAndSortedJobStats.reduce(
                      (sum, stat) => sum + stat.totalDates,
                      0,
                    )}
                  </div>
                  <div className="text-sm text-gray-300">Total Days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    $
                    {filteredAndSortedJobStats
                      .reduce((sum, stat) => sum + stat.totalBillable, 0)
                      .toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-300">Total Billable</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">
                    $
                    {filteredAndSortedJobStats
                      .reduce((sum, stat) => sum + stat.uninvoicedBillable, 0)
                      .toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-300">Uninvoiced</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    $
                    {filteredAndSortedJobStats
                      .reduce((sum, stat) => sum + stat.unpaidBillable, 0)
                      .toFixed(0)}
                  </div>
                  <div className="text-sm text-gray-300">Unpaid</div>
                </div>
              </div>

              {/* Job Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAndSortedJobStats.map((jobStat) => {
                  const getInvoiceStatusColor = (percentage: number) => {
                    if (percentage >= 100) return "bg-green-500";
                    if (percentage > 0) return "bg-yellow-500";
                    return "bg-red-500";
                  };

                  const getPaidStatusColor = (percentage: number) => {
                    if (percentage >= 100) return "bg-green-500";
                    if (percentage > 0) return "bg-blue-500";
                    return "bg-purple-500";
                  };

                  return (
                    <div
                      key={jobStat.job.id}
                      className="p-4 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-orange-500/50 transition-all"
                    >
                      {/* Job Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-100 truncate">
                            {jobStat.job.jobNumber}
                          </div>
                          <div className="text-sm text-gray-300 truncate">
                            {jobStat.job.name}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-sm text-gray-400">
                            {jobStat.totalDates}d
                          </div>
                          <div className="text-xs text-gray-500">
                            {jobStat.totalHours.toFixed(0)}h
                          </div>
                        </div>
                      </div>

                      {/* Status Metrics */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">
                            {jobStat.invoicePercentage.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-400 mb-2">
                            Invoiced
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getInvoiceStatusColor(jobStat.invoicePercentage)}`}
                              style={{ width: `${jobStat.invoicePercentage}%` }}
                            />
                          </div>
                          <div className="text-xs mt-1 space-y-0.5">
                            <div className="text-green-400">
                              ✓ {jobStat.invoicedDates}
                            </div>
                            <div className="text-red-400">
                              ✗ {jobStat.uninvoicedDates}
                            </div>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-400">
                            {jobStat.paidPercentage.toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-400 mb-2">Paid</div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${getPaidStatusColor(jobStat.paidPercentage)}`}
                              style={{ width: `${jobStat.paidPercentage}%` }}
                            />
                          </div>
                          <div className="text-xs mt-1 space-y-0.5">
                            <div className="text-green-400">
                              ✓ {jobStat.paidDates}
                            </div>
                            <div className="text-purple-400">
                              ◯ {jobStat.unpaidDates}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Summary */}
                      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700 pt-3 mb-3">
                        <div>
                          <div className="text-sm font-bold text-green-400">
                            ${jobStat.totalBillable.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-400">Total</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-red-400">
                            ${jobStat.uninvoicedBillable.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-400">
                            Uninvoiced
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-purple-400">
                            ${jobStat.unpaidBillable.toFixed(0)}
                          </div>
                          <div className="text-xs text-gray-400">Unpaid</div>
                        </div>
                      </div>

                      {/* LOA Info if applicable */}
                      {jobStat.totalLoaCount > 0 && (
                        <div className="mb-3 text-center">
                          <span className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
                            LOA: {jobStat.totalLoaCount} ($
                            {(jobStat.totalLoaCount * 200).toFixed(0)})
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedJob(jobStat.job);
                                setSelectedJobForBreakdown(jobStat.job);
                                setIsBreakdownDialogOpen(true);
                              }}
                              className="flex-1 border-gray-600 text-gray-100 hover:bg-gray-700"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="text-gray-100">
                                Manage {jobStat.job.jobNumber} -{" "}
                                {jobStat.job.name}
                              </DialogTitle>
                              <DialogDescription className="text-gray-300">
                                Manage invoice and payment status for individual
                                dates
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-96 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-gray-200">
                                      Date
                                    </TableHead>
                                    <TableHead className="text-gray-200">
                                      Hours
                                    </TableHead>
                                    <TableHead className="text-gray-200">
                                      Billable
                                    </TableHead>
                                    <TableHead className="text-gray-200">
                                      Invoiced
                                    </TableHead>
                                    <TableHead className="text-gray-200">
                                      Paid
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {getJobDates(jobStat.job).map((dateInfo) => (
                                    <TableRow key={dateInfo.date}>
                                      <TableCell className="text-gray-100">
                                        <Button
                                          variant="ghost"
                                          className="p-0 h-auto font-normal text-blue-400 hover:text-blue-300 hover:bg-transparent underline"
                                          onClick={() => {
                                            setSelectedDateForBreakdown(
                                              dateInfo.date,
                                            );
                                            setSelectedJobForBreakdown(
                                              jobStat.job,
                                            );
                                            setIsBreakdownDialogOpen(true);
                                          }}
                                        >
                                          {formatLocalDate(dateInfo.date)}
                                        </Button>
                                      </TableCell>
                                      <TableCell className="text-gray-100">
                                        {dateInfo.totalHours.toFixed(1)}h
                                        {dateInfo.totalLoaCount > 0 && (
                                          <div className="text-xs text-purple-400">
                                            +{dateInfo.totalLoaCount} LOA
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="text-gray-100">
                                        ${dateInfo.totalBillable.toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        <Switch
                                          checked={dateInfo.isInvoiced}
                                          onCheckedChange={() =>
                                            handleInvoiceToggle(jobStat.job, [
                                              dateInfo.date,
                                            ])
                                          }
                                          className="data-[state=checked]:bg-green-500"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Switch
                                          checked={dateInfo.isPaid}
                                          onCheckedChange={() => {
                                            if (dateInfo.isPaid) {
                                              removePaidDates(jobStat.job.id, [
                                                dateInfo.date,
                                              ]);
                                            } else {
                                              addPaidDates(jobStat.job.id, [
                                                dateInfo.date,
                                              ]);
                                            }
                                          }}
                                          className="data-[state=checked]:bg-purple-500"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Day Breakdown Dialog */}
                        <Dialog
                          open={isBreakdownDialogOpen}
                          onOpenChange={setIsBreakdownDialogOpen}
                        >
                          <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl">
                            <DialogHeader>
                              <DialogTitle className="text-gray-100">
                                Day Breakdown -{" "}
                                {selectedJobForBreakdown?.jobNumber}
                                {selectedDateForBreakdown &&
                                  ` - ${formatLocalDate(selectedDateForBreakdown)}`}
                              </DialogTitle>
                              <DialogDescription className="text-gray-300">
                                Detailed breakdown of time entries and rentals
                                for this day
                              </DialogDescription>
                            </DialogHeader>

                            {selectedJobForBreakdown &&
                              selectedDateForBreakdown && (
                                <div className="space-y-6">
                                  {(() => {
                                    const breakdown = getDayBreakdown(
                                      selectedJobForBreakdown,
                                      selectedDateForBreakdown,
                                    );

                                    return (
                                      <>
                                        {/* Time Entries */}
                                        {breakdown.timeEntries.length > 0 && (
                                          <div>
                                            <h3 className="text-lg font-semibold text-gray-100 mb-3">
                                              Time Entries
                                            </h3>
                                            <div className="overflow-x-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-gray-200">
                                                      Employee
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Title
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Hour Type
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Hours
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Effective Hours
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      LOA Count
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Cost
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Billable
                                                    </TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {breakdown.timeEntries.map(
                                                    (entry, index) => (
                                                      <TableRow key={index}>
                                                        <TableCell className="text-gray-100">
                                                          {entry.employeeName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.employeeTitle}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.hourTypeName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.hours.toFixed(
                                                            2,
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.effectiveHours.toFixed(
                                                            2,
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.loaCount || 0}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          $
                                                          {entry.totalCost.toFixed(
                                                            2,
                                                          )}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          $
                                                          {entry.totalBillableAmount.toFixed(
                                                            2,
                                                          )}
                                                        </TableCell>
                                                      </TableRow>
                                                    ),
                                                  )}
                                                  <TableRow className="border-t-2 border-orange-500/50 font-bold">
                                                    <TableCell
                                                      colSpan={3}
                                                      className="text-orange-200"
                                                    >
                                                      Time Totals:
                                                    </TableCell>
                                                    <TableCell className="text-blue-400">
                                                      {breakdown.timeEntries
                                                        .reduce(
                                                          (sum, entry) =>
                                                            sum + entry.hours,
                                                          0,
                                                        )
                                                        .toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-blue-400">
                                                      {breakdown.timeEntries
                                                        .reduce(
                                                          (sum, entry) =>
                                                            sum +
                                                            entry.effectiveHours,
                                                          0,
                                                        )
                                                        .toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-purple-400">
                                                      {breakdown.timeEntries.reduce(
                                                        (sum, entry) =>
                                                          sum +
                                                          (entry.loaCount || 0),
                                                        0,
                                                      )}
                                                    </TableCell>
                                                    <TableCell className="text-green-400">
                                                      $
                                                      {breakdown.timeEntries
                                                        .reduce(
                                                          (sum, entry) =>
                                                            sum +
                                                            entry.totalCost,
                                                          0,
                                                        )
                                                        .toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-green-400">
                                                      $
                                                      {breakdown.timeEntries
                                                        .reduce(
                                                          (sum, entry) =>
                                                            sum +
                                                            entry.totalBillableAmount,
                                                          0,
                                                        )
                                                        .toFixed(2)}
                                                    </TableCell>
                                                  </TableRow>
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        )}

                                        {/* Rental Entries */}
                                        {breakdown.rentalEntries.length > 0 && (
                                          <div>
                                            <h3 className="text-lg font-semibold text-gray-100 mb-3">
                                              Rental Entries
                                            </h3>
                                            <div className="overflow-x-auto">
                                              <Table>
                                                <TableHeader>
                                                  <TableRow>
                                                    <TableHead className="text-gray-200">
                                                      Employee
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Item
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Quantity
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Duration
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Rate
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      DSP Rate
                                                    </TableHead>
                                                    <TableHead className="text-gray-200">
                                                      Total Cost
                                                    </TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {breakdown.rentalEntries.map(
                                                    (entry, index) => (
                                                      <TableRow key={index}>
                                                        <TableCell className="text-gray-100">
                                                          {entry.employeeName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.rentalItemName}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.quantity}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          {entry.duration} days
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          $
                                                          {entry.dailyRate?.toFixed(
                                                            2,
                                                          ) || "0.00"}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          $
                                                          {entry.dspRate?.toFixed(
                                                            2,
                                                          ) || "0.00"}
                                                        </TableCell>
                                                        <TableCell className="text-gray-100">
                                                          $
                                                          {entry.totalCost.toFixed(
                                                            2,
                                                          )}
                                                        </TableCell>
                                                      </TableRow>
                                                    ),
                                                  )}
                                                  <TableRow className="border-t-2 border-orange-500/50 font-bold">
                                                    <TableCell
                                                      colSpan={6}
                                                      className="text-orange-200"
                                                    >
                                                      Rental Totals:
                                                    </TableCell>
                                                    <TableCell className="text-purple-400">
                                                      $
                                                      {breakdown.rentalEntries
                                                        .reduce(
                                                          (sum, entry) =>
                                                            sum +
                                                            entry.totalCost,
                                                          0,
                                                        )
                                                        .toFixed(2)}
                                                    </TableCell>
                                                  </TableRow>
                                                </TableBody>
                                              </Table>
                                            </div>
                                          </div>
                                        )}

                                        {/* Summary */}
                                        <div className="bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg p-4">
                                          <h3 className="text-lg font-semibold text-gray-100 mb-3">
                                            Day Summary
                                          </h3>
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-blue-400">
                                                {breakdown.timeEntries
                                                  .reduce(
                                                    (sum, entry) =>
                                                      sum + entry.hours,
                                                    0,
                                                  )
                                                  .toFixed(1)}
                                                h
                                              </div>
                                              <div className="text-sm text-gray-300">
                                                Total Hours
                                              </div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-purple-400">
                                                {breakdown.timeEntries.reduce(
                                                  (sum, entry) =>
                                                    sum + (entry.loaCount || 0),
                                                  0,
                                                )}
                                              </div>
                                              <div className="text-sm text-gray-300">
                                                LOA Count
                                              </div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-green-400">
                                                $
                                                {(
                                                  breakdown.timeEntries.reduce(
                                                    (sum, entry) =>
                                                      sum +
                                                      entry.totalBillableAmount,
                                                    0,
                                                  ) +
                                                  breakdown.rentalEntries.reduce(
                                                    (sum, entry) =>
                                                      sum + entry.totalCost,
                                                    0,
                                                  )
                                                ).toFixed(2)}
                                              </div>
                                              <div className="text-sm text-gray-300">
                                                Total Billable
                                              </div>
                                            </div>
                                            <div className="text-center">
                                              <div className="text-xl font-bold text-orange-400">
                                                $
                                                {breakdown.timeEntries
                                                  .reduce(
                                                    (sum, entry) =>
                                                      sum + entry.totalCost,
                                                    0,
                                                  )
                                                  .toFixed(2)}
                                              </div>
                                              <div className="text-sm text-gray-300">
                                                Labor Cost
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleJobPaidStatus(jobStat.job)}
                          className="px-3 hover:bg-gray-700"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
