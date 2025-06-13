import { ReactNode, useMemo, useEffect, useRef } from "react";
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
  Save,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { DiscreetReset } from "@/components/DiscreetReset";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { toast } from "@/hooks/use-toast";

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
    manualSave,
  } = timeTracking;

  // Debug: Track when counts change
  const prevCounts = useRef({
    employees: employees.length,
    jobs: jobs.length,
    timeEntries: timeEntries.length,
    rentalItems: rentalItems.length,
  });

  useEffect(() => {
    const currentCounts = {
      employees: employees.length,
      jobs: jobs.length,
      timeEntries: timeEntries.length,
      rentalItems: rentalItems.length,
    };

    // Log when counts change
    if (
      process.env.NODE_ENV === "development" &&
      (currentCounts.employees !== prevCounts.current.employees ||
        currentCounts.jobs !== prevCounts.current.jobs ||
        currentCounts.timeEntries !== prevCounts.current.timeEntries ||
        currentCounts.rentalItems !== prevCounts.current.rentalItems)
    ) {
      console.log("🔄 Layout counts updated:", {
        employees: `${prevCounts.current.employees} → ${currentCounts.employees}`,
        jobs: `${prevCounts.current.jobs} → ${currentCounts.jobs}`,
        timeEntries: `${prevCounts.current.timeEntries} → ${currentCounts.timeEntries}`,
        rentalItems: `${prevCounts.current.rentalItems} → ${currentCounts.rentalItems}`,
      });
    }

    prevCounts.current = currentCounts;
  }, [employees.length, jobs.length, timeEntries.length, rentalItems.length]);

  // Calculate derived counts with memoization
  const activeJobsCount = useMemo(() => {
    const count = jobs.filter((job) => job.isActive).length;
    console.log("📊 Active jobs count calculated:", count);
    return count;
  }, [jobs]);

  const activeRentalItemsCount = useMemo(() => {
    const count = rentalItems.filter((item) => item.isActive).length;
    console.log("📊 Active rental items count calculated:", count);
    return count;
  }, [rentalItems]);

  // Memoize navigation items to ensure they update when counts change
  const navigationItems = useMemo(() => {
    console.log("🔄 Recalculating navigation items with counts:", {
      employees: employees.length,
      jobs: activeJobsCount,
      timeEntries: timeEntries.length,
      rentalItems: activeRentalItemsCount,
    });

    return [
      {
        id: "dashboard" as const,
        label: "Dashboard",
        icon: Home,
        description: "Overview and analytics",
        color: "text-blue-400",
      },
      {
        id: "timeEntry" as const,
        label: "Time Entry",
        icon: Clock,
        description: "Log work hours",
        color: "text-green-400",
      },
      {
        id: "viewer" as const,
        label: "Time Viewer",
        icon: Eye,
        description: "View & manage entries",
        count: timeEntries.length,
        color: "text-purple-400",
      },
      {
        id: "reports" as const,
        label: "Payroll Information",
        icon: BarChart3,
        description: "Summary reports",
        color: "text-orange-400",
      },
      {
        id: "invoices" as const,
        label: "Invoices",
        icon: Receipt,
        description: "Manage invoiced dates",
        color: "text-yellow-400",
      },
      {
        id: "rentals" as const,
        label: "Rentals",
        icon: Truck,
        description: "Equipment & item rentals",
        count: activeRentalItemsCount,
        color: "text-cyan-400",
      },
      {
        id: "employees" as const,
        label: "Employees",
        icon: Users,
        description: "Manage staff",
        count: employees.length,
        color: "text-pink-400",
      },
      {
        id: "jobs" as const,
        label: "Jobs",
        icon: Briefcase,
        description: "Manage projects",
        count: activeJobsCount,
        color: "text-indigo-400",
      },
      {
        id: "export" as const,
        label: "Data Export",
        icon: Download,
        description: "Export for accountant",
        color: "text-emerald-400",
      },
      {
        id: "backup" as const,
        label: "Backup & Restore",
        icon: Database,
        description: "Manage data backups",
        color: "text-amber-400",
      },
    ];
  }, [
    employees.length,
    activeJobsCount,
    timeEntries.length,
    activeRentalItemsCount,
  ]);

  // Memoize the header entry count to ensure reactivity
  const timeEntriesCount = useMemo(() => {
    console.log("🔄 Header entries count updated:", timeEntries.length);
    return timeEntries.length;
  }, [timeEntries.length]);

  return (
    <div className="min-h-screen modern-gradient">
      {/* Header */}
      <header
        className="border-b border-orange-500/20 shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, hsl(220, 20%, 8%) 0%, hsl(220, 15%, 12%) 100%)",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.3), 0 0 20px hsl(24, 100%, 50%, 0.1)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 orange-gradient rounded-2xl shadow-2xl animate-glow">
                  <Clock className="h-8 w-8 text-white drop-shadow-lg" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gradient">
                    4Front Trackity-doo
                  </h1>
                  <p className="text-sm text-gray-400 font-medium">
                    Not Gonna Change It
                  </p>
                </div>
              </div>
              <div className="ml-6">
                <Badge
                  className="bg-orange-500/20 text-orange-300 border-orange-500/30 font-bold px-4 py-2 text-sm shadow-lg"
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(24, 100%, 50%, 0.2) 0%, hsl(24, 100%, 60%, 0.2) 100%)",
                  }}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {timeEntriesCount} entries
                </Badge>
              </div>
            </div>

            {/* Enhanced Save Button */}
            <div className="flex items-center">
              <Button
                onClick={() => {
                  const result = manualSave();
                  if (result.success) {
                    toast({
                      title: "💾 Data Saved Successfully!",
                      description: `All your data has been safely saved at ${new Date(result.timestamp).toLocaleTimeString()}`,
                      duration: 3000,
                    });
                  } else {
                    toast({
                      title: "❌ Save Failed",
                      description:
                        "There was an issue saving your data. Please try again.",
                      variant: "destructive",
                      duration: 5000,
                    });
                  }
                }}
                className="bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold px-8 py-3 rounded-2xl shadow-2xl hover:shadow-pink-500/25 transform hover:scale-105 transition-all duration-300 border border-pink-400/30"
                size="lg"
              >
                <Save className="h-5 w-5 mr-3 drop-shadow-sm" />
                <span className="font-bold tracking-wide text-lg">
                  SAVE NOW
                </span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <Card className="sticky top-8 modern-card">
              <div className="p-6">
                <div className="space-y-2">
                  {navigationItems.map((item) => {
                    const isActive = selectedView === item.id;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => setSelectedView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left group relative overflow-hidden ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500/20 to-orange-400/10 text-orange-300 shadow-lg border border-orange-500/30"
                            : "text-gray-300 hover:text-orange-300 hover:bg-gray-800/50"
                        }`}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(135deg, hsl(24, 100%, 50%, 0.15) 0%, hsl(24, 100%, 60%, 0.05) 100%)",
                                boxShadow:
                                  "0 4px 20px rgba(251, 146, 60, 0.15)",
                              }
                            : {}
                        }
                      >
                        <div
                          className={`p-2 rounded-lg transition-all duration-300 ${
                            isActive
                              ? "bg-orange-500/20 shadow-lg"
                              : "bg-gray-700/50 group-hover:bg-orange-500/10"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 transition-all duration-300 ${
                              isActive
                                ? "text-orange-400 drop-shadow-lg"
                                : `${item.color} group-hover:text-orange-400`
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-medium transition-all duration-300 ${
                                isActive
                                  ? "text-orange-200"
                                  : "text-gray-200 group-hover:text-orange-200"
                              }`}
                            >
                              {item.label}
                            </span>
                            {item.count !== undefined && (
                              <Badge
                                key={`${item.id}-${item.count}`} // Force re-render when count changes
                                className={`text-xs font-bold transition-all duration-300 ${
                                  isActive
                                    ? "bg-orange-400/30 text-orange-200 border-orange-400/50"
                                    : "bg-gray-600/50 text-gray-300 border-gray-500/50 group-hover:bg-orange-400/20 group-hover:text-orange-200"
                                }`}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "2px 8px",
                                  minWidth: "24px",
                                  height: "20px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {item.count}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-xs transition-all duration-300 truncate ${
                              isActive
                                ? "text-orange-300/80"
                                : "text-gray-400 group-hover:text-orange-300/80"
                            }`}
                          >
                            {item.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700/50">
                  <DiscreetReset />
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <ErrorBoundary>
              <div className="space-y-6">{children}</div>
            </ErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}
