import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { TimeEntryViewer } from "@/components/TimeEntryViewer";
import { SummaryReports } from "@/components/SummaryReports";
import { Paystubs } from "@/components/Paystubs";

import { InvoiceManagement } from "@/components/InvoiceManagement";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { JobManagement } from "@/components/JobManagement";
import { OptimizedEmployeeManagement } from "@/components/OptimizedEmployeeManagement";
import { OptimizedJobManagement } from "@/components/OptimizedJobManagement";
import { RentalManagement } from "@/components/RentalManagement";
import { TicketsAndInsurances } from "@/components/TicketsAndInsurances";
import { DatabaseErrorHandler } from "@/components/DatabaseErrorHandler";
import { DataExport } from "@/components/DataExport";
import { BackupManagement } from "@/components/BackupManagement";
import { SystemHealthCheck } from "@/components/SystemHealthCheck";
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

  // One-time clear of existing data to show clean state (preserve backups)
  // Only clear if we haven't already cleared and if localStorage is available
  try {
    if (
      typeof window !== "undefined" &&
      window.localStorage &&
      !localStorage.getItem("app_cleared")
    ) {
      localStorage.removeItem("timeTrackingApp");
      localStorage.removeItem("timeTrackingApp_fallback");
      localStorage.setItem("app_cleared", "true");
      window.location.reload();
    }
  } catch (error) {
    // Ignore localStorage errors during development
  }
}

const Index = () => {
  const regularTimeTracking = useTimeTracking();
  const optimizedTimeTracking = useOptimizedTimeTracking();
  const [retryKey, setRetryKey] = useState(0);

  // Determine which components to use based on data size - use whichever has more data
  const regularMetrics: DataMetrics = useMemo(
    () => ({
      employeeCount: regularTimeTracking.employees?.length || 0,
      jobCount: regularTimeTracking.jobs?.length || 0,
      timeEntryCount: regularTimeTracking.timeEntries?.length || 0,
    }),
    [
      regularTimeTracking.employees?.length,
      regularTimeTracking.jobs?.length,
      regularTimeTracking.timeEntries?.length,
    ],
  );

  const optimizedMetrics: DataMetrics = useMemo(
    () => ({
      employeeCount: optimizedTimeTracking.employees?.length || 0,
      jobCount: optimizedTimeTracking.jobs?.length || 0,
      timeEntryCount: optimizedTimeTracking.timeEntries?.length || 0,
    }),
    [
      optimizedTimeTracking.employees?.length,
      optimizedTimeTracking.jobs?.length,
      optimizedTimeTracking.timeEntries?.length,
    ],
  );

  // Use the data source with higher counts, or regular if they're equal
  const dataMetrics = useMemo(() => {
    const regularTotal =
      regularMetrics.employeeCount +
      regularMetrics.jobCount +
      regularMetrics.timeEntryCount;
    const optimizedTotal =
      optimizedMetrics.employeeCount +
      optimizedMetrics.jobCount +
      optimizedMetrics.timeEntryCount;
    return optimizedTotal > regularTotal ? optimizedMetrics : regularMetrics;
  }, [regularMetrics, optimizedMetrics]);

  const useOptimized = shouldUseOptimizedComponents(dataMetrics);
  const timeTracking = regularTimeTracking; // Always use regular timeTracking to ensure all functions are available

  // Early return if timeTracking is not ready
  if (
    !timeTracking ||
    !timeTracking.employees ||
    !timeTracking.jobs ||
    !timeTracking.timeEntries
  ) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-600 mb-2">
            Loading...
          </div>
          <div className="text-sm text-gray-500">
            Initializing time tracking system
          </div>
        </div>
      </div>
    );
  }
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
        component = (
          <Dashboard
            autosaveInfo={timeTracking.getAutosaveInfo()}
            triggerManualSave={timeTracking.manualSave}
          />
        );
        break;
      case "timeEntry":
        component = <TimeEntryForm />;
        break;
      case "viewer":
        component = <TimeEntryViewer />;
        break;
      case "reports":
        component = <SummaryReports />;
        break;
      case "paystubs":
        component = <Paystubs />;
        break;

      case "invoices":
        component = <InvoiceManagement />;
        break;
      case "employees":
        component = <EmployeeManagement />;
        break;
      case "jobs":
        component = <JobManagement />;
        break;
      case "rentals":
        component = <RentalManagement />;
        break;
      case "tickets":
        component = <TicketsAndInsurances />;
        break;
      case "export":
        component = <DataExport />;
        break;
      case "backup":
        component = <BackupManagement />;
        break;
      case "health-check":
        component = <SystemHealthCheck />;
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
      {renderView()}
    </Layout>
  );
};

export default Index;
