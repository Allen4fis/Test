import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  Info,
} from "lucide-react";
import {
  ComprehensiveSystemTester,
  PerformanceMonitor,
} from "@/utils/comprehensiveSystemTest";
import { SystemCleanup, BundleAnalyzer } from "@/utils/systemCleanup";

interface TestResult {
  passed: boolean;
  metrics: any;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export default function SystemStressTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState("");

  const runStressTest = async () => {
    setIsRunning(true);
    setProgress(0);
    setCurrentTest("Initializing...");

    try {
      const tester = new ComprehensiveSystemTester();

      // Simulate progress updates
      const progressSteps = [
        "Testing Data Structures...",
        "Memory Stress Testing...",
        "Rendering Performance...",
        "Database Operations...",
        "Error Handling...",
        "Bundle Analysis...",
        "Finalizing Results...",
      ];

      for (let i = 0; i < progressSteps.length; i++) {
        setCurrentTest(progressSteps[i]);
        setProgress(((i + 1) / progressSteps.length) * 100);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const result = await tester.runFullStressTest();
      setTestResult(result);
    } catch (error) {
      console.error("Stress test failed:", error);
      setTestResult({
        passed: false,
        metrics: {},
        errors: [`Test runner failed: ${error}`],
        warnings: [],
        recommendations: ["Check console for detailed error information"],
      });
    } finally {
      setIsRunning(false);
      setProgress(100);
      setCurrentTest("Complete");
    }
  };

  const componentAnalysis = SystemCleanup.analyzeComponents();
  const bundleAnalysis = BundleAnalyzer.analyzeBundleSize();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            System Stress Tester
          </h1>
          <p className="text-gray-400">
            Comprehensive testing and optimization analysis
          </p>
        </div>
        <Button onClick={runStressTest} disabled={isRunning} className="gap-2">
          {isRunning ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isRunning ? "Running Tests..." : "Run Stress Test"}
        </Button>
      </div>

      {/* Test Progress */}
      {isRunning && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100">Test Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">{currentTest}</span>
                <span className="text-gray-400">{progress.toFixed(0)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResult && (
        <div className="grid gap-6">
          {/* Overall Status */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                {testResult.passed ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                Test Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {testResult.metrics.memoryUsage?.toFixed(1) || "N/A"}MB
                  </div>
                  <div className="text-sm text-gray-400">Memory Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {testResult.metrics.renderTime?.toFixed(0) || "N/A"}ms
                  </div>
                  <div className="text-sm text-gray-400">Render Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">
                    {testResult.errors.length}
                  </div>
                  <div className="text-sm text-gray-400">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {testResult.warnings.length}
                  </div>
                  <div className="text-sm text-gray-400">Warnings</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Errors */}
          {testResult.errors.length > 0 && (
            <Card className="bg-gray-900 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Errors ({testResult.errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResult.errors.map((error, index) => (
                    <div
                      key={index}
                      className="bg-red-900/20 border border-red-500/20 rounded p-3 text-red-300"
                    >
                      {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {testResult.warnings.length > 0 && (
            <Card className="bg-gray-900 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Warnings ({testResult.warnings.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {testResult.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="bg-yellow-900/20 border border-yellow-500/20 rounded p-3 text-yellow-300"
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card className="bg-gray-900 border-blue-500/20">
            <CardHeader>
              <CardTitle className="text-blue-400 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Optimization Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {testResult.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="bg-blue-900/20 border border-blue-500/20 rounded p-3 text-blue-300"
                  >
                    {rec}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Component Analysis */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Component Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Duplicates */}
          <div>
            <h3 className="text-lg font-semibold text-orange-400 mb-2">
              Duplicate Components
            </h3>
            <div className="space-y-1">
              {componentAnalysis.duplicates.map((duplicate, index) => (
                <div
                  key={index}
                  className="text-sm text-orange-300 bg-orange-900/20 p-2 rounded"
                >
                  {duplicate}
                </div>
              ))}
            </div>
          </div>

          {/* Unused */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Potentially Unused Components
            </h3>
            <div className="space-y-1">
              {componentAnalysis.unused.map((unused, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-300 bg-gray-800 p-2 rounded"
                >
                  {unused}
                </div>
              ))}
            </div>
          </div>

          {/* Optimization Candidates */}
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">
              Optimization Candidates
            </h3>
            <div className="space-y-1">
              {componentAnalysis.optimizationCandidates.map(
                (candidate, index) => (
                  <div
                    key={index}
                    className="text-sm text-blue-300 bg-blue-900/20 p-2 rounded"
                  >
                    {candidate}
                  </div>
                ),
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bundle Analysis */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">Bundle Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">
              Heavy Dependencies
            </h3>
            <div className="space-y-1">
              {bundleAnalysis.heavyDependencies.map((dep, index) => (
                <div
                  key={index}
                  className="text-sm text-red-300 bg-red-900/20 p-2 rounded"
                >
                  {dep}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-green-400 mb-2">
              Optimizations
            </h3>
            <div className="space-y-1">
              {bundleAnalysis.optimizations.map((opt, index) => (
                <div
                  key={index}
                  className="text-sm text-green-300 bg-green-900/20 p-2 rounded"
                >
                  {opt}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cleanup Script */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-100">System Cleanup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-800 p-4 rounded-lg font-mono text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-auto">
            {SystemCleanup.generateCleanupScript()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
