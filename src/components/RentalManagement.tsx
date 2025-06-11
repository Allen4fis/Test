import { useState, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
  User,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { RentalItem, RentalEntry } from "@/types";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

export function RentalManagement() {
  const {
    rentalItems,
    rentalEntries,
    employees,
    jobs,
    addRentalItem,
    updateRentalItem,
    deleteRentalItem,
    addRentalEntry,
    updateRentalEntry,
    deleteRentalEntry,
  } = useTimeTracking();

  // Rental Item Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    dailyRate: "",
    hourlyRate: "",
    unit: "day" as const,
    isActive: true,
  });

  // Rental Entry Form State
  const [entryFormData, setEntryFormData] = useState({
    rentalItemId: "",
    jobId: "",
    employeeId: "",
    startDate: "",
    endDate: "",
    quantity: 1,
    dspRate: "",
    description: "",
  });

  // UI State
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [editingEntry, setEditingEntry] = useState<RentalEntry | null>(null);

  // Reset forms
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      dailyRate: "",
      hourlyRate: "",
      unit: "day",
      isActive: true,
    });
  };

  const resetEntryForm = () => {
    setEntryFormData({
      rentalItemId: "",
      jobId: "",
      employeeId: "",
      startDate: "",
      endDate: "",
      quantity: 1,
      dspRate: "",
      description: "",
    });
  };

  // Handle form submissions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      dailyRate: parseFloat(formData.dailyRate),
      hourlyRate: formData.hourlyRate
        ? parseFloat(formData.hourlyRate)
        : undefined,
      unit: formData.unit,
      isActive: formData.isActive,
    };

    if (editingItem) {
      updateRentalItem(editingItem.id, itemData);
      setEditingItem(null);
    } else {
      addRentalItem(itemData);
    }

    resetForm();
  };

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Find the selected rental item to get its rate and unit
    const selectedRentalItem = rentalItems.find(
      (item) => item.id === entryFormData.rentalItemId,
    );

    if (!selectedRentalItem) {
      console.error("Selected rental item not found");
      return;
    }

    const entryData = {
      rentalItemId: entryFormData.rentalItemId,
      jobId: entryFormData.jobId,
      employeeId: entryFormData.employeeId || undefined,
      startDate: entryFormData.startDate,
      endDate: entryFormData.endDate,
      quantity: entryFormData.quantity,
      billingUnit: selectedRentalItem.unit, // Use the rental item's unit
      rateUsed: selectedRentalItem.dailyRate, // Use the current daily rate
      dspRate: entryFormData.dspRate
        ? parseFloat(entryFormData.dspRate)
        : undefined,
      description: entryFormData.description,
    };

    if (editingEntry) {
      updateRentalEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      addRentalEntry(entryData);
    }

    resetEntryForm();
  };

  // Handle editing
  const handleEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      dailyRate: item.dailyRate.toString(),
      hourlyRate: item.hourlyRate?.toString() || "",
      unit: item.unit,
      isActive: item.isActive,
    });
  };

  const handleEditEntry = (entry: RentalEntry) => {
    setEditingEntry(entry);
    setEntryFormData({
      rentalItemId: entry.rentalItemId,
      jobId: entry.jobId,
      employeeId: entry.employeeId || "",
      startDate: entry.startDate,
      endDate: entry.endDate,
      quantity: entry.quantity,
      dspRate: entry.dspRate?.toString() || "",
      description: entry.description || "",
    });
  };

  // Handle deletions
  const handleDeleteItem = (id: string) => {
    deleteRentalItem(id);
  };

  const handleDeleteEntry = (id: string) => {
    deleteRentalEntry(id);
  };

  // Handle rental item selection for entry form
  const handleRentalItemChange = (value: string) => {
    setEntryFormData({ ...entryFormData, rentalItemId: value });
  };

  // Calculate rental summaries directly to ensure immediate updates
  const rentalSummaries = useMemo(() => {
    return rentalEntries.map((entry) => {
      const item = rentalItems.find((item) => item.id === entry.rentalItemId);
      const job = jobs.find((job) => job.id === entry.jobId);
      const employee = entry.employeeId
        ? employees.find((emp) => emp.id === entry.employeeId)
        : null;

      // Calculate duration based on billing unit
      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());

      let duration = 1;
      switch (entry.billingUnit) {
        case "hour":
          duration = Math.ceil(diffTime / (1000 * 60 * 60));
          break;
        case "day":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
          break;
        case "week":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
          break;
        case "month":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
          break;
      }

      const totalCost = duration * entry.quantity * entry.rateUsed;

      return {
        id: entry.id,
        rentalItemName: item?.name || "Unknown Item",
        itemName: item?.name || "Unknown Item", // Add this for backward compatibility
        category: item?.category || "Unknown",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        employeeName: employee?.name || "Unassigned",
        employeeTitle: employee?.title || "N/A",
        startDate: entry.startDate,
        endDate: entry.endDate,
        duration,
        quantity: entry.quantity,
        billingUnit: entry.billingUnit,
        rateUsed: entry.rateUsed,
        dspRate: entry.dspRate, // Include DSP rate from the entry
        totalCost,
        description: entry.description,
        date: entry.startDate, // Use start date for filtering compatibility
      };
    });
  }, [rentalEntries, rentalItems, jobs, employees]);

  const activeItems = rentalItems.filter((item) => item.isActive);
  const activeJobs = jobs.filter((job) => job.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Rental Management
          </h1>
          <p className="text-muted-foreground">
            Manage rental equipment and track rental entries
          </p>
        </div>
      </div>

      <Tabs defaultValue="items" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items">Rental Items</TabsTrigger>
          <TabsTrigger value="entries">Rental Entries</TabsTrigger>
        </TabsList>

        {/* Rental Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rental Items</CardTitle>
                  <CardDescription>
                    Manage your rental equipment and their rates
                  </CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add Rental Item</DialogTitle>
                      <DialogDescription>
                        Add a new rental item to your inventory.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name *
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
                          <Label htmlFor="category" className="text-right">
                            Category *
                          </Label>
                          <Input
                            id="category"
                            value={formData.category}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                category: e.target.value,
                              })
                            }
                            className="col-span-3"
                            placeholder="e.g., Equipment, Tools, Vehicles"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="dailyRate" className="text-right">
                            Daily Rate *
                          </Label>
                          <Input
                            id="dailyRate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.dailyRate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dailyRate: e.target.value,
                              })
                            }
                            className="col-span-3"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="hourlyRate" className="text-right">
                            Hourly Rate
                          </Label>
                          <Input
                            id="hourlyRate"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.hourlyRate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hourlyRate: e.target.value,
                              })
                            }
                            className="col-span-3"
                            placeholder="Optional hourly rate"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="unit" className="text-right">
                            Unit *
                          </Label>
                          <Select
                            value={formData.unit}
                            onValueChange={(value: any) =>
                              setFormData({ ...formData, unit: value })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="day">Day</SelectItem>
                              <SelectItem value="hour">Hour</SelectItem>
                              <SelectItem value="week">Week</SelectItem>
                              <SelectItem value="month">Month</SelectItem>
                            </SelectContent>
                          </Select>
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
                            placeholder="Optional description"
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="isActive" className="text-right">
                            Active
                          </Label>
                          <Switch
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, isActive: checked })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Item</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {rentalItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No rental items yet. Add your first item to get started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-sm text-gray-500">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
                                {item.dailyRate.toFixed(2)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">Per {item.unit}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.isActive ? (
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <DeleteConfirmationDialog
                                item={{
                                  id: item.id,
                                  name: item.name,
                                  type: "rental-item",
                                  associatedData: {
                                    additionalInfo: [
                                      `Category: ${item.category}`,
                                      `Rate: $${item.dailyRate.toFixed(2)} per ${item.unit}`,
                                      item.dspRate
                                        ? `DSP Rate: $${item.dspRate.toFixed(2)}`
                                        : null,
                                      `Status: ${item.isActive ? "Active" : "Inactive"}`,
                                    ].filter(Boolean),
                                  },
                                }}
                                trigger={
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                }
                                onConfirm={() => handleDeleteItem(item.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Item Dialog */}
          <Dialog
            open={editingItem !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingItem(null);
                resetForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Rental Item</DialogTitle>
                <DialogDescription>
                  Update the rental item information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Name *
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
                    <Label htmlFor="edit-category" className="text-right">
                      Category *
                    </Label>
                    <Input
                      id="edit-category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-dailyRate" className="text-right">
                      Daily Rate *
                    </Label>
                    <Input
                      id="edit-dailyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dailyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, dailyRate: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-hourlyRate" className="text-right">
                      Hourly Rate
                    </Label>
                    <Input
                      id="edit-hourlyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.hourlyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, hourlyRate: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-unit" className="text-right">
                      Unit *
                    </Label>
                    <Select
                      value={formData.unit}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, unit: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">Day</SelectItem>
                        <SelectItem value="hour">Hour</SelectItem>
                        <SelectItem value="week">Week</SelectItem>
                        <SelectItem value="month">Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-isActive" className="text-right">
                      Active
                    </Label>
                    <Switch
                      id="edit-isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, isActive: checked })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Update Item</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Rental Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Rental Entries
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {rentalSummaries.length} of {rentalEntries.length} entries
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Track rental equipment usage and billing
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {activeItems.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Entry
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Add Rental Entry</DialogTitle>
                          <DialogDescription>
                            Add a new rental entry to track equipment usage.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEntrySubmit}>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label
                                htmlFor="rentalItem"
                                className="text-right"
                              >
                                Rental Item *
                              </Label>
                              <Select
                                value={entryFormData.rentalItemId}
                                onValueChange={handleRentalItemChange}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select rental item" />
                                </SelectTrigger>
                                <SelectContent>
                                  {activeItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name} - ${item.dailyRate.toFixed(2)}
                                      /{item.unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="job" className="text-right">
                                Job *
                              </Label>
                              <Select
                                value={entryFormData.jobId}
                                onValueChange={(value) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    jobId: value,
                                  })
                                }
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select job" />
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
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="employee" className="text-right">
                                Employee
                              </Label>
                              <Select
                                value={entryFormData.employeeId}
                                onValueChange={(value) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    employeeId: value === "none" ? "" : value,
                                  })
                                }
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select employee (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">
                                    No Employee
                                  </SelectItem>
                                  {employees.map((employee) => (
                                    <SelectItem
                                      key={employee.id}
                                      value={employee.id}
                                    >
                                      {employee.name} - {employee.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="startDate" className="text-right">
                                Start Date *
                              </Label>
                              <Input
                                id="startDate"
                                type="date"
                                value={entryFormData.startDate}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    startDate: e.target.value,
                                  })
                                }
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="endDate" className="text-right">
                                End Date *
                              </Label>
                              <Input
                                id="endDate"
                                type="date"
                                value={entryFormData.endDate}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    endDate: e.target.value,
                                  })
                                }
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="quantity" className="text-right">
                                Quantity *
                              </Label>
                              <Input
                                id="quantity"
                                type="number"
                                min="1"
                                step="1"
                                value={entryFormData.quantity}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    quantity: parseInt(e.target.value) || 1,
                                  })
                                }
                                className="col-span-3"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="dspRate" className="text-right">
                                DSP Rate
                              </Label>
                              <Input
                                id="dspRate"
                                type="number"
                                min="0"
                                step="0.01"
                                value={entryFormData.dspRate}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    dspRate: e.target.value,
                                  })
                                }
                                className="col-span-3"
                                placeholder="Enter DSP rate (optional)"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label
                                htmlFor="description"
                                className="text-right"
                              >
                                Description
                              </Label>
                              <Textarea
                                id="description"
                                value={entryFormData.description}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    description: e.target.value,
                                  })
                                }
                                className="col-span-3"
                                placeholder="Optional description"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="submit">Add Entry</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Please add rental items first before creating rental entries.
                </p>
              ) : rentalSummaries.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No rental entries yet. Add your first rental to get started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Rental Rate</TableHead>
                        <TableHead>DSP Rate</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalSummaries.map((summary, index) => {
                        // Find the rental item by name
                        const rentalItem = rentalItems.find(
                          (item) => item.name === summary.rentalItemName,
                        );

                        return (
                          <TableRow key={`${summary.id}-${index}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {summary.itemName ||
                                    summary.rentalItemName ||
                                    "Unknown Item"}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {summary.category || "Unknown"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {summary.jobNumber || "Unknown Job"}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {summary.jobName || ""}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {summary.employeeName || "No Employee"}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{summary.startDate}</p>
                                <p>to {summary.endDate}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span>
                                  {summary.duration} {summary.billingUnit}
                                  {summary.duration !== 1 ? "s" : ""}
                                </span>
                                {summary.quantity > 1 && (
                                  <Badge variant="secondary" className="ml-1">
                                    x{summary.quantity}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {rentalItem ? (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span className="font-medium text-green-600">
                                    {rentalItem.dailyRate.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    /{rentalItem.unit}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {summary.dspRate ? (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium text-purple-600">
                                    {summary.dspRate.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    /day
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">
                                  {summary.totalCost?.toFixed(2) || "0.00"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditEntry(summary)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <DeleteConfirmationDialog
                                  item={{
                                    id: summary.id,
                                    name: `${summary.itemName || summary.rentalItemName} - ${summary.jobNumber}`,
                                    type: "rental-entry",
                                    associatedData: {
                                      additionalInfo: [
                                        `Item: ${summary.itemName || summary.rentalItemName}`,
                                        `Job: ${summary.jobNumber} - ${summary.jobName}`,
                                        `Employee: ${summary.employeeName}`,
                                        `Period: ${summary.startDate} to ${summary.endDate}`,
                                        `Duration: ${summary.duration} ${summary.billingUnit}${summary.duration !== 1 ? "s" : ""}`,
                                        `Quantity: ${summary.quantity}`,
                                        `Total cost: $${summary.totalCost?.toFixed(2) || "0.00"}`,
                                      ],
                                    },
                                  }}
                                  trigger={
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  }
                                  onConfirm={() =>
                                    handleDeleteEntry(summary.id)
                                  }
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
            </CardContent>
          </Card>

          {/* Edit Entry Dialog */}
          <Dialog
            open={editingEntry !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingEntry(null);
                resetEntryForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Rental Entry</DialogTitle>
                <DialogDescription>
                  Update the rental entry information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEntrySubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-rentalItem" className="text-right">
                      Rental Item *
                    </Label>
                    <Select
                      value={entryFormData.rentalItemId}
                      onValueChange={handleRentalItemChange}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select rental item" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - ${item.dailyRate.toFixed(2)}/
                            {item.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-job" className="text-right">
                      Job *
                    </Label>
                    <Select
                      value={entryFormData.jobId}
                      onValueChange={(value) =>
                        setEntryFormData({ ...entryFormData, jobId: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select job" />
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-employee" className="text-right">
                      Employee
                    </Label>
                    <Select
                      value={entryFormData.employeeId}
                      onValueChange={(value) =>
                        setEntryFormData({
                          ...entryFormData,
                          employeeId: value === "none" ? "" : value,
                        })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Employee</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-startDate" className="text-right">
                      Start Date *
                    </Label>
                    <Input
                      id="edit-startDate"
                      type="date"
                      value={entryFormData.startDate}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          startDate: e.target.value,
                        })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-endDate" className="text-right">
                      End Date *
                    </Label>
                    <Input
                      id="edit-endDate"
                      type="date"
                      value={entryFormData.endDate}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          endDate: e.target.value,
                        })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-quantity" className="text-right">
                      Quantity *
                    </Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={entryFormData.quantity}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          quantity: parseInt(e.target.value) || 1,
                        })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-dspRate" className="text-right">
                      DSP Rate
                    </Label>
                    <Input
                      id="edit-dspRate"
                      type="number"
                      min="0"
                      step="0.01"
                      value={entryFormData.dspRate}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          dspRate: e.target.value,
                        })
                      }
                      className="col-span-3"
                      placeholder="Enter DSP rate (optional)"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={entryFormData.description}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Update Entry</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
