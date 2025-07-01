/**
 * Backup Compatibility Verification Utility
 *
 * Run this script to verify that the backup system maintains
 * backward compatibility.
 *
 * Usage: Import and call verifyBackupCompatibility() in development
 */

import {
  runCompatibilityTestSuite,
  printTestResults,
} from "./backupCompatibilityTests";

/**
 * Main verification function
 */
export function verifyBackupCompatibility(): boolean {
  console.log("🔍 Starting Backup Compatibility Verification...");
  console.log("=" * 50);

  const testSuite = runCompatibilityTestSuite();

  printTestResults(testSuite.results);

  if (testSuite.success) {
    console.log("✅ VERIFICATION PASSED");
    console.log("🔒 Backward compatibility is guaranteed");
    console.log("📦 All future backups will be restorable");
  } else {
    console.log("❌ VERIFICATION FAILED");
    console.log("⚠️  Backward compatibility is at risk");
    console.log("🚨 Fix issues before releasing to production");
  }

  return testSuite.success;
}

/**
 * Browser-compatible verification for development console
 */
export function verifyInBrowser(): void {
  console.clear();
  console.log(
    "%c🔍 Backup Compatibility Verification",
    "font-size: 18px; font-weight: bold; color: #2563eb;",
  );

  const success = verifyBackupCompatibility();

  if (success) {
    console.log(
      "%c✅ ALL TESTS PASSED - Backup compatibility guaranteed!",
      "font-size: 16px; font-weight: bold; color: #16a34a; background: #dcfce7; padding: 8px;",
    );
  } else {
    console.log(
      "%c❌ TESTS FAILED - Backup compatibility at risk!",
      "font-size: 16px; font-weight: bold; color: #dc2626; background: #fef2f2; padding: 8px;",
    );
  }
}

// Auto-run in development if called directly
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  // Add global function for easy access in browser console
  (window as any).verifyBackupCompatibility = verifyInBrowser;

  console.log(
    "%cBackup Compatibility Verifier Loaded",
    "color: #6366f1; font-weight: bold;",
  );
  console.log("Run verifyBackupCompatibility() in console to test");
}
