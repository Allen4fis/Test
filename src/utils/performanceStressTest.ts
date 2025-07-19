import { AppData, TimeEntry, Employee, Job } from "@/types";

export interface StressTestResults {
  memoryUsage: {
    before: number;
    after: number;
    peak: number;
    leakDetected: boolean;
  };
  performance: {
    dataProcessingTime: number;
    renderTime: number;
    storageTime: number;
    searchTime: number;
  };
  scalability: {
    maxRecommendedEntries: number;
    performanceDegradation: number;
    memoryGrowthRate: number;
  };
  recommendations: string[];
  issues: string[];
}

export interface PerformanceMetrics {
  timestamp: number;
  memoryUsed: number;
  processingTime: number;
  entryCount: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private memoryBaseline: number = 0;

  startMonitoring() {
    this.memoryBaseline = this.getMemoryUsage();
    this.metrics = [];
  }

  recordMetric(entryCount: number, processingTime: number) {
    this.metrics.push({
      timestamp: Date.now(),
      memoryUsed: this.getMemoryUsage(),
      processingTime,
      entryCount,
    });
  }

  private getMemoryUsage(): number {
    if ("memory" in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  getResults(): Partial<StressTestResults> {
    const memoryUsages = this.metrics.map((m) => m.memoryUsed);
    const processingTimes = this.metrics.map((m) => m.processingTime);

    return {
      memoryUsage: {
        before: this.memoryBaseline,
        after: memoryUsages[memoryUsages.length - 1] || this.memoryBaseline,
        peak: Math.max(...memoryUsages, this.memoryBaseline),
        leakDetected: this.detectMemoryLeak(),
      },
      performance: {
        dataProcessingTime: this.calculateAverage(processingTimes),
        renderTime: 0, // Will be measured separately
        storageTime: 0, // Will be measured separately
        searchTime: 0, // Will be measured separately
      },
    };
  }

  private detectMemoryLeak(): boolean {
    if (this.metrics.length < 10) return false;

    const recentMetrics = this.metrics.slice(-10);
    const memoryGrowth = recentMetrics.map((metric, index) => {
      if (index === 0) return 0;
      return metric.memoryUsed - recentMetrics[index - 1].memoryUsed;
    });

    const averageGrowth = this.calculateAverage(memoryGrowth);
    return averageGrowth > 1024 * 1024; // 1MB growth per operation is concerning
  }

  private calculateAverage(numbers: number[]): number {
    return numbers.length > 0
      ? numbers.reduce((a, b) => a + b, 0) / numbers.length
      : 0;
  }
}

// Generate test data with realistic patterns
export function generateTestData(size: number): AppData {
  const employees: Employee[] = [];
  const jobs: Job[] = [];
  const timeEntries: TimeEntry[] = [];

  // Generate employees (realistic ratio - 1 employee per 100 entries)
  const employeeCount = Math.max(5, Math.ceil(size / 100));
  for (let i = 0; i < employeeCount; i++) {
    employees.push({
      id: `emp-${i}`,
      name: `Employee ${i}`,
      title: `Title ${i % 5}`, // 5 different titles
      billableWage: 50 + (i % 20),
      costWage: 35 + (i % 15),
      isActive: true,
      category: i % 10 === 0 ? "dsp" : "employee",
      managerId: i > 0 && i % 5 === 0 ? `emp-${Math.floor(i / 5)}` : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  // Generate jobs (realistic ratio - 1 job per 50 entries)
  const jobCount = Math.max(3, Math.ceil(size / 50));
  for (let i = 0; i < jobCount; i++) {
    jobs.push({
      id: `job-${i}`,
      jobNumber: String(1000 + i),
      name: `Project ${i}`,
      description: `Description for project ${i}`,
      isBillable: i % 3 !== 0, // 2/3 billable
      isActive: true,
      invoicedDates: [],
      paidDates: [],
      createdAt: new Date().toISOString(),
    });
  }

  // Generate time entries with realistic distribution
  const hourTypes = ["1", "2", "3", "4", "6", "7", "8", "9", "10", "11", "12"];
  const provinces = ["1", "2", "3", "4", "5"];

  for (let i = 0; i < size; i++) {
    const employee = employees[i % employees.length];
    const job = jobs[i % jobs.length];
    const date = new Date();
    date.setDate(date.getDate() - (i % 365)); // Spread over last year

    timeEntries.push({
      id: `entry-${i}`,
      employeeId: employee.id,
      jobId: job.id,
      hourTypeId: hourTypes[i % hourTypes.length],
      provinceId: provinces[i % provinces.length],
      date: date.toISOString().split("T")[0],
      hours: 1 + Math.random() * 8, // 1-9 hours
      loaCount: i % 20 === 0 ? Math.floor(Math.random() * 3) : 0, // Occasional LOA
      title: employee.title,
      billableWageUsed: employee.billableWage,
      costWageUsed: employee.costWage,
      description: i % 10 === 0 ? `Description ${i}` : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    employees,
    jobs,
    timeEntries,
    hourTypes: [
      {
        id: "1",
        name: "Regular Time",
        description: "Regular working hours",
        multiplier: 1.0,
      },
      {
        id: "2",
        name: "Overtime",
        description: "Overtime hours",
        multiplier: 1.5,
      },
      {
        id: "3",
        name: "Double Time",
        description: "Double time hours",
        multiplier: 2.0,
      },
      {
        id: "4",
        name: "Travel Hours",
        description: "Travel time",
        multiplier: 1.0,
      },
      {
        id: "6",
        name: "NS Regular Time",
        description: "Nightshift regular hours",
        multiplier: 1.0,
      },
      {
        id: "7",
        name: "NS Overtime",
        description: "Nightshift overtime",
        multiplier: 1.5,
      },
      {
        id: "8",
        name: "NS Double Time",
        description: "Nightshift double time",
        multiplier: 2.0,
      },
      {
        id: "9",
        name: "Stat Holiday",
        description: "Statutory holiday hours",
        multiplier: 1.0,
      },
      {
        id: "10",
        name: "NS Stat Holiday",
        description: "Nightshift statutory holiday",
        multiplier: 1.5,
      },
      {
        id: "11",
        name: "Stat Holiday OT",
        description: "Statutory holiday overtime",
        multiplier: 1.5,
      },
      {
        id: "12",
        name: "Billable",
        description: "Billable time",
        multiplier: 1.0,
      },
    ],
    provinces: [
      { id: "1", name: "Alberta", code: "AB" },
      { id: "2", name: "British Columbia", code: "BC" },
      { id: "3", name: "Manitoba", code: "MB" },
      { id: "4", name: "New Brunswick", code: "NB" },
      { id: "5", name: "Newfoundland and Labrador", code: "NL" },
    ],
    rentalItems: [],
    rentalEntries: [],
  };
}

// Performance testing functions
export function measureDataProcessing(data: AppData): number {
  const start = performance.now();

  // Simulate common operations
  const timeEntries = data.timeEntries.filter((entry) => entry.hours > 0);
  const employeeGroups = timeEntries.reduce(
    (acc, entry) => {
      if (!acc[entry.employeeId]) acc[entry.employeeId] = [];
      acc[entry.employeeId].push(entry);
      return acc;
    },
    {} as Record<string, TimeEntry[]>,
  );

  const calculations = Object.values(employeeGroups).map((entries) =>
    entries.reduce((sum, entry) => sum + entry.hours, 0),
  );

  return performance.now() - start;
}

export function measureStoragePerformance(data: AppData): number {
  const start = performance.now();

  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem("stress-test", serialized);
    const retrieved = localStorage.getItem("stress-test");
    if (retrieved) {
      JSON.parse(retrieved);
    }
    localStorage.removeItem("stress-test");
  } catch (error) {
    console.error("Storage test failed:", error);
  }

  return performance.now() - start;
}

export function measureSearchPerformance(
  data: AppData,
  searchTerm: string,
): number {
  const start = performance.now();

  // Simulate search operations
  const employeeResults = data.employees.filter((emp) =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const jobResults = data.jobs.filter(
    (job) =>
      job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.jobNumber.includes(searchTerm),
  );
  const entryResults = data.timeEntries.filter((entry) => {
    const employee = data.employees.find((emp) => emp.id === entry.employeeId);
    const job = data.jobs.find((j) => j.id === entry.jobId);
    return (
      employee?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return performance.now() - start;
}

// Main stress test function
export async function runStressTest(): Promise<StressTestResults> {
  const monitor = new PerformanceMonitor();
  monitor.startMonitoring();

  const testSizes = [1000, 5000, 10000, 25000, 50000];
  const results: StressTestResults = {
    memoryUsage: { before: 0, after: 0, peak: 0, leakDetected: false },
    performance: {
      dataProcessingTime: 0,
      renderTime: 0,
      storageTime: 0,
      searchTime: 0,
    },
    scalability: {
      maxRecommendedEntries: 0,
      performanceDegradation: 0,
      memoryGrowthRate: 0,
    },
    recommendations: [],
    issues: [],
  };

  let maxRecommendedEntries = 10000; // Default safe limit
  const performanceTimes: number[] = [];
  const memoryUsages: number[] = [];

  try {
    for (const size of testSizes) {
      console.log(`Testing with ${size} entries...`);

      const testData = generateTestData(size);
      const processingTime = measureDataProcessing(testData);
      const storageTime = measureStoragePerformance(testData);
      const searchTime = measureSearchPerformance(testData, "Employee");

      monitor.recordMetric(size, processingTime);
      performanceTimes.push(processingTime);

      // Check for performance degradation
      if (processingTime > 1000) {
        // More than 1 second
        results.issues.push(
          `Performance degradation detected at ${size} entries (${processingTime.toFixed(2)}ms)`,
        );
        if (maxRecommendedEntries > size) {
          maxRecommendedEntries = size;
        }
      }

      // Check for storage limits
      if (storageTime > 5000) {
        // More than 5 seconds
        results.issues.push(
          `Storage performance degraded at ${size} entries (${storageTime.toFixed(2)}ms)`,
        );
      }

      // Memory pressure test
      const memUsage = monitor.getResults().memoryUsage;
      if (memUsage && memUsage.peak > 100 * 1024 * 1024) {
        // 100MB
        results.issues.push(
          `High memory usage detected: ${(memUsage.peak / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      // Simulate user interactions
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const monitorResults = monitor.getResults();
    if (monitorResults.memoryUsage && monitorResults.performance) {
      results.memoryUsage = monitorResults.memoryUsage;
      results.performance = {
        ...monitorResults.performance,
        storageTime: measureStoragePerformance(generateTestData(1000)),
        searchTime: measureSearchPerformance(generateTestData(1000), "test"),
      };
    }

    results.scalability = {
      maxRecommendedEntries,
      performanceDegradation: calculatePerformanceDegradation(performanceTimes),
      memoryGrowthRate: calculateMemoryGrowthRate(memoryUsages),
    };

    // Generate recommendations
    results.recommendations = generateRecommendations(results);
  } catch (error) {
    results.issues.push(`Stress test failed: ${error}`);
  }

  return results;
}

function calculatePerformanceDegradation(times: number[]): number {
  if (times.length < 2) return 0;
  const first = times[0];
  const last = times[times.length - 1];
  return ((last - first) / first) * 100;
}

function calculateMemoryGrowthRate(usages: number[]): number {
  if (usages.length < 2) return 0;
  const first = usages[0];
  const last = usages[usages.length - 1];
  return ((last - first) / first) * 100;
}

function generateRecommendations(results: StressTestResults): string[] {
  const recommendations: string[] = [];

  if (results.scalability.maxRecommendedEntries < 25000) {
    recommendations.push(
      "Consider implementing data virtualization for large datasets",
    );
    recommendations.push("Add pagination to time entry lists");
    recommendations.push("Implement lazy loading for non-critical data");
  }

  if (results.memoryUsage.leakDetected) {
    recommendations.push(
      "Memory leak detected - review component cleanup and event listeners",
    );
    recommendations.push("Consider using React.memo for expensive components");
  }

  if (results.performance.dataProcessingTime > 500) {
    recommendations.push("Optimize data processing with memoization");
    recommendations.push("Consider using Web Workers for heavy calculations");
  }

  if (results.performance.storageTime > 2000) {
    recommendations.push("Implement incremental data persistence");
    recommendations.push("Consider using IndexedDB for large datasets");
  }

  recommendations.push(
    "Implement data archiving for entries older than 2 years",
  );
  recommendations.push("Add database cleanup utilities for orphaned data");
  recommendations.push("Consider implementing a background sync mechanism");

  return recommendations;
}

// Continuous monitoring
export class ContinuousPerformanceMonitor {
  private isMonitoring = false;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000;

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.monitorLoop();
  }

  stop() {
    this.isMonitoring = false;
  }

  private async monitorLoop() {
    while (this.isMonitoring) {
      const memory = this.getMemoryUsage();
      const timestamp = Date.now();

      this.metrics.push({
        timestamp,
        memoryUsed: memory,
        processingTime: 0,
        entryCount: this.getCurrentEntryCount(),
      });

      // Keep only recent metrics
      if (this.metrics.length > this.maxMetrics) {
        this.metrics = this.metrics.slice(-this.maxMetrics);
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Check every 5 seconds
    }
  }

  private getMemoryUsage(): number {
    if ("memory" in performance && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private getCurrentEntryCount(): number {
    try {
      const data = localStorage.getItem("timeTrackingApp");
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.timeEntries?.length || 0;
      }
    } catch (error) {
      console.error("Error reading entry count:", error);
    }
    return 0;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageMemoryUsage(): number {
    if (this.metrics.length === 0) return 0;
    return (
      this.metrics.reduce((sum, metric) => sum + metric.memoryUsed, 0) /
      this.metrics.length
    );
  }

  detectPerformanceIssues(): string[] {
    const issues: string[] = [];

    if (this.metrics.length < 10) return issues;

    const recentMetrics = this.metrics.slice(-10);
    const memoryTrend = this.calculateMemoryTrend(recentMetrics);

    if (memoryTrend > 1024 * 1024) {
      // 1MB increase
      issues.push("Memory usage is trending upward - possible memory leak");
    }

    const averageMemory = this.getAverageMemoryUsage();
    if (averageMemory > 200 * 1024 * 1024) {
      // 200MB
      issues.push(
        "High memory usage detected - consider optimizing data structures",
      );
    }

    return issues;
  }

  private calculateMemoryTrend(metrics: PerformanceMetrics[]): number {
    if (metrics.length < 2) return 0;
    const first = metrics[0].memoryUsed;
    const last = metrics[metrics.length - 1].memoryUsed;
    return last - first;
  }
}
