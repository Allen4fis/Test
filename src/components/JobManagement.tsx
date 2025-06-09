import { useState } from "react";
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
import { Plus, Edit, Trash2 } from "lucide-react";
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
  });

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
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No jobs found. Add your first job to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
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
