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
  Users,
  UserCheck,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Employee } from "@/types";
import { DeleteConfirmationDialog } from "@/components/DeleteConfirmationDialog";

export function EnhancedEmployeeManagement() {
  const {
    employees,
    timeEntries,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useTimeTracking();

  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    billableWage: "",
    costWage: "",
    managerId: "", // New field for manager selection
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      billableWage: "",
      costWage: "",
      managerId: "",
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
      managerId: formData.managerId || undefined, // Only include if selected
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
      managerId: employee.managerId || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (employeeId: string) => {
    deleteEmployee(employeeId);
  };

  // Get available managers (exclude the employee being edited to prevent circular relationships)
  const getAvailableManagers = () => {
    return employees.filter((emp) =>
      editingEmployee ? emp.id !== editingEmployee.id : true,
    );
  };

  // Get employee's manager name
  const getManagerName = (managerId?: string) => {
    if (!managerId) return null;
    const manager = employees.find((emp) => emp.id === managerId);
    return manager ? manager.name : "Unknown Manager";
  };

  // Get direct reports for an employee
  const getDirectReports = (employeeId: string) => {
    return employees.filter((emp) => emp.managerId === employeeId);
  };

  // Build hierarchy structure
  const buildHierarchy = () => {
    const hierarchy = new Map();
    const topLevel: Employee[] = [];

    // First, categorize employees
    employees.forEach((employee) => {
      if (!employee.managerId) {
        topLevel.push(employee);
      } else {
        if (!hierarchy.has(employee.managerId)) {
          hierarchy.set(employee.managerId, []);
        }
        hierarchy.get(employee.managerId).push(employee);
      }
    });

    return { topLevel, hierarchy };
  };

  const renderHierarchy = () => {
    const { topLevel, hierarchy } = buildHierarchy();

    const renderEmployee = (employee: Employee, level: number = 0) => (
      <div key={employee.id} className={`ml-${level * 4}`}>
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded mb-2">
          <UserCheck className="h-4 w-4 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium">{employee.name}</div>
            <div className="text-sm text-gray-500">{employee.title}</div>
          </div>
          <Badge variant={level === 0 ? "default" : "secondary"}>
            {level === 0 ? "Manager" : `Level ${level + 1}`}
          </Badge>
          {getDirectReports(employee.id).length > 0 && (
            <Badge variant="outline">
              {getDirectReports(employee.id).length} reports
            </Badge>
          )}
        </div>
        {hierarchy.has(employee.id) && (
          <div className="ml-4 border-l-2 border-gray-200 pl-4">
            {hierarchy
              .get(employee.id)
              .map((subordinate: Employee) =>
                renderEmployee(subordinate, level + 1),
              )}
          </div>
        )}
      </div>
    );

    return (
      <div className="space-y-4">
        {topLevel.map((employee) => renderEmployee(employee))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Employee Management
              </CardTitle>
              <CardDescription>
                Manage your employees, job titles, wage rates, and
                organizational hierarchy
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowHierarchy(!showHierarchy)}
              >
                {showHierarchy ? "Show List" : "Show Hierarchy"}
              </Button>
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
                        : "Enter the details for the new employee including their reporting structure and wage rates."}
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
                            <Label
                              htmlFor="name"
                              className="text-sm font-medium"
                            >
                              Name *
                            </Label>
                            <Input
                              id="name"
                              value={formData.name}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter full name"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="title"
                              className="text-sm font-medium"
                            >
                              Job Title *
                            </Label>
                            <Input
                              id="title"
                              value={formData.title}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  title: e.target.value,
                                })
                              }
                              placeholder="e.g., Project Manager, Electrician"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              htmlFor="email"
                              className="text-sm font-medium"
                            >
                              Email Address
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              value={formData.email}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  email: e.target.value,
                                })
                              }
                              placeholder="employee@company.com"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Organizational Structure */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-900">
                          Organizational Structure
                        </h4>
                        <div className="space-y-2">
                          <Label
                            htmlFor="manager"
                            className="text-sm font-medium"
                          >
                            Reports To (Manager)
                          </Label>
                          <Select
                            value={formData.managerId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, managerId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">
                                No Manager (Top Level)
                              </SelectItem>
                              {getAvailableManagers().map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.name} - {manager.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Select who this employee reports to in the
                            organizational hierarchy
                          </p>
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
                      </div>
                    </div>

                    <DialogFooter>
                      <Button type="submit">
                        {editingEmployee ? "Update Employee" : "Add Employee"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {showHierarchy ? (
            <div>
              <h3 className="text-lg font-medium mb-4">
                Organizational Hierarchy
              </h3>
              {employees.length > 0 ? (
                renderHierarchy()
              ) : (
                <p className="text-gray-500">No employees to display.</p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Direct Reports</TableHead>
                  <TableHead>Billable Rate</TableHead>
                  <TableHead>Cost Rate</TableHead>
                  <TableHead>Time Entries</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const employeeTimeEntries = timeEntries.filter(
                    (entry) => entry.employeeId === employee.id,
                  );
                  const directReports = getDirectReports(employee.id);
                  const managerName = getManagerName(employee.managerId);

                  return (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          {employee.email && (
                            <div className="text-sm text-gray-500">
                              {employee.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.title}</Badge>
                      </TableCell>
                      <TableCell>
                        {managerName ? (
                          <div className="flex items-center gap-1">
                            <UserCheck className="h-3 w-3 text-blue-500" />
                            <span className="text-sm">{managerName}</span>
                          </div>
                        ) : (
                          <Badge variant="secondary">Top Level</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {directReports.length > 0 ? (
                          <Badge variant="outline">
                            {directReports.length} report
                            {directReports.length !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-500">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Banknote className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-green-600">
                            ${employee.billableWage?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-red-600" />
                          <span className="font-medium text-red-600">
                            ${employee.costWage?.toFixed(2) || "0.00"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {employeeTimeEntries.length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <DeleteConfirmationDialog
                            type="employee"
                            item={employee}
                            onConfirm={() => handleDelete(employee.id)}
                            trigger={
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
