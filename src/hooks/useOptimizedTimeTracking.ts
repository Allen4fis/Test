import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  AppData,
  Employee,
  Job,
  HourType,
  Province,
  TimeEntry,
  RentalItem,
  RentalEntry,
  SummaryByTitleAndJob,
  SummaryByDateAndName,
  TimeEntrySummary,
  CostSummaryByEmployee,
  CostSummaryByJob,
} from "@/types";
import {
  safeNumber,
  safeDivide,
  safeArray,
  safeArrayReduce,
  safeArrayMap,
  safeArrayFilter,
  safeString,
  validateAppData,
  withErrorBoundary,
  systemHealthCheck,
} from "@/utils/systemReliability";

// Performance optimizations for large datasets
const LARGE_DATASET_THRESHOLD = 10000;
const BATCH_SIZE = 1000;
const DEBOUNCE_DELAY = 300;

// Memoization cache for expensive calculations
const calculationCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  value: any;
  timestamp: number;
}

// Optimized cache with TTL
function getCachedValue(key: string): any | null {
  const entry = calculationCache.get(key) as CacheEntry;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL) {
    calculationCache.delete(key);
    return null;
  }

  return entry.value;
}

function setCachedValue(key: string, value: any): void {
  calculationCache.set(key, {
    value,
    timestamp: Date.now(),
  });

  // Prevent cache from growing too large
  if (calculationCache.size > 100) {
    const entries = Array.from(calculationCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toDelete = entries.slice(0, 20); // Remove oldest 20 entries
    toDelete.forEach(([key]) => calculationCache.delete(key));
  }
}

// Debounced function utility
function useDebounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    },
    [func, delay],
  ) as T;
}

// Batch processing for large operations
function processBatch<T, R>(
  items: T[],
  processor: (batch: T[]) => R[],
  batchSize: number = BATCH_SIZE,
): Promise<R[]> {
  return new Promise((resolve) => {
    const results: R[] = [];
    let index = 0;

    function processBatchChunk() {
      const batch = items.slice(index, index + batchSize);
      if (batch.length === 0) {
        resolve(results);
        return;
      }

      const batchResults = processor(batch);
      results.push(...batchResults);
      index += batchSize;

      // Use requestAnimationFrame to prevent blocking the UI
      requestAnimationFrame(processBatchChunk);
    }

    processBatchChunk();
  });
}

// Optimized data filtering with indexing
class DataIndex {
  private employeeIndex: Map<string, TimeEntry[]> = new Map();
  private jobIndex: Map<string, TimeEntry[]> = new Map();
  private dateIndex: Map<string, TimeEntry[]> = new Map();
  private isDirty = true;

  buildIndex(timeEntries: TimeEntry[]) {
    if (!this.isDirty) return;

    this.employeeIndex.clear();
    this.jobIndex.clear();
    this.dateIndex.clear();

    for (const entry of timeEntries) {
      // Employee index
      if (!this.employeeIndex.has(entry.employeeId)) {
        this.employeeIndex.set(entry.employeeId, []);
      }
      this.employeeIndex.get(entry.employeeId)!.push(entry);

      // Job index
      if (!this.jobIndex.has(entry.jobId)) {
        this.jobIndex.set(entry.jobId, []);
      }
      this.jobIndex.get(entry.jobId)!.push(entry);

      // Date index
      if (!this.dateIndex.has(entry.date)) {
        this.dateIndex.set(entry.date, []);
      }
      this.dateIndex.get(entry.date)!.push(entry);
    }

    this.isDirty = false;
  }

  markDirty() {
    this.isDirty = true;
  }

  getByEmployee(employeeId: string): TimeEntry[] {
    return this.employeeIndex.get(employeeId) || [];
  }

  getByJob(jobId: string): TimeEntry[] {
    return this.jobIndex.get(jobId) || [];
  }

  getByDate(date: string): TimeEntry[] {
    return this.dateIndex.get(date) || [];
  }

  getByDateRange(startDate: string, endDate: string): TimeEntry[] {
    const result: TimeEntry[] = [];
    for (const [date, entries] of this.dateIndex) {
      if (date >= startDate && date <= endDate) {
        result.push(...entries);
      }
    }
    return result;
  }
}

// Default data function (unchanged for compatibility)
const getDefaultAppData = (): AppData => ({
  employees: [],
  jobs: [],
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
    { id: "6", name: "Northwest Territories", code: "NT" },
    { id: "7", name: "Nova Scotia", code: "NS" },
    { id: "8", name: "Nunavut", code: "NU" },
    { id: "9", name: "Ontario", code: "ON" },
    { id: "10", name: "Prince Edward Island", code: "PE" },
    { id: "11", name: "Quebec", code: "QC" },
    { id: "12", name: "Saskatchewan", code: "SK" },
    { id: "13", name: "Yukon", code: "YT" },
  ],
  timeEntries: [],
  rentalItems: [],
  rentalEntries: [],
});

