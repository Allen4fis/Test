/**
 * Backup Compatibility Test Utilities
 *
 * This module provides utilities to test backup compatibility
 * and validate the migration system.
 */

import { AppData } from "@/types";
import {
  VersionedStoredBackup,
  LegacyStoredBackup,
  createVersionedBackup,
  migrateBackup,
  validateBackup,
  checkRestoreCompatibility,
  loadAndValidateBackups,
  CURRENT_BACKUP_VERSION,
} from "./backupCompatibility";

/**
 * Sample data for testing
 */
export function createSampleAppData(): AppData {
  return {
    employees: [
      {
        id: "emp_1",
        name: "John Doe",
        title: "Developer",
        email: "john@example.com",
        billableWage: 75,
        costWage: 50,
        category: "employee",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    jobs: [
      {
        id: "job_1",
        jobNumber: "J001",
        name: "Test Project",
        description: "A test project",
        isActive: true,
        isBillable: true,
        invoicedDates: [],
        paidDates: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    timeEntries: [
      {
        id: "time_1",
        employeeId: "emp_1",
        jobId: "job_1",
        hourTypeId: "hour_1",
        provinceId: "prov_1",
        date: "2024-01-01",
        hours: 8,
        title: "Developer",
        billableWageUsed: 75,
        costWageUsed: 50,
        description: "Development work",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    rentalItems: [
      {
        id: "rental_1",
        name: "Laptop",
        description: "Development laptop",
        category: "Equipment",
        dailyRate: 25,
        unit: "day",
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    rentalEntries: [
      {
        id: "rental_entry_1",
        rentalItemId: "rental_1",
        jobId: "job_1",
        employeeId: "emp_1",
        startDate: "2024-01-01",
        endDate: "2024-01-01",
        quantity: 1,
        billingUnit: "day",
        rateUsed: 25,
        description: "Laptop rental",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
    hourTypes: [
      {
        id: "hour_1",
        name: "Regular",
        description: "Regular working hours",
        multiplier: 1.0,
      },
    ],
    provinces: [
      {
        id: "prov_1",
        name: "Alberta",
        code: "AB",
      },
    ],
  };
}

/**
 * Creates a legacy backup for testing migration
 */
export function createLegacyBackup(
  name: string = "Legacy Test Backup",
): LegacyStoredBackup {
  const data = createSampleAppData();

  return {
    id: `backup_${Date.now()}`,
    name,
    description: "Test legacy backup",
    timestamp: new Date().toISOString(),
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
 * Test results interface
 */
export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

/**
 * Comprehensive backup compatibility test suite
 */
export function runBackupCompatibilityTests(): TestResult[] {
  const results: TestResult[] = [];

  // Test 1: Create current version backup
  try {
    const data = createSampleAppData();
    const backup = createVersionedBackup(
      "test_backup_1",
      "Test Backup",
      "Test description",
      data,
      CURRENT_BACKUP_VERSION,
    );

    results.push({
      name: "Create Versioned Backup",
      passed: backup.version === CURRENT_BACKUP_VERSION,
      message:
        backup.version === CURRENT_BACKUP_VERSION
          ? "Successfully created versioned backup"
          : `Expected version ${CURRENT_BACKUP_VERSION}, got ${backup.version}`,
      details: { version: backup.version },
    });
  } catch (error) {
    results.push({
      name: "Create Versioned Backup",
      passed: false,
      message: `Failed to create backup: ${error}`,
    });
  }

  // Test 2: Validate backup structure
  try {
    const data = createSampleAppData();
    const backup = createVersionedBackup(
      "test_backup_2",
      "Test Backup 2",
      undefined,
      data,
    );

    const isValid = validateBackup(backup);
    results.push({
      name: "Validate Backup Structure",
      passed: isValid,
      message: isValid
        ? "Backup structure is valid"
        : "Backup structure validation failed",
    });
  } catch (error) {
    results.push({
      name: "Validate Backup Structure",
      passed: false,
      message: `Validation failed: ${error}`,
    });
  }

  // Test 3: Legacy backup migration
  try {
    const legacyBackup = createLegacyBackup();
    const migratedBackup = migrateBackup(legacyBackup);

    const isVersioned = "version" in migratedBackup && migratedBackup.version;
    const hasMigrationInfo = "migratedFrom" in migratedBackup;

    results.push({
      name: "Legacy Backup Migration",
      passed: isVersioned && hasMigrationInfo,
      message:
        isVersioned && hasMigrationInfo
          ? "Legacy backup successfully migrated"
          : "Legacy backup migration failed",
      details: {
        version: migratedBackup.version,
        migratedFrom: migratedBackup.migratedFrom,
      },
    });
  } catch (error) {
    results.push({
      name: "Legacy Backup Migration",
      passed: false,
      message: `Migration failed: ${error}`,
    });
  }

  // Test 4: Compatibility check
  try {
    const data = createSampleAppData();
    const backup = createVersionedBackup(
      "test_backup_4",
      "Test Backup 4",
      undefined,
      data,
    );

    const compatibility = checkRestoreCompatibility(backup);
    results.push({
      name: "Restore Compatibility Check",
      passed: compatibility.compatible,
      message: compatibility.compatible
        ? "Backup is compatible for restore"
        : `Compatibility issues: ${compatibility.errors.join(", ")}`,
      details: compatibility,
    });
  } catch (error) {
    results.push({
      name: "Restore Compatibility Check",
      passed: false,
      message: `Compatibility check failed: ${error}`,
    });
  }

  // Test 5: Load and validate multiple backups
  try {
    const data = createSampleAppData();
    const backup1 = createVersionedBackup("test_1", "Test 1", undefined, data);
    const backup2 = createLegacyBackup("Legacy Test");
    const backups = [backup1, backup2];

    const serialized = JSON.stringify(backups);
    const loaded = loadAndValidateBackups(serialized);

    const allVersioned = loaded.every((b) => "version" in b && b.version);
    const correctCount = loaded.length === 2;

    results.push({
      name: "Load and Validate Multiple Backups",
      passed: allVersioned && correctCount,
      message:
        allVersioned && correctCount
          ? "Successfully loaded and migrated all backups"
          : "Failed to load or migrate backups correctly",
      details: {
        originalCount: backups.length,
        loadedCount: loaded.length,
        allVersioned,
      },
    });
  } catch (error) {
    results.push({
      name: "Load and Validate Multiple Backups",
      passed: false,
      message: `Loading failed: ${error}`,
    });
  }

  // Test 6: Data integrity preservation
  try {
    const originalData = createSampleAppData();
    const backup = createVersionedBackup(
      "test_backup_6",
      "Data Integrity Test",
      undefined,
      originalData,
    );

    const migrated = migrateBackup(backup);
    const restoredData = migrated.data;

    // Check if all data arrays are preserved
    const dataIntact = Object.keys(originalData).every((key) => {
      const original = originalData[key as keyof AppData];
      const restored = restoredData[key as keyof AppData];
      return (
        Array.isArray(original) &&
        Array.isArray(restored) &&
        original.length === restored.length
      );
    });

    results.push({
      name: "Data Integrity Preservation",
      passed: dataIntact,
      message: dataIntact
        ? "All data preserved through migration"
        : "Data lost or corrupted during migration",
      details: {
        originalEmployees: originalData.employees.length,
        restoredEmployees: restoredData.employees.length,
        originalJobs: originalData.jobs.length,
        restoredJobs: restoredData.jobs.length,
      },
    });
  } catch (error) {
    results.push({
      name: "Data Integrity Preservation",
      passed: false,
      message: `Data integrity test failed: ${error}`,
    });
  }

  // Test 7: Invalid backup handling
  try {
    const invalidBackups = [
      null,
      undefined,
      {},
      { id: "test" },
      { data: "invalid" },
    ];

    const validationResults = invalidBackups.map((backup) =>
      validateBackup(backup),
    );

    const allInvalid = validationResults.every((result) => !result);

    results.push({
      name: "Invalid Backup Handling",
      passed: allInvalid,
      message: allInvalid
        ? "Invalid backups correctly rejected"
        : "Some invalid backups incorrectly accepted",
      details: { validationResults },
    });
  } catch (error) {
    results.push({
      name: "Invalid Backup Handling",
      passed: false,
      message: `Invalid backup test failed: ${error}`,
    });
  }

  return results;
}

/**
 * Print test results to console
 */
export function printTestResults(results: TestResult[]): void {
  console.log("\n=== Backup Compatibility Test Results ===\n");

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result, index) => {
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${status}: ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
    console.log("");
  });

  console.log(`=== Summary: ${passed}/${total} tests passed ===\n`);

  if (passed === total) {
    console.log("🎉 All backup compatibility tests PASSED!");
    console.log(
      "✅ Backups created now will be restorable in future versions.",
    );
  } else {
    console.log("⚠️  Some tests FAILED - backup compatibility may be at risk!");
    console.log("❌ Review failed tests and fix issues before deploying.");
  }
}

/**
 * Run tests and return summary
 */
export function runCompatibilityTestSuite(): {
  passed: number;
  total: number;
  success: boolean;
  results: TestResult[];
} {
  const results = runBackupCompatibilityTests();
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  return {
    passed,
    total,
    success: passed === total,
    results,
  };
}
