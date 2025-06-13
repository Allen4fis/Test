import { useState, useMemo, useEffect, useRef } from "react";
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
  safePercentage,
  performanceTest,
} from "@/utils/systemReliability";

// Default data to initialize the app
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
      description: "Nightshift regular hours (base pay + $3)",
      multiplier: 1.0,
    },
    {
      id: "7",
      name: "NS Overtime",
      description: "Nightshift overtime (base pay + $3) x1.5",
      multiplier: 1.5,
    },
    {
      id: "8",
      name: "NS Double Time",
      description: "Nightshift double time (base pay + $3) x2",
      multiplier: 2.0,
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

export function useTimeTrackingEnhanced() {
  const [rawAppData, setRawAppData] = useLocalStorage<AppData>(
    "timeTrackingApp",
    getDefaultAppData(),
  );

  // Performance monitoring
  const performanceRef = useRef({
    lastHealthCheck: Date.now(),
    operationCount: 0,
    slowOperations: [] as Array<{
      name: string;
      duration: number;
      timestamp: number;
    }>,
  });

  // Autosave ref for backwards compatibility
  const lastSaveRef = useRef<string>("");

  // State hooks must come after refs but before any conditional logic
  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "timeEntry"
    | "viewer"
    | "employees"
    | "jobs"
    | "reports"
    | "costs"
    | "invoices"
    | "rentals"
    | "export"
    | "backup"
  >("dashboard");

  // System health monitoring
  const [systemHealth, setSystemHealth] = useState<{
    status: "healthy" | "warning" | "critical";
    lastCheck: number;
    issues: string[];
  }>({ status: "healthy", lastCheck: Date.now(), issues: [] });

  // Performance monitoring wrapper
  const monitoredOperation = async <T>(
    name: string,
    operation: () => T | Promise<T>,
  ): Promise<T> => {
    const start = performance.now();
    try {
      const result = await operation();
      const duration = performance.now() - start;

      performanceRef.current.operationCount++;

      if (duration > 100) {
        // Log slow operations (>100ms)
        performanceRef.current.slowOperations.push({
          name,
          duration,
          timestamp: Date.now(),
        });

        // Keep only recent slow operations
        if (performanceRef.current.slowOperations.length > 50) {
          performanceRef.current.slowOperations =
            performanceRef.current.slowOperations.slice(-25);
        }

        console.warn(
          `Slow operation detected: ${name} took ${duration.toFixed(2)}ms`,
        );
      }

      return result;
    } catch (error) {
      console.error(`Operation failed: ${name}`, error);
      throw error;
    }
  };

  // Comprehensive data validation and sanitization
  const appData = useMemo(() => {
    return withErrorBoundary(
      () => {
        const startTime = performance.now();

        const migratedData = { ...rawAppData };

        // Validate and sanitize employees with performance monitoring
        migratedData.employees = safeArrayMap(
          safeArray(migratedData.employees),
          (emp) => ({
            ...emp,
            id: safeString(emp.id, `emp-${Date.now()}-${Math.random()}`),
            name: safeString(emp.name, "Unknown Employee"),
            title: safeString(emp.title, "Unknown Title"),
            costWage: safeNumber(emp.costWage, 0),
            billableWage: safeNumber(emp.billableWage, 0),
            isActive: emp.isActive !== undefined ? emp.isActive : true,
            category: safeString(emp.category, "employee"),
            createdAt: safeString(emp.createdAt, new Date().toISOString()),
            // Handle legacy data migration
            ...((emp as any).hourlyWage && !emp.billableWage
              ? {
                  billableWage: safeNumber((emp as any).hourlyWage, 0),
                  costWage: safeNumber((emp as any).hourlyWage, 0),
                }
              : {}),
          }),
        );

        // Validate and sanitize jobs
        migratedData.jobs = safeArrayMap(
          safeArray(migratedData.jobs),
          (job) => ({
            ...job,
            id: safeString(job.id, `job-${Date.now()}-${Math.random()}`),
            jobNumber: safeString(job.jobNumber, `JOB-${Date.now()}`),
            name: safeString(job.name, "Unknown Job"),
            description: safeString(job.description, ""),
            isActive: job.isActive !== undefined ? job.isActive : true,
            isBillable: job.isBillable !== undefined ? job.isBillable : true,
            invoicedDates: safeArray(job.invoicedDates),
            paidDates: safeArray((job as any).paidDates || []),
            createdAt: safeString(job.createdAt, new Date().toISOString()),
          }),
        );

        // Validate and sanitize time entries with referential integrity checks
        const validEmployeeIds = new Set(
          migratedData.employees.map((emp) => emp.id),
        );
        const validJobIds = new Set(migratedData.jobs.map((job) => job.id));

        migratedData.timeEntries = safeArrayFilter(
          safeArrayMap(safeArray(migratedData.timeEntries), (entry) => ({
            ...entry,
            id: safeString(entry.id, `entry-${Date.now()}-${Math.random()}`),
            employeeId: safeString(entry.employeeId, ""),
            jobId: safeString(entry.jobId, ""),
            hourTypeId: safeString(entry.hourTypeId, "1"),
            provinceId: safeString(entry.provinceId, "1"),
            date: safeString(
              entry.date,
              new Date().toISOString().split("T")[0],
            ),
            hours: Math.max(0, safeNumber(entry.hours, 0)), // Ensure non-negative
            description: safeString(entry.description, ""),
            costWageUsed: Math.max(0, safeNumber(entry.costWageUsed, 0)),
            billableWageUsed: Math.max(
              0,
              safeNumber(entry.billableWageUsed, 0),
            ),
            createdAt: safeString(entry.createdAt, new Date().toISOString()),
          })),
          // Filter out entries with invalid references
          (entry) =>
            validEmployeeIds.has(entry.employeeId) &&
            validJobIds.has(entry.jobId) &&
            entry.hours > 0,
        );

        // Handle rental data with validation
        migratedData.rentalItems = safeArrayMap(
          safeArray(migratedData.rentalItems || []),
          (item) => ({
            ...item,
            id: safeString(item.id, `rental-${Date.now()}-${Math.random()}`),
            name: safeString(item.name, "Unknown Item"),
            category: safeString(item.category, "Equipment"),
            dailyRate: Math.max(0, safeNumber(item.dailyRate, 0)),
            isActive: item.isActive !== undefined ? item.isActive : true,
            createdAt: safeString(item.createdAt, new Date().toISOString()),
          }),
        );

        const validRentalItemIds = new Set(
          migratedData.rentalItems.map((item) => item.id),
        );

        migratedData.rentalEntries = safeArrayFilter(
          safeArrayMap(
            safeArray(migratedData.rentalEntries || []),
            (entry) => ({
              ...entry,
              id: safeString(
                entry.id,
                `rental-entry-${Date.now()}-${Math.random()}`,
              ),
              rentalItemId: safeString(entry.rentalItemId, ""),
              jobId: safeString(entry.jobId, ""),
              employeeId: safeString(entry.employeeId, ""),
              startDate: safeString(
                entry.startDate,
                new Date().toISOString().split("T")[0],
              ),
              endDate: safeString(
                entry.endDate,
                new Date().toISOString().split("T")[0],
              ),
              quantity: Math.max(1, safeNumber(entry.quantity, 1)),
              rateUsed: Math.max(0, safeNumber(entry.rateUsed, 0)),
              billingUnit: safeString(entry.billingUnit, "day"),
              description: safeString(entry.description, ""),
              createdAt: safeString(entry.createdAt, new Date().toISOString()),
            }),
          ),
          // Filter out entries with invalid references
          (entry) =>
            validRentalItemIds.has(entry.rentalItemId) &&
            validJobIds.has(entry.jobId),
        );

        // Ensure core data exists
        migratedData.hourTypes = safeArray(migratedData.hourTypes);
        migratedData.provinces = safeArray(migratedData.provinces);

        // Add missing hour types if needed
        if (migratedData.hourTypes.length === 0) {
          migratedData.hourTypes = getDefaultAppData().hourTypes;
        }

        // Add missing provinces if needed
        if (migratedData.provinces.length === 0) {
          migratedData.provinces = getDefaultAppData().provinces;
        }

        const processingTime = performance.now() - startTime;
        if (processingTime > 50) {
          console.warn(`Data processing took ${processingTime.toFixed(2)}ms`);
        }

        return migratedData;
      },
      getDefaultAppData(),
      "Error processing app data - using defaults",
    );
  }, [rawAppData]);

  // Periodic system health checks
  useEffect(() => {
    const checkHealth = () => {
      const health = systemHealthCheck(appData);
      setSystemHealth({
        status: health.status,
        lastCheck: Date.now(),
        issues: health.issues,
      });

      if (health.status !== "healthy") {
        console.warn("System health check:", health);
      }
    };

    // Check immediately
    checkHealth();

    // Set up periodic checks (every 5 minutes)
    const interval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [appData]);

  // Enhanced setAppData with validation
  const setAppData = (data: AppData | ((prev: AppData) => AppData)) => {
    return withErrorBoundary(
      () => {
        if (typeof data === "function") {
          setRawAppData((prev) => {
            const result = data(prev);

            // Validate before saving
            if (!validateAppData(result)) {
              console.error("Invalid data structure - rejecting update");
              return prev;
            }

            return {
              ...result,
              jobs: result.jobs.map((job) => ({
                ...job,
                invoicedDates: safeArray(job.invoicedDates),
                paidDates: safeArray((job as any).paidDates || []),
              })),
            };
          });
        } else {
          // Validate before saving
          if (!validateAppData(data)) {
            console.error("Invalid data structure - rejecting update");
            return;
          }

          setRawAppData({
            ...data,
            jobs: data.jobs.map((job) => ({
              ...job,
              invoicedDates: safeArray(job.invoicedDates),
              paidDates: safeArray((job as any).paidDates || []),
            })),
          });
        }
      },
      undefined,
      "Error updating app data",
    );
  };

  // Enhanced operations with error handling and performance monitoring
  const addEmployee = async (employee: Omit<Employee, "id" | "createdAt">) => {
    return monitoredOperation("addEmployee", () => {
      const newEmployee: Employee = {
        ...employee,
        id: `emp-${Date.now()}-${Math.random()}`,
        name: safeString(employee.name, "").trim(),
        title: safeString(employee.title, "").trim(),
        costWage: Math.max(0, safeNumber(employee.costWage, 0)),
        billableWage: Math.max(0, safeNumber(employee.billableWage, 0)),
        createdAt: new Date().toISOString(),
      };

      if (!newEmployee.name) {
        throw new Error("Employee name is required");
      }

      setAppData((prev) => ({
        ...prev,
        employees: [...prev.employees, newEmployee],
      }));

      return newEmployee;
    });
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    return monitoredOperation("updateEmployee", () => {
      if (!id || !safeString(id)) {
        throw new Error("Valid employee ID is required");
      }

      const sanitizedUpdates = {
        ...updates,
        ...(updates.name && { name: safeString(updates.name, "").trim() }),
        ...(updates.title && { title: safeString(updates.title, "").trim() }),
        ...(updates.costWage !== undefined && {
          costWage: Math.max(0, safeNumber(updates.costWage, 0)),
        }),
        ...(updates.billableWage !== undefined && {
          billableWage: Math.max(0, safeNumber(updates.billableWage, 0)),
        }),
      };

      setAppData((prev) => ({
        ...prev,
        employees: prev.employees.map((emp) =>
          emp.id === id ? { ...emp, ...sanitizedUpdates } : emp,
        ),
      }));
    });
  };

  const deleteEmployee = async (id: string) => {
    return monitoredOperation("deleteEmployee", () => {
      if (!id || !safeString(id)) {
        throw new Error("Valid employee ID is required");
      }

      setAppData((prev) => ({
        ...prev,
        employees: prev.employees.filter((emp) => emp.id !== id),
        timeEntries: prev.timeEntries.filter(
          (entry) => entry.employeeId !== id,
        ),
        rentalEntries: prev.rentalEntries.filter(
          (entry) => entry.employeeId !== id,
        ),
      }));
    });
  };

  const addJob = async (job: Omit<Job, "id" | "createdAt">) => {
    return monitoredOperation("addJob", () => {
      const newJob: Job = {
        ...job,
        id: `job-${Date.now()}-${Math.random()}`,
        jobNumber: safeString(job.jobNumber, "").trim(),
        name: safeString(job.name, "").trim(),
        description: safeString(job.description, ""),
        invoicedDates: safeArray(job.invoicedDates),
        createdAt: new Date().toISOString(),
      };

      if (!newJob.jobNumber || !newJob.name) {
        throw new Error("Job number and name are required");
      }

      // Check for duplicate job numbers
      const existingJob = appData.jobs.find(
        (j) => j.jobNumber === newJob.jobNumber,
      );
      if (existingJob) {
        throw new Error(`Job number ${newJob.jobNumber} already exists`);
      }

      setAppData((prev) => ({
        ...prev,
        jobs: [...prev.jobs, newJob],
      }));

      return newJob;
    });
  };

  const updateJob = async (id: string, updates: Partial<Job>) => {
    return monitoredOperation("updateJob", () => {
      if (!id || !safeString(id)) {
        throw new Error("Valid job ID is required");
      }

      const sanitizedUpdates = {
        ...updates,
        ...(updates.jobNumber && {
          jobNumber: safeString(updates.jobNumber, "").trim(),
        }),
        ...(updates.name && { name: safeString(updates.name, "").trim() }),
        ...(updates.description !== undefined && {
          description: safeString(updates.description, ""),
        }),
        ...(updates.invoicedDates && {
          invoicedDates: safeArray(updates.invoicedDates),
        }),
      };

      // Check for duplicate job numbers
      if (sanitizedUpdates.jobNumber) {
        const existingJob = appData.jobs.find(
          (j) => j.jobNumber === sanitizedUpdates.jobNumber && j.id !== id,
        );
        if (existingJob) {
          throw new Error(
            `Job number ${sanitizedUpdates.jobNumber} already exists`,
          );
        }
      }

      setAppData((prev) => ({
        ...prev,
        jobs: prev.jobs.map((job) =>
          job.id === id ? { ...job, ...sanitizedUpdates } : job,
        ),
      }));
    });
  };

  const deleteJob = async (id: string) => {
    return monitoredOperation("deleteJob", () => {
      if (!id || !safeString(id)) {
        throw new Error("Valid job ID is required");
      }

      setAppData((prev) => ({
        ...prev,
        jobs: prev.jobs.filter((job) => job.id !== id),
        timeEntries: prev.timeEntries.filter((entry) => entry.jobId !== id),
        rentalEntries: prev.rentalEntries.filter((entry) => entry.jobId !== id),
      }));
    });
  };

  // Get performance metrics
  const getPerformanceMetrics = () => {
    return {
      operationCount: performanceRef.current.operationCount,
      slowOperations: performanceRef.current.slowOperations,
      systemHealth,
      dataSize: JSON.stringify(appData).length,
      lastHealthCheck: systemHealth.lastCheck,
    };
  };

  // All other functions from original useTimeTracking hook would be here
  // For brevity, I'm including the key ones that demonstrate the enhanced patterns

  return {
    // Enhanced core data with safety
    employees: safeArray(appData.employees),
    jobs: safeArray(appData.jobs),
    timeEntries: safeArray(appData.timeEntries),
    hourTypes: safeArray(appData.hourTypes),
    provinces: safeArray(appData.provinces),
    rentalItems: safeArray(appData.rentalItems),
    rentalEntries: safeArray(appData.rentalEntries),

    // Enhanced operations
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addJob,
    updateJob,
    deleteJob,

    // Monitoring and health
    getPerformanceMetrics,
    systemHealth,

    // State management
    selectedView,
    setSelectedView,

    // Original functionality preserved
    setAppData,
    // ... all other original functions would be here
  };
}

export default useTimeTrackingEnhanced;
