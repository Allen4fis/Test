import { useState, useEffect, useCallback, useMemo } from "react";
import Dexie, { Table } from "dexie";
import { Employee, Job, TimeEntry, HourType, Province } from "@/types";

// IndexedDB database schema
class TimeTrackingDB extends Dexie {
  employees!: Table<Employee>;
  jobs!: Table<Job>;
  timeEntries!: Table<TimeEntry>;
  hourTypes!: Table<HourType>;
  provinces!: Table<Province>;

  constructor() {
    super("TimeTrackingDB");

    // Use a single version with all required indexes
    this.version(1).stores({
      employees: "id, name, title, email, hourlyWage, createdAt",
      jobs: "id, jobNumber, name, description, isActive, createdAt",
      timeEntries:
        "id, employeeId, jobId, hourTypeId, provinceId, date, hours, createdAt",
      hourTypes: "id, name, description, multiplier",
      provinces: "id, name, code",
    });
  }
}

// Create database instance with error handling
let db: TimeTrackingDB;

const initializeDB = async (): Promise<TimeTrackingDB> => {
  try {
    db = new TimeTrackingDB();
    await db.open();
    return db;
  } catch (error) {
    console.error("Failed to initialize database:", error);

    // If there's a schema conflict, try to delete and recreate the database
    if (error instanceof Error && error.message.includes("ConstraintError")) {
      console.log("Attempting to reset database due to schema conflict...");
      try {
        await Dexie.delete("TimeTrackingDB");
        db = new TimeTrackingDB();
        await db.open();
        return db;
      } catch (resetError) {
        console.error("Failed to reset database:", resetError);
        throw resetError;
      }
    }
    throw error;
  }
};

// Initialize the database
db = new TimeTrackingDB();

interface PaginationOptions {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useIndexedDB() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize database with default data
  const initializeDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure database is properly initialized
      db = await initializeDB();

      // Check if data already exists
      const employeeCount = await db.employees.count();
      const jobCount = await db.jobs.count();

      if (employeeCount === 0 || jobCount === 0) {
        // Initialize with default data
        await initializeDefaultData();
      }

