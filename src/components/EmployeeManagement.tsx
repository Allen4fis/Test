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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Banknote,
  UserCheck,
  ArrowUpDown,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Employee } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";
export function EmployeeManagement() {
  const {
    employees,
    timeEntries,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useTimeTracking();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    billableWage: "",
    costWage: "",
    managerId: "no-manager", // New field for manager selection
  });

  // Concise sorting state
  const [sortBy, setSortBy] = useState<
    "name" | "title" | "billableWage" | "costWage" | "createdAt"
  >("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      billableWage: "",
      costWage: "",
      managerId: "no-manager",
    });
    setEditingEmployee(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.title.trim() ||
      !formData.billableWage.trim() ||
      !formData.costWage.trim()
    )
      return;

    const billableWage = parseFloat(formData.billableWage);
    const costWage = parseFloat(formData.costWage);

    if (
      isNaN(billableWage) ||
      billableWage < 0 ||
      isNaN(costWage) ||
      costWage < 0
    )
      return;

    const employeeData = {
      name: formData.name,
      title: formData.title,
      email: formData.email,
      billableWage: billableWage,
      costWage: costWage,
      managerId:
        formData.managerId === "no-manager" || formData.managerId === "dsp"
          ? undefined
          : formData.managerId,
      category:
        formData.managerId === "no-manager"
          ? "employee"
          : formData.managerId === "dsp"
            ? "dsp"
            : undefined,
    };
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, employeeData);
    } else {
      addEmployee(employeeData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      title: employee.title,
      email: employee.email || "",
      billableWage: employee.billableWage?.toString() || "0",
      costWage: employee.costWage?.toString() || "0",
      managerId:
        employee.category === "employee"
          ? "no-manager"
          : employee.category === "dsp"
            ? "dsp"
            : employee.managerId || "no-manager",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    deleteEmployee(employeeId);
  };

  // Get all employees for "Employee Of" selection (allow anyone to be selected)
  const getAvailableEmployees = () => {
    return employees; // Allow selection of any employee
  };

  // Get employee's category or manager name
  const getEmployeeCategory = (employee: Employee) => {
    if (employee.category === "dsp") return "DSP";
    if (employee.category === "employee") return "Employee";
    if (!employee.managerId) return "Employee";

    const manager = employees.find((emp) => emp.id === employee.managerId);
    return manager ? manager.name : "Unknown Manager";
  };

  // Sorted employees with efficient sorting
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "billableWage":
          aValue = a.billableWage || 0;
          bValue = b.billableWage || 0;
          break;
        case "costWage":
          aValue = a.costWage || 0;
          bValue = b.costWage || 0;
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
  }, [employees, sortBy, sortDirection]);

  // Get direct reports for an employee (who works under them)
  const getDirectReports = (employeeId: string) => {
    return employees.filter((emp) => emp.managerId === employeeId);
  };

  // Calculate average rates and profit margin
  const averageRates = useMemo(() => {
    if (employees.length === 0) {
      return {
        avgBillableRate: 0,
        avgCostRate: 0,
        avgProfitMargin: 0,
      };
    }

    const totalBillableRate = employees.reduce(
      (sum, emp) => sum + (emp.billableWage || 0),
      0,
    );
    const totalCostRate = employees.reduce(
      (sum, emp) => sum + (emp.costWage || 0),
      0,
    );
    const avgBillableRate = totalBillableRate / employees.length;
    const avgCostRate = totalCostRate / employees.length;
    const avgProfitMargin =
      avgBillableRate > 0
        ? ((avgBillableRate - avgCostRate) / avgBillableRate) * 100
        : 0;

    return {
      avgBillableRate,
      avgCostRate,
      avgProfitMargin,
    };
  }, [employees]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Employee Management</CardTitle>
            <CardDescription>
              Manage your employees, job titles, and wage rates
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
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="billableWage">Billable Rate</SelectItem>
                  <SelectItem value="costWage">Cost Rate</SelectItem>
                  <SelectItem value="createdAt">Date Added</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
                className="px-2 h-8"
              >
                {sortDirection === "asc" ? "↑" : "↓"}
              </Button>
              <span className="text-xs text-gray-500 ml-2">
                {sortedEmployees.length} employee
                {sortedEmployees.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? "Edit Employee" : "Add New Employee"}
                </DialogTitle>
                <DialogDescription>
                  {editingEmployee
                    ? "Update the employee information below."
                    : "Enter the details for the new employee including their billable and cost wage rates."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Basic Information
                    </h4>
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">
                          Name *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Enter full name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">
                          Job Title *
                        </Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          placeholder="e.g., Project Manager, Electrician"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="employee@company.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="manager"
                          className="text-sm font-medium"
                        >
                          Employee Of
                        </Label>
                        <Select
                          value={formData.managerId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, managerId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select employee (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no-manager">Employee</SelectItem>
                            <SelectItem value="dsp">DSP</SelectItem>
                            {getAvailableEmployees().map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500">
                          Select which employee this person works under or is
                          employed by
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Wage Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Wage Information
                    </h4>
                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label
                          htmlFor="billableWage"
                          className="text-sm font-medium text-green-700"
                        >
                          Billable Rate * (What you charge clients)
                        </Label>
                        <div className="relative">
                          <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-green-600" />
                          <Input
                            id="billableWage"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.billableWage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                billableWage: e.target.value,
                              })
                            }
                            className="pl-10"
                            placeholder="45.00"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="costWage"
                          className="text-sm font-medium text-red-700"
                        >
                          Cost Rate * (What you pay employee)
                        </Label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
                          <Input
                            id="costWage"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.costWage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                costWage: e.target.value,
                              })
                            }
                            className="pl-10"
                            placeholder="25.00"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-md">
                      <p className="text-xs text-blue-800">
                        <strong>Billable Rate:</strong> The hourly rate you
                        charge clients for this employee's work.
                        <br />
                        <strong>Cost Rate:</strong> Your internal cost - what
                        you actually pay this employee per hour.
                      </p>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? "Update Employee" : "Add Employee"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Average Rates Summary */}
        {employees.length > 0 && (
          <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-400" />
              Average Rates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  ${averageRates.avgBillableRate.toFixed(2)}
                </div>
                <div className="text-sm text-gray-300">
                  Average Billable Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  ${averageRates.avgCostRate.toFixed(2)}
                </div>
                <div className="text-sm text-gray-300">Average Cost Rate</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${averageRates.avgProfitMargin >= 0 ? "text-blue-400" : "text-red-400"}`}
                >
                  {averageRates.avgProfitMargin >= 0 ? "+" : ""}
                  {averageRates.avgProfitMargin.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-300">
                  Average Profit Margin
                </div>
              </div>
            </div>
          </div>
        )}

        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees found. Add your first employee to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("name");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortBy === "name" && (
                        <span className="text-blue-500 text-xs">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "title") {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("title");
                        setSortDirection("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Title
                      {sortBy === "title" && (
                        <span className="text-blue-500 text-xs">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Employee Of</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "billableWage") {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("billableWage");
                        setSortDirection("desc"); // Default to highest first for wages
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Billable Rate
                      {sortBy === "billableWage" && (
                        <span className="text-blue-500 text-xs">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "costWage") {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("costWage");
                        setSortDirection("desc"); // Default to highest first for wages
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Cost Rate
                      {sortBy === "costWage" && (
                        <span className="text-blue-500 text-xs">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-50 select-none"
                    onClick={() => {
                      if (sortBy === "createdAt") {
                        setSortDirection(
                          sortDirection === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("createdAt");
                        setSortDirection("desc"); // Default to newest first for dates
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {sortBy === "createdAt" && (
                        <span className="text-blue-500 text-xs">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEmployees.map((employee) => {
                  const profitMargin =
                    employee.billableWage > 0
                      ? ((employee.billableWage - employee.costWage) /
                          employee.billableWage) *
                        100
                      : 0;
                  const employeeTimeEntries = timeEntries.filter(
                    (entry) => entry.employeeId === employee.id,
                  );
                  const directReports = getDirectReports(employee.id);
                  const categoryOrManager = getEmployeeCategory(employee);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.title}</Badge>
                      </TableCell>
                      <TableCell>
                        {employee.category === "dsp" ? (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 border-purple-200"
                          >
                            DSP
                          </Badge>
                        ) : employee.category === "employee" ? (
                          <Badge variant="secondary">Employee</Badge>
                        ) : employee.managerId ? (
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-blue-500" />
                            <span className="text-sm">{categoryOrManager}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">Employee</Badge>
                        )}
                      </TableCell>
                      <TableCell>{employee.email || "—"}</TableCell>
                      <TableCell className="font-medium text-green-600">
                        ${employee.billableWage?.toFixed(2) || "0.00"}/hr
                      </TableCell>
                      <TableCell className="font-medium text-red-600">
                        ${employee.costWage?.toFixed(2) || "0.00"}/hr
                      </TableCell>
                      <TableCell
                        className={`font-medium ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {profitMargin.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {new Date(employee.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DeleteConfirmationDialog
                            item={{
                              id: employee.id,
                              name: employee.name,
                              type: "employee",
                              associatedData: {
                                timeEntries: timeEntries.filter(
                                  (entry) => entry.employeeId === employee.id,
                                ).length,
                                additionalInfo: [
                                  `Billable wage: $${employee.billableWage?.toFixed(2) || "0.00"}/hr`,
                                  `Cost wage: $${employee.costWage?.toFixed(2) || "0.00"}/hr`,
                                  `Created: ${new Date(employee.createdAt).toLocaleDateString()}`,
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
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
