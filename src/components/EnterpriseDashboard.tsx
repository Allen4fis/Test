import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Database,
  Activity,
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Archive,
  Upload,
  Download,
  Zap,
} from "lucide-react";
import { useEnterpriseTimeTracking } from "@/hooks/useEnterpriseTimeTracking";
import { VirtualizedTimeEntryTable } from "./VirtualizedTimeEntryTable";
import { EnterpriseDataImport } from "./EnterpriseDataImport";

interface SystemHealth {
  status: "excellent" | "good" | "warning" | "critical";
  queryPerformance: number;
  memoryUsage: number;
  storageUsage: number;
  recommendedActions: string[];
}

export function EnterpriseDashboard() {
  const {
    isInitialized,
    isLoading,
    totalEntries,
    performanceMetrics,
    employees,
    jobs,
  } = useEnterpriseTimeTracking();

  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: "good",
    queryPerformance: 0,
    memoryUsage: 0,
    storageUsage: 0,
    recommendedActions: [],
  });

  const [selectedTab, setSelectedTab] = useState("overview");

  // Calculate system health
  useEffect(() => {
    const calculateHealth = () => {
      const queryPerf = performanceMetrics.queryTime;
      const memUsage = performanceMetrics.memoryUsage / 1024 / 1024; // MB

      let status: SystemHealth["status"] = "excellent";
      const recommendations: string[] = [];

      // Query performance thresholds
      if (queryPerf > 2000) {
        status = "critical";
        recommendations.push(
          "Query performance is critically slow. Consider data archiving.",
        );
      } else if (queryPerf > 1000) {
        status = "warning";
        recommendations.push("Query performance is degraded. Monitor closely.");
      } else if (queryPerf > 500) {
        status = "good";
        recommendations.push(
          "Query performance is acceptable but can be improved.",
        );
      }

      // Memory usage thresholds
      if (memUsage > 500) {
        status = "critical";
        recommendations.push(
          "Memory usage is very high. Restart application recommended.",
        );
      } else if (memUsage > 200) {
        if (status !== "critical") status = "warning";
        recommendations.push(
          "Memory usage is elevated. Consider browser refresh.",
        );
      }

      // Data size thresholds
      if (totalEntries > 250000) {
        if (status !== "critical") status = "warning";
        recommendations.push(
          "Dataset is very large. Archive old data for optimal performance.",
        );
      } else if (totalEntries > 100000) {
        recommendations.push(
          "Large dataset detected. Monitor performance metrics.",
        );
      }

      // Storage usage (estimate)
      const estimatedStorage = totalEntries * 0.5; // KB per entry estimate
      const storagePercentage = (estimatedStorage / (100 * 1024)) * 100; // Against 100MB limit

      if (storagePercentage > 90) {
        status = "critical";
        recommendations.push("Storage nearly full. Archive data immediately.");
      } else if (storagePercentage > 70) {
        if (status !== "critical") status = "warning";
        recommendations.push("Storage usage is high. Plan for data archiving.");
      }

      setSystemHealth({
        status,
        queryPerformance: queryPerf,
        memoryUsage: memUsage,
        storageUsage: storagePercentage,
        recommendedActions: recommendations,
      });
    };

    if (isInitialized) {
      calculateHealth();
    }
  }, [isInitialized, totalEntries, performanceMetrics]);

  const getStatusColor = (status: SystemHealth["status"]) => {
    switch (status) {
      case "excellent":
        return "text-green-600 bg-green-100";
      case "good":
        return "text-blue-600 bg-blue-100";
      case "warning":
        return "text-orange-600 bg-orange-100";
      case "critical":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: SystemHealth["status"]) => {
    switch (status) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardContent className="p-8">
            <div className="flex flex-col items-center space-y-4">
              <Database className="h-12 w-12 animate-pulse text-blue-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  Initializing Enterprise System
                </h3>
                <p className="text-gray-500">
                  Setting up high-performance database...
                </p>
              </div>
              <div className="w-full">
                <Progress value={undefined} className="animate-pulse" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Time Tracking</h1>
          <p className="text-gray-500">
            High-performance system for 300,000+ entries
          </p>
        </div>
        <Badge className={getStatusColor(systemHealth.status)}>
          {getStatusIcon(systemHealth.status)}
          <span className="ml-2 capitalize">{systemHealth.status}</span>
        </Badge>
      </div>

      {/* System Health Alert */}
      {systemHealth.status === "critical" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical System Alert</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {systemHealth.recommendedActions.map((action, index) => (
                <div key={index}>• {action}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {systemHealth.status === "warning" && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Performance Warning</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              {systemHealth.recommendedActions.map((action, index) => (
                <div key={index}>• {action}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Total Entries</p>
                <p className="text-xl font-bold">
                  {formatNumber(totalEntries)}
                </p>
                <p className="text-xs text-gray-500">
                  {((totalEntries / 300000) * 100).toFixed(1)}% of capacity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Query Time</p>
                <p className="text-xl font-bold">
                  {performanceMetrics.queryTime.toFixed(0)}ms
                </p>
                <p className="text-xs text-gray-500">
                  {performanceMetrics.queryTime < 100
                    ? "Excellent"
                    : performanceMetrics.queryTime < 500
                      ? "Good"
                      : performanceMetrics.queryTime < 1000
                        ? "Fair"
                        : "Poor"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Memory Usage</p>
                <p className="text-xl font-bold">
                  {systemHealth.memoryUsage.toFixed(0)}MB
                </p>
                <p className="text-xs text-gray-500">
                  {systemHealth.memoryUsage < 100
                    ? "Optimal"
                    : systemHealth.memoryUsage < 200
                      ? "Good"
                      : "High"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Employees</p>
                <p className="text-xl font-bold">{employees.length}</p>
                <p className="text-xs text-gray-500">Active users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className="text-xl font-bold">{jobs.length}</p>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-xs text-gray-500">Storage</p>
                <p className="text-xl font-bold">
                  {systemHealth.storageUsage.toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">
                  {systemHealth.storageUsage < 50
                    ? "Plenty"
                    : systemHealth.storageUsage < 80
                      ? "Moderate"
                      : "High"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Storage Capacity</span>
            <span className="text-sm font-normal">
              {formatNumber(totalEntries)} / 300,000 entries
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={(totalEntries / 300000) * 100} className="h-3" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span>150K</span>
              <span>300K entries</span>
            </div>
          </div>
          {totalEntries > 200000 && (
            <Alert className="mt-4">
              <Archive className="h-4 w-4" />
              <AlertDescription>
                Consider archiving old data. You're at{" "}
                {((totalEntries / 300000) * 100).toFixed(1)}% capacity.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="import">Data Import</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Query Performance</span>
                      <span>{performanceMetrics.queryTime.toFixed(0)}ms</span>
                    </div>
                    <Progress
                      value={Math.min(
                        (performanceMetrics.queryTime / 1000) * 100,
                        100,
                      )}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>{systemHealth.memoryUsage.toFixed(0)}MB</span>
                    </div>
                    <Progress
                      value={Math.min(
                        (systemHealth.memoryUsage / 500) * 100,
                        100,
                      )}
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Storage Usage</span>
                      <span>{systemHealth.storageUsage.toFixed(0)}%</span>
                    </div>
                    <Progress
                      value={systemHealth.storageUsage}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedTab("import")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import Data
                  </Button>
                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedTab("entries")}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    View Entries
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive Old Data
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="entries">
          <VirtualizedTimeEntryTable height={600} />
        </TabsContent>

        <TabsContent value="import">
          <EnterpriseDataImport />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatNumber(totalEntries)}
                  </div>
                  <p className="text-sm text-gray-500">Total Entries</p>
                  <div className="mt-4">
                    <div className="text-lg font-semibold text-green-600">
                      {((totalEntries / 300000) * 100).toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-500">of maximum capacity</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {performanceMetrics.queryTime.toFixed(0)}ms
                  </div>
                  <p className="text-sm text-gray-500">Average Query Time</p>
                  <div className="mt-4">
                    <Badge
                      variant={
                        performanceMetrics.queryTime < 100
                          ? "default"
                          : performanceMetrics.queryTime < 500
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {performanceMetrics.queryTime < 100
                        ? "Excellent"
                        : performanceMetrics.queryTime < 500
                          ? "Good"
                          : "Needs Optimization"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div
                    className={`text-3xl font-bold ${
                      systemHealth.status === "excellent"
                        ? "text-green-600"
                        : systemHealth.status === "good"
                          ? "text-blue-600"
                          : systemHealth.status === "warning"
                            ? "text-orange-600"
                            : "text-red-600"
                    }`}
                  >
                    {getStatusIcon(systemHealth.status)}
                  </div>
                  <p className="text-sm text-gray-500 mt-2 capitalize">
                    {systemHealth.status}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500">
                      {systemHealth.recommendedActions.length} recommendations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
