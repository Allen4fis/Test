import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/usePagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Filter,
  Eye,
  EyeOff,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { Job } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

export function JobManagement() {
  const {
    jobs,
    timeEntries,
    rentalEntries,
    timeEntrySummaries,
    rentalSummaries,
    addJob,
    updateJob,
    deleteJob,
  } = useTimeTracking();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    jobNumber: "",
    name: "",
    description: "",
    isActive: true,
    isBillable: true,
  });

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<
    | "jobNumber"
    | "name"
    | "createdAt"
    | "profitMargin"
    | "totalBillable"
    | "totalCost"
  >("jobNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate profit margins for each job
  const jobProfitData = useMemo(() => {
    return jobs.map((job) => {
      // Get time entries for this job
      const jobTimeEntries = timeEntrySummaries.filter(
        (entry) => entry.jobNumber === job.jobNumber,
      );

      // Get rental entries for this job
      const jobRentalEntries = rentalSummaries.filter(
        (entry) => entry.jobNumber === job.jobNumber,
      );

      // Calculate totals from time entries
      const laborCost = jobTimeEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const laborBillable = jobTimeEntries.reduce(
        (sum, entry) => sum + entry.totalBillableAmount,
        0,
      );

      // Calculate totals from rental entries
      const rentalCost = jobRentalEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const rentalBillable = jobRentalEntries.reduce(
        (sum, entry) => sum + entry.totalBillable,
        0,
      );

      // Calculate combined totals
      const totalCost = laborCost + rentalCost;
      const totalBillable =
        job.isBillable === false ? 0 : laborBillable + rentalBillable;
      const totalProfit = totalBillable - totalCost;
      const profitMargin =
        totalBillable > 0 ? (totalProfit / totalBillable) * 100 : 0;

      // Calculate activity metrics
      const totalHours = jobTimeEntries.reduce(
        (sum, entry) => sum + entry.hours,
        0,
      );
      const entryCount = jobTimeEntries.length + jobRentalEntries.length;

      return {
        job,
        laborCost,
        laborBillable,
        rentalCost,
        rentalBillable,
        totalCost,
        totalBillable,
        totalProfit,
        profitMargin,
        totalHours,
        entryCount,
      };
    });
  }, [jobs, timeEntrySummaries, rentalSummaries]);

  const resetForm = () => {
    setFormData({
      jobNumber: "",
      name: "",
      description: "",
      isActive: true,
      isBillable: true,
    });
    setEditingJob(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobNumber.trim() || !formData.name.trim()) return;

    // Check for duplicate job number when creating new job
    if (!editingJob) {
      const existingJob = jobs.find(
        (job) =>
          job.jobNumber.toLowerCase() ===
          formData.jobNumber.trim().toLowerCase(),
      );
      if (existingJob) {
        toast({
          title: "Duplicate Job Number",
          description: `Job number "${formData.jobNumber}" already exists. Please use a different job number.`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // Check for duplicate job number when editing (excluding current job)
      const existingJob = jobs.find(
        (job) =>
          job.id !== editingJob.id &&
          job.jobNumber.toLowerCase() ===
            formData.jobNumber.trim().toLowerCase(),
      );
      if (existingJob) {
        toast({
          title: "Duplicate Job Number",
          description: `Job number "${formData.jobNumber}" already exists. Please use a different job number.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (editingJob) {
      updateJob(editingJob.id, formData);
    } else {
      addJob(formData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      jobNumber: job.jobNumber,
      name: job.name,
      description: job.description || "",
      isActive: job.isActive,
      isBillable: job.isBillable ?? true, // Default to true for backward compatibility
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (jobId: string) => {
    deleteJob(jobId);
  };

  const toggleJobStatus = (job: Job) => {
    updateJob(job.id, { isActive: !job.isActive });
  };

  // Filtered and sorted jobs with profit data
  const filteredAndSortedJobsWithProfit = useMemo(() => {
    let filtered = jobProfitData;

    // Apply search filter (same ruleset as InvoiceManagement)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const isNumericSearch = /^\d+$/.test(query.replace(/\s/g, ""));

      filtered = filtered.filter((jobData) => {
        const job = jobData.job;
        if (isNumericSearch) {
          // For numeric searches, only match job numbers exactly or as prefix
          return job.jobNumber.toLowerCase().includes(query);
        } else {
          // For text searches, search in job name and description, but only exact job number matches
          return (
            job.jobNumber.toLowerCase() === query ||
            job.name.toLowerCase().includes(query) ||
            (job.description && job.description.toLowerCase().includes(query))
          );
        }
      });
    }

    // Apply status filters
    if (!showActive || !showInactive) {
      filtered = filtered.filter((jobData) => {
        if (!showActive && jobData.job.isActive) return false;
        if (!showInactive && !jobData.job.isActive) return false;
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "jobNumber":
          // Parse job numbers as integers for proper numerical sorting
          aValue = parseInt(a.job.jobNumber) || 0;
          bValue = parseInt(b.job.jobNumber) || 0;
          break;
        case "name":
          aValue = a.job.name.toLowerCase();
          bValue = b.job.name.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.job.createdAt).getTime();
          bValue = new Date(b.job.createdAt).getTime();
          break;
        case "profitMargin":
          aValue = a.profitMargin;
          bValue = b.profitMargin;
          break;
        case "totalBillable":
          aValue = a.totalBillable;
          bValue = b.totalBillable;
          break;
        case "totalCost":
          aValue = a.totalCost;
          bValue = b.totalCost;
          break;
        default:
          aValue = a.job.jobNumber.toLowerCase();
          bValue = b.job.jobNumber.toLowerCase();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      } else {
        const numA = Number(aValue);
        const numB = Number(bValue);
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }
    });

    return sorted;
  }, [
    jobProfitData,
    showActive,
    showInactive,
    sortBy,
    sortDirection,
    searchQuery,
  ]);

  // Pagination for jobs
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const pagination = usePagination({
    data: filteredAndSortedJobsWithProfit,
    itemsPerPage,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Job Management</CardTitle>
            <CardDescription>
              Manage your jobs and project numbers
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingJob ? "Edit Job" : "Add New Job"}
                </DialogTitle>
                <DialogDescription>
                  {editingJob
                    ? "Update the job information below."
                    : "Enter the details for the new job."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jobNumber" className="text-right">
                      Job Number
                    </Label>
                    <Input
                      id="jobNumber"
                      value={formData.jobNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, jobNumber: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Job Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      Active
                    </Label>
                    <div className="col-span-3">
                      <Switch
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isActive: checked })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isBillable" className="text-right">
                      Billable
                    </Label>
                    <div className="col-span-3 flex items-center gap-3">
                      <Switch
                        id="isBillable"
                        checked={formData.isBillable}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, isBillable: checked })
                        }
                      />
                      <span className="text-sm text-gray-600">
                        {formData.isBillable
                          ? "Tracks costs and billable amounts"
                          : "Non-billable - costs only, no billable tracking"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingJob ? "Update Job" : "Add Job"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sorting and Filtering Controls */}
        <div className="px-6 pb-4">
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg border">
            {/* Search Input */}
            <div className="flex items-center gap-2 flex-1 min-w-[250px]">
              <Filter className="h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search jobs by number, name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <Label className="text-sm font-medium">Sort by:</Label>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jobNumber">Job Number</SelectItem>
                  <SelectItem value="name">Job Name</SelectItem>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="profitMargin">Profit Margin</SelectItem>
                  <SelectItem value="totalBillable">Total Billable</SelectItem>
                  <SelectItem value="totalCost">Total Cost</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
                className="px-2"
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <Label className="text-sm font-medium">Show:</Label>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={showActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowActive(!showActive)}
                  className="flex items-center gap-1"
                >
                  {showActive ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  Active
                </Button>

                <Button
                  variant={showInactive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowInactive(!showInactive)}
                  className="flex items-center gap-1"
                >
                  {showInactive ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  Inactive
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortBy("jobNumber");
                  setSortDirection("asc");
                  setShowActive(true);
                  setShowInactive(true);
                  setSearchQuery("");
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Reset Filters
              </Button>

              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredAndSortedJobsWithProfit.length} of{" "}
                {jobs.length} jobs
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Profit Summary Cards */}
        {jobs.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Cost
                    </p>
                    <p className="text-xl font-bold text-red-600">
                      $
                      {filteredAndSortedJobsWithProfit
                        .reduce((sum, jobData) => sum + jobData.totalCost, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Billable
                    </p>
                    <p className="text-xl font-bold text-green-600">
                      $
                      {filteredAndSortedJobsWithProfit
                        .reduce(
                          (sum, jobData) => sum + jobData.totalBillable,
                          0,
                        )
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Profit
                    </p>
                    <p className="text-xl font-bold text-blue-600">
                      $
                      {filteredAndSortedJobsWithProfit
                        .reduce((sum, jobData) => sum + jobData.totalProfit, 0)
                        .toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Overall Margin
                    </p>
                    <p className="text-xl font-bold text-purple-600">
                      {(() => {
                        const totalBillable = filteredAndSortedJobsWithProfit
                          .filter((jobData) => jobData.job.isBillable !== false)
                          .reduce(
                            (sum, jobData) => sum + jobData.totalBillable,
                            0,
                          );
                        const totalProfit = filteredAndSortedJobsWithProfit
                          .filter((jobData) => jobData.job.isBillable !== false)
                          .reduce(
                            (sum, jobData) => sum + jobData.totalProfit,
                            0,
                          );
                        const overallMargin =
                          totalBillable > 0
                            ? (totalProfit / totalBillable) * 100
                            : 0;
                        return `${overallMargin.toFixed(1)}%`;
                      })()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jobs found. Add your first job to get started.
          </div>
        ) : filteredAndSortedJobsWithProfit.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jobs match the current filters. Try adjusting your filter
            settings.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "jobNumber") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("jobNumber");
                      setSortDirection("asc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Job Number
                    {sortBy === "jobNumber" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "name") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("name");
                      setSortDirection("asc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Name
                    {sortBy === "name" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "createdAt") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("createdAt");
                      setSortDirection("desc"); // Default to newest first for dates
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Created
                    {sortBy === "createdAt" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead>Billing Type</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "totalCost") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("totalCost");
                      setSortDirection("desc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Total Cost
                    {sortBy === "totalCost" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "totalBillable") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("totalBillable");
                      setSortDirection("desc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Total Billable
                    {sortBy === "totalBillable" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 select-none"
                  onClick={() => {
                    if (sortBy === "profitMargin") {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc",
                      );
                    } else {
                      setSortBy("profitMargin");
                      setSortDirection("desc");
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    Profit Margin
                    {sortBy === "profitMargin" && (
                      <span className="text-blue-500">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.paginatedData.map((jobData) => {
                const { job } = jobData;
                const profitMarginColor =
                  jobData.profitMargin >= 30
                    ? "text-green-600"
                    : jobData.profitMargin >= 15
                      ? "text-yellow-600"
                      : jobData.profitMargin >= 0
                        ? "text-orange-600"
                        : "text-red-600";

                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.jobNumber}
                    </TableCell>
                    <TableCell>{job.name}</TableCell>
                    <TableCell>{job.description || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={job.isActive ? "default" : "secondary"}>
                        {job.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(job.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          (job.isBillable ?? true) ? "default" : "outline"
                        }
                        className={
                          (job.isBillable ?? true)
                            ? "bg-green-600"
                            : "bg-orange-600 text-white"
                        }
                      >
                        {(job.isBillable ?? true) ? "Billable" : "Non-Billable"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          ${jobData.totalCost.toFixed(2)}
                        </div>
                        {jobData.entryCount > 0 && (
                          <div className="text-xs text-gray-500">
                            {jobData.entryCount} entries,{" "}
                            {jobData.totalHours.toFixed(1)}h
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        {job.isBillable === false ? (
                          <div className="text-gray-500 text-sm">
                            Non-billable
                          </div>
                        ) : (
                          <div className="font-medium text-green-600">
                            ${jobData.totalBillable.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-right">
                        {job.isBillable === false ? (
                          <div className="text-gray-500 text-sm">—</div>
                        ) : jobData.totalBillable === 0 ? (
                          <div className="text-gray-500 text-sm">
                            No activity
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <TrendingUp
                              className={`h-4 w-4 ${profitMarginColor}`}
                            />
                            <div className={`font-medium ${profitMarginColor}`}>
                              {jobData.profitMargin.toFixed(1)}%
                            </div>
                          </div>
                        )}
                        {job.isBillable !== false &&
                          jobData.totalBillable > 0 && (
                            <div className="text-xs text-gray-500">
                              ${jobData.totalProfit.toFixed(2)} profit
                            </div>
                          )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleJobStatus(job)}
                        >
                          {job.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(job)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <DeleteConfirmationDialog
                          item={{
                            id: job.id,
                            name: `${job.jobNumber} - ${job.name}`,
                            type: "job",
                            associatedData: {
                              timeEntries: timeEntries.filter(
                                (entry) => entry.jobId === job.id,
                              ).length,
                              rentalEntries: rentalEntries.filter(
                                (entry) => entry.jobId === job.id,
                              ).length,
                              additionalInfo: [
                                `Status: ${job.isActive ? "Active" : "Inactive"}`,
                                `Invoiced dates: ${job.invoicedDates?.length || 0} dates`,
                                `Created: ${new Date(job.createdAt).toLocaleDateString()}`,
                                `Total Cost: $${jobData.totalCost.toFixed(2)}`,
                                job.isBillable !== false
                                  ? `Total Billable: $${jobData.totalBillable.toFixed(2)}`
                                  : null,
                                job.isBillable !== false
                                  ? `Profit Margin: ${jobData.profitMargin.toFixed(1)}%`
                                  : null,
                              ].filter(Boolean),
                            },
                          }}
                          trigger={
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          onConfirm={() => handleDelete(job.id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* Pagination Controls */}
        {filteredAndSortedJobsWithProfit.length > 0 && (
          <div className="mt-4">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              pageInfo={pagination.pageInfo}
              canGoNext={pagination.canGoNext}
              canGoPrevious={pagination.canGoPrevious}
              onPageChange={pagination.goToPage}
              onNextPage={pagination.goToNextPage}
              onPreviousPage={pagination.goToPreviousPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                pagination.goToPage(1);
              }}
              className="border-t border-gray-700/50 pt-4"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