      setError(null);
    } catch (err) {
      console.error("Database initialization error:", err);
      setError(
        err instanceof Error ? err.message : "Database initialization failed",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const initializeDefaultData = async () => {
    // Default hour types
    const defaultHourTypes: HourType[] = [
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
    ];

    // Default provinces
    const defaultProvinces: Province[] = [
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
    ];

    await db.transaction("rw", [db.hourTypes, db.provinces], async () => {
      await db.hourTypes.bulkPut(defaultHourTypes);
      await db.provinces.bulkPut(defaultProvinces);
    });
  };

  // Employee operations with pagination and search
  const getEmployees = useCallback(
    async (options: PaginationOptions): Promise<PaginatedResult<Employee>> => {
      const {
        page,
        pageSize,
        search,
        sortBy = "name",
        sortOrder = "asc",
      } = options;

      let query = db.employees.toCollection();

      // Apply search filter
      if (search) {
        query = db.employees.where("name").startsWithIgnoreCase(search);
      }

      // Get total count for pagination
      const total = await query.count();

      // Apply sorting and pagination
      const data = await query.sortBy(sortBy).then((results) => {
        if (sortOrder === "desc") {
          results.reverse();
        }
        return results.slice((page - 1) * pageSize, page * pageSize);
      });

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    [],
  );

  const addEmployee = useCallback(
    async (employee: Omit<Employee, "id" | "createdAt">) => {
      const newEmployee: Employee = {
        ...employee,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      await db.employees.add(newEmployee);
      return newEmployee;
    },
    [],
  );

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      await db.employees.update(id, updates);
    },
    [],
  );

  const deleteEmployee = useCallback(async (id: string) => {
    await db.transaction("rw", [db.employees, db.timeEntries], async () => {
      await db.employees.delete(id);
      await db.timeEntries.where("employeeId").equals(id).delete();
    });
  }, []);

  // Job operations with pagination and search
  const getJobs = useCallback(
    async (options: PaginationOptions): Promise<PaginatedResult<Job>> => {
      const {
        page,
        pageSize,
        search,
        sortBy = "jobNumber",
        sortOrder = "asc",
      } = options;

      let query = db.jobs.toCollection();

      // Apply search filter
      if (search) {
        query = db.jobs
          .where("jobNumber")
          .startsWithIgnoreCase(search)
          .or("name")
          .startsWithIgnoreCase(search);
      }

      // Get total count for pagination
      const total = await query.count();

      // Apply sorting and pagination
      const data = await query.sortBy(sortBy).then((results) => {
        if (sortOrder === "desc") {
          results.reverse();
        }
        return results.slice((page - 1) * pageSize, page * pageSize);
      });

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    [],
  );

  const addJob = useCallback(async (job: Omit<Job, "id" | "createdAt">) => {
    const newJob: Job = {
      ...job,
      invoicedDates: job.invoicedDates || [],
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    await db.jobs.add(newJob);
    return newJob;
  }, []);

  const updateJob = useCallback(async (id: string, updates: Partial<Job>) => {
    await db.jobs.update(id, updates);
  }, []);

  const deleteJob = useCallback(async (id: string) => {
    await db.transaction("rw", [db.jobs, db.timeEntries], async () => {
      await db.jobs.delete(id);
      await db.timeEntries.where("jobId").equals(id).delete();
    });
  }, []);

  // Time entry operations with optimized queries
  const getTimeEntries = useCallback(
    async (options: {
      employeeId?: string;
      jobId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      pageSize?: number;
    }) => {
      const {
        employeeId,
        jobId,
        startDate,
        endDate,
        page = 1,
        pageSize = 100,
      } = options;

      let query = db.timeEntries.toCollection();

      // Apply filters
      if (employeeId) {
        query = db.timeEntries.where("employeeId").equals(employeeId);
      }

      if (jobId) {
        query = db.timeEntries.where("jobId").equals(jobId);
      }

      if (startDate && endDate) {
        query = query.and(
          (entry) => entry.date >= startDate && entry.date <= endDate,
        );
      }

      // Get total count
      const total = await query.count();

      // Apply pagination and sorting
      const data = await query
        .reverse()
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
    [],
  );

  const addTimeEntry = useCallback(
    async (entry: Omit<TimeEntry, "id" | "createdAt">) => {
      const newEntry: TimeEntry = {
        ...entry,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      await db.timeEntries.add(newEntry);
      return newEntry;
    },
    [],
  );

  const updateTimeEntry = useCallback(
    async (id: string, updates: Partial<TimeEntry>) => {
      await db.timeEntries.update(id, updates);
    },
    [],
  );

  const deleteTimeEntry = useCallback(async (id: string) => {
    await db.timeEntries.delete(id);
  }, []);

  // Get all static data (hour types, provinces)
  const getHourTypes = useCallback(async () => {
    return await db.hourTypes.toArray();
  }, []);

  const getProvinces = useCallback(async () => {
    return await db.provinces.toArray();
  }, []);

  // Optimized summary calculations using IndexedDB queries
  const getSummaryData = useCallback(
    async (dateRange?: { startDate: string; endDate: string }) => {
      let timeEntriesQuery = db.timeEntries.toCollection();

      if (dateRange) {
        timeEntriesQuery = timeEntriesQuery.and(
          (entry) =>
            entry.date >= dateRange.startDate &&
            entry.date <= dateRange.endDate,
        );
      }

      const [timeEntries, employees, jobs, hourTypes, provinces] =
        await Promise.all([
          timeEntriesQuery.toArray(),
          db.employees.toArray(),
          db.jobs.toArray(),
          db.hourTypes.toArray(),
          db.provinces.toArray(),
        ]);

      return { timeEntries, employees, jobs, hourTypes, provinces };
    },
    [],
  );

  // Search operations with indexes
  const searchEmployees = useCallback(
    async (searchTerm: string, limit = 10) => {
      if (!searchTerm) return [];

      return await db.employees
        .where("name")
        .startsWithIgnoreCase(searchTerm)
        .limit(limit)
        .toArray();
    },
    [],
  );

  const searchJobs = useCallback(async (searchTerm: string, limit = 10) => {
    if (!searchTerm) return [];

    return await db.jobs
      .where("jobNumber")
      .startsWithIgnoreCase(searchTerm)
      .or("name")
      .startsWithIgnoreCase(searchTerm)
      .limit(limit)
      .toArray();
  }, []);

  // Bulk operations for data import/export
  const bulkImportEmployees = useCallback(async (employees: Employee[]) => {
    await db.employees.bulkPut(employees);
  }, []);

  const bulkImportJobs = useCallback(async (jobs: Job[]) => {
    await db.jobs.bulkPut(jobs);
  }, []);

  const bulkImportTimeEntries = useCallback(
    async (timeEntries: TimeEntry[]) => {
      await db.timeEntries.bulkPut(timeEntries);
    },
    [],
  );

  // Clear all data
  const clearAllData = useCallback(async () => {
    await db.transaction(
      "rw",
      [db.employees, db.jobs, db.timeEntries],
      async () => {
        await db.employees.clear();
        await db.jobs.clear();
        await db.timeEntries.clear();
      },
    );
  }, []);

  // Force reset database (delete and recreate)
  const resetDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      await Dexie.delete("TimeTrackingDB");
      db = await initializeDB();
      await initializeDefaultData();
      setError(null);
    } catch (err) {
      console.error("Database reset error:", err);
      setError(err instanceof Error ? err.message : "Database reset failed");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeDatabase();
  }, [initializeDatabase]);

  return {
    // State
    isLoading,
    error,

    // Employee operations
    getEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    searchEmployees,
    bulkImportEmployees,

    // Job operations
    getJobs,
    addJob,
    updateJob,
    deleteJob,
    searchJobs,
    bulkImportJobs,

    // Time entry operations
    getTimeEntries,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    bulkImportTimeEntries,

    // Static data
    getHourTypes,
    getProvinces,

    // Summary data
    getSummaryData,

    // Utility
    clearAllData,
    resetDatabase,
    initializeDatabase,
  };
}
