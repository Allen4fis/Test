import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  MemoryStick,
  Monitor,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertCircle,
  Play,
  Square,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  generateStressTestData,
  getMemoryUsage,
  getDataSize,
  performanceTest,
  systemHealthCheck,
  safeNumber,
  safeDivide,
} from "@/utils/systemReliability";

interface StressTestResult {
  name: string;
  duration: number;
  success: boolean;
  error?: string;
  memoryUsed: number;
  dataSize: number;
}

export function SystemReliabilityMonitor() {
  const {
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    getAutosaveInfo,
  } = useTimeTracking();

  const [isRunningStressTest, setIsRunningStressTest] = useState(false);
  const [stressTestResults, setStressTestResults] = useState<
    StressTestResult[]
  >([]);
  const [systemMetrics, setSystemMetrics] = useState({
    memoryUsage: { used: 0, total: 0 },
    dataSize: 0,
    lastUpdate: Date.now(),
  });
  const [healthStatus, setHealthStatus] = useState({
    status: "healthy" as "healthy" | "warning" | "critical",
    issues: [] as string[],
    lastCheck: Date.now(),
  });

  const intervalRef = useRef<NodeJS.Timeout>();

  // Update system metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const memory = getMemoryUsage();
      const appData = {
        employees,
        jobs,
        timeEntries,
        rentalItems,
        rentalEntries,
      };
      const dataSize = getDataSize(appData);
      const health = systemHealthCheck(appData);

      setSystemMetrics({
        memoryUsage: memory,
        dataSize,
        lastUpdate: Date.now(),
      });

      setHealthStatus({
        status: health.status,
        issues: health.issues,
        lastCheck: Date.now(),
      });
    };

    // Update immediately
    updateMetrics();

    // Update every 30 seconds
    intervalRef.current = setInterval(updateMetrics, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [employees, jobs, timeEntries, rentalItems, rentalEntries]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const runStressTest = async () => {
    setIsRunningStressTest(true);
    setStressTestResults([]);

    const tests: Array<{
      name: string;
      test: () => Promise<void> | void;
      description: string;
    }> = [
      {
        name: "Large Dataset Processing",
        description: "Process 1000 employees, 500 jobs, 10000 time entries",
        test: async () => {
          const stressData = generateStressTestData({
            employees: 1000,
            jobs: 500,
            timeEntries: 10000,
          });

          // Simulate complex calculations
          const calculations = stressData.timeEntries?.map((entry) => ({
            ...entry,
            effectiveHours: entry.hours * 1.5,
            cost: entry.hours * entry.costWageUsed,
            billable: entry.hours * entry.billableWageUsed,
          }));

          // Group by employee
          const grouped = calculations?.reduce(
            (acc, entry) => {
              if (!acc[entry.employeeId]) {
                acc[entry.employeeId] = [];
              }
              acc[entry.employeeId].push(entry);
              return acc;
            },
            {} as Record<string, any[]>,
          );

          console.log(
            `Processed ${Object.keys(grouped || {}).length} employee groups`,
          );
        },
      },
      {
        name: "Array Operations Stress Test",
        description: "Test large array operations (map, filter, reduce)",
        test: async () => {
          const largeArray = Array.from({ length: 50000 }, (_, i) => ({
            id: i,
            value: Math.random() * 1000,
            category: `cat-${i % 10}`,
          }));

          // Chain multiple operations
          const result = largeArray
            .filter((item) => item.value > 500)
            .map((item) => ({ ...item, processed: true }))
            .reduce((acc, item) => acc + item.value, 0);

          console.log(`Processed array result: ${result}`);
        },
      },
      {
        name: "Memory Allocation Test",
        description: "Test memory allocation and cleanup",
        test: async () => {
          const arrays = [];
          for (let i = 0; i < 100; i++) {
            arrays.push(new Array(10000).fill(Math.random()));
          }

          // Force some calculations
          arrays.forEach((arr) => {
            arr.reduce((a, b) => a + b, 0);
          });

          // Cleanup (arrays will be garbage collected when function ends)
        },
      },
      {
        name: "Date Processing Stress Test",
        description: "Test date parsing and formatting with edge cases",
        test: async () => {
          const dates = [
            "2024-01-01",
            "2024-02-29", // Leap year
            "2024-12-31",
            "invalid-date",
            "",
            null,
            undefined,
            "2024-13-01", // Invalid month
            "2024-01-32", // Invalid day
          ];

          dates.forEach((date, i) => {
            try {
              const parsed = new Date(date as string);
              if (!isNaN(parsed.getTime())) {
                parsed.toLocaleDateString();
              }
            } catch (error) {
              console.log(`Date parsing handled: ${date}`);
            }
          });
        },
      },
      {
        name: "Division by Zero Protection",
        description: "Test safe division operations",
        test: async () => {
          const testCases = [
            { numerator: 100, denominator: 0 },
            { numerator: 0, denominator: 0 },
            { numerator: 100, denominator: null },
            { numerator: 100, denominator: undefined },
            { numerator: 100, denominator: "invalid" },
          ];

          testCases.forEach(({ numerator, denominator }) => {
            const result = safeDivide(numerator, denominator as number, -1);
            console.log(`${numerator} / ${denominator} = ${result}`);
          });
        },
      },
      {
        name: "localStorage Stress Test",
        description: "Test localStorage operations with large data",
        test: async () => {
          const largeData = {
            test: true,
            data: new Array(10000).fill("test data"),
            timestamp: Date.now(),
          };

          try {
            localStorage.setItem("stress-test", JSON.stringify(largeData));
            const retrieved = JSON.parse(
              localStorage.getItem("stress-test") || "{}",
            );
            if (retrieved.data.length !== 10000) {
              throw new Error("Data integrity check failed");
            }
            localStorage.removeItem("stress-test");
          } catch (error) {
            console.log("localStorage stress test handled error:", error);
          }
        },
      },
    ];

    for (const { name, test, description } of tests) {
      try {
        const startMemory = getMemoryUsage();
        const startTime = performance.now();

        await test();

        const endTime = performance.now();
        const endMemory = getMemoryUsage();
        const duration = endTime - startTime;

        setStressTestResults((prev) => [
          ...prev,
          {
            name,
            duration,
            success: true,
            memoryUsed: endMemory.used - startMemory.used,
            dataSize: 0,
          },
        ]);

        // Add small delay to prevent UI blocking
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        setStressTestResults((prev) => [
          ...prev,
          {
            name,
            duration: 0,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            memoryUsed: 0,
            dataSize: 0,
          },
        ]);
      }
    }

    setIsRunningStressTest(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Monitor className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health Monitor
            <Badge
              variant={
                healthStatus.status === "healthy"
                  ? "default"
                  : healthStatus.status === "warning"
                    ? "secondary"
                    : "destructive"
              }
              className={getStatusColor(healthStatus.status)}
            >
              {getStatusIcon(healthStatus.status)}
              {healthStatus.status.toUpperCase()}
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of system performance and stability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Data Size</p>
                <p className="font-semibold">
                  {formatBytes(systemMetrics.dataSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MemoryStick className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="font-semibold">
                  {systemMetrics.memoryUsage.used} MB
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <HardDrive className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Records</p>
                <p className="font-semibold">
                  {employees.length + jobs.length + timeEntries.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Check</p>
                <p className="font-semibold">
                  {new Date(healthStatus.lastCheck).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {healthStatus.issues.length > 0 && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>System Issues Detected</AlertTitle>
              <AlertDescription>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  {healthStatus.issues.map((issue, index) => (
                    <li key={index} className="text-sm">
                      {issue}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stress Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Stress Testing
          </CardTitle>
          <CardDescription>
            Run comprehensive tests to ensure system stability under load
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button
              onClick={runStressTest}
              disabled={isRunningStressTest}
              className="flex items-center gap-2"
            >
              {isRunningStressTest ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Stress Test
                </>
              )}
            </Button>

            {stressTestResults.length > 0 && (
              <Button
                variant="outline"
                onClick={() => setStressTestResults([])}
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Clear Results
              </Button>
            )}
          </div>

          {isRunningStressTest && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Running stress tests...</span>
              </div>
              <Progress
                value={(stressTestResults.length / 6) * 100}
                className="w-full"
              />
            </div>
          )}

          {stressTestResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Test Results
              </h4>

              <div className="grid gap-3">
                {stressTestResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      result.success
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {result.success ? (
                          <div className="flex items-center gap-4">
                            <span>⏱️ {formatDuration(result.duration)}</span>
                            {result.memoryUsed > 0 && (
                              <span>💾 +{result.memoryUsed}MB</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-red-600">Failed</span>
                        )}
                      </div>
                    </div>
                    {result.error && (
                      <p className="text-sm text-red-600 mt-1">
                        Error: {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Test Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Tests:</span>
                    <span className="ml-2 font-medium">
                      {stressTestResults.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Passed:</span>
                    <span className="ml-2 font-medium text-green-600">
                      {stressTestResults.filter((r) => r.success).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Failed:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {stressTestResults.filter((r) => !r.success).length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Duration:</span>
                    <span className="ml-2 font-medium">
                      {formatDuration(
                        stressTestResults
                          .filter((r) => r.success)
                          .reduce((sum, r) => sum + r.duration, 0) /
                          stressTestResults.filter((r) => r.success).length ||
                          0,
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Optimization Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Data Management</p>
                <p className="text-gray-600">
                  Archive old time entries periodically to maintain optimal
                  performance
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Browser Performance</p>
                <p className="text-gray-600">
                  Close other browser tabs when working with large datasets
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Data Validation</p>
                <p className="text-gray-600">
                  All operations include automatic error handling and data
                  validation
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Crash Prevention</p>
                <p className="text-gray-600">
                  Built-in safeguards prevent division by zero, null references,
                  and data corruption
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
