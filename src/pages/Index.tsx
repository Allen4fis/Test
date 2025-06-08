import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { SummaryReports } from "@/components/SummaryReports";
import { CostReports } from "@/components/CostReports";
import { InvoiceManagement } from "@/components/InvoiceManagement";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { JobManagement } from "@/components/JobManagement";
import { OptimizedEmployeeManagement } from "@/components/OptimizedEmployeeManagement";
import { OptimizedJobManagement } from "@/components/OptimizedJobManagement";
import { DatabaseErrorHandler } from "@/components/DatabaseErrorHandler";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import {
  shouldUseOptimizedComponents,
  DataMetrics,
  PerformanceMonitor,
} from "@/utils/performanceConfig";

// Import database cleanup utilities for development
if (process.env.NODE_ENV === "development") {
  import("@/utils/databaseCleanup");
}

const Index = () => {
  const regularTimeTracking = useTimeTracking();
  const optimizedTimeTracking = useOptimizedTimeTracking();
  const [retryKey, setRetryKey] = useState(0);

  // Determine which components to use based on data size
  const dataMetrics: DataMetrics = useMemo(
    () => ({
      employeeCount: regularTimeTracking.employees.length,
      jobCount: regularTimeTracking.jobs.length,
      timeEntryCount: regularTimeTracking.timeEntries.length,
    }),
    [
      regularTimeTracking.employees.length,
      regularTimeTracking.jobs.length,
      regularTimeTracking.timeEntries.length,
    ],
  );

  const useOptimized = shouldUseOptimizedComponents(dataMetrics);
  const timeTracking = useOptimized
    ? optimizedTimeTracking
    : regularTimeTracking;
  const { selectedView } = timeTracking;

  // Performance monitoring
  const performanceMonitor = PerformanceMonitor.getInstance();

  // Check for database errors
  const hasError =
    timeTracking.error &&
    (timeTracking.error.includes("ConstraintError") ||
      timeTracking.error.includes("subscribe") ||
      timeTracking.error.includes("blocked") ||
      timeTracking.error.includes("Database"));

  const handleRetry = () => {
    setRetryKey((prev) => prev + 1);
  };

  // If there's a database error, show the error handler
  if (hasError) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <DatabaseErrorHandler
            error={timeTracking.error || ""}
            onRetry={handleRetry}
          />
        </div>
      </div>
    );
  }

  const renderView = () => {
    const timingId = performanceMonitor.startTiming("render-view");

    let component;
    switch (selectedView) {
      case "dashboard":
        component = <Dashboard />;
        break;
      case "timeEntry":
        component = <TimeEntryForm />;
        break;
      case "reports":
        component = <SummaryReports />;
        break;
      case "costs":
        component = <CostReports />;
        break;
      case "invoices":
        component = <InvoiceManagement />;
        break;
      case "employees":
        component = useOptimized ? (
          <OptimizedEmployeeManagement key={retryKey} />
        ) : (
          <EmployeeManagement />
        );
        break;
      case "jobs":
        component = useOptimized ? (
          <OptimizedJobManagement key={retryKey} />
        ) : (
          <JobManagement />
        );
        break;
      default:
        component = <Dashboard />;
    }

    performanceMonitor.endTiming(timingId);
    return component;
  };

  // Log performance metrics in development
  if (process.env.NODE_ENV === "development") {
    setTimeout(() => {
      performanceMonitor.logPerformanceReport();
    }, 5000);
  }

  return (
    <Layout timeTracking={timeTracking}>
      {/* Performance indicator for large datasets */}
      {useOptimized && !hasError && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                🚀 <strong>Optimized Mode:</strong> Enhanced performance for
                large dataset detected ({dataMetrics.employeeCount} employees,{" "}
                {dataMetrics.jobCount} jobs, {dataMetrics.timeEntryCount} time
                entries)
              </p>
            </div>
          </div>
        </div>
      )}
      {renderView()}
    </Layout>
  );
};

export default Index;
