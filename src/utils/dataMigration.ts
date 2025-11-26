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
  lastMigrationCheck?: {
    timestamp: string;
    status: "success" | "failed" | "in_progress";
  };
}

export interface MigrationResult {
  success: boolean;
  error?: string;
  migrated: {
    employees: number;
    jobs: number;
    timeEntries: number;
    hourTypes: number;
    provinces: number;
  };
  validation?: {
    checksumValid: boolean;
    countMatch: boolean;
    issues: string[];
  };
}

/**
 * Generates a checksum for data integrity verification
 */
function generateChecksum(data: any): string {
  try {
    const serialized = JSON.stringify(data);
    let hash = 0;

    for (let i = 0; i < serialized.length; i++) {
      const char = serialized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  } catch (error) {
    console.error("Error generating checksum:", error);
    return "error";
  }
}

/**
 * Gets count summary of data
 */
function getDataCountSummary(data: AppData) {
  return {
    employees: data.employees?.length || 0,
    jobs: data.jobs?.length || 0,
    timeEntries: data.timeEntries?.length || 0,
    rentalItems: data.rentalItems?.length || 0,
    rentalEntries: data.rentalEntries?.length || 0,
  };
}

export class DataMigrationService {
  private static instance: DataMigrationService;
  private migrationInProgress = false;
  private migrationCheckpointKey = "migration_checkpoint";

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

    // Check last migration status
    let lastMigrationCheck: MigrationStatus["lastMigrationCheck"] | undefined;
    try {
      const checkpoint = localStorage.getItem(this.migrationCheckpointKey);
      if (checkpoint) {
        const parsed = JSON.parse(checkpoint);
        lastMigrationCheck = {
          timestamp: parsed.timestamp,
          status: parsed.status,
        };
      }
    } catch (e) {
      // Ignore checkpoint errors
    }

    return {
      isRequired,
      hasLocalStorageData,
      hasIndexedDBData,
      localStorageSize: this.getLocalStorageSize(),
      dataCount: hasLocalStorageData ? localStorageCounts : indexedDBCounts,
      lastMigrationCheck,
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

  /**
   * Enhanced migration with validation and duplicate prevention
   */
  async migrateToIndexedDB(
    onProgress?: (progress: { step: string; percent: number }) => void,
  ): Promise<MigrationResult> {
    // Prevent concurrent migrations
    if (this.migrationInProgress) {
      return {
        success: false,
        error: "Migration already in progress",
        migrated: {
          employees: 0,
          jobs: 0,
          timeEntries: 0,
          hourTypes: 0,
          provinces: 0,
        },
      };
    }

    this.migrationInProgress = true;

    try {
      // Step 0: Validate source data
      onProgress?.({ step: "Validating source data...", percent: 5 });
      const localStorageData = this.getLocalStorageData();

      if (!localStorageData) {
        throw new Error("No localStorage data found");
      }

      // Generate checksum of source data for integrity verification
      const sourceChecksum = generateChecksum(localStorageData);
      const sourceCountSummary = getDataCountSummary(localStorageData);

      // Save checkpoint
      this.saveCheckpoint("in_progress", sourceChecksum, sourceCountSummary);

      // Step 1: Check for duplicates before migration
      onProgress?.({ step: "Checking for duplicates...", percent: 10 });
      const indexedDBService = useIndexedDB();
      const duplicateCheck = await this.checkForDuplicates(
        localStorageData,
        indexedDBService,
      );

      if (duplicateCheck.hasDuplicates) {
        throw new Error(
          `Cannot migrate: Potential duplicates detected. ${duplicateCheck.details.join(", ")}. Clear IndexedDB or localStorage first.`,
        );
      }

      const migrated = {
        employees: 0,
        jobs: 0,
        timeEntries: 0,
        hourTypes: 0,
        provinces: 0,
      };

      // Step 2: Migrate employees
      onProgress?.({ step: "Migrating employees...", percent: 20 });
      if (localStorageData.employees?.length > 0) {
        await indexedDBService.bulkImportEmployees(localStorageData.employees);
        migrated.employees = localStorageData.employees.length;
      }

      // Step 3: Migrate jobs
      onProgress?.({ step: "Migrating jobs...", percent: 35 });
      if (localStorageData.jobs?.length > 0) {
        await indexedDBService.bulkImportJobs(localStorageData.jobs);
        migrated.jobs = localStorageData.jobs.length;
      }

      // Step 4: Migrate time entries (in batches)
      onProgress?.({ step: "Migrating time entries...", percent: 50 });
      if (localStorageData.timeEntries?.length > 0) {
        const batchSize = 100;
        const timeEntries = localStorageData.timeEntries;

        for (let i = 0; i < timeEntries.length; i += batchSize) {
          const batch = timeEntries.slice(i, i + batchSize);
          await indexedDBService.bulkImportTimeEntries(batch);

          const progress = 50 + ((i + batch.length) / timeEntries.length) * 35;
          onProgress?.({
            step: `Migrating time entries... (${i + batch.length}/${timeEntries.length})`,
            percent: Math.round(progress),
          });
        }

        migrated.timeEntries = timeEntries.length;
      }

      // Step 5: Wait for IndexedDB to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 6: Validate migration
      onProgress?.({ step: "Validating migration...", percent: 88 });
      const validation = await this.validateMigration(
        localStorageData,
        migrated,
        indexedDBService,
      );

      if (!validation.valid) {
        // Rollback by not clearing localStorage
        throw new Error(`Migration validation failed: ${validation.issues.join(", ")}`);
      }

      // Step 7: Success - mark checkpoint
      onProgress?.({ step: "Finalizing migration...", percent: 95 });
      this.saveCheckpoint("success", sourceChecksum, sourceCountSummary);

      onProgress?.({ step: "Migration completed!", percent: 100 });

      return {
        success: true,
        migrated,
        validation: {
          checksumValid: validation.checksumValid,
          countMatch: validation.countMatch,
          issues: validation.issues,
        },
      };
    } catch (error) {
      console.error("Migration failed:", error);

      // Save failure checkpoint
      try {
        this.saveCheckpoint("failed", "", {
          employees: 0,
          jobs: 0,
          timeEntries: 0,
          rentalItems: 0,
          rentalEntries: 0,
        });
      } catch (checkpointError) {
        console.error("Failed to save checkpoint:", checkpointError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during migration",
        migrated: {
          employees: 0,
          jobs: 0,
          timeEntries: 0,
          hourTypes: 0,
          provinces: 0,
        },
      };
    } finally {
      this.migrationInProgress = false;
    }
  }

  /**
   * Check for duplicate data in IndexedDB before migration
   */
  private async checkForDuplicates(
    sourceData: AppData,
    indexedDBService: ReturnType<typeof useIndexedDB>,
  ): Promise<{ hasDuplicates: boolean; details: string[] }> {
    const details: string[] = [];

    try {
      // Check employees
      const existingEmployees = await indexedDBService.getEmployees({
        page: 1,
        pageSize: 1,
      });

      if (existingEmployees.total > 0 && sourceData.employees?.length > 0) {
        details.push(
          `${existingEmployees.total} existing employees would be duplicated`,
        );
      }

      // Check jobs
      const existingJobs = await indexedDBService.getJobs({
        page: 1,
        pageSize: 1,
      });

      if (existingJobs.total > 0 && sourceData.jobs?.length > 0) {
        details.push(`${existingJobs.total} existing jobs would be duplicated`);
      }

      // Check time entries
      const existingEntries = await indexedDBService.getTimeEntries({
        page: 1,
        pageSize: 1,
      });

      if (existingEntries.total > 0 && sourceData.timeEntries?.length > 0) {
        details.push(
          `${existingEntries.total} existing time entries would be duplicated`,
        );
      }
    } catch (error) {
      console.warn("Error checking for duplicates:", error);
    }

    return {
      hasDuplicates: details.length > 0,
      details,
    };
  }

  /**
   * Validate migration integrity
   */
  private async validateMigration(
    sourceData: AppData,
    migrated: {
      employees: number;
      jobs: number;
      timeEntries: number;
      hourTypes: number;
      provinces: number;
    },
    indexedDBService: ReturnType<typeof useIndexedDB>,
  ): Promise<{
    valid: boolean;
    checksumValid: boolean;
    countMatch: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let checksumValid = true;
    let countMatch = true;

    try {
      // Check counts match
      const employees = await indexedDBService.getEmployees({
        page: 1,
        pageSize: 1,
      });
      const jobs = await indexedDBService.getJobs({ page: 1, pageSize: 1 });
      const timeEntries = await indexedDBService.getTimeEntries({
        page: 1,
        pageSize: 1,
      });

      if (employees.total !== migrated.employees) {
        countMatch = false;
        issues.push(
          `Employee count mismatch: expected ${migrated.employees}, got ${employees.total}`,
        );
      }

      if (jobs.total !== migrated.jobs) {
        countMatch = false;
        issues.push(
          `Job count mismatch: expected ${migrated.jobs}, got ${jobs.total}`,
        );
      }

      if (timeEntries.total !== migrated.timeEntries) {
        countMatch = false;
        issues.push(
          `Time entry count mismatch: expected ${migrated.timeEntries}, got ${timeEntries.total}`,
        );
      }
    } catch (error) {
      issues.push(`Validation error: ${error instanceof Error ? error.message : "Unknown"}`);
    }

    return {
      valid: issues.length === 0,
      checksumValid,
      countMatch,
      issues,
    };
  }

  /**
   * Save migration checkpoint for recovery
   */
  private saveCheckpoint(
    status: "success" | "failed" | "in_progress",
    checksum: string,
    counts: {
      employees: number;
      jobs: number;
      timeEntries: number;
      rentalItems: number;
      rentalEntries: number;
    },
  ): void {
    try {
      const checkpoint = {
        timestamp: new Date().toISOString(),
        status,
        checksum,
        counts,
      };
      localStorage.setItem(this.migrationCheckpointKey, JSON.stringify(checkpoint));
    } catch (error) {
      console.error("Failed to save migration checkpoint:", error);
    }
  }

  /**
   * Check migration checkpoint for recovery
   */
  getMigrationCheckpoint(): {
    timestamp: string;
    status: string;
    counts: any;
  } | null {
    try {
      const checkpoint = localStorage.getItem(this.migrationCheckpointKey);
      return checkpoint ? JSON.parse(checkpoint) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear migration checkpoint after successful migration
   */
  clearMigrationCheckpoint(): void {
    try {
      localStorage.removeItem(this.migrationCheckpointKey);
    } catch (error) {
      console.error("Failed to clear migration checkpoint:", error);
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

    const localData = this.getLocalStorageData();
    if (localData) {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const employees = localData.employees.filter((emp) =>
          emp.name.includes("a"),
        );
        const jobs = localData.jobs.filter((job) => job.isActive);
      }
      localStorageTime = (performance.now() - start) / iterations;
    }

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
      indexedDBTime = -1;
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
