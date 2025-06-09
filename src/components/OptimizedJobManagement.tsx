import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { VirtualizedTable, DebouncedSearchInput } from "./VirtualizedTable";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { Job } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
import {
  Briefcase,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
} from "lucide-react";

export function OptimizedJobManagement() {
  const {
    jobs,
    timeEntries,
    rentalEntries,
    isLoadingJobs,
    jobPagination,
    searchFilters,
    handleJobPageChange,
    handleJobSearch,
    addJob,
    updateJob,
    deleteJob,
  } = useOptimizedTimeTracking();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [formData, setFormData] = useState({
    jobNumber: "",
    name: "",
    description: "",
    isActive: true,
  });

  const resetForm = () => {
    setFormData({
      jobNumber: "",
      name: "",
      description: "",
      isActive: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const jobData = {
      jobNumber: formData.jobNumber,
      name: formData.name,
      description: formData.description || undefined,
      isActive: formData.isActive,
      invoicedDates: editingJob?.invoicedDates || [],
    };

    try {
      if (editingJob) {
        await updateJob(editingJob.id, jobData);
        setEditingJob(null);
      } else {
        await addJob(jobData);
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save job:", error);
    }
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      jobNumber: job.jobNumber,
      name: job.name,
      description: job.description || "",
      isActive: job.isActive,
    });
  };

  const handleDelete = async (job: Job) => {
    try {
      await deleteJob(job.id);
    } catch (error) {
      console.error("Failed to delete job:", error);
    }
  };

  const toggleJobStatus = async (job: Job) => {
    try {
      await updateJob(job.id, { isActive: !job.isActive });
    } catch (error) {
      console.error("Failed to toggle job status:", error);
    }
  };

  const columns = [
    {
      key: "jobNumber" as keyof Job,
      header: "Job Number",
      width: 150,
      minWidth: 120,
      sortable: true,
      render: (value: string, job: Job) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{value}</span>
          {job.isActive ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      ),
    },
    {
      key: "name" as keyof Job,
      header: "Job Name",
      width: 250,
      minWidth: 180,
      sortable: true,
    },
    {
      key: "description" as keyof Job,
      header: "Description",
      width: 300,
      minWidth: 200,
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value || "No description"}
        </div>
      ),
    },
    {
      key: "isActive" as keyof Job,
      header: "Status",
      width: 100,
      minWidth: 80,
      render: (value: boolean) => (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "invoicedDates" as keyof Job,
      header: "Invoiced",
      width: 100,
      minWidth: 80,
      render: (value: string[]) => (
        <Badge variant="outline">{value?.length || 0} dates</Badge>
      ),
    },
    {
      key: "createdAt" as keyof Job,
      header: "Created",
      width: 120,
      minWidth: 100,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      width: 150,
      minWidth: 120,
      render: (_: any, job: Job) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleJobStatus(job);
            }}
            title={job.isActive ? "Deactivate job" : "Activate job"}
          >
            {job.isActive ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(job);
            }}
          >
            <Pencil className="h-4 w-4" />
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            }
            onConfirm={async (jobId) => handleDelete({ id: jobId } as Job)}
          />
        </div>
      ),
    },
  ];

  const activeJobsCount = jobs.filter((job) => job.isActive).length;
  const inactiveJobsCount = jobs.filter((job) => !job.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Job Management
            <Badge variant="secondary" className="ml-2">
              {jobPagination.total} total
            </Badge>
            <Badge variant="default" className="bg-green-100 text-green-800">
              {activeJobsCount} active
            </Badge>
            {inactiveJobsCount > 0 && (
              <Badge variant="secondary">{inactiveJobsCount} inactive</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Manage your jobs with support for large projects (2000+ jobs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-gray-400" />
              <DebouncedSearchInput
                value={searchFilters.jobSearch}
                onChange={handleJobSearch}
                placeholder="Search jobs by number or name..."
                debounceMs={300}
              />
            </div>

            {/* Add Job Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Job
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Job</DialogTitle>
                  <DialogDescription>
                    Create a new job with basic information.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="jobNumber" className="text-right">
                        Job Number *
                      </Label>
                      <Input
                        id="jobNumber"
                        value={formData.jobNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            jobNumber: e.target.value,
                          })
                        }
                        className="col-span-3 font-mono"
                        placeholder="e.g., JOB-2024-001"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Job Name *
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
                      <div className="col-span-3 flex items-center gap-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <span className="text-sm text-gray-500">
                          {formData.isActive
                            ? "Job is active"
                            : "Job is inactive"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Job</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Job Table */}
      <VirtualizedTable
        data={jobs}
        columns={columns}
        height={500}
        itemHeight={56}
        isLoading={isLoadingJobs}
        emptyMessage="No jobs found. Add your first job to get started."
        pagination={{
          page: jobPagination.page,
          pageSize: jobPagination.pageSize,
          total: jobPagination.total,
          onPageChange: handleJobPageChange,
        }}
        onRowClick={(job) => handleEdit(job)}
      />

      {/* Edit Job Dialog */}
      <Dialog
        open={editingJob !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingJob(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update the job information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-jobNumber" className="text-right">
                  Job Number *
                </Label>
                <Input
                  id="edit-jobNumber"
                  value={formData.jobNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, jobNumber: e.target.value })
                  }
                  className="col-span-3 font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Job Name *
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isActive" className="text-right">
                  Active
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Switch
                    id="edit-isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                  <span className="text-sm text-gray-500">
                    {formData.isActive ? "Job is active" : "Job is inactive"}
                  </span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingJob(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Job</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