export function useOptimizedTimeTracking() {
  const [rawAppData, setRawAppData] = useLocalStorage<AppData>(
    "timeTrackingApp",
    getDefaultAppData(),
  );

  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "timeEntry"
    | "timeViewer"
    | "employeeManagement"
    | "jobManagement"
    | "rentalManagement"
    | "summaryReports"
    | "costReports"
    | "invoiceManagement"
    | "dataExport"
    | "backupManagement"
  >("dashboard");

  // Performance monitoring
  const performanceMetrics = useRef({
    lastUpdateTime: Date.now(),
    calculationCount: 0,
    averageCalculationTime: 0,
  });

  // Data index for fast lookups
  const dataIndex = useRef(new DataIndex());

  // Update index when data changes
  useEffect(() => {
    dataIndex.current.markDirty();
    if (appData.timeEntries && Array.isArray(appData.timeEntries)) {
      dataIndex.current.buildIndex(appData.timeEntries);
    }
  }, [rawAppData.timeEntries]);

  // Validate and migrate data
  const appData = useMemo(() => {
    try {
      const validated = validateAppData(rawAppData);
      return validated;
    } catch (error) {
      console.error("Data validation failed:", error);
      return getDefaultAppData();
    }
  }, [rawAppData]);

  // Optimized setAppData with debouncing
  const setAppData = useDebounce(
    (data: AppData | ((prev: AppData) => AppData)) => {
      if (typeof data === "function") {
        setRawAppData((prev) => {
          const result = data(prev);
          return {
            ...result,
            jobs: (result.jobs || []).map((job) => ({
              ...job,
              invoicedDates: job.invoicedDates || [],
            })),
          };
        });
      } else {
        setRawAppData({
          ...data,
          jobs: (data.jobs || []).map((job) => ({
            ...job,
            invoicedDates: job.invoicedDates || [],
          })),
        });
      }
    },
    DEBOUNCE_DELAY,
  );

  // Optimized time entry summaries with caching
  const timeEntrySummaries = useMemo((): TimeEntrySummary[] => {
    if (!appData.timeEntries || !Array.isArray(appData.timeEntries)) {
      return [];
    }

    const cacheKey = `timeEntrySummaries_${appData.timeEntries.length}_${JSON.stringify(appData.timeEntries.slice(-5).map((e) => e.id))}`;
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;

    const start = performance.now();

    const summaries = appData.timeEntries.map((entry) => {
      const employee = appData.employees.find(
        (emp) => emp.id === entry.employeeId,
      );
      const job = appData.jobs.find((j) => j.id === entry.jobId);
      const hourType = appData.hourTypes.find(
        (ht) => ht.id === entry.hourTypeId,
      );
      const province = appData.provinces.find((p) => p.id === entry.provinceId);

      const isEmprig = hourType?.name === "Employee Rig";
      const baseEff = entry.hours * (hourType?.multiplier || 1);
      const effectiveHours = isEmprig ? (() => { const h = Math.max(0, entry.hours || 0); const reg = Math.min(8, h); const ot = Math.min(4, Math.max(0, h - 8)); const dt = Math.max(0, h - 12); return reg * 1 + ot * 1.5 + dt * 2; })() : baseEff;
      let adjustedBillableWage = entry.billableWageUsed || 0;
      let adjustedCostWage = entry.costWageUsed || 0;

      // Add $3 for NS hour types
      if (hourType?.name?.startsWith("NS ")) {
        adjustedBillableWage += 3;
        adjustedCostWage += 3;
      }

      const totalBillableAmount = (isEmprig ? entry.hours : effectiveHours) * adjustedBillableWage;

      let totalCost = 0;
      if (isEmprig) {
        totalCost = effectiveHours * adjustedCostWage; // Always tiered for EMPRIG
      } else if (employee?.category === "dsp") {
        totalCost = entry.hours * adjustedCostWage;
      } else {
        totalCost = effectiveHours * adjustedCostWage;
      }

      const loaCost = (entry.loaCount || 0) * 200;
      const loaBillable = (entry.loaCount || 0) * 200;

      return {
        employeeName: employee?.name || "Unknown Employee",
        employeeTitle: entry.title || employee?.title || "Unknown Title",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        hourTypeName: hourType?.name || "Unknown Hour Type",
        provinceName: province?.name || "Unknown Province",
        date: entry.date,
        hours: hourType?.name === "Billable" ? 0 : entry.hours, // Exclude Billable from hour counts
        effectiveHours: hourType?.name === "Billable" ? 0 : effectiveHours, // Exclude Billable from effective hour counts
        loaCount: entry.loaCount,
        billableWage: entry.billableWageUsed || 0,
        costWage: entry.costWageUsed || 0,
        totalBillableAmount: totalBillableAmount + loaBillable,
        totalCost: totalCost + loaCost,
      };
    });

    const calculationTime = performance.now() - start;

    // Update performance metrics
    performanceMetrics.current.calculationCount++;
    performanceMetrics.current.averageCalculationTime =
      (performanceMetrics.current.averageCalculationTime + calculationTime) / 2;

    setCachedValue(cacheKey, summaries);
    return summaries;
  }, [appData]);

  // Optimized cost summaries with batch processing for large datasets
  const costSummaryByEmployee = useMemo((): CostSummaryByEmployee[] => {
    if (
      !appData.timeEntries ||
      !Array.isArray(appData.timeEntries) ||
      !appData.employees ||
      !Array.isArray(appData.employees)
    ) {
      return [];
    }

    const cacheKey = `costSummaryByEmployee_${appData.timeEntries.length}_${appData.employees.length}`;
    const cached = getCachedValue(cacheKey);
    if (cached) return cached;

    const grouped = appData.timeEntries.reduce(
      (acc, entry) => {
        const employee = appData.employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const hourType = appData.hourTypes.find(
          (ht) => ht.id === entry.hourTypeId,
        );

        if (!employee || !hourType) return acc;

        const isEmprig = hourType.name === "Employee Rig";
        const effectiveHours = isEmprig ? (() => { const h = Math.max(0, entry.hours || 0); const reg = Math.min(8, h); const ot = Math.min(4, Math.max(0, h - 8)); const dt = Math.max(0, h - 12); return reg * 1 + ot * 1.5 + dt * 2; })() : entry.hours * hourType.multiplier;
        let adjustedCostWage = entry.costWageUsed || 0;
        let adjustedBillableWage = entry.billableWageUsed || 0;

        if (hourType.name.startsWith("NS ")) {
          adjustedCostWage += 3;
          adjustedBillableWage += 3;
        }

        let cost = 0;
        // Use stored employee category from entry, not current category
        const entryEmployeeCategory =
          entry.employeeCategory || employee.category;
        const manager = employee?.managerId
          ? employees.find((emp) => emp.id === employee.managerId)
          : null;

        const shouldUse1xRates =
          entryEmployeeCategory === "dsp" || // Entry was created when employee was DSP
          (employee?.managerId && manager?.category === "dsp"); // Current subordinate of DSP

        if (isEmprig) {
          cost = effectiveHours * adjustedCostWage; // Always tiered for EMPRIG
        } else if (shouldUse1xRates) {
          cost = entry.hours * adjustedCostWage; // 1x for DSPs and subordinates
        } else {
          cost = effectiveHours * adjustedCostWage; // Normal rates for DSPOT/others
        }

        const billableAmount = (isEmprig ? entry.hours : effectiveHours) * adjustedBillableWage;
        const loaCost = (entry.loaCount || 0) * 200;
        const loaBillable = (entry.loaCount || 0) * 200;

        if (!acc[employee.id]) {
          acc[employee.id] = {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeTitle: employee.title,
            billableWage: employee.billableWage || 0,
            costWage: employee.costWage || 0,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalBillableAmount: 0,
            totalCost: 0,
            entries: [],
          };
        }

        // Only count hours towards totals if it's not "Billable" hour type
        if (hourType.name !== "Billable") {
          acc[employee.id].totalHours += entry.hours;
          acc[employee.id].totalEffectiveHours += effectiveHours;
        }

        acc[employee.id].totalBillableAmount += billableAmount + loaBillable;
        acc[employee.id].totalCost += cost + loaCost;
        acc[employee.id].entries.push(entry);

        return acc;
      },
      {} as Record<string, CostSummaryByEmployee>,
    );

    const result = Object.values(grouped).sort(
      (a, b) => b.totalCost - a.totalCost,
    );
    setCachedValue(cacheKey, result);
    return result;
  }, [appData]);

  // Optimized operations with better error handling
  const addTimeEntry = useCallback(
    (entry: Omit<TimeEntry, "id" | "createdAt">) => {
      const now = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const newEntry: TimeEntry = {
        ...entry,
        id: `${now}-${randomSuffix}`,
        createdAt: new Date().toISOString(),
      };

      setAppData((prev) => ({
        ...prev,
        timeEntries: [...prev.timeEntries, newEntry],
      }));
    },
    [setAppData],
  );

  const deleteTimeEntry = useCallback(
    (id: string) => {
      setAppData((prev) => ({
        ...prev,
        timeEntries: prev.timeEntries.filter((entry) => entry.id !== id),
      }));
    },
    [setAppData],
  );

  const updateTimeEntry = useCallback(
    (id: string, updates: Partial<TimeEntry>) => {
      setAppData((prev) => ({
        ...prev,
        timeEntries: prev.timeEntries.map((entry) =>
          entry.id === id ? { ...entry, ...updates } : entry,
        ),
      }));
    },
    [setAppData],
  );

  // Bulk operations for better performance
  const addMultipleTimeEntries = useCallback(
    (entries: Omit<TimeEntry, "id" | "createdAt">[]) => {
      const newEntries: TimeEntry[] = entries.map((entry, index) => {
        const now = Date.now() + index;
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        return {
          ...entry,
          id: `${now}-${randomSuffix}`,
          createdAt: new Date(now).toISOString(),
        };
      });

      setAppData((prev) => ({
        ...prev,
        timeEntries: [...prev.timeEntries, ...newEntries],
      }));
    },
    [setAppData],
  );

  const deleteMultipleTimeEntries = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setAppData((prev) => ({
        ...prev,
        timeEntries: prev.timeEntries.filter((entry) => !idSet.has(entry.id)),
      }));
    },
    [setAppData],
  );

  // Performance monitoring functions
  const getPerformanceMetrics = useCallback(() => {
    return {
      ...performanceMetrics.current,
      cacheSize: calculationCache.size,
      dataSize: {
        timeEntries: appData.timeEntries.length,
        employees: appData.employees.length,
        jobs: appData.jobs.length,
      },
      isLargeDataset: appData.timeEntries.length > LARGE_DATASET_THRESHOLD,
    };
  }, [appData]);

  const clearPerformanceCache = useCallback(() => {
    calculationCache.clear();
  }, []);

  // Data archiving for old entries
  const archiveOldEntries = useCallback(
    (cutoffDate: string) => {
      const activeEntries = appData.timeEntries.filter(
        (entry) => entry.date >= cutoffDate,
      );
      const archivedEntries = appData.timeEntries.filter(
        (entry) => entry.date < cutoffDate,
      );

      // Store archived entries separately
      const archiveKey = `timeTrackingApp-archive-${cutoffDate}`;
      try {
        localStorage.setItem(archiveKey, JSON.stringify(archivedEntries));

        setAppData((prev) => ({
          ...prev,
          timeEntries: activeEntries,
        }));

        return archivedEntries.length;
      } catch (error) {
        console.error("Failed to archive entries:", error);
        return 0;
      }
    },
    [appData.timeEntries, setAppData],
  );

  // Fast search using indices
  const searchTimeEntries = useCallback(
    (filters: {
      employeeId?: string;
      jobId?: string;
      dateRange?: { start: string; end: string };
      hourTypeId?: string;
    }): TimeEntry[] => {
      if (!appData.timeEntries || !Array.isArray(appData.timeEntries)) {
        return [];
      }

      let results = appData.timeEntries;

      if (filters.employeeId) {
        results = dataIndex.current.getByEmployee(filters.employeeId);
      }

      if (filters.jobId) {
        const jobEntries = dataIndex.current.getByJob(filters.jobId);
        results = filters.employeeId
          ? results.filter((entry) => jobEntries.includes(entry))
          : jobEntries;
      }

      if (filters.dateRange) {
        const dateEntries = dataIndex.current.getByDateRange(
          filters.dateRange.start,
          filters.dateRange.end,
        );
        results = results.filter((entry) => dateEntries.includes(entry));
      }

      if (filters.hourTypeId) {
        results = results.filter(
          (entry) => entry.hourTypeId === filters.hourTypeId,
        );
      }

      return results;
    },
    [appData.timeEntries],
  );

  return {
    // Core data
    employees: appData.employees || [],
    jobs: appData.jobs || [],
    hourTypes: appData.hourTypes || [],
    provinces: appData.provinces || [],
    timeEntries: appData.timeEntries || [],
    rentalItems: appData.rentalItems || [],
    rentalEntries: appData.rentalEntries || [],

    // View state
    selectedView,
    setSelectedView,

    // Optimized operations
    addTimeEntry,
    deleteTimeEntry,
    updateTimeEntry,
    addMultipleTimeEntries,
    deleteMultipleTimeEntries,

    // Fast search
    searchTimeEntries,

    // Summaries (cached)
    timeEntrySummaries,
    costSummaryByEmployee,

    // Performance utilities
    getPerformanceMetrics,
    clearPerformanceCache,
    archiveOldEntries,

    // Original functions for compatibility (can be gradually replaced)
    resetData: () => setRawAppData(getDefaultAppData()),
    restoreFromBackup: (backupData: AppData) => setRawAppData(backupData),
  };
}
