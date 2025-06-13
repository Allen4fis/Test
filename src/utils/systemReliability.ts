/**
 * System Reliability and Crash Prevention Utilities
 *
 * This module provides comprehensive error handling, data validation,
 * and crash prevention mechanisms for the entire application.
 */

import { AppData, Employee, Job, TimeEntry, RentalEntry } from "@/types";

// Safe number operations to prevent crashes
export const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === "number" && !isNaN(value) && isFinite(value))
    return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && isFinite(parsed) ? parsed : defaultValue;
  }
  return defaultValue;
};

// Safe division to prevent division by zero
export const safeDivide = (
  numerator: number,
  denominator: number,
  defaultValue: number = 0,
): number => {
  const safeNum = safeNumber(numerator);
  const safeDenom = safeNumber(denominator);

  if (safeDenom === 0) {
    console.warn(`Division by zero prevented: ${numerator} / ${denominator}`);
    return defaultValue;
  }

  const result = safeNum / safeDenom;
  return isFinite(result) ? result : defaultValue;
};

// Safe percentage calculation
export const safePercentage = (part: number, total: number): number => {
  return safeDivide(safeNumber(part) * 100, safeNumber(total), 0);
};

// Safe array operations
export const safeArray = <T>(value: any): T[] => {
  if (Array.isArray(value)) return value;
  console.warn("Non-array value passed to safeArray:", typeof value);
  return [];
};

export const safeArrayReduce = <T, U>(
  array: T[],
  reducer: (acc: U, current: T, index: number) => U,
  initialValue: U,
): U => {
  try {
    const safeArr = safeArray(array);
    return safeArr.reduce(reducer, initialValue);
  } catch (error) {
    console.error("Error in array reduce operation:", error);
    return initialValue;
  }
};

export const safeArrayMap = <T, U>(
  array: T[],
  mapper: (item: T, index: number) => U,
): U[] => {
  try {
    const safeArr = safeArray(array);
    return safeArr.map(mapper);
  } catch (error) {
    console.error("Error in array map operation:", error);
    return [];
  }
};

export const safeArrayFilter = <T>(
  array: T[],
  predicate: (item: T, index: number) => boolean,
): T[] => {
  try {
    const safeArr = safeArray(array);
    return safeArr.filter(predicate);
  } catch (error) {
    console.error("Error in array filter operation:", error);
    return [];
  }
};

// Safe string operations
export const safeString = (value: any, defaultValue: string = ""): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return defaultValue;
  try {
    return String(value);
  } catch {
    return defaultValue;
  }
};

// Safe object property access
export const safeGet = <T>(obj: any, path: string, defaultValue: T): T => {
  try {
    if (!obj || typeof obj !== "object") return defaultValue;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current !== undefined ? current : defaultValue;
  } catch {
    return defaultValue;
  }
};

// Data validation functions
export const validateEmployee = (employee: any): employee is Employee => {
  if (!employee || typeof employee !== "object") return false;

  return (
    typeof employee.id === "string" &&
    employee.id.length > 0 &&
    typeof employee.name === "string" &&
    employee.name.trim().length > 0 &&
    typeof employee.title === "string" &&
    safeNumber(employee.costWage) >= 0 &&
    safeNumber(employee.billableWage) >= 0
  );
};

export const validateJob = (job: any): job is Job => {
  if (!job || typeof job !== "object") return false;

  return (
    typeof job.id === "string" &&
    job.id.length > 0 &&
    typeof job.jobNumber === "string" &&
    job.jobNumber.trim().length > 0 &&
    typeof job.name === "string" &&
    job.name.trim().length > 0 &&
    typeof job.isActive === "boolean"
  );
};

export const validateTimeEntry = (entry: any): entry is TimeEntry => {
  if (!entry || typeof entry !== "object") return false;

  return (
    typeof entry.id === "string" &&
    entry.id.length > 0 &&
    typeof entry.employeeId === "string" &&
    entry.employeeId.length > 0 &&
    typeof entry.jobId === "string" &&
    entry.jobId.length > 0 &&
    typeof entry.date === "string" &&
    entry.date.match(/^\d{4}-\d{2}-\d{2}$/) &&
    safeNumber(entry.hours) > 0 &&
    safeNumber(entry.costWageUsed) >= 0 &&
    safeNumber(entry.billableWageUsed) >= 0
  );
};

