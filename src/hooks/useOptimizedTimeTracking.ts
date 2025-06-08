import { useState, useMemo, useCallback, useEffect } from "react";
import { useIndexedDB } from "./useIndexedDB";
import { useDebouncedCallback } from "use-debounce";
import {
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

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

interface SearchFilters {
  employeeSearch: string;
  jobSearch: string;
  provinceFilter: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export function useOptimizedTimeTracking() {
  const indexedDB = useIndexedDB();

  // View state
  const [selectedView, setSelectedView] = useState<
    | "dashboard"
    | "timeEntry"
    | "employees"
    | "jobs"
    | "reports"
    | "costs"
    | "invoices"
  >("dashboard");

  // Pagination states
  const [employeePagination, setEmployeePagination] = useState<PaginationState>(
    {
      page: 1,
      pageSize: 50,
      total: 0,
    },
  );

  const [jobPagination, setJobPagination] = useState<PaginationState>({
    page: 1,
    pageSize: 50,
    total: 0,
  });

  // Search and filter states
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    employeeSearch: "",
    jobSearch: "",
    provinceFilter: "",
    dateRange: {
      startDate: "",
      endDate: "",
    },
  });

  // Cache for static data
  const [hourTypes, setHourTypes] = useState<HourType[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);

  // Load static data on mount
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        const [hourTypesData, provincesData] = await Promise.all([
          indexedDB.getHourTypes(),
          indexedDB.getProvinces(),
        ]);
        setHourTypes(hourTypesData);
        setProvinces(provincesData);
      } catch (error) {
        console.error("Failed to load static data:", error);
      }
    };

    if (!indexedDB.isLoading) {
      loadStaticData();
    }
  }, [indexedDB.isLoading]);

  // Debounced search functions
  const debouncedEmployeeSearch = useDebouncedCallback(
    async (searchTerm: string) => {
      setEmployeePagination((prev) => ({ ...prev, page: 1 }));
      await loadEmployees(1, employeePagination.pageSize, searchTerm);
    },
    300,
  );

  const debouncedJobSearch = useDebouncedCallback(
    async (searchTerm: string) => {
      setJobPagination((prev) => ({ ...prev, page: 1 }));
      await loadJobs(1, jobPagination.pageSize, searchTerm);
    },
    300,
  );

  // Data loading functions
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  const loadEmployees = useCallback(
    async (
      page: number = employeePagination.page,
      pageSize: number = employeePagination.pageSize,
      search: string = searchFilters.employeeSearch,
    ) => {
      setIsLoadingEmployees(true);
      try {
        const result = await indexedDB.getEmployees({
          page,
          pageSize,
          search,
          sortBy: "name",
          sortOrder: "asc",
        });

        setEmployees(result.data);
        setEmployeePagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        });
      } catch (error) {
        console.error("Failed to load employees:", error);
      } finally {
        setIsLoadingEmployees(false);
      }
    },
    [
      employeePagination.page,
      employeePagination.pageSize,
      searchFilters.employeeSearch,
      indexedDB,
    ],
  );

  const loadJobs = useCallback(
    async (
      page: number = jobPagination.page,
      pageSize: number = jobPagination.pageSize,
      search: string = searchFilters.jobSearch,
    ) => {
      setIsLoadingJobs(true);
      try {
        const result = await indexedDB.getJobs({
          page,
          pageSize,
          search,
          sortBy: "jobNumber",
          sortOrder: "asc",
        });

        setJobs(result.data);
        setJobPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        });
      } catch (error) {
        console.error("Failed to load jobs:", error);
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [
      jobPagination.page,
      jobPagination.pageSize,
      searchFilters.jobSearch,
      indexedDB,
    ],
  );

  // Load initial data when database is ready
  useEffect(() => {
    if (!indexedDB.isLoading) {
      loadEmployees();
      loadJobs();
    }
  }, [indexedDB.isLoading, loadEmployees, loadJobs]);

  // Handle search changes
  useEffect(() => {
    if (searchFilters.employeeSearch !== "") {
      debouncedEmployeeSearch(searchFilters.employeeSearch);
    }
  }, [searchFilters.employeeSearch, debouncedEmployeeSearch]);

  useEffect(() => {
    if (searchFilters.jobSearch !== "") {
      debouncedJobSearch(searchFilters.jobSearch);
    }
  }, [searchFilters.jobSearch, debouncedJobSearch]);

  // Employee operations
  const addEmployee = useCallback(
    async (employee: Omit<Employee, "id" | "createdAt">) => {
      try {
        await indexedDB.addEmployee(employee);
        await loadEmployees(); // Refresh the list
      } catch (error) {
        console.error("Failed to add employee:", error);
        throw error;
      }
    },
    [indexedDB, loadEmployees],
  );

  const updateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      try {
        await indexedDB.updateEmployee(id, updates);
        await loadEmployees(); // Refresh the list
      } catch (error) {
        console.error("Failed to update employee:", error);
        throw error;
      }
    },
    [indexedDB, loadEmployees],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      try {
        await indexedDB.deleteEmployee(id);
        await loadEmployees(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete employee:", error);
        throw error;
      }
    },
    [indexedDB, loadEmployees],
  );

  // Job operations
  const addJob = useCallback(
    async (job: Omit<Job, "id" | "createdAt">) => {
      try {
        await indexedDB.addJob(job);
        await loadJobs(); // Refresh the list
      } catch (error) {
        console.error("Failed to add job:", error);
        throw error;
      }
    },
    [indexedDB, loadJobs],
  );

  const updateJob = useCallback(
    async (id: string, updates: Partial<Job>) => {
      try {
        await indexedDB.updateJob(id, updates);
        await loadJobs(); // Refresh the list
      } catch (error) {
        console.error("Failed to update job:", error);
        throw error;
      }
    },
    [indexedDB, loadJobs],
  );

  const deleteJob = useCallback(
    async (id: string) => {
      try {
        await indexedDB.deleteJob(id);
        await loadJobs(); // Refresh the list
      } catch (error) {
        console.error("Failed to delete job:", error);
        throw error;
      }
    },
    [indexedDB, loadJobs],
  );

  // Time entry operations
  const addTimeEntry = useCallback(
    async (entry: Omit<TimeEntry, "id" | "createdAt">) => {
      try {
        await indexedDB.addTimeEntry(entry);
      } catch (error) {
        console.error("Failed to add time entry:", error);
        throw error;
      }
    },
    [indexedDB],
  );

  const updateTimeEntry = useCallback(
    async (id: string, updates: Partial<TimeEntry>) => {
      try {
        await indexedDB.updateTimeEntry(id, updates);
      } catch (error) {
        console.error("Failed to update time entry:", error);
        throw error;
      }
    },
    [indexedDB],
  );

  const deleteTimeEntry = useCallback(
    async (id: string) => {
      try {
        await indexedDB.deleteTimeEntry(id);
      } catch (error) {
        console.error("Failed to delete time entry:", error);
        throw error;
      }
    },
    [indexedDB],
  );

  // Optimized summary calculations
  const getSummaryData = useCallback(
    async (dateRange?: { startDate: string; endDate: string }) => {
      try {
        const summaryData = await indexedDB.getSummaryData(dateRange);
        return calculateSummaries(summaryData);
      } catch (error) {
        console.error("Failed to get summary data:", error);
        return {
          timeEntrySummaries: [],
          summaryByTitleAndJob: [],
          summaryByDateAndName: [],
          costSummaryByEmployee: [],
          costSummaryByJob: [],
        };
      }
    },
    [indexedDB],
  );

  // Calculate summaries from raw data
  const calculateSummaries = useCallback(
    (data: {
      timeEntries: TimeEntry[];
      employees: Employee[];
      jobs: Job[];
      hourTypes: HourType[];
      provinces: Province[];
    }) => {
      const { timeEntries, employees, jobs, hourTypes, provinces } = data;

      // Create lookup maps for performance
      const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));
      const jobMap = new Map(jobs.map((job) => [job.id, job]));
      const hourTypeMap = new Map(hourTypes.map((ht) => [ht.id, ht]));
      const provinceMap = new Map(provinces.map((prov) => [prov.id, prov]));

      // Calculate time entry summaries
      const timeEntrySummaries: TimeEntrySummary[] = timeEntries.map(
        (entry) => {
          const employee = employeeMap.get(entry.employeeId);
          const job = jobMap.get(entry.jobId);
          const hourType = hourTypeMap.get(entry.hourTypeId);
          const province = provinceMap.get(entry.provinceId);

          const effectiveHours = entry.hours * (hourType?.multiplier || 1);
          let adjustedHourlyWage = employee?.hourlyWage || 0;
          let totalCost = 0;

          // LOA has fixed $200 cost regardless of hours
          if (hourType?.name === "LOA") {
            totalCost = 200;
          } else {
            // Add $3 to base wage for NS hour types
            if (hourType?.name.startsWith("NS ")) {
              adjustedHourlyWage += 3;
            }
            totalCost = effectiveHours * adjustedHourlyWage;
          }

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
            hourlyWage: employee?.hourlyWage || 0,
            totalCost: totalCost,
          };
        },
      );

      // Calculate other summaries using the same optimization patterns
      // ... (implement other summary calculations with Maps for performance)

      return {
        timeEntrySummaries,
        summaryByTitleAndJob: [], // Implement as needed
        summaryByDateAndName: [], // Implement as needed
        costSummaryByEmployee: [], // Implement as needed
        costSummaryByJob: [], // Implement as needed
      };
    },
    [],
  );

  // Pagination handlers
  const handleEmployeePageChange = useCallback(
    (page: number) => {
      setEmployeePagination((prev) => ({ ...prev, page }));
      loadEmployees(page);
    },
    [loadEmployees],
  );

  const handleJobPageChange = useCallback(
    (page: number) => {
      setJobPagination((prev) => ({ ...prev, page }));
      loadJobs(page);
    },
    [loadJobs],
  );

  // Search handlers
  const handleEmployeeSearch = useCallback((search: string) => {
    setSearchFilters((prev) => ({ ...prev, employeeSearch: search }));
  }, []);

  const handleJobSearch = useCallback((search: string) => {
    setSearchFilters((prev) => ({ ...prev, jobSearch: search }));
  }, []);

  // Reset data
  const resetData = useCallback(async () => {
    try {
      await indexedDB.clearAllData();
      await indexedDB.initializeDatabase();
      await loadEmployees();
      await loadJobs();
    } catch (error) {
      console.error("Failed to reset data:", error);
    }
  }, [indexedDB, loadEmployees, loadJobs]);

  return {
    // State
    selectedView,
    setSelectedView,
    isLoading: indexedDB.isLoading,
    error: indexedDB.error,

    // Data
    employees,
    jobs,
    hourTypes,
    provinces,
    isLoadingEmployees,
    isLoadingJobs,

    // Pagination
    employeePagination,
    jobPagination,
    handleEmployeePageChange,
    handleJobPageChange,

    // Search
    searchFilters,
    handleEmployeeSearch,
    handleJobSearch,

    // Operations
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addJob,
    updateJob,
    deleteJob,
    addTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Summary data
    getSummaryData,

    // Utility
    resetData,
  };
}
