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
  TrendingUp,
  BarChart3,
  ArrowUpDown,
  Truck,
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
    dspRate: "",
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

  // UI States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RentalItem | null>(null);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<RentalEntry | null>(null);

  // Sorting states
  const [sortBy, setSortBy] = useState<
    "name" | "category" | "dailyRate" | "createdAt"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Entry sorting states
  const [entrySortBy, setEntrySortBy] = useState<
    "startDate" | "rentalItem" | "job" | "employee" | "quantity" | "totalCost"
  >("startDate");
  const [entrySortDirection, setEntrySortDirection] = useState<"asc" | "desc">(
    "desc",
  );

  // Billable sorting states
  const [billableSortBy, setBillableSortBy] = useState<
    "rentalItem" | "category" | "totalRevenue" | "totalDays" | "avgDaily"
  >("totalRevenue");
  const [billableSortDirection, setBillableSortDirection] = useState<
    "asc" | "desc"
  >("desc");

  // Billable job filtering states for analytics
  const [showBillableJobs, setShowBillableJobs] = useState(true);
  const [showNonBillableJobs, setShowNonBillableJobs] = useState(true);

  // Billable job filtering states for entries
  const [showBillableJobEntries, setShowBillableJobEntries] = useState(true);
  const [showNonBillableJobEntries, setShowNonBillableJobEntries] =
    useState(true);

  // Reset forms
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      category: "",
      dailyRate: "",
      hourlyRate: "",
      unit: "day",
      dspRate: "",
    });
    setEditingItem(null);
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
    setEditingEntry(null);
  };

  // Handle submissions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.category.trim() ||
      !formData.dailyRate.trim()
    )
      return;

    const itemData = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      dailyRate: parseFloat(formData.dailyRate),
      hourlyRate: formData.hourlyRate
        ? parseFloat(formData.hourlyRate)
        : undefined,
      unit: formData.unit,
      dspRate: formData.dspRate ? parseFloat(formData.dspRate) : undefined,
      isActive: true,
    };

    if (editingItem) {
      updateRentalItem(editingItem.id, itemData);
    } else {
      addRentalItem(itemData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !entryFormData.rentalItemId ||
      !entryFormData.jobId ||
      !entryFormData.startDate ||
      !entryFormData.endDate
    )
      return;

    const selectedItem = rentalItems.find(
      (item) => item.id === entryFormData.rentalItemId,
    );
    if (!selectedItem) return;

    const entryData = {
      rentalItemId: entryFormData.rentalItemId,
      jobId: entryFormData.jobId,
      employeeId: entryFormData.employeeId || undefined,
      startDate: entryFormData.startDate,
      endDate: entryFormData.endDate,
      quantity: entryFormData.quantity,
      billingUnit: selectedItem.unit,
      rateUsed: selectedItem.dailyRate,
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

    setIsEntryDialogOpen(false);
    resetEntryForm();
  };

  // Handle editing
  const handleEdit = (item: RentalItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      category: item.category,
      dailyRate: item.dailyRate.toString(),
      hourlyRate: item.hourlyRate?.toString() || "",
      unit: item.unit,
      dspRate: item.dspRate?.toString() || "",
    });
    setIsDialogOpen(true);
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
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          break;
        case "week":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
          break;
        case "month":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
          break;
      }

      // Calculate billable amount (what you charge the client)
      const totalBillable = entry.rateUsed * duration * entry.quantity;

      // Calculate actual cost (what you pay the DSP, if applicable)
      const actualCost = entry.dspRate
        ? entry.dspRate * duration * entry.quantity
        : 0;

      return {
        id: entry.id,
        rentalItemName: item?.name || "Unknown Item",
        category: item?.category || "Unknown",
        jobNumber: job?.jobNumber || "Unknown",
        jobName: job?.name || "",
        employeeName: employee?.name || "Unassigned",
        startDate: entry.startDate,
        endDate: entry.endDate,
        duration,
        quantity: entry.quantity,
        rateUsed: entry.rateUsed, // Billable rate
        dspRate: entry.dspRate, // Cost rate
        totalBillable, // What we charge client
        totalCost: actualCost, // What we pay DSP
        totalProfit: totalBillable - actualCost, // Profit margin
        description: entry.description,
      };
    });
  }, [rentalEntries, rentalItems, jobs, employees]);

  // Get active items and jobs for form options
  const activeItems = rentalItems.filter((item) => item.isActive);
  const activeJobs = jobs.filter((job) => job.isActive);

  // Sorted rental items
  const sortedItems = useMemo(() => {
    return [...rentalItems].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "dailyRate":
          aValue = a.dailyRate;
          bValue = b.dailyRate;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rentalItems, sortBy, sortDirection]);

  // Pagination for rental items
  const [itemsPerPageItems, setItemsPerPageItems] = useState(20);
  const paginationItems = usePagination({
    data: sortedItems,
    itemsPerPage: itemsPerPageItems,
  });

  // Sorted rental entries
  const sortedEntries = useMemo(() => {
    return [...rentalSummaries].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (entrySortBy) {
        case "startDate":
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
          break;
        case "rentalItem":
          aValue = a.rentalItemName.toLowerCase();
          bValue = b.rentalItemName.toLowerCase();
          break;
        case "job":
          aValue = a.jobNumber.toLowerCase();
          bValue = b.jobNumber.toLowerCase();
          break;
        case "employee":
          aValue = a.employeeName.toLowerCase();
          bValue = b.employeeName.toLowerCase();
          break;
        case "quantity":
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case "totalCost":
          aValue = a.totalCost;
          bValue = b.totalCost;
          break;
        default:
          aValue = new Date(a.startDate).getTime();
          bValue = new Date(b.startDate).getTime();
      }

      if (aValue < bValue) return entrySortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return entrySortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [rentalSummaries, entrySortBy, entrySortDirection]);

  // Pagination for rental entries
  const [itemsPerPageEntries, setItemsPerPageEntries] = useState(50);
  const paginationEntries = usePagination({
    data: sortedEntries,
    itemsPerPage: itemsPerPageEntries,
  });

  // Billable analytics data
  const billableAnalytics = useMemo(() => {
    const itemAnalytics = rentalItems.map((item) => {
      const itemEntries = rentalSummaries.filter((entry) => {
        if (entry.rentalItemName !== item.name) return false;

        // Filter by billable job status
        const job = jobs.find((j) => j.jobNumber === entry.jobNumber);
        const isBillable = job?.isBillable !== false;

        if (!showBillableJobs && isBillable) return false;
        if (!showNonBillableJobs && !isBillable) return false;

        return true;
      });

      const totalRevenue = itemEntries.reduce(
        (sum, entry) => sum + entry.totalBillable,
        0,
      );
      const totalCosts = itemEntries.reduce(
        (sum, entry) => sum + entry.totalCost,
        0,
      );
      const totalProfit = totalRevenue - totalCosts;
      const totalDays = itemEntries.reduce(
        (sum, entry) => sum + entry.duration,
        0,
      );
      const avgDaily = totalDays > 0 ? totalRevenue / totalDays : 0;

      return {
        rentalItem: item.name,
        category: item.category,
        dailyRate: item.dailyRate,
        totalRevenue,
        totalDays,
        avgDaily,
        rentals: itemEntries.length,
      };
    });

    return itemAnalytics.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (billableSortBy) {
        case "rentalItem":
          aValue = a.rentalItem.toLowerCase();
          bValue = b.rentalItem.toLowerCase();
          break;
        case "category":
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case "totalRevenue":
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case "totalDays":
          aValue = a.totalDays;
          bValue = b.totalDays;
          break;
        case "avgDaily":
          aValue = a.avgDaily;
          bValue = b.avgDaily;
          break;
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      if (aValue < bValue) return billableSortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return billableSortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [
    rentalItems,
    rentalSummaries,
    jobs,
    showBillableJobs,
    showNonBillableJobs,
    billableSortBy,
    billableSortDirection,
  ]);

  // Pagination for billable analytics
  const [itemsPerPageAnalytics, setItemsPerPageAnalytics] = useState(20);
  const paginationAnalytics = usePagination({
    data: billableAnalytics,
    itemsPerPage: itemsPerPageAnalytics,
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="items">Rental Items</TabsTrigger>
          <TabsTrigger value="entries">Rental Entries</TabsTrigger>
          <TabsTrigger value="billable">Billable Analytics</TabsTrigger>
        </TabsList>

        {/* Rental Items Tab */}
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    Rental Management
                  </CardTitle>
                  <CardDescription>
                    Manage rental items and their rates
                  </CardDescription>
                  {/* Concise sorting controls */}
                  <div className="flex items-center gap-2 mt-3">
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <Select
                      value={sortBy}
                      onValueChange={(value: any) => setSortBy(value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="dailyRate">Daily Rate</SelectItem>
                        <SelectItem value="createdAt">Date Added</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        )
                      }
                      className="px-2 h-8"
                    >
                      {sortDirection === "asc" ? "↑" : "↓"}
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">
                      {sortedItems.length} item
                      {sortedItems.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rental Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>
                        {editingItem ? "Edit Rental" : "Add New Rental"} Item
                      </DialogTitle>
                      <DialogDescription>
                        {editingItem
                          ? "Update the rental item information."
                          : "Add a new rental item to your inventory."}
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
                            placeholder="e.g., Excavator X200"
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
                            placeholder="Optional description"
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
                            placeholder="e.g., Heavy Equipment"
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
                            min="0"
                            step="0.01"
                            value={formData.dailyRate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dailyRate: e.target.value,
                              })
                            }
                            className="col-span-3"
                            placeholder="0.00"
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
                            min="0"
                            step="0.01"
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
                            Billing Unit *
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
                          <Label htmlFor="dspRate" className="text-right">
                            DSP Rate
                          </Label>
                          <Input
                            id="dspRate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.dspRate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dspRate: e.target.value,
                              })
                            }
                            className="col-span-3"
                            placeholder="Optional DSP rate"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">
                          {editingItem ? "Update Item" : "Add Item"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {sortedItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental items found. Add your first rental item to get
                  started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>DSP Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginationItems.paginatedData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${item.dailyRate.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {item.hourlyRate
                              ? `$${item.hourlyRate.toFixed(2)}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.unit}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.dspRate ? `$${item.dspRate.toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell>
                            {item.isActive ? (
                              <Badge className="bg-green-500">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
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
                                      `Daily Rate: $${item.dailyRate.toFixed(2)}`,
                                      `Unit: ${item.unit}`,
                                      ...(item.hourlyRate
                                        ? [
                                            `Hourly Rate: $${item.hourlyRate.toFixed(2)}`,
                                          ]
                                        : []),
                                      ...(item.dspRate
                                        ? [
                                            `DSP Rate: $${item.dspRate.toFixed(2)}`,
                                          ]
                                        : []),
                                      `Status: ${item.isActive ? "Active" : "Inactive"}`,
                                      `Created: ${new Date(item.createdAt).toLocaleDateString()}`,
                                    ],
                                  },
                                }}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
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

              {/* Pagination Controls */}
              {sortedItems.length > 0 && (
                <div className="mt-4">
                  <PaginationControls
                    currentPage={paginationItems.currentPage}
                    totalPages={paginationItems.totalPages}
                    totalItems={paginationItems.totalItems}
                    pageInfo={paginationItems.pageInfo}
                    canGoNext={paginationItems.canGoNext}
                    canGoPrevious={paginationItems.canGoPrevious}
                    onPageChange={paginationItems.goToPage}
                    onNextPage={paginationItems.goToNextPage}
                    onPreviousPage={paginationItems.goToPreviousPage}
                    itemsPerPage={itemsPerPageItems}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPageItems(newItemsPerPage);
                      paginationItems.goToPage(1);
                    }}
                    className="border-t border-gray-700/50 pt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rental Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    Rental Entries
                  </CardTitle>
                  <CardDescription>
                    Track rental usage and assignments
                  </CardDescription>
                  {/* Concise sorting controls */}
                  <div className="flex items-center gap-2 mt-3">
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <Select
                      value={entrySortBy}
                      onValueChange={(value: any) => setEntrySortBy(value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="startDate">Start Date</SelectItem>
                        <SelectItem value="rentalItem">Rental Item</SelectItem>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="quantity">Quantity</SelectItem>
                        <SelectItem value="totalCost">Total Cost</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEntrySortDirection(
                          entrySortDirection === "asc" ? "desc" : "asc",
                        )
                      }
                      className="px-2 h-8"
                    >
                      {entrySortDirection === "asc" ? "↑" : "↓"}
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">
                      {sortedEntries.length} entr
                      {sortedEntries.length !== 1 ? "ies" : "y"}
                    </span>
                  </div>
                </div>
                <Dialog
                  open={isEntryDialogOpen}
                  onOpenChange={setIsEntryDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={() => resetEntryForm()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rental Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Add New Rental Entry</DialogTitle>
                      <DialogDescription>
                        Record a new rental usage for tracking and billing.
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
                                  {item.name} - ${item.dailyRate.toFixed(2)}/
                                  {item.unit}
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
                              <SelectItem value="none">No Employee</SelectItem>
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
                          <Label htmlFor="description" className="text-right">
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
              </div>
            </CardHeader>
            <CardContent>
              {sortedEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental entries found. Add your first rental entry to get
                  started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rental Item</TableHead>
                        <TableHead>Job</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Rate Used</TableHead>
                        <TableHead>DSP Rate</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginationEntries.paginatedData.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">
                            <div>
                              <div className="font-medium text-purple-600">
                                {entry.rentalItemName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.category}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {entry.jobNumber}
                              </div>
                              <div className="text-sm text-gray-500">
                                {entry.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.employeeName === "Unassigned" ? (
                              <Badge variant="outline">Unassigned</Badge>
                            ) : (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {entry.employeeName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{entry.startDate}</TableCell>
                          <TableCell>{entry.endDate}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {entry.duration} days
                            </Badge>
                          </TableCell>
                          <TableCell>{entry.quantity}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${entry.rateUsed.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {entry.dspRate
                              ? `$${entry.dspRate.toFixed(2)}`
                              : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-purple-600">
                            ${entry.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const originalEntry = rentalEntries.find(
                                    (e) => e.id === entry.id,
                                  );
                                  if (originalEntry) {
                                    handleEditEntry(originalEntry);
                                  }
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <DeleteConfirmationDialog
                                item={{
                                  id: entry.id,
                                  name: `${entry.rentalItemName} - ${entry.jobNumber}`,
                                  type: "rental-entry",
                                  associatedData: {
                                    additionalInfo: [
                                      `Rental Item: ${entry.rentalItemName}`,
                                      `Job: ${entry.jobNumber} - ${entry.jobName}`,
                                      `Employee: ${entry.employeeName}`,
                                      `Period: ${entry.startDate} to ${entry.endDate}`,
                                      `Duration: ${entry.duration} days`,
                                      `Quantity: ${entry.quantity}`,
                                      `Rate Used: $${entry.rateUsed.toFixed(2)}`,
                                      ...(entry.dspRate
                                        ? [
                                            `DSP Rate: $${entry.dspRate.toFixed(2)}`,
                                          ]
                                        : []),
                                      `Total Cost: $${entry.totalCost.toFixed(2)}`,
                                      ...(entry.description
                                        ? [`Description: ${entry.description}`]
                                        : []),
                                    ],
                                  },
                                }}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                                onConfirm={() => handleDeleteEntry(entry.id)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {sortedEntries.length > 0 && (
                <div className="mt-4">
                  <PaginationControls
                    currentPage={paginationEntries.currentPage}
                    totalPages={paginationEntries.totalPages}
                    totalItems={paginationEntries.totalItems}
                    pageInfo={paginationEntries.pageInfo}
                    canGoNext={paginationEntries.canGoNext}
                    canGoPrevious={paginationEntries.canGoPrevious}
                    onPageChange={paginationEntries.goToPage}
                    onNextPage={paginationEntries.goToNextPage}
                    onPreviousPage={paginationEntries.goToPreviousPage}
                    itemsPerPage={itemsPerPageEntries}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPageEntries(newItemsPerPage);
                      paginationEntries.goToPage(1);
                    }}
                    itemsPerPageOptions={[25, 50, 100, 200]}
                    className="border-t border-gray-700/50 pt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Rental Entry Dialog */}
          <Dialog
            open={editingEntry !== null}
            onOpenChange={(open) => {
              if (!open) {
                setEditingEntry(null);
                resetEntryForm();
              }
            }}
          >
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Rental Entry</DialogTitle>
                <DialogDescription>
                  Update the rental entry information. Original values are shown
                  for reference.
                </DialogDescription>
              </DialogHeader>

              {/* Original Values Display */}
              {editingEntry && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Original Values:
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Rental Item:{" "}
                      </span>
                      <span className="font-medium">
                        {rentalItems.find(
                          (item) => item.id === editingEntry.rentalItemId,
                        )?.name || `ID: ${editingEntry.rentalItemId}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Job:{" "}
                      </span>
                      <span className="font-medium">
                        {(() => {
                          const job = jobs.find(
                            (job) => job.id === editingEntry.jobId,
                          );
                          return job
                            ? `${job.jobNumber} - ${job.name}`
                            : `ID: ${editingEntry.jobId}`;
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Employee:{" "}
                      </span>
                      <span className="font-medium">
                        {editingEntry.employeeId
                          ? employees.find(
                              (emp) => emp.id === editingEntry.employeeId,
                            )?.name || `ID: ${editingEntry.employeeId}`
                          : "No Employee"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Period:{" "}
                      </span>
                      <span className="font-medium">
                        {editingEntry.startDate} to {editingEntry.endDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Quantity:{" "}
                      </span>
                      <span className="font-medium">
                        {editingEntry.quantity}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Rate Used:{" "}
                      </span>
                      <span className="font-medium">
                        ${editingEntry.rateUsed?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        DSP Rate:{" "}
                      </span>
                      <span className="font-medium">
                        ${editingEntry.dspRate?.toFixed(2) || "0.00"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Billing Unit:{" "}
                      </span>
                      <span className="font-medium">
                        {editingEntry.billingUnit}
                      </span>
                    </div>
                    {editingEntry.description && (
                      <div className="col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">
                          Description:{" "}
                        </span>
                        <span className="font-medium">
                          {editingEntry.description}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form onSubmit={handleEntrySubmit}>
                <div className="border-t pt-4">
                  <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Edit Fields:
                  </h4>
                </div>
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

        {/* Rental Billable Tab */}
        <TabsContent value="billable">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-green-500" />
                    Rental Billable Analytics
                  </CardTitle>
                  <CardDescription>
                    Track rental performance and profitability by equipment type
                  </CardDescription>
                  {/* Concise sorting controls */}
                  <div className="flex items-center gap-2 mt-3">
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <Select
                      value={billableSortBy}
                      onValueChange={(value: any) => setBillableSortBy(value)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rentalItem">Rental Item</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="totalRevenue">
                          Total Revenue
                        </SelectItem>
                        <SelectItem value="totalDays">Total Days</SelectItem>
                        <SelectItem value="avgDaily">Avg Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setBillableSortDirection(
                          billableSortDirection === "asc" ? "desc" : "asc",
                        )
                      }
                      className="px-2 h-8"
                    >
                      {billableSortDirection === "asc" ? "↑" : "↓"}
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">
                      {billableAnalytics.length} item
                      {billableAnalytics.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Job Type Filter Controls */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-600">Job Types:</span>
                    <Button
                      variant={showBillableJobs ? "default" : "outline"}
                      size="sm"
                      onClick={() => setShowBillableJobs(!showBillableJobs)}
                      className="h-7 px-2 text-xs"
                    >
                      Billable
                    </Button>
                    <Button
                      variant={showNonBillableJobs ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setShowNonBillableJobs(!showNonBillableJobs)
                      }
                      className="h-7 px-2 text-xs"
                    >
                      Non-Billable
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {billableAnalytics.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No rental data available for analytics.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rental Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Daily Rate</TableHead>
                        <TableHead>Total Revenue</TableHead>
                        <TableHead>Total Days</TableHead>
                        <TableHead>Avg Daily</TableHead>
                        <TableHead>Rentals</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginationAnalytics.paginatedData.map((item) => (
                        <TableRow key={item.rentalItem}>
                          <TableCell className="font-medium">
                            {item.rentalItem}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${item.dailyRate.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-semibold text-green-600">
                            ${item.totalRevenue.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.totalDays} days
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium text-blue-600">
                            ${item.avgDaily.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-purple-500" />
                              {item.rentals}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination Controls */}
              {billableAnalytics.length > 0 && (
                <div className="mt-4">
                  <PaginationControls
                    currentPage={paginationAnalytics.currentPage}
                    totalPages={paginationAnalytics.totalPages}
                    totalItems={paginationAnalytics.totalItems}
                    pageInfo={paginationAnalytics.pageInfo}
                    canGoNext={paginationAnalytics.canGoNext}
                    canGoPrevious={paginationAnalytics.canGoPrevious}
                    onPageChange={paginationAnalytics.goToPage}
                    onNextPage={paginationAnalytics.goToNextPage}
                    onPreviousPage={paginationAnalytics.goToPreviousPage}
                    itemsPerPage={itemsPerPageAnalytics}
                    onItemsPerPageChange={(newItemsPerPage) => {
                      setItemsPerPageAnalytics(newItemsPerPage);
                      paginationAnalytics.goToPage(1);
                    }}
                    className="border-t border-gray-700/50 pt-4"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
