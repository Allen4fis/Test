/**
 * Backup Compatibility and Migration System
 *
 * This module ensures backward compatibility for all backup formats
 * created from v1.0.0 onwards. It handles version detection, migration,
 * and validation of backup data.
 *
 * CRITICAL: Never remove or change existing migration logic.
 * Only add new migrations for new versions.
 */

import { AppData } from "@/types";

// Current backup format version
export const CURRENT_BACKUP_VERSION = "1.0.0";

// Backup format history - NEVER REMOVE ENTRIES
export const BACKUP_VERSION_HISTORY = [
  "1.0.0", // Initial version with versioning system
] as const;

export type BackupVersion = (typeof BACKUP_VERSION_HISTORY)[number];

/**
 * Enhanced backup metadata with versioning
 */
export interface VersionedBackupMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  dataSize: number;
  version: BackupVersion; // Backup format version
  appVersion?: string; // Application version when backup was created
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
    hourTypes: number;
    provinces: number;
  };
  // Migration tracking
  migratedFrom?: BackupVersion;
  migrationTimestamp?: string;
}

/**
 * Versioned backup with data
 */
export interface VersionedStoredBackup extends VersionedBackupMetadata {
  data: AppData;
}

/**
 * Legacy backup format (pre-versioning) - v0.x.x
 * This represents the original backup format before versioning was added
 */
export interface LegacyBackupMetadata {
  id: string;
  name: string;
  description?: string;
  timestamp: string;
  dataSize: number;
  recordCounts: {
    employees: number;
    jobs: number;
    timeEntries: number;
    rentalItems: number;
    rentalEntries: number;
    hourTypes: number;
    provinces: number;
  };
  // No version field - this is how we detect legacy backups
}

export interface LegacyStoredBackup extends LegacyBackupMetadata {
  data: AppData;
}

/**
 * Union type for any backup format
 */
export type AnyBackup = VersionedStoredBackup | LegacyStoredBackup;
export type AnyBackupMetadata = VersionedBackupMetadata | LegacyBackupMetadata;

/**
 * Detects the version of a backup
 */
export function detectBackupVersion(backup: AnyBackup): BackupVersion {
  if ("version" in backup && backup.version) {
    return backup.version;
  }
  // Legacy backup - no version field means it's from before versioning
  return "1.0.0"; // We'll treat legacy as 1.0.0 for migration purposes
}

/**
 * Checks if a backup is legacy (pre-versioning)
 */
export function isLegacyBackup(
  backup: AnyBackup,
): backup is LegacyStoredBackup {
  return !("version" in backup) || !backup.version;
}

/**
 * Validates backup data structure
 */
export function validateBackupData(data: any): data is AppData {
  if (!data || typeof data !== "object") {
    return false;
  }

  const requiredFields = [
    "employees",
    "jobs",
    "timeEntries",
    "rentalItems",
    "rentalEntries",
    "hourTypes",
    "provinces",
  ];

  for (const field of requiredFields) {
    if (!Array.isArray(data[field])) {
      return false;
    }
  }

  return true;
}

/**
 * Validates a complete backup structure
 */
export function validateBackup(backup: any): backup is AnyBackup {
  if (!backup || typeof backup !== "object") {
    return false;
  }

  // Check required metadata fields
  const requiredMetadata = [
    "id",
    "name",
    "timestamp",
    "dataSize",
    "recordCounts",
    "data",
  ];
  for (const field of requiredMetadata) {
    if (!(field in backup)) {
      return false;
    }
  }

  // Validate data structure
  if (!validateBackupData(backup.data)) {
    return false;
  }

  return true;
}

/**
 * Migration functions for each version upgrade
 * CRITICAL: Never modify existing migration functions
 */

/**
 * Migrates legacy backup (pre-versioning) to v1.0.0
 */
function migrateLegacyTo1_0_0(
  backup: LegacyStoredBackup,
): VersionedStoredBackup {
  // Legacy backups already have the correct structure for v1.0.0
  // We just need to add versioning metadata
  return {
    ...backup,
    version: "1.0.0",
    appVersion: "unknown", // We don't know which app version created this
    migratedFrom: "1.0.0", // Mark as migrated from legacy
    migrationTimestamp: new Date().toISOString(),
  };
}

/**
 * Template for future migrations
 *
 * function migrate1_0_0To1_1_0(backup: VersionedStoredBackup): VersionedStoredBackup {
 *   // Example: Add new optional fields with defaults
 *   const migratedData = {
 *     ...backup.data,
 *     // Add new fields here with sensible defaults
 *     newField: backup.data.newField || defaultValue
 *   };
 *
 *   return {
 *     ...backup,
 *     version: "1.1.0",
 *     data: migratedData,
 *     migratedFrom: backup.version,
 *     migrationTimestamp: new Date().toISOString()
 *   };
 * }
 */

/**
 * Main migration function - migrates any backup to current version
 */
