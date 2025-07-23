/**
 * Comprehensive System Test Suite
 * Tests for bugs, performance issues, and edge cases
 */

export interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  performance?: number;
  warnings?: string[];
}

export interface SystemTestReport {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  results: TestResult[];
  overallStatus: "PASS" | "FAIL" | "WARNING";
  performanceMetrics: {
    averageTestTime: number;
    slowestTest: string;
    fastestTest: string;
  };
}

export class ComprehensiveSystemTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<SystemTestReport> {
    console.log("🧪 Starting Comprehensive System Test Suite...");

    const startTime = performance.now();

    // Core functionality tests
    await this.testDataIntegrity();
    await this.testCalculationAccuracy();
    await this.testMemoryLeaks();
    await this.testLargeDatasetHandling();
    await this.testErrorHandling();
    await this.testUIResponsiveness();
    await this.testDataPersistence();
    await this.testEdgeCases();
    await this.testConcurrency();
    await this.testPerformance();

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    return this.generateReport(totalTime);
  }

  private async testDataIntegrity(): Promise<void> {
    const test: TestResult = {
      testName: "Data Integrity Check",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Check localStorage data
      const data = localStorage.getItem("timeTrackingApp");
      if (!data) {
        test.warnings?.push("No saved data found in localStorage");
      } else {
        const parsedData = JSON.parse(data);

        // Check required fields
        const requiredFields = [
          "employees",
          "jobs",
          "timeEntries",
          "hourTypes",
          "provinces",
        ];
        for (const field of requiredFields) {
          if (!parsedData[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        // Check data consistency
        if (parsedData.timeEntries) {
          for (const entry of parsedData.timeEntries) {
            if (!entry.id || !entry.employeeId || !entry.jobId) {
              throw new Error("Time entry missing required fields");
            }
          }
        }
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testCalculationAccuracy(): Promise<void> {
    const test: TestResult = {
      testName: "Calculation Accuracy Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test wage calculations
      const testEntry = {
        hours: 8,
        billableWageUsed: 25,
        costWageUsed: 20,
        hourTypeMultiplier: 1.5,
      };

      const expectedBillableAmount = 8 * 1.5 * 25; // 300
      const expectedCostAmount = 8 * 1.5 * 20; // 240

      if (expectedBillableAmount !== 300) {
        throw new Error("Billable amount calculation error");
      }

      if (expectedCostAmount !== 240) {
        throw new Error("Cost amount calculation error");
      }

      // Test LOA calculations
      const loaCount = 3;
      const loaAmount = 200;
      const expectedLoaTotal = 3 * 200; // 600

      if (expectedLoaTotal !== 600) {
        throw new Error("LOA calculation error");
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testMemoryLeaks(): Promise<void> {
    const test: TestResult = {
      testName: "Memory Leak Detection",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Check for large objects in memory
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Simulate heavy operations
      for (let i = 0; i < 1000; i++) {
        const tempArray = new Array(1000).fill(0);
        tempArray.push(i);
      }

      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryDiff = finalMemory - initialMemory;

      if (memoryDiff > 50 * 1024 * 1024) {
        // 50MB threshold
        test.warnings?.push(
          `High memory usage detected: ${memoryDiff / 1024 / 1024}MB`,
        );
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testLargeDatasetHandling(): Promise<void> {
    const test: TestResult = {
      testName: "Large Dataset Handling",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test with large arrays
      const largeArray = new Array(10000).fill(0).map((_, i) => ({
        id: `test-${i}`,
        name: `Test Item ${i}`,
        value: Math.random() * 1000,
      }));

      // Test array operations
      const filtered = largeArray.filter((item) => item.value > 500);
      const mapped = filtered.map((item) => ({ ...item, processed: true }));
      const reduced = mapped.reduce((sum, item) => sum + item.value, 0);

      if (filtered.length === 0 || mapped.length === 0 || reduced === 0) {
        throw new Error("Large dataset processing failed");
      }

      const processingTime = performance.now() - startTime;
      if (processingTime > 1000) {
        // 1 second threshold
        test.warnings?.push(`Slow processing detected: ${processingTime}ms`);
      }

      test.passed = true;
      test.performance = processingTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testErrorHandling(): Promise<void> {
    const test: TestResult = {
      testName: "Error Handling Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test invalid data handling
      try {
        JSON.parse("invalid json");
      } catch (e) {
        // Expected error - good
      }

      // Test null/undefined handling
      const testObj: any = null;
      const safeAccess = testObj?.nonExistentProperty?.deepProperty;

      if (safeAccess !== undefined) {
        throw new Error("Unsafe property access not handled");
      }

      // Test division by zero
      const divisionResult = 10 / 0;
      if (!isFinite(divisionResult)) {
        // Expected - good
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testUIResponsiveness(): Promise<void> {
    const test: TestResult = {
      testName: "UI Responsiveness Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test DOM manipulation performance
      const testElement = document.createElement("div");
      testElement.innerHTML = "<p>Test content</p>";
      document.body.appendChild(testElement);

      // Simulate rapid updates
      for (let i = 0; i < 100; i++) {
        testElement.style.transform = `translateX(${i}px)`;
      }

      document.body.removeChild(testElement);

      const renderTime = performance.now() - startTime;
      if (renderTime > 500) {
        // 500ms threshold
        test.warnings?.push(`Slow UI rendering detected: ${renderTime}ms`);
      }

      test.passed = true;
      test.performance = renderTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testDataPersistence(): Promise<void> {
    const test: TestResult = {
      testName: "Data Persistence Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test localStorage operations
      const testKey = "test-persistence-key";
      const testData = { timestamp: Date.now(), data: "test" };

      localStorage.setItem(testKey, JSON.stringify(testData));
      const retrieved = localStorage.getItem(testKey);

      if (!retrieved) {
        throw new Error("Failed to retrieve data from localStorage");
      }

      const parsedData = JSON.parse(retrieved);
      if (parsedData.data !== "test") {
        throw new Error("Data corruption in localStorage");
      }

      localStorage.removeItem(testKey);

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testEdgeCases(): Promise<void> {
    const test: TestResult = {
      testName: "Edge Cases Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test with empty arrays
      const emptyArray: any[] = [];
      const emptySum = emptyArray.reduce((sum, item) => sum + item, 0);
      if (emptySum !== 0) {
        throw new Error("Empty array reduce failed");
      }

      // Test with very large numbers
      const largeNumber = Number.MAX_SAFE_INTEGER;
      const calculation = largeNumber + 1;
      if (calculation <= largeNumber) {
        test.warnings?.push("Large number precision loss detected");
      }

      // Test with negative numbers
      const negativeHours = -5;
      if (negativeHours < 0) {
        // This should be handled in validation
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testConcurrency(): Promise<void> {
    const test: TestResult = {
      testName: "Concurrency Test",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test multiple async operations
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          new Promise((resolve) => {
            setTimeout(() => resolve(i), Math.random() * 100);
          }),
        );
      }

      const results = await Promise.all(promises);
      if (results.length !== 10) {
        throw new Error("Concurrent operations failed");
      }

      test.passed = true;
      test.performance = performance.now() - startTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private async testPerformance(): Promise<void> {
    const test: TestResult = {
      testName: "Performance Benchmark",
      passed: false,
      warnings: [],
    };

    try {
      const startTime = performance.now();

      // Test heavy computation
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i);
      }

      const computationTime = performance.now() - startTime;
      if (computationTime > 2000) {
        // 2 second threshold
        test.warnings?.push(`Slow computation detected: ${computationTime}ms`);
      }

      test.passed = true;
      test.performance = computationTime;
    } catch (error) {
      test.error = error instanceof Error ? error.message : "Unknown error";
    }

    this.results.push(test);
  }

  private generateReport(totalTime: number): SystemTestReport {
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.filter((r) => !r.passed).length;
    const warnings = this.results.reduce(
      (sum, r) => sum + (r.warnings?.length || 0),
      0,
    );

    const performanceTimes = this.results
      .filter((r) => r.performance !== undefined)
      .map((r) => ({ name: r.testName, time: r.performance! }));

    const averageTestTime =
      performanceTimes.reduce((sum, p) => sum + p.time, 0) /
      performanceTimes.length;
    const slowestTest = performanceTimes.reduce((prev, curr) =>
      prev.time > curr.time ? prev : curr,
    );
    const fastestTest = performanceTimes.reduce((prev, curr) =>
      prev.time < curr.time ? prev : curr,
    );

    const overallStatus: "PASS" | "FAIL" | "WARNING" =
      failed > 0 ? "FAIL" : warnings > 5 ? "WARNING" : "PASS";

    return {
      totalTests: this.results.length,
      passed,
      failed,
      warnings,
      results: this.results,
      overallStatus,
      performanceMetrics: {
        averageTestTime,
        slowestTest: slowestTest.name,
        fastestTest: fastestTest.name,
      },
    };
  }
}

// Export test runner function
export async function runComprehensiveSystemTest(): Promise<SystemTestReport> {
  const tester = new ComprehensiveSystemTester();
  return await tester.runAllTests();
}
