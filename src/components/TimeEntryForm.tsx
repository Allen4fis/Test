import { useState, useEffect, useMemo } from "react";
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
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
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
  Clock,
  FileText,
  MapPin,
  Building,
  Activity,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { TimeEntry } from "@/types";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString as getLocalDateString,
} from "@/utils/dateUtils";

export function TimeEntryForm() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    addTimeEntry,
    addMultipleTimeEntries,
    updateTimeEntry,
    deleteTimeEntry,
  } = useTimeTracking();

  const [formData, setFormData] = useState({
    employeeId: "",
    jobId: "",
    provinceId: "",
    date: getLocalDateString(),
    hourType1: "",
    hours1: "",
    hourType2: "",
    hours2: "",
    hourType3: "",
    hours3: "",
    hourType4: "",
    hours4: "",
    loaCount: "",
    title: "",
    billableWageUsed: "",
    costWageUsed: "",
    description: "",
  });

  const [formError, setFormError] = useState("");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState("");

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
      provinceId: "",
      date: getLocalDateString(),
      hourType1: "",
      hours1: "",
      hourType2: "",
      hours2: "",
      hourType3: "",
      hours3: "",
      hourType4: "",
      hours4: "",
      loaCount: "",
      title: "",
      billableWageUsed: "",
      costWageUsed: "",
      description: "",
    });
    setFormError("");
    setEditingEntry(null);
  };

  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      // Validation
      if (
        !formData.employeeId ||
        !formData.jobId ||
        !formData.provinceId ||
        !formData.date ||
        !formData.title ||
        !formData.billableWageUsed ||
        !formData.costWageUsed
      ) {
        setFormError("Please fill in all required fields.");
        return;
      }

      // Collect all hour entries
      const hourEntries = [
        { hourTypeId: formData.hourType1, hours: formData.hours1 },
        { hourTypeId: formData.hourType2, hours: formData.hours2 },
        { hourTypeId: formData.hourType3, hours: formData.hours3 },
        { hourTypeId: formData.hourType4, hours: formData.hours4 },
      ].filter(
        (entry) =>
          entry.hourTypeId && entry.hours && parseFloat(entry.hours) > 0,
      );

      const loaCount = formData.loaCount ? parseFloat(formData.loaCount) : 0;
      const billableWageUsed = parseFloat(formData.billableWageUsed);
      const costWageUsed = parseFloat(formData.costWageUsed);

      // Validate at least one hour entry or LOA
      if (hourEntries.length === 0 && loaCount === 0) {
        setFormError(
          "Please enter at least one hour type with hours or a Live Out Allowance count.",
        );
        return;
      }

      // Validate wage inputs
      if (isNaN(billableWageUsed) || billableWageUsed < 0) {
        setFormError("Please enter a valid billable wage.");
        return;
      }

      if (isNaN(costWageUsed) || costWageUsed < 0) {
        setFormError("Please enter a valid cost wage.");
        return;
      }

      // Validate LOA count
      if (loaCount < 0 || (loaCount > 0 && !Number.isInteger(loaCount))) {
        setFormError(
          "Live Out Allowance count must be a whole number (0 or greater).",
        );
        return;
      }

      // Validate individual hour entries
      for (const entry of hourEntries) {
        const hours = parseFloat(entry.hours);
        if (isNaN(hours) || hours < 0) {
          setFormError("Please enter valid hour amounts (0 or greater).");
          return;
        }
        if (hours > 24) {
          setFormError("Hours cannot exceed 24 for a single entry.");
          return;
        }
      }

      if (editingEntry) {
        // For editing, we still use the single entry approach
        const hours =
          hourEntries.length > 0 ? parseFloat(hourEntries[0].hours) : 0;
        const hourTypeId =
          hourEntries.length > 0
            ? hourEntries[0].hourTypeId
            : formData.hourType1;

        const entryData = {
          employeeId: formData.employeeId,
          jobId: formData.jobId,
          hourTypeId: hourTypeId,
          provinceId: formData.provinceId,
          date: formData.date,
          hours: hours,
          loaCount: loaCount > 0 ? loaCount : undefined,
          title: formData.title,
          billableWageUsed: billableWageUsed,
          costWageUsed: costWageUsed,
          description: formData.description,
        };

        updateTimeEntry(editingEntry.id, entryData);
        resetForm();
      } else {
        // For new entries, create all entries at once using batch method
        if (hourEntries.length > 0) {
          setSubmissionProgress(`Creating ${hourEntries.length} entries...`);

          const entriesToCreate = hourEntries.map((entry, i) => {
            const hours = parseFloat(entry.hours);
            return {
              employeeId: formData.employeeId,
              jobId: formData.jobId,
              hourTypeId: entry.hourTypeId,
              provinceId: formData.provinceId,
              date: formData.date,
              hours: hours,
              loaCount: i === 0 && loaCount > 0 ? loaCount : undefined, // LOA only on first entry
              title: formData.title,
              billableWageUsed: billableWageUsed,
              costWageUsed: costWageUsed,
              description: formData.description,
            };
          });

          // Create all entries in a single batch operation
          addMultipleTimeEntries(entriesToCreate);
          setSubmissionProgress(
            `Successfully created ${hourEntries.length} entries!`,
          );
        }

        // If only LOA and no hours, create a single entry with 0 hours
        if (hourEntries.length === 0 && loaCount > 0) {
          setSubmissionProgress("Creating LOA entry...");

          const entryData = {
            employeeId: formData.employeeId,
            jobId: formData.jobId,
            hourTypeId: formData.hourType1 || hourTypes[0]?.id || "",
            provinceId: formData.provinceId,
            date: formData.date,
            hours: 0,
            loaCount: loaCount,
            title: formData.title,
            billableWageUsed: billableWageUsed,
            costWageUsed: costWageUsed,
            description: formData.description,
          };

          addTimeEntry(entryData);
          setSubmissionProgress("LOA entry created successfully!");
        }

        // Brief delay to show success message
        await delay(800);

        // Preserve form data but clear hours and description for next entry
        setFormData((prev) => ({
          ...prev,
          hours1: "",
          hours2: "",
          hours3: "",
          hours4: "",
          loaCount: "",
          description: "",
        }));
        setFormError("");
      }
    } catch (error) {
      setFormError("Error saving time entry. Please try again.");
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress("");
    }
  };

  const handleEdit = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setFormData({
      employeeId: entry.employeeId,
      jobId: entry.jobId,
      hourType1: entry.hourTypeId,
      hours1: entry.hours.toString(),
      hourType2: "",
      hours2: "",
      hourType3: "",
      hours3: "",
      hourType4: "",
      hours4: "",
      provinceId: entry.provinceId,
      date: entry.date,
      loaCount: entry.loaCount?.toString() || "",
      title: entry.title || "",
      billableWageUsed: entry.billableWageUsed?.toString() || "0",
      costWageUsed: entry.costWageUsed?.toString() || "0",
      description: entry.description || "",
    });
  };

  const handleCancelEdit = () => {
    resetForm();
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteTimeEntry(entryId);
    } catch (error) {
      // Error handled by component
    }
  };

  // Get recent time entries (sorted by latest input time) - Memoized for performance
  const recentEntries = useMemo(() => {
    return timeEntries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [timeEntries]);

  // Pagination for recent entries
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const pagination = usePagination({
    data: recentEntries,
    itemsPerPage,
  });

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
              : "Record hours worked for an employee with custom wage rates - multiple hour types will create separate entries"}
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
                    {employees.map((employee) => {
                      const manager = employee.managerId
                        ? employees.find((emp) => emp.id === employee.managerId)
                        : null;

                      const employeeType =
                        employee.category === "dsp"
                          ? "DSP"
                          : manager
                            ? `Employee of ${manager.name}`
                            : "Direct Employee";

                      return (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} - {employee.title} • {employeeType}
                        </SelectItem>
                      );
                    })}
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
                          <div className="flex items-center justify-between w-full">
                            <span>
                              {job.jobNumber} - {job.name}
                            </span>
                            {job.isBillable === false && (
                              <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded ml-2">
                                Non-Billable
                              </span>
                            )}
                          </div>
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

              {/* Live Out Allowance Count */}
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
                  Live Out Allowance count ($200 per LOA) - applies to first
                  entry only
                </p>
              </div>
            </div>

            {/* Hour Type and Hours Section */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">
                Hour Types & Hours
              </Label>
              <p className="text-sm text-gray-600">
                Enter hours for each hour type. Each filled hour type will
                create a separate time entry.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hour Type 1 */}
                <div className="space-y-2">
                  <Label htmlFor="hourType1" className="text-sm font-medium">
                    Hour Type 1
                  </Label>
                  <Select
                    value={formData.hourType1}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hourType1: value })
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

                <div className="space-y-2">
                  <Label htmlFor="hours1" className="text-sm font-medium">
                    Hours 1
                  </Label>
                  <Input
                    id="hours1"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.hours1}
                    onChange={(e) =>
                      setFormData({ ...formData, hours1: e.target.value })
                    }
                    placeholder="8.0"
                  />
                </div>

                {/* Hour Type 2 */}
                <div className="space-y-2">
                  <Label htmlFor="hourType2" className="text-sm font-medium">
                    Hour Type 2
                  </Label>
                  <Select
                    value={formData.hourType2}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hourType2: value })
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

                <div className="space-y-2">
                  <Label htmlFor="hours2" className="text-sm font-medium">
                    Hours 2
                  </Label>
                  <Input
                    id="hours2"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.hours2}
                    onChange={(e) =>
                      setFormData({ ...formData, hours2: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>

                {/* Hour Type 3 */}
                <div className="space-y-2">
                  <Label htmlFor="hourType3" className="text-sm font-medium">
                    Hour Type 3
                  </Label>
                  <Select
                    value={formData.hourType3}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hourType3: value })
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

                <div className="space-y-2">
                  <Label htmlFor="hours3" className="text-sm font-medium">
                    Hours 3
                  </Label>
                  <Input
                    id="hours3"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.hours3}
                    onChange={(e) =>
                      setFormData({ ...formData, hours3: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>

                {/* Hour Type 4 */}
                <div className="space-y-2">
                  <Label htmlFor="hourType4" className="text-sm font-medium">
                    Hour Type 4
                  </Label>
                  <Select
                    value={formData.hourType4}
                    onValueChange={(value) =>
                      setFormData({ ...formData, hourType4: value })
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

                <div className="space-y-2">
                  <Label htmlFor="hours4" className="text-sm font-medium">
                    Hours 4
                  </Label>
                  <Input
                    id="hours4"
                    type="number"
                    step="0.25"
                    min="0"
                    max="24"
                    value={formData.hours4}
                    onChange={(e) =>
                      setFormData({ ...formData, hours4: e.target.value })
                    }
                    placeholder="0.0"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="65.00"
                    required
                  />
                </div>
                {selectedEmployee &&
                  parseFloat(formData.billableWageUsed) &&
                  parseFloat(formData.billableWageUsed) !==
                    selectedEmployee.billableWage && (
                    <p className="text-xs text-blue-600">
                      Default rate: ${selectedEmployee.billableWage.toFixed(2)}
                    </p>
                  )}
              </div>

              {/* Cost Wage */}
              <div className="space-y-2">
                <Label htmlFor="costWageUsed" className="text-sm font-medium">
                  Cost Rate *
                </Label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
                  <Input
                    id="costWageUsed"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.costWageUsed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costWageUsed: e.target.value,
                      })
                    }
                    className="pl-10"
                    placeholder="45.00"
                    required
                  />
                </div>
                {selectedEmployee &&
                  parseFloat(formData.costWageUsed) &&
                  parseFloat(formData.costWageUsed) !==
                    selectedEmployee.costWage && (
                    <p className="text-xs text-blue-600">
                      Default rate: ${selectedEmployee.costWage.toFixed(2)}
                    </p>
                  )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description of work performed"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    {submissionProgress ||
                      (editingEntry ? "Updating..." : "Creating Entries...")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingEntry ? "Update Entry" : "Log Time"}
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
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Time Entries
          </CardTitle>
          <CardDescription>
            Last 50 time entries, sorted by newest first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No time entries yet. Add your first entry above!
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Hour Type</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead className="text-purple-600">
                      Live Out Allowance
                    </TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagination.paginatedData.map((entry) => {
                    const employee = employees.find(
                      (emp) => emp.id === entry.employeeId,
                    );
                    const job = jobs.find((job) => job.id === entry.jobId);
                    const hourType = hourTypes.find(
                      (ht) => ht.id === entry.hourTypeId,
                    );
                    const province = provinces.find(
                      (prov) => prov.id === entry.provinceId,
                    );

                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          <div>
                            <p>{employee?.name || "Unknown"}</p>
                            <p className="text-sm text-gray-500">
                              {entry.title}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {job?.jobNumber || "Unknown"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {job?.name || ""}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatLocalDate(entry.date, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {hourType?.name || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">
                              {entry.hours.toFixed(2)}h
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.loaCount && entry.loaCount > 0 ? (
                            <div className="text-purple-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">
                                  {entry.loaCount}
                                </span>
                              </div>
                              <div className="text-xs">
                                ${(entry.loaCount * 200).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-green-600 font-medium">
                            $
                            {(
                              entry.hours *
                                entry.billableWageUsed *
                                (hourType?.multiplier || 1) +
                              (entry.loaCount || 0) * 200
                            ).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DeleteConfirmationDialog
                              item={{
                                id: entry.id,
                                name: `${employee?.name || "Unknown"} - ${formatLocalDate(entry.date)} - ${hourType?.name || "Unknown"}`,
                                type: "time-entry",
                                associatedData: {
                                  additionalInfo: [
                                    `Employee: ${employee?.name || "Unknown"} (${entry.title})`,
                                    `Job: ${job?.jobNumber || "Unknown"} - ${job?.name || ""}`,
                                    `Date: ${formatLocalDate(entry.date)}`,
                                    `Hours: ${entry.hours.toFixed(2)}h`,
                                    `Hour Type: ${hourType?.name || "Unknown"}`,
                                    `Province: ${province?.name || "Unknown"}`,
                                    ...(entry.loaCount && entry.loaCount > 0
                                      ? [
                                          `LOA: ${entry.loaCount} ($${(entry.loaCount * 200).toFixed(2)})`,
                                        ]
                                      : []),
                                    `Total Cost: $${(
                                      entry.hours *
                                        entry.billableWageUsed *
                                        (hourType?.multiplier || 1) +
                                      (entry.loaCount || 0) * 200
                                    ).toFixed(2)}`,
                                    `Created: ${new Date(entry.createdAt).toLocaleDateString()}`,
                                  ],
                                },
                              }}
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              }
                              onConfirm={(entryId) => handleDelete(entry)}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {recentEntries.length > 0 && (
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
                itemsPerPageOptions={[10, 25, 50, 100]}
                className="border-t border-gray-700/50 pt-4"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );