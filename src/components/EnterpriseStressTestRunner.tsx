import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  RefreshCw,
  Shield,
  TrendingUp,
  Activity,
  Database,
  Zap,
  Target,
  AlertCircle,
} from "lucide-react";
import { EnterpriseStressTesting } from "@/utils/enterpriseStressTesting";

interface TestProgress {
  currentTest: string;
  progress: number;
  phase: string;
  testsCompleted: number;
  totalTests: number;
}

export default function EnterpriseStressTestRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testProgress, setTestProgress] = useState<TestProgress>({
    currentTest: "",
    progress: 0,
    phase: "",
    testsCompleted: 0,
    totalTests: 8,
  });
  const [businessReadinessScore, setBusinessReadinessScore] =
    useState<number>(0);

  const runEnterpriseStressTest = async () => {
    setIsRunning(true);
    setTestResults(null);
    setBusinessReadinessScore(0);

    try {
      const stressTester = new EnterpriseStressTesting({
        maxEmployees: 10000,
        maxJobs: 5000,
        maxTimeEntries: 100000,
        maxRentalEntries: 50000,
        concurrentOperations: 100,
        memoryThresholdMB: 500,
        responseTimeThresholdMs: 100,
        errorThreshold: 0,
      });

      // Simulate progress updates
      const phases = [
        {
          name: "Data Volume Tests",
          tests: ["Massive Data Loading", "Performance Under Load"],
        },
        {
          name: "Concurrent Operations",
          tests: ["Race Conditions", "Locking Mechanisms"],
        },
        {
          name: "Memory & Performance",
          tests: ["Memory Leaks", "UI Responsiveness"],
        },
        {
          name: "Error Handling",
          tests: ["Recovery Mechanisms", "Corrupted Data"],
        },
        {
          name: "Business Logic",
          tests: ["Financial Accuracy", "Reporting Consistency"],
        },
        {
          name: "Security & Validation",
          tests: ["Input Validation", "Authorization"],
        },
        {
          name: "Scalability",
          tests: ["Horizontal Scaling", "Database Performance"],
        },
        {
          name: "Real-World Simulation",
          tests: ["Business Operations", "Peak Load"],
        },
      ];

      let completedTests = 0;
      const totalTests = phases.reduce(
        (sum, phase) => sum + phase.tests.length,
        0,
      );

      for (const phase of phases) {
        setTestProgress((prev) => ({
          ...prev,
          phase: phase.name,
          currentTest: phase.tests[0],
        }));

        for (const test of phase.tests) {
          setTestProgress((prev) => ({
            ...prev,
            currentTest: test,
            testsCompleted: completedTests,
            totalTests,
            progress: (completedTests / totalTests) * 100,
          }));

          // Simulate test execution time
          await new Promise((resolve) => setTimeout(resolve, 2000));
          completedTests++;
        }
      }

      // Run the actual stress test
      const results = await stressTester.runUltimateStressTest();
      setTestResults(results);
      setBusinessReadinessScore(results.businessReadinessScore);
    } catch (error) {
      console.error("Enterprise stress test failed:", error);
      setTestResults({
        overallSuccess: false,
        results: [],
        recommendations: [
          "Critical system failure detected - immediate attention required",
        ],
        businessReadinessScore: 0,
      });
    } finally {
      setIsRunning(false);
      setTestProgress((prev) => ({
        ...prev,
        progress: 100,
        currentTest: "Complete",
      }));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-yellow-500";
    if (score >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 95) return { text: "ENTERPRISE READY", color: "bg-green-600" };
    if (score >= 85) return { text: "BUSINESS READY", color: "bg-blue-600" };
    if (score >= 70)
      return { text: "NEEDS OPTIMIZATION", color: "bg-yellow-600" };
    if (score >= 50) return { text: "REQUIRES FIXES", color: "bg-orange-600" };
    return { text: "CRITICAL ISSUES", color: "bg-red-600" };
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-400" />
            Enterprise Stress Test Suite
          </h1>
          <p className="text-gray-400 mt-2">
            Multi-Million Dollar Business Readiness Assessment
          </p>
        </div>
        <Button
          onClick={runEnterpriseStressTest}
          disabled={isRunning}
          className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          size="lg"
        >
          {isRunning ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5" />
          )}
          {isRunning
            ? "Running Ultimate Test..."
            : "Run Enterprise Stress Test"}
        </Button>
      </div>

      {/* Business Readiness Score */}
      {businessReadinessScore > 0 && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-400" />
              Business Readiness Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`text-6xl font-bold ${getScoreColor(businessReadinessScore)}`}
                >
                  {businessReadinessScore.toFixed(1)}%
                </div>
                <div>
                  <Badge
                    className={`${getScoreBadge(businessReadinessScore).color} text-white`}
                  >
                    {getScoreBadge(businessReadinessScore).text}
                  </Badge>
                  <p className="text-gray-400 text-sm mt-1">
                    {businessReadinessScore >= 90
                      ? "Ready for enterprise deployment"
                      : businessReadinessScore >= 75
                        ? "Suitable for production with monitoring"
                        : "Requires optimization before production"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-300">
                  {testResults?.results?.filter((r: any) => r.passed).length ||
                    0}{" "}
                  / {testResults?.results?.length || 0}
                </div>
                <div className="text-gray-400 text-sm">Tests Passed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Progress */}
      {isRunning && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-400" />
              Test Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-200">
                    Phase: {testProgress.phase}
                  </div>
                  <div className="text-gray-400">
                    Current Test: {testProgress.currentTest}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-200">
                    {testProgress.testsCompleted} / {testProgress.totalTests}
                  </div>
                  <div className="text-gray-400 text-sm">Tests</div>
                </div>
              </div>
              <Progress value={testProgress.progress} className="w-full" />
              <div className="text-center text-gray-400 text-sm">
                {testProgress.progress.toFixed(1)}% Complete
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="space-y-6">
          {/* Overall Status */}
          <Alert
            className={`${testResults.overallSuccess ? "border-green-500/20 bg-green-500/10" : "border-red-500/20 bg-red-500/10"}`}
          >
            <div className="flex items-center gap-2">
              {testResults.overallSuccess ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <AlertDescription
                className={
                  testResults.overallSuccess ? "text-green-300" : "text-red-300"
                }
              >
                {testResults.overallSuccess
                  ? "🎉 All enterprise stress tests passed! Your system is ready for multi-million dollar operations."
                  : "⚠️ Critical issues detected. System requires immediate attention before production deployment."}
              </AlertDescription>
            </div>
          </Alert>

          {/* Individual Test Results */}
          <div className="grid gap-4">
            {testResults.results?.map((result: any, index: number) => (
              <Card key={index} className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-400" />
                      )}
                      {result.testName}
                    </div>
                    <Badge variant={result.passed ? "default" : "destructive"}>
                      {result.passed ? "PASSED" : "FAILED"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">
                        {result.executionTime.toFixed(0)}ms
                      </div>
                      <div className="text-xs text-gray-400">
                        Execution Time
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {result.memoryUsage.toFixed(1)}MB
                      </div>
                      <div className="text-xs text-gray-400">Memory Usage</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">
                        {result.errorCount}
                      </div>
                      <div className="text-xs text-gray-400">Errors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">
                        {result.warningCount}
                      </div>
                      <div className="text-xs text-gray-400">Warnings</div>
                    </div>
                  </div>

                  {result.recommendations?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-200 mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Recommendations
                      </h4>
                      <ul className="list-disc list-inside space-y-1">
                        {result.recommendations.map(
                          (rec: string, idx: number) => (
                            <li key={idx} className="text-gray-400 text-sm">
                              {rec}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Enterprise Recommendations */}
          {testResults.recommendations?.length > 0 && (
            <Card className="bg-gray-900 border-yellow-500/20">
              <CardHeader>
                <CardTitle className="text-yellow-400 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Enterprise Deployment Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {testResults.recommendations.map(
                    (rec: string, index: number) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{rec}</span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Enterprise Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">
                    {testResults.results
                      ?.reduce(
                        (sum: number, r: any) => sum + r.executionTime,
                        0,
                      )
                      .toFixed(0)}
                    ms
                  </div>
                  <div className="text-gray-400">Total Test Time</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {testResults.results
                      ?.reduce((sum: number, r: any) => sum + r.memoryUsage, 0)
                      .toFixed(1)}
                    MB
                  </div>
                  <div className="text-gray-400">Peak Memory Usage</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400">
                    {(
                      (testResults.results?.filter((r: any) => r.passed)
                        .length /
                        testResults.results?.length) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                  <div className="text-gray-400">Success Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
