import { AppData } from "@/types";
import { useIndexedDB } from "@/hooks/useIndexedDB";

export interface MigrationStatus {
  isRequired: boolean;
  hasLocalStorageData: boolean;
  hasIndexedDBData: boolean;
  localStorageSize: string;
  dataCount: {
    employees: number;
    jobs: number;
    timeEntries: number;
  };
}

export class DataMigrationService {
  private static instance: DataMigrationService;

  static getInstance(): DataMigrationService {
    if (!this.instance) {
      this.instance = new DataMigrationService();
    }
    return this.instance;
  }

  async checkMigrationStatus(): Promise<MigrationStatus> {
    const localStorageData = this.getLocalStorageData();
    const indexedDBService = useIndexedDB();

    // Check if IndexedDB has data
    let hasIndexedDBData = false;
    let indexedDBCounts = { employees: 0, jobs: 0, timeEntries: 0 };

    try {
      const [employees, jobs, timeEntries] = await Promise.all([
        indexedDBService.getEmployees({ page: 1, pageSize: 1 }),
        indexedDBService.getJobs({ page: 1, pageSize: 1 }),
        indexedDBService.getTimeEntries({ page: 1, pageSize: 1 }),
      ]);

      indexedDBCounts = {
        employees: employees.total,
        jobs: jobs.total,
        timeEntries: timeEntries.total,
      };

      hasIndexedDBData =
        indexedDBCounts.employees > 0 ||
        indexedDBCounts.jobs > 0 ||
        indexedDBCounts.timeEntries > 0;
    } catch (error) {
      console.warn("Could not check IndexedDB data:", error);
    }

    const hasLocalStorageData = localStorageData !== null;
    const localStorageCounts = localStorageData
      ? {
          employees: localStorageData.employees?.length || 0,
          jobs: localStorageData.jobs?.length || 0,
          timeEntries: localStorageData.timeEntries?.length || 0,
        }
      : { employees: 0, jobs: 0, timeEntries: 0 };

    const isRequired =
      hasLocalStorageData &&
      !hasIndexedDBData &&
      (localStorageCounts.employees > 50 ||
        localStorageCounts.jobs > 100 ||
        localStorageCounts.timeEntries > 500);

    return {
      isRequired,
      hasLocalStorageData,
      hasIndexedDBData,
      localStorageSize: this.getLocalStorageSize(),
      dataCount: hasLocalStorageData ? localStorageCounts : indexedDBCounts,
    };
  }

  private getLocalStorageData(): AppData | null {
    try {
      const data = localStorage.getItem("timeTrackingApp");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Failed to read localStorage data:", error);
      return null;
    }
  }

  private getLocalStorageSize(): string {
    try {
      const data = localStorage.getItem("timeTrackingApp");
      if (!data) return "0 KB";

      const sizeInBytes = new Blob([data]).size;
      const sizeInKB = sizeInBytes / 1024;

      if (sizeInKB < 1024) {
        return `${sizeInKB.toFixed(2)} KB`;
      } else {
        return `${(sizeInKB / 1024).toFixed(2)} MB`;
      }
    } catch (error) {
      return "Unknown";
    }
  }

  async migrateToIndexedDB(
    onProgress?: (progress: { step: string; percent: number }) => void,
  ): Promise<{ success: boolean; error?: string; migrated: any }> {
    try {
      const localStorageData = this.getLocalStorageData();

      if (!localStorageData) {
        return { success: false, error: "No localStorage data found" };
      }

      const indexedDBService = useIndexedDB();
      const migrated = {
        employees: 0,
        jobs: 0,
        timeEntries: 0,
        hourTypes: 0,
        provinces: 0,
      };

      // Step 1: Migrate employees
      onProgress?.({ step: "Migrating employees...", percent: 10 });
      if (localStorageData.employees?.length > 0) {
        await indexedDBService.bulkImportEmployees(localStorageData.employees);
        migrated.employees = localStorageData.employees.length;
      }

      // Step 2: Migrate jobs
      onProgress?.({ step: "Migrating jobs...", percent: 30 });
      if (localStorageData.jobs?.length > 0) {
        await indexedDBService.bulkImportJobs(localStorageData.jobs);
        migrated.jobs = localStorageData.jobs.length;
      }

      // Step 3: Migrate time entries (in batches for performance)
      onProgress?.({ step: "Migrating time entries...", percent: 50 });
      if (localStorageData.timeEntries?.length > 0) {
        const batchSize = 100;
        const timeEntries = localStorageData.timeEntries;

        for (let i = 0; i < timeEntries.length; i += batchSize) {
          const batch = timeEntries.slice(i, i + batchSize);
          await indexedDBService.bulkImportTimeEntries(batch);

          const progress = 50 + ((i + batch.length) / timeEntries.length) * 40;
          onProgress?.({
            step: `Migrating time entries... (${i + batch.length}/${timeEntries.length})`,
            percent: Math.round(progress),
          });
        }

        migrated.timeEntries = timeEntries.length;
      }

      // Step 4: Finalize
      onProgress?.({ step: "Finalizing migration...", percent: 95 });

      // Wait a moment for IndexedDB to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      onProgress?.({ step: "Migration completed!", percent: 100 });

      return { success: true, migrated };
    } catch (error) {
      console.error("Migration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        migrated: {
          employees: 0,
          jobs: 0,
          timeEntries: 0,
          hourTypes: 0,
          provinces: 0,
        },
      };
    }
  }

  async createBackup(): Promise<{
    success: boolean;
    data?: AppData;
    error?: string;
  }> {
    try {
      const data = this.getLocalStorageData();
      if (!data) {
        return { success: false, error: "No data to backup" };
      }

      // Create downloadable backup
      const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        data: data,
      };

      return { success: true, data: backup as any };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Backup failed",
      };
    }
  }

  downloadBackup(data: AppData, filename?: string): void {
    const backup = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      data: data,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ||
      `timetracking-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async clearLocalStorageAfterMigration(): Promise<void> {
    try {
      localStorage.removeItem("timeTrackingApp");
      console.log("✅ localStorage data cleared after successful migration");
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  }

  // Performance testing utilities
  async benchmarkDataAccess(): Promise<{
    localStorage: number;
    indexedDB: number;
    recommendation: string;
  }> {
    const iterations = 10;
    let localStorageTime = 0;
    let indexedDBTime = 0;

    // Benchmark localStorage
    const localData = this.getLocalStorageData();
    if (localData) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate data processing
        const employees = localData.employees.filter((emp) =>
          emp.name.includes("a"),
        );
        const jobs = localData.jobs.filter((job) => job.isActive);
      }
      localStorageTime = (performance.now() - start) / iterations;
    }

    // Benchmark IndexedDB
    try {
      const indexedDBService = useIndexedDB();
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        await indexedDBService.getEmployees({
          page: 1,
          pageSize: 10,
          search: "a",
        });
        await indexedDBService.getJobs({ page: 1, pageSize: 10 });
      }
      indexedDBTime = (performance.now() - start) / iterations;
    } catch (error) {
      indexedDBTime = -1; // Error occurred
    }

    let recommendation = "Continue with current setup";
    if (indexedDBTime > 0 && localStorageTime > 0) {
      if (indexedDBTime < localStorageTime * 0.8) {
        recommendation =
          "IndexedDB is significantly faster - recommend migration";
      } else if (localStorageTime > 100) {
        recommendation =
          "localStorage is slow - recommend migration for better UX";
      }
    }

    return {
      localStorage: localStorageTime,
      indexedDB: indexedDBTime,
      recommendation,
    };
  }
}
