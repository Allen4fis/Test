import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { TimeEntryViewer } from "@/components/TimeEntryViewer";
import { SummaryReports } from "@/components/SummaryReports";

import { InvoiceManagement } from "@/components/InvoiceManagement";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { JobManagement } from "@/components/JobManagement";
import { OptimizedEmployeeManagement } from "@/components/OptimizedEmployeeManagement";
import { OptimizedJobManagement } from "@/components/OptimizedJobManagement";
import { RentalManagement } from "@/components/RentalManagement";
import { DatabaseErrorHandler } from "@/components/DatabaseErrorHandler";
import { DataExport } from "@/components/DataExport";
import { BackupManagement } from "@/components/BackupManagement";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { useGlobalAutosave } from "@/hooks/useGlobalAutosave";
import {
  shouldUseOptimizedComponents,
  DataMetrics,
  PerformanceMonitor,
} from "@/utils/performanceConfig";

// Import database cleanup utilities for development
if (process.env.NODE_ENV === "development") {
  import("@/utils/databaseCleanup");

  // One-time clear of existing data to show clean state (preserve backups)
  if (!localStorage.getItem("app_cleared")) {
    localStorage.removeItem("timeTrackingApp");
    localStorage.removeItem("timeTrackingApp_fallback");
    localStorage.setItem("app_cleared", "true");
    window.location.reload();
  }
}

const Index = () => {
  const regularTimeTracking = useTimeTracking();
  const optimizedTimeTracking = useOptimizedTimeTracking();
  const [retryKey, setRetryKey] = useState(0);

  // Determine which components to use based on data size - use whichever has more data
  const regularMetrics: DataMetrics = useMemo(
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

  const optimizedMetrics: DataMetrics = useMemo(
    () => ({
      employeeCount: optimizedTimeTracking.employees.length,
      jobCount: optimizedTimeTracking.jobs.length,
      timeEntryCount: optimizedTimeTracking.timeEntries.length,
    }),
    [
      optimizedTimeTracking.employees.length,
      optimizedTimeTracking.jobs.length,
      optimizedTimeTracking.timeEntries.length,
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
  const timeTracking = useOptimized
    ? optimizedTimeTracking
    : regularTimeTracking;

  // Initialize global autosave with the current app data
  const globalAutosave = useGlobalAutosave({
    employees: timeTracking.employees,
    jobs: timeTracking.jobs,
    hourTypes: timeTracking.hourTypes,
    provinces: timeTracking.provinces,
    timeEntries: timeTracking.timeEntries,
    rentalItems: timeTracking.rentalItems,
    rentalEntries: timeTracking.rentalEntries,
  });

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
            autosaveInfo={globalAutosave.getAutosaveInfo()}
            triggerManualSave={globalAutosave.triggerManualSave}
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
      case "rentals":
        component = <RentalManagement />;
        break;
      case "export":
        component = <DataExport />;
        break;
      case "backup":
        component = <BackupManagement />;
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
