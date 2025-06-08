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
      isActive: item.isActive,
    });
  };

  const handleDeleteItem = async (item: RentalItem) => {
    try {
      await deleteRentalItem(item.id);
    } catch (error) {
      console.error("Failed to delete rental item:", error);
    }
  };

  // Handle rental entry operations
  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const entryData = {
      rentalItemId: entryFormData.rentalItemId,
      jobId: entryFormData.jobId,
      employeeId:
        entryFormData.employeeId === "unassigned"
          ? undefined
          : entryFormData.employeeId || undefined,
      startDate: entryFormData.startDate,
      endDate: entryFormData.endDate,
      quantity: parseInt(entryFormData.quantity) || 1,
      billingUnit: entryFormData.billingUnit,
      rateUsed: parseFloat(entryFormData.rateUsed) || 0,
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

  const handleDeleteEntry = async (entry: RentalEntry) => {
    try {
      await deleteRentalEntry(entry.id);
    } catch (error) {
      console.error("Failed to delete rental entry:", error);
    }
  };

  // Auto-populate rate when rental item is selected
  const handleRentalItemChange = (rentalItemId: string) => {
    setEntryFormData({ ...entryFormData, rentalItemId });

    const selectedItem = rentalItems.find((item) => item.id === rentalItemId);
    if (selectedItem) {
      setEntryFormData((prev) => ({
        ...prev,
        rentalItemId,
        billingUnit: selectedItem.unit,
        rateUsed:
          selectedItem.unit === "hour" && selectedItem.hourlyRate
            ? selectedItem.hourlyRate.toString()
            : selectedItem.dailyRate.toString(),
      }));
    }
  };

  // Calculate rental summaries with invoiced filtering
  const rentalSummaries = rentalEntries
    .map((entry) => {
      const item = rentalItems.find((item) => item.id === entry.rentalItemId);
      const job = jobs.find((job) => job.id === entry.jobId);
      const employee = entry.employeeId
        ? employees.find((emp) => emp.id === entry.employeeId)
        : null;

      const duration = calculateDuration(
        entry.startDate,
        entry.endDate,
        entry.billingUnit,
      );
      const totalCost = duration * entry.quantity * entry.rateUsed;

      return {
        ...entry,
        itemName: item?.name || "Unknown Item",
        category: item?.category || "Unknown",
        jobNumber: job?.jobNumber || "Unknown",
        jobName: job?.name || "Unknown Job",
        employeeName: employee?.name || "Unassigned",
        duration,
        totalCost,
        job: job, // Include job reference for filtering
      };
    })
    .filter((summary) => {
      // Filter out invoiced entries if toggle is off
      if (!includeInvoicedEntries && summary.job) {
        // Check if the rental entry's start date is in the job's invoiced dates
        const isInvoiced = summary.job.invoicedDates.includes(
          summary.startDate,
        );
        return !isInvoiced; // Only show non-invoiced entries when toggle is off
      }
      return true; // Show all entries when toggle is on
    });

  const totalRentalCost = rentalSummaries.reduce(
    (sum, summary) => sum + summary.totalCost,
    0,
  );
  const activeItems = rentalItems.filter((item) => item.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Rental Management
            <Badge variant="secondary" className="ml-2">
              {activeItems.length} active items
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage rental equipment and track rental charges to jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Truck className="h-5 w-5" />
                <span className="font-medium">Total Items</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">
                {rentalItems.length}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700">
                <Calendar className="h-5 w-5" />
                <span className="font-medium">Active Rentals</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {rentalEntries.length}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <DollarSign className="h-5 w-5" />
                <span className="font-medium">Total Rental Cost</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">
                ${totalRentalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Items and Entries */}
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
                    Manage your rental equipment and pricing
                  </CardDescription>
                </div>
                <Dialog
                  open={isAddItemDialogOpen}
                  onOpenChange={setIsAddItemDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Rental Item</DialogTitle>
                      <DialogDescription>
                        Create a new rental item with pricing information.
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
                            placeholder="e.g., Excavator, Drill, Generator"
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
                              placeholder="0.00"
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
                  No rental items yet. Add your first rental item to get
                  started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Daily Rate</TableHead>
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Rental Item
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "
                                      {item.name}"? This will also delete all
                                      rental entries for this item. This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteItem(item)}
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
                    Track rental usage and billing to jobs
                    {!includeInvoicedEntries && " (excluding invoiced entries)"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="include-invoiced" className="text-sm font-medium">
                      Include invoiced entries
                    </Label>
                    <Switch
                      id="include-invoiced"
                      checked={includeInvoicedEntries}
                      onCheckedChange={setIncludeInvoicedEntries}
                    />
                  </div>
                  <Dialog
                    open={isAddEntryDialogOpen}
                    onOpenChange={setIsAddEntryDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button disabled={activeItems.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Rental
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Add New Rental Entry</DialogTitle>
                      <DialogDescription>
                        Record rental usage for billing to a job.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEntrySubmit}>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rentalItem" className="text-right">
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
                                  {item.name} - ${item.dailyRate}/day
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
                          <Label htmlFor="employee" className="text-right">
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
                              <SelectItem value="unassigned">
                                Unassigned
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
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
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
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="endDate">End Date *</Label>
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
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input
                              id="quantity"
                              type="number"
                              min="1"
                              value={entryFormData.quantity}
                              onChange={(e) =>
                                setEntryFormData({
                                  ...entryFormData,
                                  quantity: e.target.value,
                                })
                              }
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="billingUnit">Billing Unit *</Label>
                            <Select
                              value={entryFormData.billingUnit}
                              onValueChange={(
                                value: "day" | "hour" | "week" | "month",
                              ) =>
                                setEntryFormData({
                                  ...entryFormData,
                                  billingUnit: value,
                                })
                              }
                            >
                              <SelectTrigger>
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
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="rateUsed" className="text-right">
                            Rate Used *
                          </Label>
                          <div className="col-span-3 relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              id="rateUsed"
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
                              placeholder="0.00"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label
                            htmlFor="entry-description"
                            className="text-right"
                          >
                            Description
                          </Label>
                          <Textarea
                            id="entry-description"
                            value={entryFormData.description}
                            onChange={(e) =>
                              setEntryFormData({
                                ...entryFormData,
                                description: e.target.value,
                              })
                            }
                            className="col-span-3"
                            rows={3}
                            placeholder="Notes about the rental..."
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
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span className="font-medium">
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
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Rental Entry
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this
                                      rental entry for {summary.itemName}? This
                                      action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteEntry(summary)}
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
                            {item.name} - ${item.dailyRate}/day
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-quantity">Quantity *</Label>
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
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-billingUnit">Billing Unit *</Label>
                      <Select
                        value={entryFormData.billingUnit}
                        onValueChange={(
                          value: "day" | "hour" | "week" | "month",
                        ) =>
                          setEntryFormData({
                            ...entryFormData,
                            billingUnit: value,
                          })
                        }
                      >
                        <SelectTrigger>
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
                      htmlFor="edit-entry-description"
                      className="text-right"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="edit-entry-description"
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
                  <Button type="submit">Update Rental</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}