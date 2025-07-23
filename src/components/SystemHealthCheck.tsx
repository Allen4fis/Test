import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Zap,
  Shield,
  TrendingUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  runComprehensiveSystemTest,
  SystemTestReport,
  TestResult,
} from "@/utils/comprehensiveSystemTest";
import {
  runOptimizationAnalysis,
  OptimizationReport,
  OptimizationSuggestion,
  getTimeTrackingOptimizations,
} from "@/utils/optimizationAnalysis";

export function SystemHealthCheck() {
  const [isRunning, setIsRunning] = useState(false);
  const [testReport, setTestReport] = useState<SystemTestReport | null>(null);
  const [optimizationReport, setOptimizationReport] =
    useState<OptimizationReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  const runFullSystemCheck = async () => {
    setIsRunning(true);
    try {
      console.log("🚀 Starting Full System Health Check...");

      // Run comprehensive tests
      const testResults = await runComprehensiveSystemTest();
      setTestReport(testResults);

      // Run optimization analysis
      const optimizationResults = await runOptimizationAnalysis();
      setOptimizationReport(optimizationResults);

      console.log("✅ System Health Check Complete!");
    } catch (error) {
      console.error("❌ System Health Check Failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
      case "Excellent":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "WARNING":
      case "Good":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "FAIL":
      case "Critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
      case "Excellent":
        return "bg-green-500";
      case "WARNING":
      case "Good":
        return "bg-yellow-500";
      case "FAIL":
      case "Critical":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = {
      High: "bg-red-100 text-red-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-blue-100 text-blue-800",
    };
    return (
      <Badge className={colors[severity as keyof typeof colors] || ""}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-blue-400" />
          System Health Check
        </h1>
        <p className="text-gray-400">
          Comprehensive testing and optimization analysis for production
          readiness
        </p>
      </div>

      {/* Control Panel */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Test Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={runFullSystemCheck}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Running Tests...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Full System Check
                </>
              )}
            </Button>
            {testReport && (
              <div className="text-sm text-gray-400">
                Last run: {new Date().toLocaleTimeString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testReport && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(testReport.overallStatus)}
                Bug & Functionality Tests
              </div>
              <Badge className={getStatusColor(testReport.overallStatus)}>
                {testReport.overallStatus}
              </Badge>
            </CardTitle>
            <CardDescription>
              {testReport.passed}/{testReport.totalTests} tests passed •{" "}
              {testReport.warnings} warnings detected
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {testReport.passed}
                </div>
                <div className="text-sm text-gray-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">
                  {testReport.failed}
                </div>
                <div className="text-sm text-gray-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {testReport.warnings}
                </div>
                <div className="text-sm text-gray-400">Warnings</div>
              </div>
            </div>

            <Collapsible
              open={expandedSections["test-details"]}
              onOpenChange={() => toggleSection("test-details")}
            >
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                {expandedSections["test-details"] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                View Detailed Results
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mt-4">
                {testReport.results.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {test.passed ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">{test.testName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.performance && (
                        <span className="text-xs text-gray-400">
                          {test.performance.toFixed(2)}ms
                        </span>
                      )}
                      {test.warnings && test.warnings.length > 0 && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          {test.warnings.length} warnings
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Optimization Report */}
      {optimizationReport && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Optimization
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Score:</span>
                <Badge className={getStatusColor(optimizationReport.status)}>
                  {optimizationReport.overallScore}/100
                </Badge>
              </div>
            </CardTitle>
            <CardDescription>
              {optimizationReport.suggestions.length} optimization opportunities
              identified
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Performance Score</span>
                <span>{optimizationReport.overallScore}/100</span>
              </div>
              <Progress
                value={optimizationReport.overallScore}
                className="h-2"
              />
            </div>

            <Collapsible
              open={expandedSections["optimization-details"]}
              onOpenChange={() => toggleSection("optimization-details")}
            >
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                {expandedSections["optimization-details"] ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                View Optimization Suggestions
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-4">
                {optimizationReport.suggestions.map((suggestion, index) => (
                  <div key={index} className="p-4 bg-gray-800 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(suggestion.severity)}
                        <Badge variant="outline">{suggestion.category}</Badge>
                      </div>
                      <span className="text-xs text-green-400">
                        {suggestion.estimatedGain}
                      </span>
                    </div>
                    <h4 className="font-medium text-gray-100 mb-1">
                      {suggestion.description}
                    </h4>
                    <p className="text-sm text-gray-400 mb-2">
                      {suggestion.impact}
                    </p>
                    <p className="text-sm text-blue-300">
                      {suggestion.solution}
                    </p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Time Tracking Specific Optimizations */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Time Tracking App Optimizations
          </CardTitle>
          <CardDescription>
            Specific recommendations for this application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {getTimeTrackingOptimizations().map((suggestion, index) => (
              <div key={index} className="p-4 bg-gray-800 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSeverityBadge(suggestion.severity)}
                    <Badge variant="outline">{suggestion.category}</Badge>
                  </div>
                  <span className="text-xs text-green-400">
                    {suggestion.estimatedGain}
                  </span>
                </div>
                <h4 className="font-medium text-gray-100 mb-1">
                  {suggestion.description}
                </h4>
                <p className="text-sm text-gray-400 mb-2">
                  {suggestion.impact}
                </p>
                <p className="text-sm text-blue-300">{suggestion.solution}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Metrics */}
      {optimizationReport && (
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>System Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-lg font-medium text-gray-100">
                  Memory Usage
                </div>
                <div className="text-2xl font-bold text-blue-400">
                  {optimizationReport.metrics.memoryUsage.toFixed(2)} MB
                </div>
              </div>
              <div>
                <div className="text-lg font-medium text-gray-100">Status</div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(optimizationReport.status)}
                  <span className="text-lg font-medium">
                    {optimizationReport.status}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
