import { useState, useEffect, useMemo } from "react";
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
  User,
  Banknote,
  DollarSign,
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

import { parseLocalDate, formatLocalDate } from "@/utils/dateUtils";

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
    loaCount: "",
    title: "",
    billableWageUsed: "",
    costWageUsed: "",
    description: "",
  });

  const [formError, setFormError] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);

  // Update title and wages when employee is selected
  useEffect(() => {
    if (formData.employeeId && !editingEntry) {
      const selectedEmployee = employees.find(
        (emp) => emp.id === formData.employeeId,
      );
      if (selectedEmployee) {
        setFormData((prev) => ({
          ...prev,
          title: selectedEmployee.title,
          billableWageUsed: selectedEmployee.billableWage.toString(),
          costWageUsed: selectedEmployee.costWage.toString(),
        }));
      }
    }
  }, [formData.employeeId, employees, editingEntry]);

  const resetForm = () => {
    setFormData({
      employeeId: "",
      jobId: "",
      hourTypeId: "",
      provinceId: "",
      date: getLocalDateString(),
      hours: "",
      loaCount: "",
      title: "",
      billableWageUsed: "",
      costWageUsed: "",
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
      !formData.hours ||
      !formData.title ||
      !formData.billableWageUsed ||
      !formData.costWageUsed
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    const hours = parseFloat(formData.hours);
    const loaCount = formData.loaCount ? parseFloat(formData.loaCount) : 0;
    const billableWageUsed = parseFloat(formData.billableWageUsed);
    const costWageUsed = parseFloat(formData.costWageUsed);

    if (isNaN(hours) || hours < 0) {
      setFormError("Please enter a valid number of hours (0 or greater).");
      return;
    }

    if (hours === 0 && loaCount === 0) {
      setFormError(
        "Please enter either hours worked or Live Out Allowance count.",
      );
      return;
    }

    if (hours > 24) {
      setFormError("Hours cannot exceed 24 for a single day.");
      return;
    }

    if (loaCount < 0 || (loaCount > 0 && !Number.isInteger(loaCount))) {
      setFormError(
        "Live Out Allowance count must be a whole number (0 or greater).",
      );
      return;
    }

    if (isNaN(billableWageUsed) || billableWageUsed < 0) {
      setFormError("Please enter a valid billable wage.");
      return;
    }

    if (isNaN(costWageUsed) || costWageUsed < 0) {
      setFormError("Please enter a valid cost wage.");
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
        loaCount: loaCount > 0 ? loaCount : undefined,
        title: formData.title,
        billableWageUsed: billableWageUsed,
        costWageUsed: costWageUsed,
        description: formData.description,
      };

      if (editingEntry) {
        updateTimeEntry(editingEntry.id, entryData);
        resetForm(); // Full reset when editing
      } else {
        addTimeEntry(entryData);
        // Preserve form data but clear hours, Live Out Allowance count, and description for next entry
        setFormData((prev) => ({
          ...prev,
          hours: "",
          loaCount: "",
          description: "",
        }));
        setFormError("");
      }
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
      loaCount: entry.loaCount?.toString() || "",
      title: entry.title || "",
      billableWageUsed: entry.billableWageUsed?.toString() || "0",
      costWageUsed: entry.costWageUsed?.toString() || "0",
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

  const handleDelete = async (entry: TimeEntry) => {
    try {
      await deleteTimeEntry(entry.id);
    } catch (error) {
      console.error("Error deleting time entry:", error);
    }
  };

  // Get recent time entries (last 50, sorted by latest input time) - Memoized for performance
  const recentEntries = useMemo(() => {
    return timeEntries
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }, [timeEntries]);

  const selectedEmployee = employees.find(
    (emp) => emp.id === formData.employeeId,
  );

  return (
    <div className="space-y-6">
      {/* Time Entry Form */}
      <Card id="time-entry-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {editingEntry ? "Edit Time Entry" : "Log Time Entry"}
          </CardTitle>
          <CardDescription>
            {editingEntry
              ? "Update the time entry details"
              : "Record hours worked for an employee with custom wage rates"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formError && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employee Selection */}
              <div className="space-y-2">
                <Label htmlFor="employee" className="text-sm font-medium">
                  Employee *
                </Label>
                <Select
                  value={formData.employeeId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
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

              {/* Employee Title */}
              <div className="space-y-2">
                <Label
                  htmlFor="title"
                  className="text-sm font-medium flex items-center gap-1"
                >
                  <User className="h-4 w-4" />
                  Title *
                </Label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter title for this entry"
                  required
                />
                {selectedEmployee &&
                  selectedEmployee.title !== formData.title &&
                  formData.title && (
                    <p className="text-xs text-blue-600">
                      Default title: {selectedEmployee.title}
                    </p>
                  )}
              </div>

              {/* Job Selection */}
              <div className="space-y-2">
                <Label htmlFor="job" className="text-sm font-medium">
                  Job *
                </Label>
                <Select
                  value={formData.jobId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, jobId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs
                      .filter((job) => job.isActive)
                      .map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.jobNumber} - {job.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hour Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="hourType" className="text-sm font-medium">
                  Hour Type *
                </Label>
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
                        {hourType.name} (x{hourType.multiplier})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Province Selection */}
              <div className="space-y-2">
                <Label htmlFor="province" className="text-sm font-medium">
                  Province *
                </Label>
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

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium">
                  Date *
                </Label>
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

              {/* Hours */}
              <div className="space-y-2">
                <Label htmlFor="hours" className="text-sm font-medium">
                  Hours
                </Label>
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
                  placeholder="8.0"
                />
              </div>

              {/* LOA Count */}
              <div className="space-y-2">
                <Label htmlFor="loaCount" className="text-sm font-medium">
                  Live Out Allowance Count
                </Label>
                <Input
                  id="loaCount"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.loaCount}
                  onChange={(e) =>
                    setFormData({ ...formData, loaCount: e.target.value })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  Live Out Allowance count ($200 per LOA)
                </p>
              </div>

              {/* Billable Wage */}
              <div className="space-y-2">
                <Label
                  htmlFor="billableWageUsed"
                  className="text-sm font-medium"
                >
                  Billable Rate *
                </Label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                  <Input
                    id="billableWageUsed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.billableWageUsed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billableWageUsed: e.target.value,
                      })
                    }
                    className="pl-10"
                    placeholder="45.00"
                    required
                  />
                </div>
                {selectedEmployee &&
                  selectedEmployee.billableWage !==
                    parseFloat(formData.billableWageUsed) &&
                  formData.billableWageUsed && (
                    <p className="text-xs text-green-600">
                      Default: ${selectedEmployee.billableWage.toFixed(2)}/hr
                    </p>
                  )}
              </div>

              {/* Cost Wage */}
              <div className="space-y-2">
                <Label htmlFor="costWageUsed" className="text-sm font-medium">
                  Cost Rate *
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
                  <Input
                    id="costWageUsed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costWageUsed}
                    onChange={(e) =>
                      setFormData({ ...formData, costWageUsed: e.target.value })
                    }
                    className="pl-10"
                    placeholder="25.00"
                    required
                  />
                </div>
                {selectedEmployee &&
                  selectedEmployee.costWage !==
                    parseFloat(formData.costWageUsed) &&
                  formData.costWageUsed && (
                    <p className="text-xs text-red-600">
                      Default: ${selectedEmployee.costWage.toFixed(2)}/hr
                    </p>
                  )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Brief description of work performed..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                {editingEntry ? "Update Entry" : "Log Time"}
              </Button>
              {editingEntry && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Time Entries
          </CardTitle>
          <CardDescription>
            Your recent time entries (sorted by latest input). Click on an entry
            to edit.
            {!showAllEntries && recentEntries.length > 10 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAllEntries(true)}
                className="p-0 ml-2 h-auto text-blue-600 underline"
              >
                Show all {recentEntries.length} entries
              </Button>
            )}
            {showAllEntries && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowAllEntries(false)}
                className="p-0 ml-2 h-auto text-blue-600 underline"
              >
                Show fewer
              </Button>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No time entries yet. Log your first entry above!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="text-purple-600">
                      Live Out Allowance
                    </TableHead>
                    <TableHead>Billable</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showAllEntries
                    ? recentEntries
                    : recentEntries.slice(0, 10)
                  ).map((entry) => {
                    const employee = employees.find(
                      (emp) => emp.id === entry.employeeId,
                    );
                    const job = jobs.find((j) => j.id === entry.jobId);
                    const hourType = hourTypes.find(
                      (ht) => ht.id === entry.hourTypeId,
                    );
                    const province = provinces.find(
                      (p) => p.id === entry.provinceId,
                    );

                    const billableWageChanged =
                      employee &&
                      entry.billableWageUsed !== employee.billableWage;
                    const costWageChanged =
                      employee && entry.costWageUsed !== employee.costWage;

                    return (
                      <TableRow
                        key={entry.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          editingEntry?.id === entry.id
                            ? "bg-blue-50 border-l-4 border-l-blue-500"
                            : ""
                        }`}
                        onClick={() => handleEdit(entry)}
                      >
                        <TableCell>{formatLocalDate(entry.date)}</TableCell>
                        <TableCell>{employee?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>
                              {entry.title || employee?.title || "Unknown"}
                            </span>
                            {entry.title && entry.title !== employee?.title && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {job?.jobNumber || "Unknown"} -{" "}
                          {job?.name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {hourType?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>{entry.hours}h</TableCell>
                        <TableCell>
                          {entry.loaCount && entry.loaCount > 0 ? (
                            <div className="flex items-center gap-1">
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 text-purple-800"
                              >
                                {entry.loaCount}
                              </Badge>
                              <span className="text-xs text-purple-600 font-medium">
                                ${(entry.loaCount * 200).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600 font-medium">
                              ${entry.billableWageUsed?.toFixed(2) || "0.00"}
                            </span>
                            {billableWageChanged && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600 font-medium">
                              ${entry.costWageUsed?.toFixed(2) || "0.00"}
                            </span>
                            {costWageChanged && (
                              <Badge variant="outline" className="text-xs">
                                Modified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(entry);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-red-600">
                                    ⚠️ Delete Time Entry
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-lg font-semibold text-red-700">
                                    If Deleted, This Time Entry Will Be Gone
                                    FOREVER AND EVER AND EVER!
                                  </AlertDialogDescription>
                                  <AlertDialogDescription className="text-sm text-gray-600 mt-2">
                                    Time entry for {employee?.name} on{" "}
                                    {entry.date} - {entry.hours} hours
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(entry)}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
