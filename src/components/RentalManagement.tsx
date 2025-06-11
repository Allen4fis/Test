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
  Truck,
  Plus,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { RentalItem, RentalEntry } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to calculate rental duration
const calculateDuration = (
  startDate: string,
  endDate: string,
  unit: string,
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());

  switch (unit) {
    case "hour":
      return Math.ceil(diffTime / (1000 * 60 * 60));
    case "day":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
    case "week":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    case "month":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    default:
      return 1;
  }
};

export function RentalManagement() {
  const {
    employees,
    jobs,
    rentalItems,
    rentalEntries,
    addRentalItem,
    updateRentalItem,
    deleteRentalItem,
    addRentalEntry,
    updateRentalEntry,
    deleteRentalEntry,
  } = useTimeTracking();

  // States for rental item management
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    category: "",
    dailyRate: "",
    hourlyRate: "",
    unit: "day" as "day" | "hour" | "week" | "month",
    employeeId: "no-employee", // Employee attachment
    dspRate: "", // DSP rate
    isActive: true,
  });

  // States for rental entry management
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RentalEntry | null>(null);
  const [entryFormData, setEntryFormData] = useState({
    rentalItemId: "",
    jobId: "",
    employeeId: "unassigned",
    startDate: getLocalDateString(),
    endDate: getLocalDateString(),
    quantity: "1",
    billingUnit: "day" as "day" | "hour" | "week" | "month",
    rateUsed: "",
    description: "",
  });

  // State for invoiced entries filter
  const [includeInvoicedEntries, setIncludeInvoicedEntries] = useState(true);

  const resetItemForm = () => {
    setItemFormData({
      name: "",
      description: "",
      category: "",
      dailyRate: "",
      hourlyRate: "",
      unit: "day",
      employeeId: "no-employee",
      dspRate: "",
      isActive: true,
    });
    setEditingItem(null);
  };

  const resetEntryForm = () => {
    setEntryFormData({
      rentalItemId: "",
      jobId: "",
      employeeId: "unassigned",
      startDate: getLocalDateString(),
      endDate: getLocalDateString(),
      quantity: "1",
      billingUnit: "day",
      rateUsed: "",
      description: "",
    });
    setEditingEntry(null);
  };

  // Handle rental item operations
  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const itemData = {
      name: itemFormData.name,
      description: itemFormData.description || undefined,
      category: itemFormData.category,
      dailyRate: parseFloat(itemFormData.dailyRate) || 0,
      hourlyRate: itemFormData.hourlyRate
        ? parseFloat(itemFormData.hourlyRate)
        : undefined,
      unit: itemFormData.unit,
      employeeId:
        itemFormData.employeeId === "no-employee"
          ? undefined
          : itemFormData.employeeId,
      dspRate: itemFormData.dspRate
        ? parseFloat(itemFormData.dspRate)
        : undefined,
      isActive: itemFormData.isActive,
    };

    if (editingItem) {
      updateRentalItem(editingItem.id, itemData);
      setEditingItem(null);
    } else {
      addRentalItem(itemData);
      setIsAddItemDialogOpen(false);
    }
    resetItemForm();
  };

  const handleEditItem = (item: RentalItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      dailyRate: item.dailyRate.toString(),
      hourlyRate: item.hourlyRate?.toString() || "",
      unit: item.unit,
      employeeId: item.employeeId || "no-employee",
      dspRate: item.dspRate?.toString() || "",
      isActive: item.isActive,
    });
  };

  const handleDeleteItem = async (itemId: string) => {
    deleteRentalItem(itemId);
  };

  // Handle rental entry operations
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedItem = rentalItems.find(
      (item) => item.id === entryFormData.rentalItemId,
    );
    if (!selectedItem) return;

    const entryData = {
      rentalItemId: entryFormData.rentalItemId,
      jobId: entryFormData.jobId,
      employeeId:
        entryFormData.employeeId === "unassigned"
          ? undefined
          : entryFormData.employeeId,
      startDate: entryFormData.startDate,
      endDate: entryFormData.endDate,
      quantity: parseInt(entryFormData.quantity) || 1,
      billingUnit: entryFormData.billingUnit,
      rateUsed: parseFloat(entryFormData.rateUsed) || selectedItem.dailyRate,
      description: entryFormData.description || undefined,
    };

    if (editingEntry) {
      updateRentalEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      addRentalEntry(entryData);
      setIsAddEntryDialogOpen(false);
    }
    resetEntryForm();
  };

  const handleEditEntry = (entry: RentalEntry) => {
    setEditingEntry(entry);
    setEntryFormData({
      rentalItemId: entry.rentalItemId,
      jobId: entry.jobId,
      employeeId: entry.employeeId || "unassigned",
      startDate: entry.startDate,
      endDate: entry.endDate,
      quantity: entry.quantity.toString(),
      billingUnit: entry.billingUnit,
      rateUsed: entry.rateUsed.toString(),
      description: entry.description || "",
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    deleteRentalEntry(entryId);
  };

  const handleRentalItemChange = (itemId: string) => {
    const selectedItem = rentalItems.find((item) => item.id === itemId);
    if (selectedItem) {
      setEntryFormData({
        ...entryFormData,
        rentalItemId: itemId,
        billingUnit: selectedItem.unit,
        rateUsed: selectedItem.dailyRate.toString(),
      });
    }
  };

  // Get rental summaries (already filtered by the useTimeTracking hook)
  const rentalSummaries = useTimeTracking().rentalSummaries.map((summary) => {
    // Get the original rental entry for full details
    const entry = rentalEntries.find((re) => {
      const item = rentalItems.find((item) => item.id === re.rentalItemId);
      return item?.name === summary.rentalItemName;
    });

    return {
      ...summary,
      id: entry?.id || summary.id || `summary-${Math.random()}`,
    };
  });

  const activeItems = rentalItems.filter((item) => item.isActive);

  // Get jobs data for filtering if needed
  const isDateInvoiced = (jobId: string, date: string) => {
    const job = jobs.find((j) => j.id === jobId);
    return job?.invoicedDates?.includes(date) || false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Rental Management
          </h2>
          <p className="text-muted-foreground">
            Manage rental equipment and track rental entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {rentalItems.length} Items
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {rentalEntries.length} Entries
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
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
                    Manage available rental equipment and items
                  </CardDescription>
                </div>
                <Dialog
                  open={isAddItemDialogOpen}
                  onOpenChange={setIsAddItemDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={() => resetItemForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Rental Item</DialogTitle>
                      <DialogDescription>
                        Create a new rental item for your inventory.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleItemSubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="name" className="text-right">
                            Name *
                          </Label>
                          <Input
                            id="name"
                            value={itemFormData.name}
                            onChange={(e) =>
                              setItemFormData({
                                ...itemFormData,
                                name: e.target.value,
                              })
                            }
                            className="col-span-3"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="category" className="text-right">
                            Category *
                          </Label>
                          <Select
                            value={itemFormData.category}
                            onValueChange={(value) =>
                              setItemFormData({
                                ...itemFormData,
                                category: value,
                              })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Equipment">
                                Equipment
                              </SelectItem>
                              <SelectItem value="Tools">Tools</SelectItem>
                              <SelectItem value="Vehicles">Vehicles</SelectItem>
                              <SelectItem value="Materials">
                                Materials
                              </SelectItem>
                              <SelectItem value="Safety">
                                Safety Equipment
                              </SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="unit" className="text-right">
                            Billing Unit *
                          </Label>
                          <Select
                            value={itemFormData.unit}
                            onValueChange={(
                              value: "day" | "hour" | "week" | "month",
                            ) =>
                              setItemFormData({ ...itemFormData, unit: value })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hour">Per Hour</SelectItem>
                              <SelectItem value="day">Per Day</SelectItem>
                              <SelectItem value="week">Per Week</SelectItem>
                              <SelectItem value="month">Per Month</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="dailyRate" className="text-right">
                            Daily Rate *
                          </Label>
                          <div className="col-span-3 relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="dailyRate"
                              type="number"
                              step="0.01"
                              value={itemFormData.dailyRate}
                              onChange={(e) =>
                                setItemFormData({
                                  ...itemFormData,
                                  dailyRate: e.target.value,
                                })
                              }
                              className="pl-10"
                              required
                            />
                          </div>
                        </div>
                        {itemFormData.unit === "hour" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="hourlyRate" className="text-right">
                              Hourly Rate
                            </Label>
                            <div className="col-span-3 relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="hourlyRate"
                                type="number"
                                step="0.01"
                                value={itemFormData.hourlyRate}
                                onChange={(e) =>
                                  setItemFormData({
                                    ...itemFormData,
                                    hourlyRate: e.target.value,
                                  })
                                }
                                className="pl-10"
                              />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="employee" className="text-right">
                            Attached to Employee
                          </Label>
                          <Select
                            value={itemFormData.employeeId}
                            onValueChange={(value) =>
                              setItemFormData({
                                ...itemFormData,
                                employeeId: value,
                              })
                            }
                          >
                            <SelectTrigger className="col-span-3">
                              <SelectValue placeholder="Select employee (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="no-employee">
                                No Employee Attachment
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
                        {itemFormData.employeeId !== "no-employee" && (
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dspRate" className="text-right">
                              DSP Rate
                            </Label>
                            <div className="col-span-3 relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="dspRate"
                                type="number"
                                step="0.01"
                                value={itemFormData.dspRate}
                                onChange={(e) =>
                                  setItemFormData({
                                    ...itemFormData,
                                    dspRate: e.target.value,
                                  })
                                }
                                className="pl-10"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="description" className="text-right">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={itemFormData.description}
                            onChange={(e) =>
                              setItemFormData({
                                ...itemFormData,
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
                              checked={itemFormData.isActive}
                              onCheckedChange={(checked) =>
                                setItemFormData({
                                  ...itemFormData,
                                  isActive: checked,
                                })
                              }
                            />
                            <span className="text-sm text-gray-500">
                              {itemFormData.isActive
                                ? "Item is available for rent"
                                : "Item is disabled"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsAddItemDialogOpen(false);
                            resetItemForm();
                          }}
                        >
                          Cancel
                        </Button>
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
                        <TableHead>Attached Employee</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>DSP Rate</TableHead>
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
                            {item.employeeId ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-blue-700">
                                  {employees.find(
                                    (emp) => emp.id === item.employeeId,
                                  )?.name || "Unknown Employee"}
                                </span>
                              </div>
                            ) : (
                              <Badge variant="secondary">No Employee</Badge>
                            )}
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
                            {item.dspRate ? (
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-purple-600" />
                                <span className="font-medium text-purple-600">
                                  {item.dspRate.toFixed(2)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
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
                                      `Daily rate: $${item.dailyRate.toFixed(2)}`,
                                      `Billing unit: ${item.unit}`,
                                      `Status: ${item.isActive ? "Active" : "Inactive"}`,
                                    ],
                                    relatedEntries: rentalEntries.filter(
                                      (entry) => entry.rentalItemId === item.id,
                                    ),
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
                resetItemForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Rental Item</DialogTitle>
                <DialogDescription>
                  Update the rental item information.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleItemSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-name" className="text-right">
                      Name *
                    </Label>
                    <Input
                      id="edit-name"
                      value={itemFormData.name}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          name: e.target.value,
                        })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-category" className="text-right">
                      Category *
                    </Label>
                    <Select
                      value={itemFormData.category}
                      onValueChange={(value) =>
                        setItemFormData({ ...itemFormData, category: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Tools">Tools</SelectItem>
                        <SelectItem value="Vehicles">Vehicles</SelectItem>
                        <SelectItem value="Materials">Materials</SelectItem>
                        <SelectItem value="Safety">Safety Equipment</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-unit" className="text-right">
                      Billing Unit *
                    </Label>
                    <Select
                      value={itemFormData.unit}
                      onValueChange={(
                        value: "day" | "hour" | "week" | "month",
                      ) => setItemFormData({ ...itemFormData, unit: value })}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hour">Per Hour</SelectItem>
                        <SelectItem value="day">Per Day</SelectItem>
                        <SelectItem value="week">Per Week</SelectItem>
                        <SelectItem value="month">Per Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-dailyRate" className="text-right">
                      Daily Rate *
                    </Label>
                    <div className="col-span-3 relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-dailyRate"
                        type="number"
                        step="0.01"
                        value={itemFormData.dailyRate}
                        onChange={(e) =>
                          setItemFormData({
                            ...itemFormData,
                            dailyRate: e.target.value,
                          })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  {itemFormData.unit === "hour" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-hourlyRate" className="text-right">
                        Hourly Rate
                      </Label>
                      <div className="col-span-3 relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-hourlyRate"
                          type="number"
                          step="0.01"
                          value={itemFormData.hourlyRate}
                          onChange={(e) =>
                            setItemFormData({
                              ...itemFormData,
                              hourlyRate: e.target.value,
                            })
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-employee" className="text-right">
                      Attached to Employee
                    </Label>
                    <Select
                      value={itemFormData.employeeId}
                      onValueChange={(value) =>
                        setItemFormData({
                          ...itemFormData,
                          employeeId: value,
                        })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no-employee">
                          No Employee Attachment
                        </SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {itemFormData.employeeId !== "no-employee" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="edit-dspRate" className="text-right">
                        DSP Rate
                      </Label>
                      <div className="col-span-3 relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="edit-dspRate"
                          type="number"
                          step="0.01"
                          value={itemFormData.dspRate}
                          onChange={(e) =>
                            setItemFormData({
                              ...itemFormData,
                              dspRate: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-description" className="text-right">
                      Description
                    </Label>
                    <Textarea
                      id="edit-description"
                      value={itemFormData.description}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          description: e.target.value,
                        })
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
                        checked={itemFormData.isActive}
                        onCheckedChange={(checked) =>
                          setItemFormData({
                            ...itemFormData,
                            isActive: checked,
                          })
                        }
                      />
                      <span className="text-sm text-gray-500">
                        {itemFormData.isActive
                          ? "Item is available for rent"
                          : "Item is disabled"}
                      </span>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingItem(null);
                      resetItemForm();
                    }}
                  >
                    Cancel
                  </Button>
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
                  <CardTitle className="flex items-center gap-2">
                    Rental Entries
                    <Badge variant="secondary">
                      {rentalSummaries.length} of {rentalEntries.length} entries
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Track and manage rental usage entries
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {activeItems.length > 0 && (
                    <Dialog
                      open={isAddEntryDialogOpen}
                      onOpenChange={setIsAddEntryDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button onClick={() => resetEntryForm()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Rental
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                          <DialogTitle>Add New Rental Entry</DialogTitle>
                          <DialogDescription>
                            Create a new rental entry for equipment usage.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEntrySubmit}>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                          <TableCell>
                            {(() => {
                              const rentalItem = rentalItems.find(
                                (item) => item.name === summary.itemName,
                              );
                              // Enhanced debug logging
                              console.log('=== RENTAL RATE DEBUG ===');
                              console.log('Summary item name:', summary.itemName);
                              console.log('All rental items:', rentalItems.map(item => ({ id: item.id, name: item.name, dailyRate: item.dailyRate })));
                              console.log('Found rental item:', rentalItem ? { id: rentalItem.id, name: rentalItem.name, dailyRate: rentalItem.dailyRate, unit: rentalItem.unit } : 'NOT FOUND');
                              console.log('=== END RENTAL RATE DEBUG ===');

                              return rentalItem ? (
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
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const rentalItem = rentalItems.find(
                                (item) => item.name === summary.itemName,
                              );
                              // Enhanced debug logging
                              console.log('=== DSP RATE DEBUG ===');
                              console.log('Summary item name:', summary.itemName);
                              console.log('Found rental item:', rentalItem ? { id: rentalItem.id, name: rentalItem.name, dspRate: rentalItem.dspRate, employeeId: rentalItem.employeeId } : 'NOT FOUND');
                              console.log('DSP Rate value:', rentalItem?.dspRate);
                              console.log('DSP Rate exists?', !!rentalItem?.dspRate);
                              console.log('=== END DSP RATE DEBUG ===');

                              return rentalItem?.dspRate ? (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-purple-600" />
                                  <span className="font-medium text-purple-600">
                                    {rentalItem.dspRate.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    /day
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
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
                    <Label htmlFor="edit-description" className="text-right">
                      Description
                    </Label>
                              <Textarea
                                id="entryDescription"
                                value={entryFormData.description}
                                onChange={(e) =>
                                  setEntryFormData({
                                    ...entryFormData,
                                    description: e.target.value,
                                  })
                                }
                                className="col-span-3"
                                rows={3}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddEntryDialogOpen(false);
                                resetEntryForm();
                              }}
                            >
                              Cancel
                            </Button>
                            <Button type="submit">Add Rental</Button>
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
                      {rentalSummaries.map((summary) => (
                        <TableRow key={summary.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{summary.itemName}</p>
                              <Badge variant="outline" className="text-xs">
                                {summary.category}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{summary.jobNumber}</p>
                              <p className="text-sm text-gray-500">
                                {summary.jobName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{summary.employeeName}</TableCell>
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
                            {(() => {
                              const rentalItem = rentalItems.find(
                                (item) => item.name === summary.itemName,
                              );
                              // Enhanced debug logging
                              console.log("=== RENTAL RATE DEBUG ===");
                              console.log("Summary item name:", summary.itemName);
                              console.log("Rental items count:", rentalItems.length);
                              console.log("All rental item names:", rentalItems.map(item => item.name));
                              console.log("Found rental item:", rentalItem);
                              console.log("Found item daily rate:", rentalItem?.dailyRate);
                              console.log("Found item unit:", rentalItem?.unit);
                              console.log("=== END RENTAL RATE DEBUG ===");
                              return rentalItem ? (
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
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const rentalItem = rentalItems.find(
                                (item) => item.name === summary.itemName,
                              );

                                {summary.totalCost.toFixed(2)}
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
                                  name: `${summary.itemName} - ${summary.jobNumber}`,
                                  type: "rental-entry",
                                  associatedData: {
                                    additionalInfo: [
                                      `Item: ${summary.itemName}`,
                                      `Job: ${summary.jobNumber} - ${summary.jobName}`,
                                      `Employee: ${summary.employeeName}`,
                                      `Period: ${summary.startDate} to ${summary.endDate}`,
                                      `Duration: ${summary.duration} ${summary.billingUnit}${summary.duration !== 1 ? "s" : ""}`,
                                      `Quantity: ${summary.quantity}`,
                                      `Total cost: $${summary.totalCost.toFixed(2)}`,
                                    ],
                                  },
                                }}
                                trigger={
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                }
                                onConfirm={() => handleDeleteEntry(summary.id)}
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-employee" className="text-right">
                      Employee
                    </Label>
                    <Select
                      value={entryFormData.employeeId}
                      onValueChange={(value) =>
                        setEntryFormData({
                          ...entryFormData,
                          employeeId: value,
                        })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select employee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name} - {employee.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Start Date *</Label>
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-endDate">End Date *</Label>
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
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-quantity" className="text-right">
                      Quantity *
                    </Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="1"
                      value={entryFormData.quantity}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          quantity: e.target.value,
                        })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-rateUsed" className="text-right">
                      Rate Used *
                    </Label>
                    <div className="col-span-3 relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="edit-rateUsed"
                        type="number"
                        step="0.01"
                        value={entryFormData.rateUsed}
                        onChange={(e) =>
                          setEntryFormData({
                            ...entryFormData,
                            rateUsed: e.target.value,
                          })
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label
                      htmlFor="edit-entryDescription"
                      className="text-right"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="edit-entryDescription"
                      value={entryFormData.description}
                      onChange={(e) =>
                        setEntryFormData({
                          ...entryFormData,
                          description: e.target.value,
                        })
                      }
                      className="col-span-3"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingEntry(null);
                      resetEntryForm();
                    }}
                  >
                    Cancel
                  </Button>
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