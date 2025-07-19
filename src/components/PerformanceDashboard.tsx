import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  Activity,
  Database,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Archive,
} from "lucide-react";
import {
  runStressTest,
  StressTestResults,
  ContinuousPerformanceMonitor,
} from "@/utils/performanceStressTest";
import { useTimeTracking } from "@/hooks/useTimeTracking";

interface PerformanceStats {
  memoryUsage: number;
  entryCount: number;
  storageSize: number;
  renderTime: number;
  lastUpdate: number;
}

export function PerformanceDashboard() {
  const { timeEntries, employees, jobs } = useTimeTracking();
  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [stressTestResults, setStressTestResults] =
    useState<StressTestResults | null>(null);
  const [performanceStats, setPerformanceStats] =
    useState<PerformanceStats | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitor] = useState(() => new ContinuousPerformanceMonitor());

  // Calculate current performance stats
  useEffect(() => {
    const calculateStats = () => {
      const start = performance.now();

      // Simulate a typical data processing operation
      const processedEntries = timeEntries.map((entry) => ({
        ...entry,
        processed: true,
      }));

      const renderTime = performance.now() - start;

      // Calculate storage size
      let storageSize = 0;
      try {
        const data = localStorage.getItem("timeTrackingApp");
        if (data) {
          storageSize = new Blob([data]).size;
        }
      } catch (error) {
        console.error("Error calculating storage size:", error);
      }

      // Get memory usage (if available)
      let memoryUsage = 0;
      if ("memory" in performance && (performance as any).memory) {
        memoryUsage = (performance as any).memory.usedJSHeapSize;
      }

      setPerformanceStats({
        memoryUsage,
        entryCount: timeEntries.length,
        storageSize,
        renderTime,
        lastUpdate: Date.now(),
      });
    };

    calculateStats();
    const interval = setInterval(calculateStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [timeEntries]);

  const runPerformanceTest = async () => {
    setIsRunningStressTest(true);
    try {
      const results = await runStressTest();
      setStressTestResults(results);
    } catch (error) {
      console.error("Stress test failed:", error);
    } finally {
      setIsRunningStressTest(false);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      monitor.stop();
      setIsMonitoring(false);
    } else {
      monitor.start();
      setIsMonitoring(true);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getPerformanceStatus = (
    stats: PerformanceStats,
  ): {
    status: "good" | "warning" | "critical";
    message: string;
  } => {
    if (stats.entryCount > 50000) {
      return {
        status: "critical",
        message: "Very large dataset - consider archiving old data",
      };
    }
    if (stats.entryCount > 25000) {
      return {
        status: "warning",
        message: "Large dataset - performance may be affected",
      };
    }
    if (stats.renderTime > 100) {
      return {
        status: "warning",
        message: "Slow rendering detected",
      };
    }
    if (stats.storageSize > 5 * 1024 * 1024) {
      // 5MB
      return {
        status: "warning",
        message: "Large storage usage - consider data cleanup",
      };
    }
    return { status: "good", message: "Performance is optimal" };
  };

  const archiveOldData = () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoffDate = sixMonthsAgo.toISOString().split("T")[0];

    const oldEntries = timeEntries.filter((entry) => entry.date < cutoffDate);

    if (oldEntries.length === 0) {
      alert("No old entries found to archive.");
      return;
    }

    const confirmed = window.confirm(
      `Archive ${oldEntries.length} entries older than ${cutoffDate}? This will improve performance but move old data to separate storage.`,
    );

    if (confirmed) {
      // Implementation would go here
      console.log(`Would archive ${oldEntries.length} entries`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="flex gap-2">
          <Button
            onClick={toggleMonitoring}
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
          >
            <Activity className="h-4 w-4 mr-2" />
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button
            onClick={runPerformanceTest}
            disabled={isRunningStressTest}
            size="sm"
          >
            {isRunningStressTest ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isRunningStressTest ? "Running..." : "Run Stress Test"}
          </Button>
        </div>
      </div>

      {/* Current Performance Stats */}
      {performanceStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Data Entries
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceStats.entryCount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {employees.length} employees, {jobs.length} jobs
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
                  <p className="text-sm font-medium text-gray-600">
                    Render Time
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceStats.renderTime.toFixed(1)}ms
                  </p>
                  <Badge
                    variant={
                      performanceStats.renderTime > 100
                        ? "destructive"
                        : performanceStats.renderTime > 50
                          ? "secondary"
                          : "default"
                    }
                    className="text-xs"
                  >
                    {performanceStats.renderTime > 100
                      ? "Slow"
                      : performanceStats.renderTime > 50
                        ? "OK"
                        : "Fast"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Storage Size
                  </p>
                  <p className="text-2xl font-bold">
                    {formatBytes(performanceStats.storageSize)}
                  </p>
                  <Progress
                    value={
                      (performanceStats.storageSize / (10 * 1024 * 1024)) * 100
                    }
                    className="h-1 mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Memory Usage
                  </p>
                  <p className="text-2xl font-bold">
                    {performanceStats.memoryUsage > 0
                      ? formatBytes(performanceStats.memoryUsage)
                      : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500">
                    JS Heap {isMonitoring ? "(Live)" : "(Static)"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Status */}
      {performanceStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {(() => {
                const { status } = getPerformanceStatus(performanceStats);
                return status === "good" ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                );
              })()}
              Performance Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(() => {
                const { status, message } =
                  getPerformanceStatus(performanceStats);
                return (
                  <div className="flex items-center justify-between">
                    <span>{message}</span>
                    <Badge
                      variant={
                        status === "good"
                          ? "default"
                          : status === "warning"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {status.toUpperCase()}
                    </Badge>
                  </div>
                );
              })()}

              {performanceStats.entryCount > 10000 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Archive Old Data</p>
                    <p className="text-sm text-gray-600">
                      Improve performance by archiving entries older than 6
                      months
                    </p>
                  </div>
                  <Button onClick={archiveOldData} size="sm">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stress Test Results */}
      {stressTestResults && (
        <Card>
          <CardHeader>
            <CardTitle>Stress Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Max Recommended Entries</p>
                  <p className="text-xl font-bold">
                    {stressTestResults.scalability.maxRecommendedEntries.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Performance Degradation</p>
                  <p className="text-xl font-bold">
                    {stressTestResults.scalability.performanceDegradation.toFixed(
                      1,
                    )}
                    %
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Memory Growth Rate</p>
                  <p className="text-xl font-bold">
                    {stressTestResults.scalability.memoryGrowthRate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">Memory Leak</p>
                  <p className="text-xl font-bold">
                    {stressTestResults.memoryUsage.leakDetected ? (
                      <span className="text-red-600">Detected</span>
                    ) : (
                      <span className="text-green-600">None</span>
                    )}
                  </p>
                </div>
              </div>

              {stressTestResults.issues.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-600 mb-2">Issues</h4>
                  <ul className="space-y-1">
                    {stressTestResults.issues.map((issue, index) => (
                      <li key={index} className="text-sm text-red-600">
                        • {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {stressTestResults.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-600 mb-2">
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {stressTestResults.recommendations.map(
                      (recommendation, index) => (
                        <li key={index} className="text-sm text-blue-600">
                          • {recommendation}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monitoring Status */}
      {isMonitoring && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 animate-pulse text-green-500" />
              Live Performance Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              <p>
                Continuous monitoring is active. Performance metrics are being
                collected every 5 seconds.
              </p>
              <p className="mt-2">
                Current session:{" "}
                {Math.floor(
                  (Date.now() - (performanceStats?.lastUpdate || Date.now())) /
                    1000,
                )}{" "}
                seconds
              </p>
              {(() => {
                const metrics = monitor.getMetrics();
                const avgMemory = monitor.getAverageMemoryUsage();
                const issues = monitor.detectPerformanceIssues();

                return (
                  <div className="mt-3 space-y-2">
                    <p>
                      Metrics collected: {metrics.length} | Average memory:{" "}
                      {formatBytes(avgMemory)}
                    </p>
                    {issues.length > 0 && (
                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <p className="text-orange-800 font-medium">
                          Performance Issues Detected:
                        </p>
                        {issues.map((issue, index) => (
                          <p key={index} className="text-orange-700 text-xs">
                            • {issue}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Data Management</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Archive entries older than 1-2 years</li>
                <li>• Clean up orphaned employee/job references</li>
                <li>• Regular backup and data validation</li>
                <li>• Use batch operations for multiple entries</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Browser Performance</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Close unnecessary browser tabs</li>
                <li>• Clear browser cache periodically</li>
                <li>• Use pagination for large lists</li>
                <li>• Enable hardware acceleration</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
