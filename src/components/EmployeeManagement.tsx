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
  UserCheck,
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
        formData.managerId === "no-manager" ? undefined : formData.managerId, // Only include if not "no-manager"
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
      managerId: employee.managerId || "no-manager",
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

  // Get employee's manager name
  const getManagerName = (managerId?: string) => {
    if (!managerId) return null;
    const manager = employees.find((emp) => emp.id === managerId);
    return manager ? manager.name : "Unknown Manager";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Employee Management</CardTitle>
            <CardDescription>
              Manage your employees, job titles, and wage rates
            </CardDescription>
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
                            <SelectItem value="no-manager">
                              Independent Employee
                            </SelectItem>
                            {getAvailableEmployees().map((employee) => (
                              <SelectItem key={employee.id} value={employee.id}>
                                {employee.name} - {employee.title}
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
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees found. Add your first employee to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Billable Rate</TableHead>
                  <TableHead>Cost Rate</TableHead>
                  <TableHead>Profit Margin</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => {
                  const profitMargin =
                    employee.billableWage > 0
                      ? ((employee.billableWage - employee.costWage) /
                          employee.billableWage) *
                        100
                      : 0;
                  const managerName = getManagerName(employee.managerId);
                  return (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        {employee.name}
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