export const validateAppData = (data: any): data is AppData => {
  if (!data || typeof data !== "object") return false;

  try {
    const employees = safeArray(data.employees);
    const jobs = safeArray(data.jobs);
    const timeEntries = safeArray(data.timeEntries);
    const hourTypes = safeArray(data.hourTypes);
    const provinces = safeArray(data.provinces);

    // Validate critical arrays exist
    if (
      !Array.isArray(employees) ||
      !Array.isArray(jobs) ||
      !Array.isArray(timeEntries)
    ) {
      return false;
    }

    // Validate some core entries (not all for performance)
    const sampleEmployees = employees.slice(0, 5);
    const sampleJobs = jobs.slice(0, 5);
    const sampleTimeEntries = timeEntries.slice(0, 10);

    return (
      sampleEmployees.every(validateEmployee) &&
      sampleJobs.every(validateJob) &&
      sampleTimeEntries.every(validateTimeEntry)
    );
  } catch (error) {
    console.error("AppData validation error:", error);
    return false;
  }
};

// Safe localStorage operations
export const safeLocalStorageGet = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;

    const parsed = JSON.parse(item);
    return parsed !== null ? parsed : defaultValue;
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const safeLocalStorageSet = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing localStorage key "${key}":`, error);

    // Handle quota exceeded
    if (error instanceof DOMException && error.code === 22) {
      console.warn("LocalStorage quota exceeded. Attempting cleanup...");
      try {
        // Clear some old autosave data
        const autosaveKey = key.includes("autosave") ? key : `${key}-autosave`;
        localStorage.removeItem(autosaveKey);
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        console.error("Could not free up localStorage space");
      }
    }

    return false;
  }
};

// Memory usage monitoring
export const getMemoryUsage = (): { used: number; total: number } => {
  try {
    // @ts-ignore - performance.memory is not in all browsers
    if (performance.memory) {
      return {
        // @ts-ignore
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        // @ts-ignore
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      };
    }
  } catch (error) {
    console.warn("Memory monitoring not available:", error);
  }

  return { used: 0, total: 0 };
};

// Data size monitoring
export const getDataSize = (data: any): number => {
  try {
    return new Blob([JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
};

// Stress test utilities
export const generateStressTestData = (options: {
  employees?: number;
  jobs?: number;
  timeEntries?: number;
}): Partial<AppData> => {
  const { employees = 100, jobs = 50, timeEntries = 1000 } = options;

  console.log(
    `Generating stress test data: ${employees} employees, ${jobs} jobs, ${timeEntries} time entries`,
  );

  const stressEmployees: Employee[] = [];
  const stressJobs: Job[] = [];
  const stressTimeEntries: TimeEntry[] = [];

  // Generate employees
  for (let i = 0; i < employees; i++) {
    stressEmployees.push({
      id: `stress-emp-${i}`,
      name: `Test Employee ${i + 1}`,
      title: `Title ${(i % 10) + 1}`,
      costWage: 20 + (i % 30),
      billableWage: 40 + (i % 50),
      isActive: i % 10 !== 0, // 90% active
      category: i % 5 === 0 ? "dsp" : "employee",
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }

  // Generate jobs
  for (let i = 0; i < jobs; i++) {
    stressJobs.push({
      id: `stress-job-${i}`,
      jobNumber: `STRESS-${String(i + 1).padStart(4, "0")}`,
      name: `Stress Test Job ${i + 1}`,
      description: `Description for stress test job ${i + 1}`,
      isActive: i % 20 !== 0, // 95% active
      isBillable: i % 5 !== 0, // 80% billable
      invoicedDates: [],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    });
  }

  // Generate time entries
  for (let i = 0; i < timeEntries; i++) {
    const employeeIndex = i % employees;
    const jobIndex = i % jobs;
    const daysAgo = i % 365; // Spread over a year

    stressTimeEntries.push({
      id: `stress-entry-${i}`,
      employeeId: `stress-emp-${employeeIndex}`,
      jobId: `stress-job-${jobIndex}`,
      hourTypeId: `${(i % 8) + 1}`, // Cycle through hour types
      provinceId: `${(i % 13) + 1}`, // Cycle through provinces
      date: new Date(Date.now() - daysAgo * 86400000)
        .toISOString()
        .split("T")[0],
      hours: Math.round((Math.random() * 12 + 1) * 100) / 100, // 1-13 hours
      description: `Stress test entry ${i + 1}`,
      costWageUsed: 20 + (i % 30),
      billableWageUsed: 40 + (i % 50),
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
  }

  return {
    employees: stressEmployees,
    jobs: stressJobs,
    timeEntries: stressTimeEntries,
  };
};

// Performance monitoring
export const performanceTest = async (
  testName: string,
  testFn: () => void | Promise<void>,
): Promise<number> => {
  const startTime = performance.now();
  const startMemory = getMemoryUsage();

  try {
    await testFn();
    const endTime = performance.now();
    const endMemory = getMemoryUsage();
    const duration = endTime - startTime;

    console.log(`Performance Test: ${testName}`);
    console.log(`  Duration: ${duration.toFixed(2)}ms`);
    console.log(
      `  Memory used: ${startMemory.used}MB → ${endMemory.used}MB (${endMemory.used - startMemory.used > 0 ? "+" : ""}${endMemory.used - startMemory.used}MB)`,
    );

    return duration;
  } catch (error) {
    console.error(`Performance test "${testName}" failed:`, error);
    throw error;
  }
};

// Error boundary utilities
export const withErrorBoundary = <T>(
  fn: () => T,
  fallback: T,
  errorMessage: string = "Operation failed",
): T => {
  try {
    return fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return fallback;
  }
};

// Async error boundary
export const withAsyncErrorBoundary = async <T>(
  fn: () => Promise<T>,
  fallback: T,
  errorMessage: string = "Async operation failed",
): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    return fallback;
  }
};

// System health check
export const systemHealthCheck = (
  appData: AppData,
): {
  status: "healthy" | "warning" | "critical";
  issues: string[];
  metrics: {
    employeeCount: number;
    jobCount: number;
    timeEntryCount: number;
    dataSize: number;
    memoryUsage: { used: number; total: number };
  };
} => {
  const issues: string[] = [];
  const metrics = {
    employeeCount: safeArray(appData.employees).length,
    jobCount: safeArray(appData.jobs).length,
    timeEntryCount: safeArray(appData.timeEntries).length,
    dataSize: getDataSize(appData),
    memoryUsage: getMemoryUsage(),
  };

  // Check for data integrity issues
  if (metrics.employeeCount === 0) {
    issues.push("No employees found - system may not function properly");
  }

  if (metrics.jobCount === 0) {
    issues.push("No jobs found - time entries cannot be created");
  }

  // Check for performance issues
  if (metrics.dataSize > 10 * 1024 * 1024) {
    // 10MB
    issues.push("Large data size detected - may impact performance");
  }

  if (metrics.timeEntryCount > 10000) {
    issues.push("Large number of time entries - consider archiving old data");
  }

  if (metrics.memoryUsage.used > 100) {
    // 100MB
    issues.push("High memory usage detected");
  }

  // Check data validation
  if (!validateAppData(appData)) {
    issues.push("Data validation failed - corrupted data detected");
  }

  // Determine status
  let status: "healthy" | "warning" | "critical" = "healthy";
  if (issues.length > 0) {
    status = issues.some(
      (issue) =>
        issue.includes("corrupted") ||
        issue.includes("No employees") ||
        issue.includes("validation failed"),
    )
      ? "critical"
      : "warning";
  }

  return { status, issues, metrics };
};

export default {
  safeNumber,
  safeDivide,
  safePercentage,
  safeArray,
  safeArrayReduce,
  safeArrayMap,
  safeArrayFilter,
  safeString,
  safeGet,
  validateEmployee,
  validateJob,
  validateTimeEntry,
  validateAppData,
  safeLocalStorageGet,
  safeLocalStorageSet,
  getMemoryUsage,
  getDataSize,
  generateStressTestData,
  performanceTest,
  withErrorBoundary,
  withAsyncErrorBoundary,
  systemHealthCheck,
};
