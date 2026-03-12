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
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
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
  Download,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { EmployeeTicket, TicketCategory } from "@/types";
import { toast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";

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
  const [selectedCategoryForView, setSelectedCategoryForView] = useState<TicketCategory | null>(null);
  const [quickAddEmployeeId, setQuickAddEmployeeId] = useState<string>("");
  const [quickAddDates, setQuickAddDates] = useState({
    expirationDate: "",
    issueDate: "",
  });
  const [selectedLetterFilter, setSelectedLetterFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

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
    excludeFromAlert: false,
  });

  const today = new Date();

  // Helper to check ticket status
  const getTicketStatus = (expirationDate: string, alertDaysBeforeExpiry: number = 30) => {
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
    }

    const alertDate = new Date(expDate);
    alertDate.setDate(alertDate.getDate() - alertDaysBeforeExpiry);

    if (today >= alertDate && expDate > today) {
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
    return employeeTickets
      .filter((ticket) => {
        const employee = employees.find((emp) => emp.id === ticket.employeeId);
        return employee?.isActive !== false;
      })
      .map((ticket) => {
        const employee = employees.find((emp) => emp.id === ticket.employeeId);
        const category = ticketCategories.find(
          (cat) => cat.id === ticket.categoryId,
        );
        const alertDaysBeforeExpiry = category?.alertDaysBeforeExpiry || 30;
        const ticketStatus = getTicketStatus(ticket.expirationDate, alertDaysBeforeExpiry);

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
  // Exclude optional tickets and those marked to exclude from alert
  const criticalTickets = useMemo(() => {
    return ticketsWithDetails
      .filter(
        (ticket) =>
          (ticket.status === "expired" || ticket.status === "expiring-soon") &&
          ticket.requirementLevel !== "optional" &&
          !ticket.excludeFromAlert,
      )
      .sort((a, b) => {
        // Mandatory first, then recommended
        // Within each requirement level, expired first then expiring-soon
        const levelOrder: Record<string, number> = {
          mandatory: 0,
          recommended: 1,
        };
        const statusOrder: Record<string, number> = {
          expired: 0,
          "expiring-soon": 1,
        };

        const levelDiff = (levelOrder[a.requirementLevel] ?? 2) - (levelOrder[b.requirementLevel] ?? 2);
        if (levelDiff !== 0) return levelDiff;

        return (
          (statusOrder[a.status] ?? 2) -
          (statusOrder[b.status] ?? 2)
        );
      });
  }, [ticketsWithDetails]);

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
      excludeFromAlert: ticketForm.excludeFromAlert || undefined,
    });

    setTicketForm({
      employeeId: "",
      categoryId: "",
      expirationDate: "",
      issueDate: "",
      notes: "",
      excludeFromAlert: false,
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
      excludeFromAlert: ticketForm.excludeFromAlert || undefined,
    });

    setEditingTicket(null);
    setTicketForm({
      employeeId: "",
      categoryId: "",
      expirationDate: "",
      issueDate: "",
      notes: "",
      excludeFromAlert: false,
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
      excludeFromAlert: ticket.excludeFromAlert || false,
    });
    setEditingTicket(ticket);
  };

  const getEmployeesForCategory = (categoryId: string) => {
    const assignedTickets = employeeTickets.filter((t) => t.categoryId === categoryId);
    const assignedEmployeeIds = new Set(assignedTickets.map((t) => t.employeeId));
    const assigned = employees.filter(
      (emp) => emp.isActive && assignedEmployeeIds.has(emp.id)
    );
    const unassigned = employees.filter(
      (emp) => emp.isActive && !assignedEmployeeIds.has(emp.id)
    );
    return { assigned, unassigned, assignedTickets };
  };

  const handleQuickAddTicket = () => {
    if (!quickAddEmployeeId || !quickAddDates.expirationDate || !selectedCategoryForView) {
      toast({
        title: "Error",
        description: "Please select employee and expiration date",
        variant: "destructive",
      });
      return;
    }

    addEmployeeTicket({
      employeeId: quickAddEmployeeId,
      categoryId: selectedCategoryForView.id,
      expirationDate: quickAddDates.expirationDate,
      issueDate: quickAddDates.issueDate || undefined,
      notes: undefined,
      excludeFromAlert: undefined,
    });

    setQuickAddEmployeeId("");
    setQuickAddDates({ expirationDate: "", issueDate: "" });

    toast({
      title: "Success",
      description: "Employee ticket added",
    });
  };

  const handleExportPDF = () => {
    // Get all mandatory and recommended tickets
    const mandatoryTickets = ticketsWithDetails.filter(
      (ticket) => ticket.requirementLevel === "mandatory"
    );
    const recommendedTickets = ticketsWithDetails.filter(
      (ticket) => ticket.requirementLevel === "recommended"
    );

    if (mandatoryTickets.length === 0 && recommendedTickets.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There are no mandatory or recommended tickets to export",
      });
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString();
    const timeStr = today.toLocaleTimeString();

    const generateTableRows = (tickets: typeof ticketsWithDetails) => {
      return tickets
        .map((ticket) => {
          const expDate = new Date(ticket.expirationDate);
          let statusBadge = "";
          let statusColor = "";

          if (ticket.status === "expired") {
            statusBadge = "EXPIRED";
            statusColor = "#dc2626";
          } else if (ticket.status === "expiring-soon") {
            statusBadge = "EXPIRING SOON";
            statusColor = "#ea580c";
          } else {
            statusBadge = "VALID";
            statusColor = "#16a34a";
          }

          const daysText =
            ticket.status === "expired"
              ? `${Math.floor((today.getTime() - expDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
              : ticket.daysLabel || "—";

          return `
            <tr>
              <td style="color: #000000;">${ticket.employeeName}</td>
              <td style="color: #000000;">${ticket.categoryName}</td>
              <td style="color: #000000;">${expDate.toLocaleDateString()}</td>
              <td style="color: #000000;">${daysText}</td>
              <td><span style="background-color: ${statusColor}; color: white; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">${statusBadge}</span></td>
            </tr>
          `;
        })
        .join("");
    };

    const htmlContent = `
      <html>
        <head>
          <style>
            html, body { color: #000000 !important; }
            body { font-family: Arial, sans-serif; margin: 20px; background-color: white; }
            h1 { color: #000000 !important; border-bottom: 3px solid #dc2626; padding-bottom: 10px; font-size: 24px; }
            h2 { color: #000000 !important; margin-top: 25px; margin-bottom: 12px; font-size: 16px; border-left: 4px solid #dc2626; padding-left: 10px; }
            .report-date { margin-bottom: 20px; font-size: 13px; }
            .warning-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
            .warning-text { font-weight: bold; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            thead { background-color: #dc2626; }
            th { background-color: #dc2626 !important; color: white !important; padding: 12px; text-align: left; font-weight: bold; border: 1px solid #991b1b; }
            td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; background-color: white; }
            tbody tr:nth-child(odd) td { background-color: white; color: #000000 !important; }
            tbody tr:nth-child(even) td { background-color: #f9fafb; color: #000000 !important; }
            .footer { margin-top: 30px; font-size: 12px; border-top: 1px solid #d1d5db; padding-top: 15px; }
            .summary-box { background-color: #f3f4f6; padding: 12px; border-radius: 4px; margin-bottom: 15px; border-left: 4px solid #3b82f6; }
            .summary-text { font-size: 13px; }
            p { color: #000000 !important; }
            span { color: inherit; }
          </style>
        </head>
        <body>
          <h1 style="color: #000000;">📋 TICKETS & INSURANCES REPORT</h1>
          <div class="report-date" style="color: #000000;">Generated: ${dateStr} at ${timeStr}</div>

          ${
            mandatoryTickets.length > 0
              ? `
            <h2 style="color: #000000;">🔴 MANDATORY TICKETS/INSURANCES</h2>
            <div class="warning-box">
              <div class="warning-text" style="color: #7f1d1d;">ACTION REQUIRED: Employees with expired mandatory tickets should not be assigned to work until renewed.</div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Ticket/Insurance</th>
                  <th>Expiration Date</th>
                  <th>Status Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${generateTableRows(mandatoryTickets)}
              </tbody>
            </table>
          `
              : ""
          }

          ${
            recommendedTickets.length > 0
              ? `
            <h2 style="color: #000000;">🟠 RECOMMENDED TICKETS/INSURANCES</h2>
            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Ticket/Insurance</th>
                  <th>Expiration Date</th>
                  <th>Status Details</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${generateTableRows(recommendedTickets)}
              </tbody>
            </table>
          `
              : ""
          }

          <div class="footer" style="color: #000000;">
            <div class="summary-box" style="color: #000000;">
              <p class="summary-text" style="color: #000000;"><strong>Report Summary:</strong></p>
              <p class="summary-text" style="color: #000000;">• Mandatory Tickets: ${mandatoryTickets.length}</p>
              <p class="summary-text" style="color: #000000;">• Recommended Tickets: ${recommendedTickets.length}</p>
              <p class="summary-text" style="color: #000000;">• Total: ${mandatoryTickets.length + recommendedTickets.length}</p>
            </div>
            <p style="color: #000000;">This report was automatically generated from the Trackity-doo system.</p>
          </div>
        </body>
      </html>
    `;

    const element = document.createElement("div");
    element.innerHTML = htmlContent;

    const opt = {
      margin: 10,
      filename: `Tickets-Insurances-Report-${new Date().toISOString().split("T")[0]}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "portrait", unit: "mm", format: "a4" },
    };

    html2pdf().set(opt).from(element).save();

    toast({
      title: "PDF Exported",
      description: `Report with ${mandatoryTickets.length + recommendedTickets.length} ticket(s) has been downloaded`,
    });
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
            </div>

            {criticalTickets.length > 0 && (
              <div className="space-y-1 mt-3 text-xs">
                {criticalTickets.map((ticket, index) => {
                  const isMandatory = ticket.requirementLevel === "mandatory";
                  const isExpired = ticket.status === "expired";
                  const nextTicket = criticalTickets[index + 1];
                  const isLastMandatory =
                    isMandatory && nextTicket?.requirementLevel !== "mandatory";

                  return (
                    <div key={ticket.id}>
                      <style>{`
                        @keyframes hellishFlash {
                          0%, 100% { background-color: rgb(239, 68, 68); }
                          50% { background-color: rgb(127, 29, 29); }
                        }
                        @keyframes hellishTextFlash {
                          0%, 100% { color: rgb(255, 255, 255); }
                          50% { color: rgb(255, 200, 124); }
                        }
                      `}</style>
                      <div
                        className={`flex items-center justify-between p-2 rounded border-l-3 text-xs gap-2 ${
                          isExpired && isMandatory
                            ? "border-red-700"
                            : isExpired && !isMandatory
                              ? "bg-orange-100 border-red-600"
                              : isMandatory
                                ? "bg-orange-100 border-orange-600"
                                : "bg-orange-50 border-orange-400"
                        }`}
                        style={isExpired && isMandatory ? {
                          animation: "hellishFlash 0.6s infinite",
                        } : {}}
                      >
                        <div className="flex-1 min-w-0">
                          <span
                            className={`truncate block font-bold ${
                              isExpired && isMandatory
                                ? "text-white"
                                : isExpired
                                  ? "text-red-900"
                                  : isMandatory
                                    ? "text-orange-900"
                                    : "text-orange-800"
                            }`}
                            style={isExpired && isMandatory ? {
                              animation: "hellishTextFlash 0.6s infinite",
                            } : {}}
                          >
                            {ticket.employeeName}: {ticket.categoryName}
                          </span>
                          <span
                            className={`text-xs ${
                              isExpired && isMandatory
                                ? "text-yellow-100"
                                : isExpired
                                  ? "text-red-700"
                                  : "text-orange-700"
                            }`}
                          >
                            {isExpired
                              ? `Expired ${ticket.daysLabel || "ago"}`
                              : `Expires ${ticket.daysLabel || "soon"}`}
                          </span>
                        </div>
                        <Badge
                          className={`border-0 text-xs flex-shrink-0 font-bold ${
                            isExpired && isMandatory
                              ? "bg-red-900 text-yellow-100"
                              : isExpired && !isMandatory
                                ? "bg-red-600 text-white"
                                : isMandatory
                                  ? "bg-orange-600 text-white"
                                  : "bg-orange-500 text-white"
                          }`}
                          style={isExpired && isMandatory ? {
                            animation: "hellishFlash 0.6s infinite",
                          } : {}}
                        >
                          {isExpired ? "EXPIRED" : "SOON"}
                        </Badge>
                      </div>
                      {isLastMandatory && (
                        <div className="my-2 py-1 border-t-2 border-gray-400" />
                      )}
                    </div>
                  );
                })}
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
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5" />
                Employee Tickets & Insurances
              </CardTitle>
              <CardDescription className="text-white">
                Select an employee to view and manage their tickets
              </CardDescription>
            </div>
            <div className="w-56">
              <Label className="text-xs font-medium mb-2 block text-white">Filter by Employee</Label>
              <Select value={selectedEmployeeId || "all-employees"} onValueChange={(value) => setSelectedEmployeeId(value === "all-employees" ? null : value)}>
                <SelectTrigger className="text-white">
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
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={ticketForm.expirationDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTicketForm({
                          ...ticketForm,
                          expirationDate: value,
                        });
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (value && !dateRegex.test(value)) {
                          toast({
                            title: "Invalid date format",
                            description: "Please use YYYY-MM-DD format",
                            variant: "destructive",
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input
                      type="text"
                      placeholder="YYYY-MM-DD"
                      value={ticketForm.issueDate}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTicketForm({ ...ticketForm, issueDate: value });
                      }}
                      onBlur={(e) => {
                        const value = e.target.value;
                        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                        if (value && !dateRegex.test(value)) {
                          toast({
                            title: "Invalid date format",
                            description: "Please use YYYY-MM-DD format",
                            variant: "destructive",
                          });
                        }
                      }}
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
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="excludeFromAlert"
                      checked={ticketForm.excludeFromAlert}
                      onChange={(e) =>
                        setTicketForm({ ...ticketForm, excludeFromAlert: e.target.checked })
                      }
                      className="rounded"
                    />
                    <Label htmlFor="excludeFromAlert" className="cursor-pointer">
                      Exclude from alert banner
                    </Label>
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

            // Reset to page 1 when filter changes
            if (currentPage > 1 && currentPage > Math.ceil(filteredTickets.length / itemsPerPage)) {
              setCurrentPage(1);
            }

            const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
            const startIdx = (currentPage - 1) * itemsPerPage;
            const paginatedTickets = filteredTickets.slice(startIdx, startIdx + itemsPerPage);

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
              <>
                <Accordion type="single" collapsible className="space-y-2">
                  {paginatedTickets.map((ticket) => (
                  <AccordionItem
                    key={ticket.id}
                    value={ticket.id}
                    className={`border rounded-lg px-4 ${
                      ticket.excludeFromAlert
                        ? "bg-orange-50 border-orange-300"
                        : "border-gray-300"
                    }`}
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between gap-4 flex-1 text-left">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {!selectedEmployeeId && (
                            <div
                              className={`text-sm font-medium min-w-fit ${
                                ticket.excludeFromAlert
                                  ? "text-orange-700"
                                  : "text-white"
                              }`}
                            >
                              {ticket.employeeName}
                            </div>
                          )}
                          <div
                            className={`text-sm font-medium ${
                              ticket.excludeFromAlert
                                ? "text-orange-700"
                                : "text-white"
                            }`}
                          >
                            {ticket.categoryName}
                          </div>
                          <div
                            className={`text-xs ${
                              ticket.excludeFromAlert
                                ? "text-orange-600"
                                : "text-gray-300"
                            }`}
                          >
                            Exp: {new Date(ticket.expirationDate).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={ticket.color}>
                          {ticket.label}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0">
                      <div className="space-y-3 pl-0">
                        {ticket.issueDate && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Issue Date:</span>
                            <span className="font-medium">{new Date(ticket.issueDate).toLocaleDateString()}</span>
                          </div>
                        )}
                        {ticket.notes && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Notes:</span>
                            <span className="font-medium text-gray-700">{ticket.notes}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button
                            variant={ticket.excludeFromAlert ? "outline" : "outline"}
                            size="sm"
                            onClick={() => {
                              updateEmployeeTicket(ticket.id, {
                                employeeId: ticket.employeeId,
                                categoryId: ticket.categoryId,
                                expirationDate: ticket.expirationDate,
                                issueDate: ticket.issueDate || undefined,
                                notes: ticket.notes || undefined,
                                excludeFromAlert: !ticket.excludeFromAlert,
                              });
                              toast({
                                title: "Success",
                                description: ticket.excludeFromAlert
                                  ? "Ticket re-enabled for alerts"
                                  : "Ticket excluded from alerts",
                              });
                            }}
                            className={ticket.excludeFromAlert ? "text-orange-600 border-orange-600" : "text-gray-600"}
                          >
                            {ticket.excludeFromAlert ? "Restore" : "Exclude"}
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditTicket(ticket)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
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
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    value={ticketForm.expirationDate}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        expirationDate: e.target.value,
                                      })
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                                      if (value && !dateRegex.test(value)) {
                                        toast({
                                          title: "Invalid date format",
                                          description: "Please use YYYY-MM-DD format",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Issue Date</Label>
                                  <Input
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    value={ticketForm.issueDate}
                                    onChange={(e) =>
                                      setTicketForm({
                                        ...ticketForm,
                                        issueDate: e.target.value,
                                      })
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                                      if (value && !dateRegex.test(value)) {
                                        toast({
                                          title: "Invalid date format",
                                          description: "Please use YYYY-MM-DD format",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
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
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id="excludeFromAlertEdit"
                                    checked={ticketForm.excludeFromAlert}
                                    onChange={(e) =>
                                      setTicketForm({ ...ticketForm, excludeFromAlert: e.target.checked })
                                    }
                                    className="rounded"
                                  />
                                  <Label htmlFor="excludeFromAlertEdit" className="cursor-pointer">
                                    Exclude from alert banner
                                  </Label>
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
                                      excludeFromAlert: false,
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
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
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
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  ))}
                </Accordion>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages} • {filteredTickets.length} total
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
                  {ticketCategories.map((category) => {
                    const { assigned } = getEmployeesForCategory(category.id);
                    const activeEmployeeCount = employees.filter((e) => e.isActive).length;
                    return (
                      <TableRow
                        key={category.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setSelectedCategoryForView(category)}
                      >
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
                          <span className="font-medium text-gray-200">
                            {category.alertDaysBeforeExpiry || 30} days
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {assigned.length}/{activeEmployeeCount}
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditCategory(category)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent onClick={(e) => e.stopPropagation()}>
                                <DialogHeader>
                                  <DialogTitle>Edit Ticket Category</DialogTitle>
                                  <DialogDescription>
                                    Update the ticket category details
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
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
                                      value={categoryForm.alertDaysBeforeExpiry || ""}
                                      onChange={(e) => {
                                        const value = e.target.value.trim();
                                        if (value === "") {
                                          setCategoryForm({
                                            ...categoryForm,
                                            alertDaysBeforeExpiry: "",
                                          });
                                        } else {
                                          const numValue = parseInt(value);
                                          if (!isNaN(numValue) && numValue > 0) {
                                            setCategoryForm({
                                              ...categoryForm,
                                              alertDaysBeforeExpiry: numValue,
                                            });
                                          }
                                        }
                                      }}
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
                              <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Assignment View Dialog */}
      <Dialog open={selectedCategoryForView !== null} onOpenChange={(open) => {
        if (!open) {
          setSelectedCategoryForView(null);
          setQuickAddEmployeeId("");
          setQuickAddDates({ expirationDate: "", issueDate: "" });
          setSelectedLetterFilter(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCategoryForView?.name} - Assignment Overview
            </DialogTitle>
            <DialogDescription>
              View which employees have this ticket assigned and quickly add more
            </DialogDescription>
          </DialogHeader>

          {selectedCategoryForView && (() => {
            const { assigned, unassigned, assignedTickets } = getEmployeesForCategory(selectedCategoryForView.id);

            // Filter by selected letter
            const filterByLetter = (employees: typeof unassigned) => {
              if (!selectedLetterFilter) return employees;
              return employees.filter((emp) =>
                emp.name.charAt(0).toUpperCase() === selectedLetterFilter
              );
            };

            const filteredAssigned = filterByLetter(assigned);
            const filteredUnassigned = filterByLetter(unassigned);

            // Get unique first letters for A-Z selector
            const allEmployees = [...assigned, ...unassigned];
            const availableLetters = Array.from(
              new Set(
                allEmployees.map((emp) => emp.name.charAt(0).toUpperCase())
              )
            )
              .sort()
              .filter((letter) => /^[A-Z]$/.test(letter));

            return (
              <div className="space-y-6">
                {/* A-Z Letter Selector */}
                <div className="flex flex-wrap gap-1 sticky top-0 bg-white pb-2 -mb-2">
                  <Button
                    size="sm"
                    variant={selectedLetterFilter === null ? "default" : "outline"}
                    onClick={() => setSelectedLetterFilter(null)}
                    className="h-8 text-xs"
                  >
                    All
                  </Button>
                  {availableLetters.map((letter) => (
                    <Button
                      key={letter}
                      size="sm"
                      variant={selectedLetterFilter === letter ? "default" : "outline"}
                      onClick={() => setSelectedLetterFilter(letter)}
                      className="h-8 w-8 text-xs p-0"
                    >
                      {letter}
                    </Button>
                  ))}
                </div>

                {/* Results summary */}
                {selectedLetterFilter && (
                  <div className="text-xs text-gray-600 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                    Showing employees starting with "<strong>{selectedLetterFilter}</strong>"
                  </div>
                )}

                <div className="max-h-96 overflow-y-auto space-y-6">
                  {/* Assigned Employees */}
                  {filteredAssigned.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5" />
                        Assigned ({filteredAssigned.length})
                      </h3>
                      <div className="space-y-2">
                        {filteredAssigned.map((employee) => {
                        const ticket = assignedTickets.find(
                          (t) => t.employeeId === employee.id
                        );
                        if (!ticket) return null;

                        const status = getTicketStatus(
                          ticket.expirationDate,
                          selectedCategoryForView.alertDaysBeforeExpiry || 30
                        );

                        return (
                          <div
                            key={employee.id}
                            className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-green-900">{employee.name}</p>
                              <p className="text-xs text-green-700">
                                Expires: {new Date(ticket.expirationDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className={status.color}>{status.label}</Badge>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unassigned Employees */}
                  {filteredUnassigned.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Not Assigned ({filteredUnassigned.length})
                      </h3>
                      <div className="space-y-3">
                        {filteredUnassigned.map((employee) => (
                        <div
                          key={employee.id}
                          className="p-3 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div>
                              <p className="font-medium text-orange-900">{employee.name}</p>
                              <p className="text-xs text-orange-700">{employee.title}</p>
                            </div>
                          </div>

                          {/* Quick Add Form */}
                          {quickAddEmployeeId === employee.id ? (
                            <div className="space-y-2 mt-2 pt-2 border-t border-orange-200">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs">Expiration Date *</Label>
                                  <Input
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    value={quickAddDates.expirationDate}
                                    onChange={(e) =>
                                      setQuickAddDates({
                                        ...quickAddDates,
                                        expirationDate: e.target.value,
                                      })
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                                      if (value && !dateRegex.test(value)) {
                                        toast({
                                          title: "Invalid date format",
                                          description: "Please use YYYY-MM-DD format",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Certification Date</Label>
                                  <Input
                                    type="text"
                                    placeholder="YYYY-MM-DD"
                                    value={quickAddDates.issueDate}
                                    onChange={(e) =>
                                      setQuickAddDates({
                                        ...quickAddDates,
                                        issueDate: e.target.value,
                                      })
                                    }
                                    onBlur={(e) => {
                                      const value = e.target.value;
                                      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                                      if (value && !dateRegex.test(value)) {
                                        toast({
                                          title: "Invalid date format",
                                          description: "Please use YYYY-MM-DD format",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setQuickAddEmployeeId(employee.id);
                                    handleQuickAddTicket();
                                  }}
                                  className="flex-1 h-8"
                                >
                                  Add
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setQuickAddEmployeeId("");
                                    setQuickAddDates({
                                      expirationDate: "",
                                      issueDate: "",
                                    });
                                  }}
                                  className="flex-1 h-8"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setQuickAddEmployeeId(employee.id)}
                              className="w-full h-8"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add To Ticket
                            </Button>
                          )}
                        </div>
                      ))}
                      </div>
                    </div>
                  )}

                  {filteredUnassigned.length === 0 && filteredAssigned.length > 0 && !selectedLetterFilter && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
                      <p className="text-sm font-medium text-blue-900">
                        ✓ All active employees have this ticket assigned
                      </p>
                    </div>
                  )}

                  {filteredAssigned.length === 0 && filteredUnassigned.length === 0 && selectedLetterFilter && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <p className="text-sm font-medium text-gray-700">
                        No employees starting with "{selectedLetterFilter}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedCategoryForView(null);
                setQuickAddEmployeeId("");
                setQuickAddDates({ expirationDate: "", issueDate: "" });
                setSelectedLetterFilter(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
