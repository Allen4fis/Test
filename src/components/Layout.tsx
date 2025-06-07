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
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface LayoutProps {
  children: ReactNode;
  timeTracking: ReturnType<typeof useTimeTracking>;
}

export function Layout({ children, timeTracking }: LayoutProps) {
  const { selectedView, setSelectedView, employees, jobs, timeEntries } =
    timeTracking;

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
      id: "reports" as const,
      label: "Reports",
      icon: BarChart3,
      description: "Summary reports",
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
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Clock className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">
                  Time Tracker
                </h1>
              </div>
              <Badge variant="outline" className="text-xs">
                {timeEntries.length} entries
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3">
            <Card className="p-4">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = selectedView === item.id;

                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      className="w-full justify-start gap-3 h-auto p-3"
                      onClick={() => {
                        console.log("Navigating to:", item.id);
                        setSelectedView(item.id);
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.label}</span>
                          {item.count !== undefined && (
                            <Badge variant="secondary" className="ml-2">
                              {item.count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </Button>
                  );
                })}
              </nav>
            </Card>

            {/* Quick Stats */}
            <Card className="p-4 mt-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Employees:</span>
                  <span className="font-medium">{employees.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Jobs:</span>
                  <span className="font-medium">
                    {jobs.filter((j) => j.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Entries:</span>
                  <span className="font-medium">{timeEntries.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Hours:</span>
                  <span className="font-medium">
                    {timeEntries
                      .reduce((sum, entry) => sum + entry.hours, 0)
                      .toFixed(1)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
