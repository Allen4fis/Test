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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  Edit,
  Save,
  X,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { TimeEntry } from "@/types";

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function TimeEntryForm() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeTracking();

  const [formData, setFormData] = useState({
    employeeId: "",
    jobId: "",
    hourTypeId: "",
    provinceId: "",
    date: getLocalDateString(),
    hours: "",
    description: "",
  });

  const [formError, setFormError] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const resetForm = () => {
    setFormData({
      employeeId: "",
      jobId: "",
      hourTypeId: "",
      provinceId: "",
      date: getLocalDateString(),
      hours: "",
      description: "",
    });
    setFormError("");
    setEditingEntry(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validation
    if (
      !formData.employeeId ||
      !formData.jobId ||
      !formData.hourTypeId ||
      !formData.provinceId ||
      !formData.date ||
      !formData.hours
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const hours = parseFloat(formData.hours);
    if (isNaN(hours) || hours <= 0) {
      setFormError("Please enter a valid number of hours greater than 0.");
      return;
    }

    if (hours > 24) {
      setFormError("Hours cannot exceed 24 for a single day.");
      return;
    }

    try {
      const entryData = {
        employeeId: formData.employeeId,
        jobId: formData.jobId,
        hourTypeId: formData.hourTypeId,
        provinceId: formData.provinceId,
        date: formData.date,
        hours: hours,
        description: formData.description,
      };

      if (editingEntry) {
        updateTimeEntry(editingEntry.id, entryData);
      } else {
        addTimeEntry(entryData);
      }

      resetForm();
    } catch (error) {
      setFormError("Error saving time entry. Please try again.");
      console.error("Error saving time entry:", error);
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      employeeId: entry.employeeId,
      jobId: entry.jobId,
      hourTypeId: entry.hourTypeId,
      provinceId: entry.provinceId,
      date: entry.date,
      hours: entry.hours.toString(),
      description: entry.description || "",
    });
    setFormError("");

    // Scroll to form
    const formElement = document.getElementById("time-entry-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = (entry: TimeEntry) => {
    try {
      deleteTimeEntry(entry.id);
      // If we're editing this entry, cancel the edit
      if (editingEntry && editingEntry.id === entry.id) {
        resetForm();
      }
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find((emp) => emp.id === employeeId);
    return employee ? employee.name : "Unknown Employee";
  };

  const getJobNumber = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job ? job.jobNumber : "Unknown Job";
  };

  const getHourTypeName = (hourTypeId: string) => {
    const hourType = hourTypes.find((ht) => ht.id === hourTypeId);
    return hourType ? hourType.name : "Unknown Type";
  };

  const getProvinceName = (provinceId: string) => {
    const province = provinces.find((p) => p.id === provinceId);
    return province ? province.code : "Unknown Province";
  };

  const getHourTypeMultiplier = (hourTypeId: string) => {
    const hourType = hourTypes.find((ht) => ht.id === hourTypeId);
    return hourType ? hourType.multiplier : 1;
  };

  // Get recent time entries (last 20)
  const recentEntries = [...timeEntries]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);

  const activeJobs = jobs.filter((job) => job.isActive);

  // Check if we have the necessary data to create time entries
  const hasEmployees = employees.length > 0;
  const hasActiveJobs = activeJobs.length > 0;
  const canCreateEntry = hasEmployees && hasActiveJobs;

  return (
    <div className="space-y-6">
      <Card id="time-entry-form">
        <CardHeader>
          <CardTitle>
            {editingEntry ? "Edit Time Entry" : "Log Time Entry"}
          </CardTitle>
          <CardDescription>
            {editingEntry
              ? "Update the time entry details below"
              : "Record hours worked for employees across different jobs and provinces"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canCreateEntry && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {!hasEmployees &&
                  !hasActiveJobs &&
                  "You need to add employees and jobs before creating time entries. "}
                {!hasEmployees &&
                  hasActiveJobs &&
                  "You need to add employees before creating time entries. "}
                {hasEmployees &&
                  !hasActiveJobs &&
                  "You need to add active jobs before creating time entries. "}
                Go to the {!hasEmployees ? "Employees" : "Jobs"} section to get
                started.
              </AlertDescription>
            </Alert>
          )}

          {formError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          {editingEntry && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You are editing a time entry from{" "}
                {new Date(editingEntry.date).toLocaleDateString()}. Make your
                changes and click "Update Entry" to save.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                  disabled={!hasEmployees}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        hasEmployees
                          ? "Select employee"
                          : "No employees available"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.name} - {employee.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job">Job *</Label>
                <Select
                  value={formData.jobId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jobId: value })
                  }
                  disabled={!hasActiveJobs}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        hasActiveJobs
                          ? "Select job"
                          : "No active jobs available"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {activeJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.jobNumber} - {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hourType">Hour Type *</Label>
                <Select
                  value={formData.hourTypeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hourTypeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hour type" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourTypes.map((hourType) => (
                      <SelectItem key={hourType.id} value={hourType.id}>
                        {hourType.name} ({hourType.multiplier}x)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="province">Province *</Label>
                <Select
                  value={formData.provinceId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provinceId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((province) => (
                      <SelectItem key={province.id} value={province.id}>
                        {province.name} ({province.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Hours *</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  value={formData.hours}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: e.target.value })
                  }
                  placeholder="8.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional notes about the work performed..."
                rows={2}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!canCreateEntry}>
                {editingEntry ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update Entry
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Time Entry
                  </>
                )}
              </Button>

              {editingEntry && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </Button>
              )}

              {!editingEntry &&
                (formData.employeeId ||
                  formData.jobId ||
                  formData.hourTypeId ||
                  formData.provinceId ||
                  formData.hours ||
                  formData.description) && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Clear Form
                  </Button>
                )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>
            Latest 20 time entries - click edit to modify or delete to remove
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No time entries found. Add your first entry above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Province</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentEntries.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className={
                      editingEntry && editingEntry.id === entry.id
                        ? "bg-blue-50"
                        : ""
                    }
                  >
                    <TableCell className="font-medium">
                      {getEmployeeName(entry.employeeId)}
                    </TableCell>
                    <TableCell>{getJobNumber(entry.jobId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getHourTypeName(entry.hourTypeId)}
                      </Badge>
                    </TableCell>
                    <TableCell>{getProvinceName(entry.provinceId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>{entry.hours.toFixed(2)}</TableCell>
                    <TableCell>
                      {(
                        entry.hours * getHourTypeMultiplier(entry.hourTypeId)
                      ).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(entry)}
                          disabled={editingEntry?.id === entry.id}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete this time entry for{" "}
                                {getEmployeeName(entry.employeeId)} on{" "}
                                {new Date(entry.date).toLocaleDateString()}.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(entry)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
