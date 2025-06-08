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
import { VirtualizedTable, DebouncedSearchInput } from "./VirtualizedTable";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { Employee } from "@/types";
import { Users, Plus, Pencil, Trash2, DollarSign, Search } from "lucide-react";

export function OptimizedEmployeeManagement() {
  const {
    employees,
    isLoadingEmployees,
    employeePagination,
    searchFilters,
    handleEmployeePageChange,
    handleEmployeeSearch,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useOptimizedTimeTracking();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    email: "",
    hourlyWage: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      title: "",
      email: "",
      hourlyWage: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employeeData = {
      name: formData.name,
      title: formData.title,
      email: formData.email || undefined,
      hourlyWage: parseFloat(formData.hourlyWage) || 0,
    };

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeData);
        setEditingEmployee(null);
      } else {
        await addEmployee(employeeData);
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error("Failed to save employee:", error);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      title: employee.title,
      email: employee.email || "",
      hourlyWage: employee.hourlyWage?.toString() || "",
    });
  };

  const handleDelete = async (employee: Employee) => {
    try {
      await deleteEmployee(employee.id);
    } catch (error) {
      console.error("Failed to delete employee:", error);
    }
  };

  const columns = [
    {
      key: "name" as keyof Employee,
      header: "Name",
      width: 200,
      minWidth: 150,
      sortable: true,
    },
    {
      key: "title" as keyof Employee,
      header: "Title",
      width: 180,
      minWidth: 120,
      sortable: true,
    },
    {
      key: "email" as keyof Employee,
      header: "Email",
      width: 220,
      minWidth: 150,
      render: (value: string) => value || "N/A",
    },
    {
      key: "hourlyWage" as keyof Employee,
      header: "Hourly Wage",
      width: 140,
      minWidth: 120,
      render: (value: number) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-green-600" />
          <span className="font-medium">
            {typeof value === "number" ? value.toFixed(2) : "0.00"}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt" as keyof Employee,
      header: "Created",
      width: 120,
      minWidth: 100,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      width: 120,
      minWidth: 100,
      render: (_: any, employee: Employee) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(employee);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {employee.name}? This will
                  also delete all their time entries. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(employee)}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Management
            <Badge variant="secondary" className="ml-2">
              {employeePagination.total} total
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your employees with support for large teams (500+ employees)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-gray-400" />
              <DebouncedSearchInput
                value={searchFilters.employeeSearch}
                onChange={handleEmployeeSearch}
                placeholder="Search employees by name..."
                debounceMs={300}
              />
            </div>

            {/* Add Employee Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Create a new employee profile with their basic information.
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
                      <Label htmlFor="hourlyWage" className="text-right">
                        Hourly Wage *
                      </Label>
                      <div className="col-span-3 relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          id="hourlyWage"
                          type="number"
                          step="0.01"
                          value={formData.hourlyWage}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              hourlyWage: e.target.value,
                            })
                          }
                          className="pl-10"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddDialogOpen(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">Add Employee</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <VirtualizedTable
        data={employees}
        columns={columns}
        height={500}
        itemHeight={56}
        isLoading={isLoadingEmployees}
        emptyMessage="No employees found. Add your first employee to get started."
        pagination={{
          page: employeePagination.page,
          pageSize: employeePagination.pageSize,
          total: employeePagination.total,
          onPageChange: handleEmployeePageChange,
        }}
        onRowClick={(employee) => handleEdit(employee)}
      />

      {/* Edit Employee Dialog */}
      <Dialog
        open={editingEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingEmployee(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update the employee's information.
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
                <Label htmlFor="edit-title" className="text-right">
                  Title *
                </Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-hourlyWage" className="text-right">
                  Hourly Wage *
                </Label>
                <div className="col-span-3 relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="edit-hourlyWage"
                    type="number"
                    step="0.01"
                    value={formData.hourlyWage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        hourlyWage: e.target.value,
                      })
                    }
                    className="pl-10"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingEmployee(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
