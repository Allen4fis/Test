import { useState, useEffect, useCallback } from "react";
import { Employee, Job, TimeEntry, HourType, Province } from "@/types";

// Fallback storage hook using localStorage when IndexedDB fails
export function useFallbackStorage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default data
  const getDefaultData = () => ({
    employees: [] as Employee[],
    jobs: [] as Job[],
    timeEntries: [] as TimeEntry[],
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
        id: "5",
        name: "LOA",
        description: "Leave of Absence",
        multiplier: 1.0,
      },
      {
        id: "6",
        name: "NS Regular Time",
        description: "Nova Scotia regular hours (base pay + $3)",
        multiplier: 1.0,
      },
      {
        id: "7",
        name: "NS Overtime",
        description: "Nova Scotia overtime (base pay + $3) x1.5",
        multiplier: 1.5,
      },
      {
        id: "8",
        name: "NS Double Time",
        description: "Nova Scotia double time (base pay + $3) x2",
        multiplier: 2.0,
      },
    ] as HourType[],
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
    ] as Province[],
  });

  // Load data from localStorage
  const loadData = useCallback(() => {
    try {
      const stored = localStorage.getItem("timeTrackingApp_fallback");
      if (stored) {
        return JSON.parse(stored);
      }
      return getDefaultData();
    } catch (error) {
      console.error("Failed to load fallback data:", error);
      return getDefaultData();
    }
  }, []);

  // Save data to localStorage
  const saveData = useCallback((data: any) => {
    try {
      localStorage.setItem("timeTrackingApp_fallback", JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save fallback data:", error);
      throw error;
    }
  }, []);

  const [data, setData] = useState(getDefaultData());

  // Initialize
  useEffect(() => {
    try {
      setIsLoading(true);
      const loadedData = loadData();
      setData(loadedData);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initialize fallback storage",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  // Simple CRUD operations with pagination simulation
  const getEmployees = useCallback(
    async (options: { page: number; pageSize: number; search?: string }) => {
      const { page, pageSize, search } = options;

      let filteredEmployees = data.employees;
      if (search) {
        filteredEmployees = data.employees.filter((emp) =>
          emp.name.toLowerCase().includes(search.toLowerCase()),
        );
      }

      const total = filteredEmployees.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = filteredEmployees.slice(startIndex, endIndex);

      return {
        data: pageData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    [data.employees],
  );

  const addEmployee = useCallback(
    async (employee: Omit<Employee, "id" | "createdAt">) => {
      const newEmployee: Employee = {
        ...employee,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const newData = {
        ...data,
        employees: [...data.employees, newEmployee],
      };

      setData(newData);
      saveData(newData);
      return newEmployee;
    },
    [data, saveData],
  );

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      const newData = {
        ...data,
        employees: data.employees.map((emp) =>
          emp.id === id ? { ...emp, ...updates } : emp,
        ),
      };

      setData(newData);
      saveData(newData);
    },
    [data, saveData],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const newData = {
        ...data,
        employees: data.employees.filter((emp) => emp.id !== id),
        timeEntries: data.timeEntries.filter(
          (entry) => entry.employeeId !== id,
        ),
      };

      setData(newData);
      saveData(newData);
    },
    [data, saveData],
  );

  // Similar operations for jobs (simplified)
  const getJobs = useCallback(
    async (options: { page: number; pageSize: number; search?: string }) => {
      const { page, pageSize, search } = options;

      let filteredJobs = data.jobs;
      if (search) {
        filteredJobs = data.jobs.filter(
          (job) =>
            job.jobNumber.toLowerCase().includes(search.toLowerCase()) ||
            job.name.toLowerCase().includes(search.toLowerCase()),
        );
      }

      const total = filteredJobs.length;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const pageData = filteredJobs.slice(startIndex, endIndex);

      return {
        data: pageData,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    [data.jobs],
  );

  const addJob = useCallback(
    async (job: Omit<Job, "id" | "createdAt">) => {
      const newJob: Job = {
        ...job,
        invoicedDates: job.invoicedDates || [],
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      const newData = {
        ...data,
        jobs: [...data.jobs, newJob],
      };

      setData(newData);
      saveData(newData);
      return newJob;
    },
    [data, saveData],
  );

  // Static data
  const getHourTypes = useCallback(
    async () => data.hourTypes,
    [data.hourTypes],
  );
  const getProvinces = useCallback(
    async () => data.provinces,
    [data.provinces],
  );

  return {
    // State
    isLoading,
    error,

    // Employee operations
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,

    // Job operations
    getJobs,
    addJob,
    updateJob: async () => {}, // Stub
    deleteJob: async () => {}, // Stub

    // Static data
    getHourTypes,
    getProvinces,

    // Utility
    clearAllData: async () => {
      const defaultData = getDefaultData();
      setData(defaultData);
      saveData(defaultData);
    },
    resetDatabase: async () => {
      const defaultData = getDefaultData();
      setData(defaultData);
      saveData(defaultData);
    },
    initializeDatabase: async () => {
      // Already initialized
    },
  };
}
