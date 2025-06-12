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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Job } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

export function JobManagement() {
  const { jobs, timeEntries, rentalEntries, addJob, updateJob, deleteJob } =
    useTimeTracking();
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
  const [sortBy, setSortBy] = useState<"jobNumber" | "name" | "createdAt">(
    "jobNumber",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showActive, setShowActive] = useState(true);
  const [showInactive, setShowInactive] = useState(true);

  const resetForm = () => {
    setFormData({ jobNumber: "", name: "", description: "", isActive: true });
    setEditingJob(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.jobNumber.trim() || !formData.name.trim()) return;

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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (jobId: string) => {
    deleteJob(jobId);
  };

  const toggleJobStatus = (job: Job) => {
    updateJob(job.id, { isActive: !job.isActive });
  };

  // Filtered and sorted jobs
  const filteredAndSortedJobs = useMemo(() => {
    let filtered = jobs;

    // Apply status filters
    if (!showActive || !showInactive) {
      filtered = jobs.filter((job) => {
        if (!showActive && job.isActive) return false;
        if (!showInactive && !job.isActive) return false;
        return true;
      });
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "jobNumber":
          aValue = a.jobNumber.toLowerCase();
          bValue = b.jobNumber.toLowerCase();
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.jobNumber.toLowerCase();
          bValue = b.jobNumber.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [jobs, showActive, showInactive, sortBy, sortDirection]);

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
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                Reset Filters
              </Button>

              <div className="ml-auto text-sm text-gray-500">
                Showing {filteredAndSortedJobs.length} of {jobs.length} jobs
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jobs found. Add your first job to get started.
          </div>
        ) : filteredAndSortedJobs.length === 0 ? (
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
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.jobNumber}</TableCell>
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
                            ],
                          },
                        }}
                        trigger={
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        }
                        onConfirm={handleDelete}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
