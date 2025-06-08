import { Layout } from "@/components/Layout";
import { Dashboard } from "@/components/Dashboard";
import { TimeEntryForm } from "@/components/TimeEntryForm";
import { SummaryReports } from "@/components/SummaryReports";
import { CostReports } from "@/components/CostReports";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { JobManagement } from "@/components/JobManagement";
import { useTimeTracking } from "@/hooks/useTimeTracking";

const Index = () => {
  const timeTracking = useTimeTracking();
  const { selectedView } = timeTracking;

  const renderView = () => {
    switch (selectedView) {
      case "dashboard":
        return <Dashboard />;
      case "timeEntry":
        return <TimeEntryForm />;
      case "reports":
        return <SummaryReports />;
      case "costs":
        return <CostReports />;
      case "employees":
        return <EmployeeManagement />;
      case "jobs":
        return <JobManagement />;
      default:
        return <Dashboard />;
    }
  };

  return <Layout timeTracking={timeTracking}>{renderView()}</Layout>;
};

export default Index;
