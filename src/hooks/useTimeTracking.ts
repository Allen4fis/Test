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
} from "@/types";

// Default data to initialize the app
const getDefaultAppData = (): AppData => ({
  employees: [],
  jobs: [],
  hourTypes: [
    {
      id: "1",
      name: "Regular",
      description: "Regular working hours",
      multiplier: 1.0,
    },
    {
      id: "2",
      name: "Overtime",
      description: "Overtime hours (1.5x)",
      multiplier: 1.5,
    },
    {
      id: "3",
      name: "Double Time",
      description: "Double time hours (2x)",
      multiplier: 2.0,
    },
    {
      id: "4",
      name: "Triple Time",
      description: "Triple time hours (3x)",
      multiplier: 3.0,
    },
    {
      id: "5",
      name: "Travel Time",
      description: "Travel between job sites",
      multiplier: 1.0,
    },
    {
      id: "6",
      name: "Travel - Premium",
      description: "Premium travel time",
      multiplier: 1.25,
    },
    {
      id: "7",
      name: "Training",
      description: "Training and education hours",
      multiplier: 1.0,
    },
    {
      id: "8",
      name: "Meetings",
      description: "Meetings and conferences",
      multiplier: 1.0,
    },
    {
      id: "9",
      name: "Safety Training",
      description: "Safety training and orientation",
      multiplier: 1.0,
    },
    {
      id: "10",
      name: "Administrative",
      description: "Administrative and paperwork",
      multiplier: 1.0,
    },
    {
      id: "11",
      name: "On-Call",
      description: "On-call standby time",
      multiplier: 0.5,
    },
    {
      id: "12",
      name: "Call-Out",
      description: "Emergency call-out hours",
      multiplier: 2.0,
    },
    {
      id: "13",
      name: "Holiday",
      description: "Holiday work hours",
      multiplier: 2.5,
    },
    {
      id: "14",
      name: "Weekend",
      description: "Weekend work hours",
      multiplier: 1.5,
    },
    {
      id: "15",
      name: "Night Shift",
      description: "Night shift premium",
      multiplier: 1.25,
    },
    {
      id: "16",
      name: "Statutory Holiday",
      description: "Statutory holiday work",
      multiplier: 3.0,
    },
    {
      id: "17",
      name: "Vacation Buyout",
      description: "Vacation time buyout",
      multiplier: 1.0,
    },
    {
      id: "18",
      name: "Sick Leave",
      description: "Paid sick leave hours",
      multiplier: 1.0,
    },
    {
      id: "19",
      name: "Personal Leave",
      description: "Personal leave hours",
      multiplier: 1.0,
    },
    {
      id: "20",
      name: "Bereavement",
      description: "Bereavement leave",
      multiplier: 1.0,
    },
    {
      id: "21",
      name: "Jury Duty",
      description: "Jury duty time",
      multiplier: 1.0,
    },
    {
      id: "22",
      name: "Union Activities",
      description: "Union meeting/activities",
      multiplier: 1.0,
    },
    {
      id: "23",
      name: "Equipment Setup",
      description: "Equipment setup/breakdown",
      multiplier: 1.0,
    },
    {
      id: "24",
      name: "Site Preparation",
      description: "Site preparation work",
      multiplier: 1.0,
    },
    {
      id: "25",
      name: "Quality Control",
      description: "Quality control inspections",
      multiplier: 1.0,
    },
    {
      id: "26",
      name: "Maintenance",
      description: "Equipment/facility maintenance",
      multiplier: 1.0,
    },
    {
      id: "27",
      name: "Cleanup",
      description: "Site cleanup and restoration",
      multiplier: 1.0,
    },
    {
      id: "28",
      name: "Supervision",
      description: "Supervisory duties",
      multiplier: 1.1,
    },
    {
      id: "29",
      name: "Hazard Pay",
      description: "Hazardous work conditions",
      multiplier: 1.5,
    },
    {
      id: "30",
      name: "Remote Work",
      description: "Remote/work from home",
      multiplier: 1.0,
    },
    {
      id: "31",
      name: "Consulting",
      description: "Consulting services",
      multiplier: 1.2,
    },
    {
      id: "32",
      name: "Project Management",
      description: "Project management tasks",
      multiplier: 1.1,
    },
    {
      id: "33",
      name: "Client Meeting",
      description: "Client meetings and presentations",
      multiplier: 1.0,
    },
    {
      id: "34",
      name: "Research",
      description: "Research and development",
      multiplier: 1.0,
    },
    {
      id: "35",
      name: "Documentation",
      description: "Technical documentation",
      multiplier: 1.0,
    },
    {
      id: "36",
      name: "Installation",
      description: "Equipment/system installation",
      multiplier: 1.0,
    },
    {
      id: "37",
      name: "Commissioning",
      description: "System commissioning and testing",
      multiplier: 1.1,
    },
    {
      id: "38",
      name: "Emergency Response",
      description: "Emergency response work",
      multiplier: 2.0,
    },
    {
      id: "39",
      name: "Weather Delay",
      description: "Weather-related standby",
      multiplier: 0.75,
    },
    {
      id: "40",
      name: "Apprentice Training",
      description: "Training apprentices",
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
});

export function useTimeTracking() {
  const [appData, setAppData] = useLocalStorage<AppData>(
    "timeTrackingApp",
    getDefaultAppData(),
  );
  const [selectedView, setSelectedView] = useState<
    "dashboard" | "timeEntry" | "employees" | "jobs" | "reports"
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

  // Summary calculations
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

      return {
        employeeName: employee?.name || "Unknown Employee",
        employeeTitle: employee?.title || "Unknown Title",
        jobNumber: job?.jobNumber || "Unknown Job",
        jobName: job?.name || "Unknown Job Name",
        hourTypeName: hourType?.name || "Unknown Hour Type",
        provinceName: province?.name || "Unknown Province",
        date: entry.date,
        hours: entry.hours,
        effectiveHours: entry.hours * (hourType?.multiplier || 1),
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

        if (!acc[key]) {
          acc[key] = {
            title: employee.title,
            jobNumber: job.jobNumber,
            jobName: job.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            entries: [],
          };
        }

        acc[key].totalHours += entry.hours;
        acc[key].totalEffectiveHours += entry.hours * hourType.multiplier;
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

        if (!acc[key]) {
          acc[key] = {
            date: entry.date,
            employeeName: employee.name,
            totalHours: 0,
            totalEffectiveHours: 0,
            entries: [],
          };
        }

        acc[key].totalHours += entry.hours;
        acc[key].totalEffectiveHours += entry.hours * hourType.multiplier;
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

    // Utility
    resetData: () => setAppData(getDefaultAppData()),
  };
}
