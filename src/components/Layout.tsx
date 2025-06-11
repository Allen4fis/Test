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
  Save,
  Activity,
  TrendingUp,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useOptimizedTimeTracking } from "@/hooks/useOptimizedTimeTracking";
import { DiscreetReset } from "@/components/DiscreetReset";
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

  const navigationItems = [
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
      label: "Reports",
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
      count: rentalItems.filter((item) => item.isActive).length,
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
      count: jobs.filter((job) => job.isActive).length,
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
                    Modern Time Tracking System
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
                  {timeEntries.length} entries
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
            <Card className="modern-card hover-scale overflow-hidden">
              <div
                className="p-6 border-b border-orange-500/20"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                }}
              >
                <h2 className="text-xl font-bold text-gray-100 mb-2 flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  Navigation
                </h2>
                <p className="text-gray-400 text-sm">Choose your workspace</p>
              </div>
              <div className="p-6">
                <nav className="space-y-3">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = selectedView === item.id;

                    return (
                      <Button
                        key={item.id}
                        variant={isActive ? "default" : "ghost"}
                        className={`w-full justify-start gap-4 h-auto p-4 smooth-transition group ${
                          isActive
                            ? "orange-gradient text-white shadow-2xl transform scale-105 font-bold border border-orange-400/30"
                            : "text-gray-300 hover:bg-gray-800/50 hover:text-white hover:scale-105 border border-transparent hover:border-orange-500/20"
                        }`}
                        onClick={() => {
                          console.log("Navigating to:", item.id);
                          setSelectedView(item.id);
                        }}
                      >
                        <Icon
                          className={`h-6 w-6 ${
                            isActive
                              ? "drop-shadow-lg"
                              : `${item.color} group-hover:text-orange-400`
                          }`}
                        />
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-base">
                              {item.label}
                            </span>
                            {item.count !== undefined && (
                              <Badge
                                className={`ml-2 ${
                                  isActive
                                    ? "bg-white/20 text-white border-white/30"
                                    : "bg-orange-500/20 text-orange-300 border-orange-500/30"
                                }`}
                              >
                                {item.count}
                              </Badge>
                            )}
                          </div>
                          <p
                            className={`text-sm mt-1 ${
                              isActive
                                ? "text-white/80"
                                : "text-gray-400 group-hover:text-gray-300"
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

            {/* Enhanced Quick Stats */}
            <Card className="modern-card mt-8 hover-scale overflow-hidden">
              <div
                className="p-6 border-b border-orange-500/20"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                }}
              >
                <h3 className="font-bold text-gray-100 text-lg flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                  Quick Analytics
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-pink-400" />
                        Total Employees:
                      </span>
                      <span className="font-bold text-gray-100 text-xl">
                        {employees.length}
                      </span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-indigo-400" />
                        Active Jobs:
                      </span>
                      <span className="font-bold text-gray-100 text-xl">
                        {jobs.filter((j) => j.isActive).length}
                      </span>
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300 font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-400" />
                        Time Entries:
                      </span>
                      <span className="font-bold text-gray-100 text-xl">
                        {timeEntries.length}
                      </span>
                    </div>
                  </div>
                  <div
                    className="p-4 rounded-xl border border-orange-500/30"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-orange-200 font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-400" />
                        Total Hours:
                      </span>
                      <span className="font-bold text-orange-300 text-2xl">
                        {timeEntries
                          .reduce((sum, entry) => sum + entry.hours, 0)
                          .toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            <div className="modern-card rounded-3xl overflow-hidden animate-fade-in">
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
