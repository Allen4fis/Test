import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Clock,
  Users,
  Briefcase,
  FileText,
  Home,
  Receipt,
  Truck,
  Eye,
  Download,
  Database,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { DiscreetReset } from "@/components/DiscreetReset";

interface LayoutProps {
  children: ReactNode;
  timeTracking: ReturnType<typeof useTimeTracking>;
}

export function Layout({ children, timeTracking }: LayoutProps) {
  const {
    selectedView,
    setSelectedView,
    employees,
    jobs,
    timeEntries,
    rentalItems,
  } = timeTracking;

  const navigationItems = [
    {
      id: "dashboard" as const,
      label: "Dashboard",
      icon: Home,
      description: "Overview and statistics",
    },
    {
      id: "timeEntry" as const,
      label: "Time Entry",
      icon: Clock,
      description: "Log work hours",
    },
    {
      id: "viewer" as const,
      label: "Time Viewer",
      icon: Eye,
      description: "View & manage entries",
      count: timeEntries.length,
    },
    {
      id: "reports" as const,
      label: "Reports",
      icon: BarChart3,
      description: "Summary reports",
    },
    {
      id: "costs" as const,
      label: "Cost Reports",
      icon: FileText,
      description: "Labor cost analysis",
    },
    {
      id: "invoices" as const,
      label: "Invoices",
      icon: Receipt,
      description: "Manage invoiced dates",
    },
    {
      id: "rentals" as const,
      label: "Rentals",
      icon: Truck,
      description: "Equipment & item rentals",
      count: rentalItems.filter((item) => item.isActive).length,
    },
    {
      id: "employees" as const,
      label: "Employees",
      icon: Users,
      description: "Manage staff",
      count: employees.length,
    },
    {
      id: "jobs" as const,
      label: "Jobs",
      icon: Briefcase,
      description: "Manage projects",
      count: jobs.filter((job) => job.isActive).length,
    },
    {
      id: "export" as const,
      label: "Data Export",
      icon: Download,
      description: "Export for accountant",
    },
    {
      id: "backup" as const,
      label: "Backup & Restore",
      icon: Database,
      description: "Manage data backups",
    },
  ];

  return (
    <div className="min-h-screen modern-gradient">
      {/* Header */}
      <header className="bg-sidebar border-b border-sidebar-border/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl shadow-lg">
                  <Clock className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-sidebar-foreground">
                    4Front Trackity-doo
                  </h1>
                  <p className="text-xs text-sidebar-foreground/70">
                    Professional Time Management
                  </p>
                </div>
              </div>
              <div className="ml-4">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 text-primary border-primary/20 font-medium"
                >
                  {timeEntries.length} entries
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <Card className="modern-card bg-sidebar border-sidebar-border shadow-xl overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-sidebar-foreground mb-4">
                  Navigation
                </h2>
                <nav className="space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = selectedView === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start gap-3 h-auto p-4 transition-all duration-200 ${
                          isActive
                            ? "orange-gradient text-primary-foreground shadow-lg transform scale-105 font-semibold"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:scale-105"
                        }`}
                        onClick={() => {
                          console.log("Navigating to:", item.id);
                          setSelectedView(item.id);
                        }}
                      >
                        <Icon
                          className={`h-5 w-5 ${isActive ? "drop-shadow-sm" : ""}`}
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item.label}</span>
                            {item.count !== undefined && (
                              <Badge
                                variant="secondary"
                                className={`ml-2 ${
                                  isActive
                                    ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                                    : "bg-primary/10 text-primary border-primary/20"
                                }`}
                              >
                                {item.count}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs mt-1 ${
                              isActive
                                ? "text-primary-foreground/80"
                                : "text-sidebar-foreground/60"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </nav>
              </div>
            </Card>

            {/* Quick Stats */}
            <Card className="modern-card mt-6 bg-card border-border shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">
                      Total Employees:
                    </span>
                    <span className="font-bold text-foreground text-lg">
                      {employees.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">
                      Active Jobs:
                    </span>
                    <span className="font-bold text-foreground text-lg">
                      {jobs.filter((j) => j.isActive).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-muted-foreground font-medium">
                      Time Entries:
                    </span>
                    <span className="font-bold text-foreground text-lg">
                      {timeEntries.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <span className="text-foreground font-medium">
                      Total Hours:
                    </span>
                    <span className="font-bold text-primary text-lg">
                      {timeEntries
                        .reduce((sum, entry) => sum + entry.hours, 0)
                        .toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="modern-card bg-card border-border shadow-xl rounded-2xl overflow-hidden">
              <div className="p-8">{children}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Discreet reset button - nearly invisible */}
      <DiscreetReset />
    </div>
  );
}
