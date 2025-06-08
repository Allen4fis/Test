import { useMemo } from "react";
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
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import {
  shouldUseOptimizedComponents,
  DataMetrics,
  PerformanceMonitor,
} from "@/utils/performanceConfig";

const Index = () => {
  const regularTimeTracking = useTimeTracking();
  const optimizedTimeTracking = useOptimizedTimeTracking();

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
          <OptimizedEmployeeManagement />
        ) : (
          <EmployeeManagement />
        );
        break;
      case "jobs":
        component = useOptimized ? (
          <OptimizedJobManagement />
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
      {useOptimized && (
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
