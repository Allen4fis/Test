/**
 * Count Update Test Component
 *
 * This component can be used to verify that count badges update properly
 * when items are added or removed from the system.
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  XCircle,
  RefreshCw,
  Users,
  Briefcase,
  Clock,
  Truck,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

export function CountUpdateTest() {
  const {
    employees,
    jobs,
    timeEntries,
    rentalItems,
    addEmployee,
    deleteEmployee,
    addJob,
    deleteJob,
  } = useTimeTracking();

  const [testResults, setTestResults] = useState<{
    employees: "pending" | "pass" | "fail";
    jobs: "pending" | "pass" | "fail";
  }>({
    employees: "pending",
    jobs: "pending",
  });

  const runEmployeeTest = async () => {
    const initialCount = employees.length;
    console.log(
      "🧪 Starting employee count test, initial count:",
      initialCount,
    );

    try {
      // Add a test employee
      await addEmployee({
        name: "Test Employee",
        title: "Test Title",
        costWage: 25,
        billableWage: 40,
        isActive: true,
        category: "employee",
      });

      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterAddCount = employees.length;
      console.log("📈 After add count:", afterAddCount);

      if (afterAddCount !== initialCount + 1) {
        console.error("❌ Add employee test failed");
        setTestResults((prev) => ({ ...prev, employees: "fail" }));
        return;
      }

      // Find and delete the test employee
      const testEmployee = employees.find(
        (emp) => emp.name === "Test Employee",
      );
      if (!testEmployee) {
        console.error("❌ Could not find test employee");
        setTestResults((prev) => ({ ...prev, employees: "fail" }));
        return;
      }

      await deleteEmployee(testEmployee.id);

      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterDeleteCount = employees.length;
      console.log("📉 After delete count:", afterDeleteCount);

      if (afterDeleteCount === initialCount) {
        console.log("✅ Employee count test passed");
        setTestResults((prev) => ({ ...prev, employees: "pass" }));
      } else {
        console.error("❌ Delete employee test failed");
        setTestResults((prev) => ({ ...prev, employees: "fail" }));
      }
    } catch (error) {
      console.error("❌ Employee test error:", error);
      setTestResults((prev) => ({ ...prev, employees: "fail" }));
    }
  };

  const runJobTest = async () => {
    const initialCount = jobs.length;
    console.log("🧪 Starting job count test, initial count:", initialCount);

    try {
      // Add a test job
      await addJob({
        jobNumber: "TEST-001",
        name: "Test Job",
        description: "Test job for count verification",
        isActive: true,
        isBillable: true,
      });

      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterAddCount = jobs.length;
      console.log("📈 After add count:", afterAddCount);

      if (afterAddCount !== initialCount + 1) {
        console.error("❌ Add job test failed");
        setTestResults((prev) => ({ ...prev, jobs: "fail" }));
        return;
      }

      // Find and delete the test job
      const testJob = jobs.find((job) => job.jobNumber === "TEST-001");
      if (!testJob) {
        console.error("❌ Could not find test job");
        setTestResults((prev) => ({ ...prev, jobs: "fail" }));
        return;
      }

      await deleteJob(testJob.id);

      // Wait for React to re-render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const afterDeleteCount = jobs.length;
      console.log("📉 After delete count:", afterDeleteCount);

      if (afterDeleteCount === initialCount) {
        console.log("✅ Job count test passed");
        setTestResults((prev) => ({ ...prev, jobs: "pass" }));
      } else {
        console.error("❌ Delete job test failed");
        setTestResults((prev) => ({ ...prev, jobs: "fail" }));
      }
    } catch (error) {
      console.error("❌ Job test error:", error);
      setTestResults((prev) => ({ ...prev, jobs: "fail" }));
    }
  };

  const runAllTests = async () => {
    setTestResults({ employees: "pending", jobs: "pending" });
    await runEmployeeTest();
    await runJobTest();
  };

  const getStatusIcon = (status: "pending" | "pass" | "fail") => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: "pending" | "pass" | "fail") => {
    switch (status) {
      case "pass":
        return "text-green-600";
      case "fail":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Count Update Verification Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                This test verifies that count badges in the navigation update
                properly when items are added or removed. Open your browser's
                console to see detailed logs.
              </AlertDescription>
            </Alert>

            {/* Current Counts Display */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-pink-600" />
                <span className="text-sm">Employees:</span>
                <Badge variant="secondary">{employees.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                <span className="text-sm">Jobs:</span>
                <Badge variant="secondary">
                  {jobs.filter((job) => job.isActive).length}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm">Time Entries:</span>
                <Badge variant="secondary">{timeEntries.length}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-600" />
                <span className="text-sm">Rental Items:</span>
                <Badge variant="secondary">
                  {rentalItems.filter((item) => item.isActive).length}
                </Badge>
              </div>
            </div>

            {/* Test Controls */}
            <div className="flex gap-4">
              <Button onClick={runAllTests} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Run All Tests
              </Button>
              <Button
                onClick={runEmployeeTest}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Test Employee Count
              </Button>
              <Button
                onClick={runJobTest}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Briefcase className="h-4 w-4" />
                Test Job Count
              </Button>
            </div>

            {/* Test Results */}
            <div className="space-y-2">
              <h4 className="font-medium">Test Results:</h4>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  {getStatusIcon(testResults.employees)}
                  <span className={getStatusColor(testResults.employees)}>
                    Employee Count Update: {testResults.employees.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  {getStatusIcon(testResults.jobs)}
                  <span className={getStatusColor(testResults.jobs)}>
                    Job Count Update: {testResults.jobs.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-sm text-gray-600 space-y-2">
              <h5 className="font-medium">How the test works:</h5>
              <ol className="list-decimal list-inside space-y-1">
                <li>Records the current count of items</li>
                <li>Adds a test item and verifies the count increased</li>
                <li>
                  Removes the test item and verifies the count returned to
                  original
                </li>
                <li>
                  Watch the navigation sidebar badges - they should update in
                  real-time
                </li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
