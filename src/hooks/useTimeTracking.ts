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

export function useTimeTracking() {
  const [rawAppData, setRawAppData] = useLocalStorage<AppData>(
    "timeTrackingApp",
    getDefaultAppData(),
  );

  // Autosave hooks - must be at the top to follow Rules of Hooks
  const lastSaveRef = useRef<string>("");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Ensure backward compatibility and data migrations
  const appData = useMemo(() => {
    const migratedData = { ...rawAppData };

    // Add invoicedDates to existing jobs that don't have it
    migratedData.jobs = rawAppData.jobs.map((job) => ({
      ...job,
      invoicedDates: job.invoicedDates || [],
    }));

    // Migrate employees from single hourlyWage to billableWage/costWage
    migratedData.employees = rawAppData.employees.map((employee) => {
      // If employee has the old structure (hourlyWage only)
      if ("hourlyWage" in employee && !("billableWage" in employee)) {
        const oldEmployee = employee as any;
        return {
          id: employee.id,
          name: employee.name,
          title: employee.title,
          email: employee.email,
          billableWage: oldEmployee.hourlyWage || 0,
          costWage: oldEmployee.hourlyWage || 0,
          createdAt: employee.createdAt,
        } as Employee;
      }
      return employee;
    });

    // Add title and wage fields to existing time entries that don't have them
    migratedData.timeEntries = rawAppData.timeEntries.map((entry) => {
      const employee = migratedData.employees.find(
        (emp) => emp.id === entry.employeeId,
      );

      const migratedEntry = { ...entry };

      // Add title if missing
      if (!migratedEntry.title) {
        migratedEntry.title = employee?.title || "Unknown Title";
      }

      // Add wage fields if missing
      if (!("billableWageUsed" in migratedEntry)) {
        migratedEntry.billableWageUsed = employee?.billableWage || 0;
      }

      if (!("costWageUsed" in migratedEntry)) {
        migratedEntry.costWageUsed = employee?.costWage || 0;
      }

      // Migrate LOA from hour type to separate field
      const hourType = rawAppData.hourTypes?.find(
        (ht) => ht.id === entry.hourTypeId,
      );
      if (hourType?.name === "LOA") {
        // Convert LOA hour entry to regular time entry with LOA count
        migratedEntry.loaCount = entry.hours; // Use hours as LOA count
        migratedEntry.hours = 0; // Set hours to 0 for LOA entries
        // Change to regular time hour type
        migratedEntry.hourTypeId = "1"; // Regular Time
      }

      return migratedEntry as TimeEntry;
    });

    // Remove LOA hour type if it exists (migrated to separate field)
    const existingHourTypes =
      rawAppData.hourTypes?.filter((ht) => ht.name !== "LOA") || [];

    // Get all standard hour types (excluding LOA)
    const allStandardHourTypes = getDefaultAppData().hourTypes;

    // Merge existing with defaults, preferring existing where IDs match
    const hourTypeMap = new Map();

    // First add all standard types
    allStandardHourTypes.forEach((ht) => {
      hourTypeMap.set(ht.id, ht);
    });

    // Then override with existing types (preserves any customizations)
    existingHourTypes.forEach((ht) => {
      hourTypeMap.set(ht.id, ht);
    });

    migratedData.hourTypes = Array.from(hourTypeMap.values());

    // Add rental data if it doesn't exist (backward compatibility)
    if (!migratedData.rentalItems) {
      migratedData.rentalItems = [];
    }
    if (!migratedData.rentalEntries) {
      migratedData.rentalEntries = [];
    }

    return migratedData;
  }, [rawAppData]);

  const setAppData = (data: AppData | ((prev: AppData) => AppData)) => {
    if (typeof data === "function") {
      setRawAppData((prev) => {
        const result = data(prev);
        return {
          ...result,
          jobs: result.jobs.map((job) => ({
            ...job,
            invoicedDates: job.invoicedDates || [],
          })),
        };
      });
    } else {
      setRawAppData({
        ...data,
        jobs: data.jobs.map((job) => ({
          ...job,
          invoicedDates: job.invoicedDates || [],
        })),
      });
    }
  };

  // Autosave functionality - saves every 10 minutes with efficient storage
  const AUTOSAVE_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds
  const AUTOSAVE_KEY = "timeTrackingApp-autosave";
  const MAX_AUTOSAVES = 3; // Keep only the last 3 autosaves to save storage

  // Generate a data hash for change detection
  const generateDataHash = (data: AppData): string => {
    return JSON.stringify({
      employeesCount: data.employees.length,
      jobsCount: data.jobs.length,
      timeEntriesCount: data.timeEntries.length,
      rentalItemsCount: data.rentalItems.length,
      rentalEntriesCount: data.rentalEntries.length,
      lastModified:
        data.timeEntries[0]?.createdAt || data.employees[0]?.createdAt || "",
    });
  };

  // Save autosave with rotation
  const performAutosave = () => {
    try {
      const currentHash = generateDataHash(appData);

      // Only save if data has changed
      if (currentHash === lastSaveRef.current) {
        return;
      }

      const autosave = {
        timestamp: new Date().toISOString(),
        data: appData,
        hash: currentHash,
      };

      // Get existing autosaves
      const existingAutosaves = JSON.parse(
        localStorage.getItem(AUTOSAVE_KEY) || "[]",
      );

      // Add new autosave and keep only the last MAX_AUTOSAVES
      const updatedAutosaves = [autosave, ...existingAutosaves].slice(
        0,
        MAX_AUTOSAVES,
      );

      // Save to localStorage
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(updatedAutosaves));
      lastSaveRef.current = currentHash;

      console.log(`Autosave completed at ${autosave.timestamp}`);
    } catch (error) {
      console.error("Autosave failed:", error);
    }
  };

  // Setup autosave timer
  useEffect(() => {
    // Initial hash
    lastSaveRef.current = generateDataHash(appData);

    // Setup periodic autosave
    autosaveTimerRef.current = setInterval(performAutosave, AUTOSAVE_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [appData]);

  // Function to get autosave info (for debugging or display)
  const getAutosaveInfo = () => {
    try {
      const autosaves = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "[]");
      return autosaves.map((save: any) => ({
        timestamp: save.timestamp,
        entriesCount: save.data?.timeEntries?.length || 0,
        employeesCount: save.data?.employees?.length || 0,
        jobsCount: save.data?.jobs?.length || 0,
      }));
    } catch {
      return [];
    }
  };

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

  // Employee operations
  const addEmployee = (employee: Omit<Employee, "id" | "createdAt">) => {
    const newEmployee: Employee = {
      ...employee,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      employees: [...prev.employees, newEmployee],
    }));
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setAppData((prev) => ({
      ...prev,
      employees: prev.employees.map((emp) =>
        emp.id === id ? { ...emp, ...updates } : emp,
      ),
    }));
  };

  const deleteEmployee = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      employees: prev.employees.filter((emp) => emp.id !== id),
      timeEntries: prev.timeEntries.filter((entry) => entry.employeeId !== id),
    }));
  };

  // Job operations
  const addJob = (job: Omit<Job, "id" | "createdAt">) => {
    const newJob: Job = {
      ...job,
      invoicedDates: job.invoicedDates || [],
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      jobs: [...prev.jobs, newJob],
    }));
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setAppData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === id ? { ...job, ...updates } : job,
      ),
    }));
  };

  const deleteJob = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      jobs: prev.jobs.filter((job) => job.id !== id),
      timeEntries: prev.timeEntries.filter((entry) => entry.jobId !== id),
    }));
  };

  // Invoice management for jobs
  const updateJobInvoicedDates = (jobId: string, dates: string[]) => {
    setAppData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === jobId ? { ...job, invoicedDates: dates } : job,
      ),
    }));
  };

  const addInvoicedDates = (jobId: string, dates: string[]) => {
    setAppData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              invoicedDates: [
                ...new Set([...(job.invoicedDates || []), ...dates]),
              ],
            }
          : job,
      ),
    }));
  };

  const removeInvoicedDates = (jobId: string, dates: string[]) => {
    setAppData((prev) => ({
      ...prev,
      jobs: prev.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              invoicedDates: (job.invoicedDates || []).filter(
                (date) => !dates.includes(date),
              ),
            }
          : job,
      ),
    }));
  };

  // Time entry operations
  const addTimeEntry = (entry: Omit<TimeEntry, "id" | "createdAt">) => {
    const newEntry: TimeEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      timeEntries: [...prev.timeEntries, newEntry],
    }));
  };

  const updateTimeEntry = (id: string, updates: Partial<TimeEntry>) => {
    setAppData((prev) => ({
      ...prev,
      timeEntries: prev.timeEntries.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      ),
    }));
  };

  const deleteTimeEntry = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      timeEntries: prev.timeEntries.filter((entry) => entry.id !== id),
    }));
  };

  // Rental item operations
  const addRentalItem = (item: Omit<RentalItem, "id" | "createdAt">) => {
    const newItem: RentalItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      rentalItems: [...(prev.rentalItems || []), newItem],
    }));
  };

  const updateRentalItem = (id: string, updates: Partial<RentalItem>) => {
    setAppData((prev) => ({
      ...prev,
      rentalItems: (prev.rentalItems || []).map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    }));
  };

  const deleteRentalItem = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      rentalItems: (prev.rentalItems || []).filter((item) => item.id !== id),
      rentalEntries: (prev.rentalEntries || []).filter(
        (entry) => entry.rentalItemId !== id,
      ),
    }));
  };

  // Rental entry operations
  const addRentalEntry = (entry: Omit<RentalEntry, "id" | "createdAt">) => {
    const newEntry: RentalEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setAppData((prev) => ({
      ...prev,
      rentalEntries: [...(prev.rentalEntries || []), newEntry],
    }));
  };

  const updateRentalEntry = (id: string, updates: Partial<RentalEntry>) => {
    setAppData((prev) => ({
      ...prev,
      rentalEntries: (prev.rentalEntries || []).map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry,
      ),
    }));
  };

  const deleteRentalEntry = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      rentalEntries: (prev.rentalEntries || []).filter(
        (entry) => entry.id !== id,
      ),
    }));
  };

  // Rental summary calculations
  const rentalSummaries = useMemo(() => {
    return appData.rentalEntries.map((entry) => {
      const item = appData.rentalItems.find(
        (item) => item.id === entry.rentalItemId,
      );
      const job = appData.jobs.find((job) => job.id === entry.jobId);
      const employee = entry.employeeId
        ? appData.employees.find((emp) => emp.id === entry.employeeId)
        : null;

      // Calculate duration based on billing unit
      const startDate = new Date(entry.startDate);
      const endDate = new Date(entry.endDate);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());

      let duration = 1;
      switch (entry.billingUnit) {
        case "hour":
          duration = Math.ceil(diffTime / (1000 * 60 * 60));
          break;
        case "day":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
          break;
        case "week":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
          break;
        case "month":
          duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
          break;
      }

      const totalCost = duration * entry.quantity * entry.rateUsed;

      return {
        id: entry.id,
        rentalItemName: item?.name || "Unknown Item",
        category: item?.category || "Unknown",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        employeeName: employee?.name || "Unassigned",
        employeeTitle: employee?.title || "N/A",
        startDate: entry.startDate,
        endDate: entry.endDate,
        duration,
        quantity: entry.quantity,
        billingUnit: entry.billingUnit,
        rateUsed: entry.rateUsed,
        totalCost,
        description: entry.description,
        date: entry.startDate, // Use start date for filtering compatibility
      };
    });
  }, [appData]);

  // Summary calculations with dual wages
  const timeEntrySummaries = useMemo((): TimeEntrySummary[] => {
    return appData.timeEntries.map((entry) => {
      const employee = appData.employees.find(
        (emp) => emp.id === entry.employeeId,
      );
      const job = appData.jobs.find((j) => j.id === entry.jobId);
      const hourType = appData.hourTypes.find(
        (ht) => ht.id === entry.hourTypeId,
      );
      const province = appData.provinces.find((p) => p.id === entry.provinceId);

      const effectiveHours = entry.hours * (hourType?.multiplier || 1);
      let adjustedBillableWage = entry.billableWageUsed || 0;
      let adjustedCostWage = entry.costWageUsed || 0;
      let totalBillableAmount = 0;
      let totalCost = 0;

      // Add $3 to base wage for NS hour types
      if (hourType?.name?.startsWith("NS ")) {
        adjustedBillableWage += 3;
        adjustedCostWage += 3;
      }
      totalBillableAmount = effectiveHours * adjustedBillableWage;
      totalCost = effectiveHours * adjustedCostWage;

      // Add LOA cost separately (fixed $200 per LOA count)
      const loaCost = (entry.loaCount || 0) * 200;
      const loaBillable = (entry.loaCount || 0) * 200;
      totalBillableAmount += loaBillable;
      totalCost += loaCost;

      return {
        employeeName: employee?.name || "Unknown Employee",
        employeeTitle: entry.title || employee?.title || "Unknown Title",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        hourTypeName: hourType?.name || "Unknown Hour Type",
        provinceName: province?.name || "Unknown Province",
        date: entry.date,
        hours: entry.hours,
        effectiveHours: effectiveHours,
        loaCount: entry.loaCount,
        billableWage: entry.billableWageUsed || 0,
        costWage: entry.costWageUsed || 0,
        totalBillableAmount: totalBillableAmount,
        totalCost: totalCost,
      };
    });
  }, [appData]);

  const summaryByTitleAndJob = useMemo((): SummaryByTitleAndJob[] => {
    const grouped = appData.timeEntries.reduce(
      (acc, entry) => {
        const employee = appData.employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const job = appData.jobs.find((j) => j.id === entry.jobId);
        const hourType = appData.hourTypes.find(
          (ht) => ht.id === entry.hourTypeId,
        );

        if (!employee || !job || !hourType) return acc;

        const entryTitle = entry.title || employee.title;
        const key = `${entryTitle}-${job.jobNumber}`;
        const effectiveHours = entry.hours * hourType.multiplier;
        let adjustedCostWage = entry.costWageUsed || 0;
        let cost = 0;

        // Add $3 to base wage for NS hour types
        if (hourType.name.startsWith("NS ")) {
          adjustedCostWage += 3;
        }
        cost = effectiveHours * adjustedCostWage;

        // Add LOA cost separately (fixed $200 per LOA count)
        const loaCost = (entry.loaCount || 0) * 200;

        if (!acc[key]) {
          acc[key] = {
            title: entryTitle,
            jobNumber: job.jobNumber,
            jobName: job.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            entries: [],
          };
        }

        acc[key].totalHours += entry.hours;
        acc[key].totalEffectiveHours += effectiveHours;
        acc[key].totalCost += cost + loaCost;
        acc[key].entries.push(entry);

        return acc;
      },
      {} as Record<string, SummaryByTitleAndJob>,
    );

    return Object.values(grouped).sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [appData]);

  const summaryByDateAndName = useMemo((): SummaryByDateAndName[] => {
    const grouped = appData.timeEntries.reduce(
      (acc, entry) => {
        const employee = appData.employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const hourType = appData.hourTypes.find(
          (ht) => ht.id === entry.hourTypeId,
        );

        if (!employee || !hourType) return acc;

        const key = `${entry.date}-${employee.name}`;
        const effectiveHours = entry.hours * hourType.multiplier;
        let adjustedCostWage = entry.costWageUsed || 0;
        let cost = 0;

        // Add $3 to base wage for NS hour types
        if (hourType.name.startsWith("NS ")) {
          adjustedCostWage += 3;
        }
        cost = effectiveHours * adjustedCostWage;

        // Add LOA cost separately (fixed $200 per LOA count)
        const loaCost = (entry.loaCount || 0) * 200;

        if (!acc[key]) {
          acc[key] = {
            date: entry.date,
            employeeName: employee.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalLoaCount: 0,
            totalCost: 0,
            entries: [],
          };
        }

        acc[key].totalHours += entry.hours;
        acc[key].totalEffectiveHours += effectiveHours;
        acc[key].totalLoaCount += entry.loaCount || 0;
        acc[key].totalCost += cost + loaCost;
        acc[key].entries.push(entry);

        return acc;
      },
      {} as Record<string, SummaryByDateAndName>,
    );

    return Object.values(grouped).sort((a, b) => {
      const dateComparison = b.date.localeCompare(a.date); // Most recent first
      return dateComparison !== 0
        ? dateComparison
        : a.employeeName.localeCompare(b.employeeName);
    });
  }, [appData]);

  // Cost summaries by employee with dual wages
  const costSummaryByEmployee = useMemo((): CostSummaryByEmployee[] => {
    const grouped = appData.timeEntries.reduce(
      (acc, entry) => {
        const employee = appData.employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const hourType = appData.hourTypes.find(
          (ht) => ht.id === entry.hourTypeId,
        );

        if (!employee || !hourType) return acc;

        const effectiveHours = entry.hours * hourType.multiplier;
        let adjustedCostWage = entry.costWageUsed || 0;
        let adjustedBillableWage = entry.billableWageUsed || 0;
        let cost = 0;
        let billableAmount = 0;

        // Add $3 to base wage for NS hour types
        if (hourType.name.startsWith("NS ")) {
          adjustedCostWage += 3;
          adjustedBillableWage += 3;
        }
        cost = effectiveHours * adjustedCostWage;
        billableAmount = effectiveHours * adjustedBillableWage;

        // Add LOA cost separately (fixed $200 per LOA count)
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

        acc[employee.id].totalHours += entry.hours;
        acc[employee.id].totalEffectiveHours += effectiveHours;
        acc[employee.id].totalBillableAmount += billableAmount + loaBillable;
        acc[employee.id].totalCost += cost + loaCost;
        acc[employee.id].entries.push(entry);

        return acc;
      },
      {} as Record<string, CostSummaryByEmployee>,
    );

    return Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost);
  }, [appData]);

  // Cost summaries by job with dual wages
  const costSummaryByJob = useMemo((): CostSummaryByJob[] => {
    const grouped = appData.timeEntries.reduce(
      (acc, entry) => {
        const employee = appData.employees.find(
          (emp) => emp.id === entry.employeeId,
        );
        const job = appData.jobs.find((j) => j.id === entry.jobId);
        const hourType = appData.hourTypes.find(
          (ht) => ht.id === entry.hourTypeId,
        );

        if (!employee || !job || !hourType) return acc;

        const effectiveHours = entry.hours * hourType.multiplier;
        let adjustedCostWage = entry.costWageUsed || 0;
        let cost = 0;

        // Add $3 to base wage for NS hour types
        if (hourType.name.startsWith("NS ")) {
          adjustedCostWage += 3;
        }
        cost = effectiveHours * adjustedCostWage;

        // Add LOA cost separately (fixed $200 per LOA count)
        const loaCost = (entry.loaCount || 0) * 200;

        if (!acc[job.id]) {
          acc[job.id] = {
            jobId: job.id,
            jobNumber: job.jobNumber,
            jobName: job.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            employees: [],
            entries: [],
          };
        }

        acc[job.id].totalHours += entry.hours;
        acc[job.id].totalEffectiveHours += effectiveHours;
        acc[job.id].totalCost += cost + loaCost;
        acc[job.id].entries.push(entry);

        // Update employee breakdown for this job
        const existingEmployee = acc[job.id].employees.find(
          (emp) => emp.employeeName === employee.name,
        );
        if (existingEmployee) {
          existingEmployee.hours += entry.hours;
          existingEmployee.effectiveHours += effectiveHours;
          existingEmployee.cost += cost + loaCost;
        } else {
          acc[job.id].employees.push({
            employeeName: employee.name,
            hours: entry.hours,
            effectiveHours: effectiveHours,
            cost: cost + loaCost,
          });
        }

        return acc;
      },
      {} as Record<string, CostSummaryByJob>,
    );

    return Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost);
  }, [appData]);

  return {
    // Data
    employees: appData.employees,
    jobs: appData.jobs,
    hourTypes: appData.hourTypes,
    provinces: appData.provinces,
    timeEntries: appData.timeEntries,

    // View management
    selectedView,
    setSelectedView,

    // Employee operations
    addEmployee,
    updateEmployee,
    deleteEmployee,

    // Job operations
    addJob,
    updateJob,
    deleteJob,
    updateJobInvoicedDates,
    addInvoicedDates,
    removeInvoicedDates,

    // Time entry operations
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Rental item operations
    rentalItems: appData.rentalItems,
    addRentalItem,
    updateRentalItem,
    deleteRentalItem,

    // Rental entry operations
    rentalEntries: appData.rentalEntries,
    addRentalEntry,
    updateRentalEntry,
    deleteRentalEntry,

    // Summaries
    timeEntrySummaries,
    rentalSummaries,
    summaryByTitleAndJob,
    summaryByDateAndName,
    costSummaryByEmployee,
    costSummaryByJob,

    // Utility
    resetData: () => setRawAppData(getDefaultAppData()),
    restoreFromBackup: (backupData: AppData) => setRawAppData(backupData),
    clearAllData: () => {
      // Clear all data and reset to completely empty state
      const emptyData: AppData = {
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
      };
      setRawAppData(emptyData);
    },
    restoreHourTypes: () => {
      // Restore all standard hour types (excluding LOA)
      const defaultHourTypes = getDefaultAppData().hourTypes;
      setRawAppData((prev) => ({
        ...prev,
        hourTypes: defaultHourTypes,
      }));
    },

    // Autosave utilities
    getAutosaveInfo,
  };
}
