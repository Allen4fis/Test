import { useState, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";
import {
  AppData,
  Employee,
  Job,
  HourType,
  Province,
  TimeEntry,
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
    { id: "5", name: "LOA", description: "Leave of Absence", multiplier: 1.0 },
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
});

export function useTimeTracking() {
  const [appData, setAppData] = useLocalStorage<AppData>(
    "timeTrackingApp",
    getDefaultAppData(),
  );
  const [selectedView, setSelectedView] = useState<
    "dashboard" | "timeEntry" | "employees" | "jobs" | "reports" | "costs"
  >("dashboard");
  "dashboard" | "timeEntry" | "employees" | "jobs" | ("reports" > "dashboard");

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

  // Summary calculations with cost
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
      const hourlyWage = employee?.hourlyWage || 0;
      const totalCost = effectiveHours * hourlyWage;

      return {
        employeeName: employee?.name || "Unknown Employee",
        employeeTitle: employee?.title || "Unknown Title",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        hourTypeName: hourType?.name || "Unknown Hour Type",
        provinceName: province?.name || "Unknown Province",
        date: entry.date,
        hours: entry.hours,
        effectiveHours: effectiveHours,
        hourlyWage: hourlyWage,
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

        const key = `${employee.title}-${job.jobNumber}`;
        const effectiveHours = entry.hours * hourType.multiplier;
        const cost = effectiveHours * (employee.hourlyWage || 0);

        if (!acc[key]) {
          acc[key] = {
            title: employee.title,
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
        acc[key].totalCost += cost;
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
        const cost = effectiveHours * (employee.hourlyWage || 0);

        if (!acc[key]) {
          acc[key] = {
            date: entry.date,
            employeeName: employee.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            entries: [],
          };
        }

        acc[key].totalHours += entry.hours;
        acc[key].totalEffectiveHours += effectiveHours;
        acc[key].totalCost += cost;
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

  // Cost summaries by employee
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
        const cost = effectiveHours * (employee.hourlyWage || 0);

        if (!acc[employee.id]) {
          acc[employee.id] = {
            employeeId: employee.id,
            employeeName: employee.name,
            employeeTitle: employee.title,
            hourlyWage: employee.hourlyWage || 0,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            entries: [],
          };
        }

        acc[employee.id].totalHours += entry.hours;
        acc[employee.id].totalEffectiveHours += effectiveHours;
        acc[employee.id].totalCost += cost;
        acc[employee.id].entries.push(entry);

        return acc;
      },
      {} as Record<string, CostSummaryByEmployee>,
    );

    return Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost);
  }, [appData]);

  // Cost summaries by job
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
        const cost = effectiveHours * (employee.hourlyWage || 0);

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
        acc[job.id].totalCost += cost;
        acc[job.id].entries.push(entry);

        // Update employee breakdown for this job
        const existingEmployee = acc[job.id].employees.find(
          (emp) => emp.employeeName === employee.name,
        );
        if (existingEmployee) {
          existingEmployee.hours += entry.hours;
          existingEmployee.effectiveHours += effectiveHours;
          existingEmployee.cost += cost;
        } else {
          acc[job.id].employees.push({
            employeeName: employee.name,
            hours: entry.hours,
            effectiveHours: effectiveHours,
            cost: cost,
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

    // Time entry operations
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Summaries
    timeEntrySummaries,
    summaryByTitleAndJob,
    summaryByDateAndName,
    costSummaryByEmployee,
    costSummaryByJob,

    // Utility
    resetData: () => setAppData(getDefaultAppData()),
  };
}
