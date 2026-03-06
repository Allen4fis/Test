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
import { Badge } from "@/components/ui/badge";
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
import {
  Trash2,
  Edit,
  Plus,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { EmployeeTicket, TicketCategory } from "@/types";
import { toast } from "@/hooks/use-toast";

export function TicketsAndInsurances() {
  const {
    employees,
    ticketCategories,
    employeeTickets,
    addTicketCategory,
    updateTicketCategory,
    deleteTicketCategory,
    addEmployeeTicket,
    updateEmployeeTicket,
    deleteEmployeeTicket,
  } = useTimeTracking();

  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingTicket, setIsAddingTicket] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TicketCategory | null>(
    null,
  );
  const [editingTicket, setEditingTicket] = useState<EmployeeTicket | null>(
    null,
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    requirementLevel: "mandatory" as const,
    alertDaysBeforeExpiry: 30,
  });

  const [ticketForm, setTicketForm] = useState({
    employeeId: "",
    categoryId: "",
    expirationDate: "",
    issueDate: "",
    notes: "",
  });

  const today = new Date();
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  // Helper to check ticket status
  const getTicketStatus = (expirationDate: string) => {
    const expDate = new Date(expirationDate);
    let daysLabel = "";

    if (expDate < today) {
      const daysExpired = Math.floor(
        (today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysLabel = `${daysExpired} day${daysExpired !== 1 ? "s" : ""} ago`;
      return {
        status: "expired",
        label: "Expired",
        color: "bg-red-100 text-red-800",
        daysLabel,
      };
    } else if (expDate <= oneMonthFromNow) {
      const daysUntil = Math.floor(
        (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      daysLabel = `${daysUntil} day${daysUntil !== 1 ? "s" : ""} left`;
      return {
        status: "expiring-soon",
        label: "Expiring Soon",
        color: "bg-yellow-100 text-yellow-800",
        daysLabel,
      };
    }
    return { status: "valid", label: "Valid", color: "bg-green-100 text-green-800", daysLabel: "" };
  };

  // Get tickets with employee and category info
  const ticketsWithDetails = useMemo(() => {
    return employeeTickets.map((ticket) => {
      const employee = employees.find((emp) => emp.id === ticket.employeeId);
      const category = ticketCategories.find(
        (cat) => cat.id === ticket.categoryId,
      );
      const ticketStatus = getTicketStatus(ticket.expirationDate);

      return {
        ...ticket,
        employeeName: employee?.name || "Unknown",
        categoryName: category?.name || "Unknown",
        requirementLevel: category?.requirementLevel || "optional",
        ...ticketStatus,
      };
    });
  }, [employeeTickets, employees, ticketCategories]);

  // Get critical tickets (expired or expiring within 1 month)
  // Exclude optional tickets - only show mandatory and recommended
  const criticalTickets = useMemo(() => {
    return ticketsWithDetails.filter(
      (ticket) =>
        ticket.status === "expired" || ticket.status === "expiring-soon",
    );
  }, [ticketsWithDetails]);

  // Get tickets grouped by employee with summary
  const employeeTicketsSummary = useMemo(() => {
    const grouped = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        tickets: typeof ticketsWithDetails;
        mandatoryCount: number;
        recommendedCount: number;
        optionalCount: number;
        expiredCount: number;
        expiringCount: number;
        validCount: number;
      }
    >();

    ticketsWithDetails.forEach((ticket) => {
      if (!grouped.has(ticket.employeeId)) {
        const employee = employees.find((emp) => emp.id === ticket.employeeId);
        grouped.set(ticket.employeeId, {
          employeeId: ticket.employeeId,
          employeeName: employee?.name || "Unknown",
          tickets: [],
          mandatoryCount: 0,
          recommendedCount: 0,
          optionalCount: 0,
          expiredCount: 0,
          expiringCount: 0,
          validCount: 0,
        });
      }

      const group = grouped.get(ticket.employeeId)!;
      group.tickets.push(ticket);

      if (ticket.requirementLevel === "mandatory") {
        group.mandatoryCount++;
      } else if (ticket.requirementLevel === "recommended") {
        group.recommendedCount++;
      } else {
        group.optionalCount++;
      }

      if (ticket.status === "expired") {
        group.expiredCount++;
      } else if (ticket.status === "expiring-soon") {
        group.expiringCount++;
      } else {
        group.validCount++;
      }
    });

    return Array.from(grouped.values()).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );
  }, [ticketsWithDetails, employees]);

  const handleAddCategory = () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    addTicketCategory({
      name: categoryForm.name,
      description: categoryForm.description || undefined,
      requirementLevel: categoryForm.requirementLevel,
      alertDaysBeforeExpiry: categoryForm.alertDaysBeforeExpiry || 30,
    });

    setCategoryForm({ name: "", description: "", requirementLevel: "mandatory", alertDaysBeforeExpiry: 30 });
    setIsAddingCategory(false);

    toast({
      title: "Success",
      description: "Ticket category added",
    });
  };

  const handleEditCategory = () => {
    if (!editingCategory || !categoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    updateTicketCategory(editingCategory.id, {
      name: categoryForm.name,
      description: categoryForm.description || undefined,
      requirementLevel: categoryForm.requirementLevel,
      alertDaysBeforeExpiry: categoryForm.alertDaysBeforeExpiry || 30,
    });

    setEditingCategory(null);
    setCategoryForm({ name: "", description: "", requirementLevel: "mandatory", alertDaysBeforeExpiry: 30 });

    toast({
      title: "Success",
      description: "Ticket category updated",
    });
  };

  const handleDeleteCategory = (id: string) => {
    deleteTicketCategory(id);
    toast({
      title: "Success",
      description: "Ticket category deleted",
    });
  };

  const handleAddTicket = () => {
    if (!ticketForm.employeeId || !ticketForm.categoryId || !ticketForm.expirationDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addEmployeeTicket({
      employeeId: ticketForm.employeeId,
      categoryId: ticketForm.categoryId,
      expirationDate: ticketForm.expirationDate,
      issueDate: ticketForm.issueDate || undefined,
      notes: ticketForm.notes || undefined,
    });

    setTicketForm({
      employeeId: "",
      categoryId: "",
      expirationDate: "",
      issueDate: "",
      notes: "",
    });
    setIsAddingTicket(false);

    toast({
      title: "Success",
      description: "Employee ticket added",
    });
  };

  const handleEditTicket = () => {
    if (
      !editingTicket ||
      !ticketForm.employeeId ||
      !ticketForm.categoryId ||
      !ticketForm.expirationDate
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    updateEmployeeTicket(editingTicket.id, {
      employeeId: ticketForm.employeeId,
      categoryId: ticketForm.categoryId,
      expirationDate: ticketForm.expirationDate,
      issueDate: ticketForm.issueDate || undefined,
      notes: ticketForm.notes || undefined,
    });

    setEditingTicket(null);
    setTicketForm({
      employeeId: "",
      categoryId: "",
      expirationDate: "",
      issueDate: "",
      notes: "",
    });

    toast({
      title: "Success",
      description: "Employee ticket updated",
    });
  };

  const handleDeleteTicket = (id: string) => {
    deleteEmployeeTicket(id);
    toast({
      title: "Success",
      description: "Employee ticket deleted",
    });
  };

  const openEditCategory = (category: TicketCategory) => {
    setCategoryForm({
      name: category.name,
      description: category.description || "",
      requirementLevel: category.requirementLevel || "mandatory",
      alertDaysBeforeExpiry: category.alertDaysBeforeExpiry || 30,
    });
    setEditingCategory(category);
  };

  const openEditTicket = (ticket: EmployeeTicket) => {
    setTicketForm({
      employeeId: ticket.employeeId,
      categoryId: ticket.categoryId,
      expirationDate: ticket.expirationDate,
      issueDate: ticket.issueDate || "",
      notes: ticket.notes || "",
    });
    setEditingTicket(ticket);
  };

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {criticalTickets.length > 0 && (
        <Card className="border-l-4 border-red-500 bg-red-50/50 mb-4">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-red-900">
                    Expired/Expiring Tickets & Insurances
                  </h3>
                  <p className="text-xs text-red-700">
                    {criticalTickets.filter((t) => t.status === "expired").length > 0 && (
                      <>
                        <span className="font-semibold">
                          {criticalTickets.filter((t) => t.status === "expired").length} expired
                        </span>
                        {criticalTickets.filter((t) => t.status === "expiring-soon").length > 0 && " • "}
                      </>
                    )}
                    {criticalTickets.filter((t) => t.status === "expiring-soon").length > 0 && (
                      <span className="font-semibold">
                        {criticalTickets.filter((t) => t.status === "expiring-soon").length} expiring soon
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {criticalTickets.length > 0 && (
              <div className="space-y-1 mt-3 text-xs">
                {criticalTickets.slice(0, 3).map((ticket, index) => {
                  const isMandatory = ticket.requirementLevel === "mandatory";
                  const nextTicket = criticalTickets[index + 1];
                  const isLastMandatory =
                    isMandatory && nextTicket?.requirementLevel !== "mandatory";

                  return (
                    <div key={ticket.id}>
                      <div
                        className={`flex items-center justify-between p-2 rounded border-l-2 ${
                          isMandatory
                            ? "bg-white/80 border-red-500"
                            : "bg-white/50 border-orange-400"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span
                            className={`truncate block ${
                              isMandatory
                                ? "font-semibold text-gray-900"
                                : "font-medium text-gray-700"
                            }`}
                          >
                            {ticket.employeeName}: {ticket.categoryName}
                          </span>
                          <span
                            className={`text-xs ${
                              isMandatory ? "text-gray-700" : "text-gray-500"
                            }`}
                          >
                            {ticket.status === "expired"
                              ? `Expired ${ticket.daysLabel || "ago"}`
                              : `Expires ${ticket.daysLabel || "soon"}`}
                          </span>
                        </div>
                        <Badge
                          className={`border-0 text-xs ml-2 flex-shrink-0 ${
                            ticket.status === "expired"
                              ? isMandatory
                                ? "bg-red-600 text-white"
                                : "bg-red-500 text-white"
                              : isMandatory
                                ? "bg-yellow-600 text-white"
                                : "bg-yellow-500 text-white"
                          }`}
                        >
                          {ticket.status === "expired" ? "Expired" : "Soon"}
                        </Badge>
                      </div>
                      {isLastMandatory && (
                        <div className="my-1 border-t border-gray-300" />
                      )}
                    </div>
                  );
                })}
                {criticalTickets.length > 3 && (
                  <p className="text-xs text-red-600 font-semibold px-2">
                    +{criticalTickets.length - 3} more
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      )}


      {/* Employee Tickets Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Employee Tickets & Insurances
              </CardTitle>
              <CardDescription>
                Track ticket and insurance expiration dates for each employee
              </CardDescription>
            </div>
            <div className="w-56">
              <Label className="text-xs font-medium mb-2 block">Filter by Employee</Label>
              <Select value={selectedEmployeeId || "all-employees"} onValueChange={(value) => setSelectedEmployeeId(value === "all-employees" ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-employees">All employees</SelectItem>
                  {employees
                    .filter((emp) => emp.isActive)
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isAddingTicket} onOpenChange={setIsAddingTicket}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Employee Ticket</DialogTitle>
                  <DialogDescription>
                    Assign a ticket or insurance to an employee
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Employee *</Label>
                    <Select
                      value={ticketForm.employeeId}
                      onValueChange={(value) =>
                        setTicketForm({ ...ticketForm, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter((emp) => emp.isActive)
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} - {emp.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={ticketForm.categoryId}
                      onValueChange={(value) =>
                        setTicketForm({ ...ticketForm, categoryId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiration Date *</Label>
                    <Input
                      type="date"
                      value={ticketForm.expirationDate}
                      onChange={(e) =>
                        setTicketForm({
                          ...ticketForm,
                          expirationDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={ticketForm.issueDate}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, issueDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Optional notes"
                      value={ticketForm.notes}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, notes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingTicket(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddTicket}>Add Ticket</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            const filteredTickets = selectedEmployeeId
              ? ticketsWithDetails.filter(
                  (ticket) => ticket.employeeId === selectedEmployeeId,
                )
              : ticketsWithDetails;

            return filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {selectedEmployeeId
                    ? "No tickets for this employee"
                    : "No tickets assigned yet"}
                </p>
                <p className="text-sm">
                  {selectedEmployeeId
                    ? "This employee has no ticket records"
                    : "Add an employee ticket to get started"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {!selectedEmployeeId && <TableHead>Employee</TableHead>}
                      <TableHead>Category</TableHead>
                      <TableHead>Expiration Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        {!selectedEmployeeId && (
                          <TableCell className="font-medium">
                            {ticket.employeeName}
                          </TableCell>
                        )}
                        <TableCell>{ticket.categoryName}</TableCell>
                        <TableCell>
                          {new Date(ticket.expirationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={ticket.color}>
                            {ticket.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.issueDate
                            ? new Date(ticket.issueDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {ticket.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditTicket(ticket)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Employee Ticket</DialogTitle>
                                  <DialogDescription>
                                    Update the ticket details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Employee *</Label>
                                    <Select
                                      value={ticketForm.employeeId}
                                      onValueChange={(value) =>
                                        setTicketForm({
                                          ...ticketForm,
                                          employeeId: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {employees
                                          .filter((emp) => emp.isActive)
                                          .map((emp) => (
                                            <SelectItem
                                              key={emp.id}
                                              value={emp.id}
                                            >
                                              {emp.name} - {emp.title}
                                            </SelectItem>
                                          ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select
                                      value={ticketForm.categoryId}
                                      onValueChange={(value) =>
                                        setTicketForm({
                                          ...ticketForm,
                                          categoryId: value,
                                        })
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ticketCategories.map((cat) => (
                                          <SelectItem key={cat.id} value={cat.id}>
                                            {cat.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Expiration Date *</Label>
                                    <Input
                                      type="date"
                                      value={ticketForm.expirationDate}
                                      onChange={(e) =>
                                        setTicketForm({
                                          ...ticketForm,
                                          expirationDate: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Issue Date</Label>
                                    <Input
                                      type="date"
                                      value={ticketForm.issueDate}
                                      onChange={(e) =>
                                        setTicketForm({
                                          ...ticketForm,
                                          issueDate: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Notes</Label>
                                    <Input
                                      placeholder="Optional notes"
                                      value={ticketForm.notes}
                                      onChange={(e) =>
                                        setTicketForm({
                                          ...ticketForm,
                                          notes: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTicket(null);
                                      setTicketForm({
                                        employeeId: "",
                                        categoryId: "",
                                        expirationDate: "",
                                        issueDate: "",
                                        notes: "",
                                      });
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  <Button onClick={handleEditTicket}>
                                    Save Changes
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this ticket?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteTicket(ticket.id)}
                                    className="bg-red-600"
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
            );
          })()}
        </CardContent>
      </Card>

      {/* Ticket Categories Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Ticket Categories
              </CardTitle>
              <CardDescription>
                Manage ticket and insurance categories (e.g., Class 1 License, CPR,
                Safety Training)
              </CardDescription>
            </div>
            <Dialog open={isAddingCategory} onOpenChange={setIsAddingCategory}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Ticket Category</DialogTitle>
                  <DialogDescription>
                    Create a new ticket or insurance category
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category Name *</Label>
                    <Input
                      placeholder="e.g., Class 1 License, CPR Certification"
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm({ ...categoryForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Optional description"
                      value={categoryForm.description}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Requirement Level</Label>
                    <Select
                      value={categoryForm.requirementLevel}
                      onValueChange={(value) =>
                        setCategoryForm({
                          ...categoryForm,
                          requirementLevel: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mandatory">Mandatory</SelectItem>
                        <SelectItem value="recommended">Recommended</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Days Before Expiry</Label>
                    <Input
                      type="number"
                      min="1"
                      value={categoryForm.alertDaysBeforeExpiry}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          alertDaysBeforeExpiry: parseInt(e.target.value) || 30,
                        })
                      }
                      placeholder="30"
                    />
                    <p className="text-xs text-gray-500">
                      Alert will trigger this many days before expiration
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddingCategory(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddCategory}>Add Category</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {ticketCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No categories yet</p>
              <p className="text-sm">Create a category to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Alert Days Before Expiry</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell>
                        {category.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            category.requirementLevel === "mandatory"
                              ? "default"
                              : "outline"
                          }
                        >
                          {category.requirementLevel || "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-800">
                          {category.alertDaysBeforeExpiry || 30} days
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditCategory(category)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Ticket Category</DialogTitle>
                                <DialogDescription>
                                  Update the ticket category details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Category Name *</Label>
                                  <Input
                                    placeholder="e.g., Class 1 License, CPR Certification"
                                    value={categoryForm.name}
                                    onChange={(e) =>
                                      setCategoryForm({
                                        ...categoryForm,
                                        name: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <Input
                                    placeholder="Optional description"
                                    value={categoryForm.description}
                                    onChange={(e) =>
                                      setCategoryForm({
                                        ...categoryForm,
                                        description: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Requirement Level</Label>
                                  <Select
                                    value={categoryForm.requirementLevel}
                                    onValueChange={(value) =>
                                      setCategoryForm({
                                        ...categoryForm,
                                        requirementLevel: value as any,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="mandatory">
                                        Mandatory
                                      </SelectItem>
                                      <SelectItem value="recommended">
                                        Recommended
                                      </SelectItem>
                                      <SelectItem value="optional">
                                        Optional
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Alert Days Before Expiry</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={categoryForm.alertDaysBeforeExpiry}
                                    onChange={(e) =>
                                      setCategoryForm({
                                        ...categoryForm,
                                        alertDaysBeforeExpiry: parseInt(e.target.value) || 30,
                                      })
                                    }
                                    placeholder="30"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Alert will trigger this many days before expiration
                                  </p>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setEditingCategory(null);
                                    setCategoryForm({
                                      name: "",
                                      description: "",
                                      requirementLevel: "mandatory",
                                      alertDaysBeforeExpiry: 30,
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button onClick={handleEditCategory}>
                                  Save Changes
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Category</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{category.name}"?
                                  This will also delete all associated employee tickets.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteCategory(category.id)
                                  }
                                  className="bg-red-600"
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
    </div>
  );
}
