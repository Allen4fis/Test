/**
 * Comprehensive System Testing and Debugging Utilities
 *
 * This module provides tools for testing system reliability,
 * detecting performance issues, and preventing crashes.
 */

import {
  generateStressTestData,
  performanceTest,
  systemHealthCheck,
  safeNumber,
  safeDivide,
  safeArray,
  validateAppData,
} from "./systemReliability";

// Test cases that commonly cause crashes
export const CRASH_TEST_CASES = {
  divisionByZero: [
    { numerator: 100, denominator: 0 },
    { numerator: 0, denominator: 0 },
    { numerator: 100, denominator: null },
    { numerator: 100, denominator: undefined },
    { numerator: Infinity, denominator: 0 },
  ],
  invalidDates: [
    "",
    null,
    undefined,
    "invalid-date",
    "2024-13-01",
    "2024-01-32",
    "2024-02-30",
    "not-a-date",
    123456789,
  ],
  nullArrays: [null, undefined, "", "not-array", 123, {}],
  malformedData: [
    { employees: null },
    { jobs: "not-array" },
    { timeEntries: undefined },
    { employees: [{ id: null }] },
    { jobs: [{ jobNumber: "" }] },
    {},
    null,
    undefined,
  ],
  extremeNumbers: [
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Infinity,
    -Infinity,
    NaN,
    0,
    -0,
    1e308,
    -1e308,
  ],
};