export function migrateBackup(backup: AnyBackup): VersionedStoredBackup {
  let currentBackup = backup;
  const originalVersion = detectBackupVersion(backup);

  // Migration chain - process each version upgrade

  // Step 1: Handle legacy backups
  if (isLegacyBackup(currentBackup)) {
    currentBackup = migrateLegacyTo1_0_0(currentBackup);
  }

  // Step 2: Add future migrations here
  // Example:
  // if (currentBackup.version === "1.0.0") {
  //   currentBackup = migrate1_0_0To1_1_0(currentBackup);
  // }
  // if (currentBackup.version === "1.1.0") {
  //   currentBackup = migrate1_1_0To1_2_0(currentBackup);
  // }

  // Ensure we have a versioned backup
  const versionedBackup = currentBackup as VersionedStoredBackup;

  // Update to current version if we went through migrations
  if (originalVersion !== CURRENT_BACKUP_VERSION) {
    versionedBackup.version = CURRENT_BACKUP_VERSION;
    versionedBackup.migrationTimestamp = new Date().toISOString();
  }

  return versionedBackup;
}

/**
 * Creates a new backup with current version
 */
export function createVersionedBackup(
  id: string,
  name: string,
  description: string | undefined,
  data: AppData,
  appVersion?: string,
): VersionedStoredBackup {
  const timestamp = new Date().toISOString();

  return {
    id,
    name,
    description,
    timestamp,
    version: CURRENT_BACKUP_VERSION,
    appVersion: appVersion || "unknown",
    dataSize: new Blob([JSON.stringify(data)]).size,
    recordCounts: {
      employees: data.employees.length,
      jobs: data.jobs.length,
      timeEntries: data.timeEntries.length,
      rentalItems: data.rentalItems.length,
      rentalEntries: data.rentalEntries.length,
      hourTypes: data.hourTypes.length,
      provinces: data.provinces.length,
    },
    data,
  };
}

/**
 * Safely loads and validates backups from storage
 */
export function loadAndValidateBackups(
  storedData: string,
): VersionedStoredBackup[] {
  try {
    const parsed = JSON.parse(storedData);

    if (!Array.isArray(parsed)) {
      console.warn("Backup storage is not an array, returning empty array");
      return [];
    }

    const validBackups: VersionedStoredBackup[] = [];

    for (const item of parsed) {
      try {
        // Validate backup structure
        if (!validateBackup(item)) {
          console.warn(
            "Invalid backup structure found, skipping:",
            item?.id || "unknown",
          );
          continue;
        }

        // Migrate to current version
        const migratedBackup = migrateBackup(item);
        validBackups.push(migratedBackup);
      } catch (error) {
        console.error("Error processing backup:", item?.id || "unknown", error);
        // Continue processing other backups
      }
    }

    return validBackups.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.error("Error loading backups from storage:", error);
    return [];
  }
}

/**
 * Compatibility check - ensures data can be safely restored
 */
export function checkRestoreCompatibility(backup: VersionedStoredBackup): {
  compatible: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check if backup was migrated
  if (backup.migratedFrom) {
    warnings.push(
      `This backup was migrated from version ${backup.migratedFrom} to ${backup.version}`,
    );
  }

  // Validate data integrity
  if (!validateBackupData(backup.data)) {
    errors.push("Backup data structure is invalid or corrupted");
  }

  // Check for required fields in each data type
  const dataChecks = [
    { name: "employees", required: ["id", "name", "billableWage", "costWage"] },
    {
      name: "jobs",
      required: ["id", "jobNumber", "name", "isActive", "isBillable"],
    },
    {
      name: "timeEntries",
      required: ["id", "employeeId", "jobId", "date", "hours"],
    },
    {
      name: "rentalItems",
      required: ["id", "name", "dailyRate", "unit", "isActive"],
    },
    {
      name: "rentalEntries",
      required: ["id", "rentalItemId", "jobId", "startDate", "endDate"],
    },
    { name: "hourTypes", required: ["id", "name", "multiplier"] },
    { name: "provinces", required: ["id", "name", "code"] },
  ];

  for (const check of dataChecks) {
    const items = backup.data[check.name as keyof AppData];
    if (Array.isArray(items) && items.length > 0) {
      const sampleItem = items[0];
      const missing = check.required.filter((field) => !(field in sampleItem));
      if (missing.length > 0) {
        errors.push(
          `${check.name} missing required fields: ${missing.join(", ")}`,
        );
      }
    }
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Get human-readable version info
 */
export function getVersionInfo(backup: VersionedStoredBackup): string {
  let info = `Backup Version: ${backup.version}`;

  if (backup.appVersion && backup.appVersion !== "unknown") {
    info += ` (App: ${backup.appVersion})`;
  }

  if (backup.migratedFrom) {
    info += ` [Migrated from ${backup.migratedFrom}]`;
  }

  return info;
}
