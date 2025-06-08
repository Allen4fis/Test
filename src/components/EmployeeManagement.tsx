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
import { Plus, Edit, Trash2, DollarSign, Banknote } from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { Employee } from "@/types";

export function EmployeeManagement() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } =
    useTimeTracking();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    billableWage: "",
    costWage: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      billableWage: "",
      costWage: "",
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
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (employee: Employee) => {
    deleteEmployee(employee.id);
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
            <DialogContent className="max-w-md">
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
                    <Label htmlFor="title" className="text-right">
                      Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="billableWage" className="text-right">
                      Billable Rate *
                    </Label>
                    <div className="col-span-3 relative">
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
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="costWage" className="text-right">
                      Cost Rate *
                    </Label>
                    <div className="col-span-3 relative">
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
                  <div className="col-span-4 text-xs text-gray-500 px-4">
                    <p>
                      <strong>Billable Rate:</strong> What you charge clients
                      for this employee's time
                    </p>
                    <p>
                      <strong>Cost Rate:</strong> Internal cost/what you pay
                      this employee
                    </p>
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
      </CardHeader>
      <CardContent>
        {employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees found. Add your first employee to get started.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Billable Rate</TableHead>
                <TableHead>Cost Rate</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.title}</TableCell>
                  <TableCell>{employee.email || "—"}</TableCell>
                  <TableCell className="font-medium text-green-600">
                    ${employee.billableWage?.toFixed(2) || "0.00"}/hr
                  </TableCell>
                  <TableCell className="font-medium text-red-600">
                    ${employee.costWage?.toFixed(2) || "0.00"}/hr
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete {employee.name} and
                              all their time entries. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(employee)}
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
        )}
      </CardContent>
    </Card>
  );
}