// Memory stress testing
export const runMemoryStressTest = async (): Promise<{
  success: boolean;
  peakMemory: number;
  duration: number;
  error?: string;
}> => {
  const startTime = performance.now();
  let peakMemory = 0;

  try {
    // Create progressively larger data structures
    const testArrays: any[] = [];

    for (let i = 0; i < 100; i++) {
      // Create large array
      const largeArray = new Array(10000).fill(null).map((_, index) => ({
        id: `test-${i}-${index}`,
        data: new Array(100).fill(Math.random()),
        timestamp: Date.now(),
      }));

      testArrays.push(largeArray);

      // Check memory usage
      try {
        // @ts-ignore
        if (performance.memory) {
          // @ts-ignore
          const currentMemory = performance.memory.usedJSHeapSize / 1024 / 1024;
          peakMemory = Math.max(peakMemory, currentMemory);
        }
      } catch {
        // Memory API not available
      }

      // Process the data to simulate real operations
      largeArray
        .filter((item) => item.id.includes("test"))
        .map((item) => ({ ...item, processed: true }))
        .reduce((acc, item) => acc + item.data.length, 0);

      // Yield control to prevent UI blocking
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    // Force cleanup
    testArrays.length = 0;

    return {
      success: true,
      peakMemory,
      duration: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      peakMemory,
      duration: performance.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

// Data corruption simulation
export const runDataCorruptionTest = async (
  testData: any,
): Promise<{
  success: boolean;
  issuesFound: string[];
  duration: number;
}> => {
  const startTime = performance.now();
  const issuesFound: string[] = [];

  try {
    // Test null/undefined handling
    console.log("Testing null/undefined handling...");
    const nullTests = [
      () => safeArray(null),
      () => safeArray(undefined),
      () => safeNumber(null),
      () => safeNumber(undefined),
      () => safeDivide(10, null),
      () => safeDivide(null, 10),
    ];

    nullTests.forEach((test, index) => {
      try {
        test();
      } catch (error) {
        issuesFound.push(`Null test ${index + 1} failed: ${error}`);
      }
    });

    // Test data validation
    console.log("Testing data validation...");
    CRASH_TEST_CASES.malformedData.forEach((corruptData, index) => {
      try {
        const isValid = validateAppData(corruptData);
        if (isValid) {
          issuesFound.push(
            `Data validation incorrectly accepted corrupt data ${index + 1}`,
          );
        }
      } catch (error) {
        // This is expected for corrupt data
      }
    });

    // Test extreme number handling
    console.log("Testing extreme numbers...");
    CRASH_TEST_CASES.extremeNumbers.forEach((num, index) => {
      try {
        const safe = safeNumber(num);
        const divided = safeDivide(num, 10);
        const percentage = (safe / 100) * num;

        if (!isFinite(safe) && isFinite(num)) {
          issuesFound.push(`Safe number conversion failed for ${num}`);
        }
      } catch (error) {
        issuesFound.push(`Extreme number test ${index + 1} failed: ${error}`);
      }
    });

    // Test date handling
    console.log("Testing date handling...");
    CRASH_TEST_CASES.invalidDates.forEach((date, index) => {
      try {
        const parsedDate = new Date(date as string);
        if (!isNaN(parsedDate.getTime()) && date === "") {
          issuesFound.push(`Empty date incorrectly parsed as valid`);
        }
      } catch (error) {
        // Expected for invalid dates
      }
    });

    return {
      success: issuesFound.length === 0,
      issuesFound,
      duration: performance.now() - startTime,
    };
  } catch (error) {
    issuesFound.push(`Test framework error: ${error}`);
    return {
      success: false,
      issuesFound,
      duration: performance.now() - startTime,
    };
  }
};

// Performance regression testing
export const runPerformanceRegressionTest = async (): Promise<{
  results: Array<{
    test: string;
    duration: number;
    status: "pass" | "warn" | "fail";
    threshold: number;
  }>;
  overallStatus: "pass" | "warn" | "fail";
}> => {
  const tests = [
    {
      name: "Array Operations (10k items)",
      threshold: 100, // ms
      test: () => {
        const arr = Array.from({ length: 10000 }, (_, i) => i);
        return arr
          .filter((n) => n % 2 === 0)
          .map((n) => n * 2)
          .reduce((sum, n) => sum + n, 0);
      },
    },
    {
      name: "Data Processing (1k employees)",
      threshold: 200, // ms
      test: () => {
        const data = generateStressTestData({ employees: 1000 });
        return data.employees?.reduce(
          (acc, emp) => ({
            totalCost: acc.totalCost + (emp.costWage || 0),
            totalBillable: acc.totalBillable + (emp.billableWage || 0),
          }),
          { totalCost: 0, totalBillable: 0 },
        );
      },
    },
    {
      name: "JSON Serialization (large data)",
      threshold: 50, // ms
      test: () => {
        const data = generateStressTestData({
          employees: 100,
          jobs: 50,
          timeEntries: 500,
        });
        return JSON.parse(JSON.stringify(data));
      },
    },
    {
      name: "Date Operations (1k dates)",
      threshold: 30, // ms
      test: () => {
        const dates = Array.from({ length: 1000 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split("T")[0];
        });
        return dates.map((date) => new Date(date).getTime()).sort();
      },
    },
  ];

  const results = [];
  let overallStatus: "pass" | "warn" | "fail" = "pass";

  for (const testCase of tests) {
    try {
      const duration = await performanceTest(testCase.name, testCase.test);

      let status: "pass" | "warn" | "fail" = "pass";
      if (duration > testCase.threshold * 2) {
        status = "fail";
        overallStatus = "fail";
      } else if (duration > testCase.threshold) {
        status = "warn";
        if (overallStatus === "pass") overallStatus = "warn";
      }

      results.push({
        test: testCase.name,
        duration,
        status,
        threshold: testCase.threshold,
      });
    } catch (error) {
      results.push({
        test: testCase.name,
        duration: 0,
        status: "fail",
        threshold: testCase.threshold,
      });
      overallStatus = "fail";
    }
  }

  return { results, overallStatus };
};

// Comprehensive system test
export const runFullSystemTest = async (appData: any) => {
  console.log("🔄 Starting comprehensive system test...");
  const startTime = Date.now();

  // 1. Health check
  console.log("📊 Running health check...");
  const healthResult = systemHealthCheck(appData);

  // 2. Memory stress test
  console.log("🧠 Running memory stress test...");
  const memoryResult = await runMemoryStressTest();

  // 3. Data corruption test
  console.log("🔍 Running data corruption test...");
  const corruptionResult = await runDataCorruptionTest(appData);

  // 4. Performance regression test
  console.log("⚡ Running performance regression test...");
  const performanceResult = await runPerformanceRegressionTest();

  const totalDuration = Date.now() - startTime;

  // Determine overall status
  const overallStatus =
    healthResult.status === "critical" ||
    !memoryResult.success ||
    !corruptionResult.success ||
    performanceResult.overallStatus === "fail"
      ? "critical"
      : healthResult.status === "warning" ||
          corruptionResult.issuesFound.length > 0 ||
          performanceResult.overallStatus === "warn"
        ? "warning"
        : "healthy";

  const report = {
    timestamp: new Date().toISOString(),
    duration: totalDuration,
    status: overallStatus,
    summary: {
      healthCheck: healthResult,
      memoryTest: memoryResult,
      corruptionTest: corruptionResult,
      performanceTest: performanceResult,
    },
    recommendations: [] as string[],
  };

  // Generate recommendations
  if (healthResult.status !== "healthy") {
    report.recommendations.push(
      "System health issues detected - review health check results",
    );
  }
  if (!memoryResult.success) {
    report.recommendations.push(
      "Memory stress test failed - check for memory leaks",
    );
  }
  if (corruptionResult.issuesFound.length > 0) {
    report.recommendations.push(
      "Data handling issues found - review error handling",
    );
  }
  if (performanceResult.overallStatus !== "pass") {
    report.recommendations.push(
      "Performance issues detected - optimize slow operations",
    );
  }
  if (report.recommendations.length === 0) {
    report.recommendations.push("System is operating optimally");
  }

  console.log(`✅ System test completed in ${totalDuration}ms`);
  console.log(`📋 Status: ${overallStatus.toUpperCase()}`);
  console.log(`💡 Recommendations: ${report.recommendations.join(", ")}`);

  return report;
};

// Export for global access in development
export const initializeSystemTesting = () => {
  // Add to window for console access in development
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    (window as any).systemTest = {
      runFullTest: runFullSystemTest,
      runMemoryTest: runMemoryStressTest,
      runCorruptionTest: runDataCorruptionTest,
      runPerformanceTest: runPerformanceRegressionTest,
      crashTestCases: CRASH_TEST_CASES,
    };
    console.log(
      "🔧 System testing tools available at window.systemTest in development mode",
    );
  }
};

export default {
  runFullSystemTest,
  runMemoryStressTest,
  runDataCorruptionTest,
  runPerformanceRegressionTest,
  initializeSystemTesting,
  CRASH_TEST_CASES,
};
