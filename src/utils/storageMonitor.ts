/**
 * Storage Monitor - Tracks localStorage usage and warns when approaching quota
 * Prevents silent data loss from quota exceeded errors
 */

export interface StorageStats {
  used: number; // bytes used
  quota: number; // total quota in bytes
  available: number; // bytes available
  percentUsed: number; // 0-100
  status: "healthy" | "warning" | "critical";
}

export interface StorageBreakdown {
  mainData: number;
  autosaves: number;
  backups: number;
  other: number;
  total: number;
}

const STORAGE_KEYS = {
  MAIN_DATA: "timeTrackingApp",
  AUTOSAVES: "timeTrackingApp-autosave",
  BACKUPS: "trackity-doo-backups",
};

// Conservative quota estimate (browsers vary: 5-10MB)
const ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB safe estimate

/**
 * Get total localStorage usage in bytes
 */
export function getStorageUsed(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          total += key.length + value.length;
        }
      }
    }
    return total;
  } catch (error) {
    console.error("Error calculating storage used:", error);
    return 0;
  }
}

/**
 * Get breakdown of storage usage by data type
 */
export function getStorageBreakdown(): StorageBreakdown {
  try {
    const breakdown: StorageBreakdown = {
      mainData: 0,
      autosaves: 0,
      backups: 0,
      other: 0,
      total: 0,
    };

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key);
      if (!value) continue;

      const size = key.length + value.length;

      if (key === STORAGE_KEYS.MAIN_DATA) {
        breakdown.mainData = size;
      } else if (key === STORAGE_KEYS.AUTOSAVES) {
        breakdown.autosaves = size;
      } else if (key === STORAGE_KEYS.BACKUPS) {
        breakdown.backups = size;
      } else {
        breakdown.other += size;
      }
    }

    breakdown.total = breakdown.mainData + breakdown.autosaves + breakdown.backups + breakdown.other;
    return breakdown;
  } catch (error) {
    console.error("Error getting storage breakdown:", error);
    return {
      mainData: 0,
      autosaves: 0,
      backups: 0,
      other: 0,
      total: 0,
    };
  }
}

/**
 * Get overall storage statistics
 */
export function getStorageStats(): StorageStats {
  const used = getStorageUsed();
  const quota = ESTIMATED_QUOTA;
  const available = Math.max(0, quota - used);
  const percentUsed = (used / quota) * 100;

  let status: "healthy" | "warning" | "critical";
  if (percentUsed >= 95) {
    status = "critical";
  } else if (percentUsed >= 80) {
    status = "warning";
  } else {
    status = "healthy";
  }

  return {
    used,
    quota,
    available,
    percentUsed,
    status,
  };
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Check if storage quota is approaching critical levels
 */
export function isStorageCritical(): boolean {
  const stats = getStorageStats();
  return stats.status === "critical";
}

/**
 * Check if storage quota is in warning zone
 */
export function isStorageWarning(): boolean {
  const stats = getStorageStats();
  return stats.status === "warning" || stats.status === "critical";
}

/**
 * Get storage cleanup suggestions
 */
export function getCleanupSuggestions(): string[] {
  const breakdown = getStorageBreakdown();
  const stats = getStorageStats();
  const suggestions: string[] = [];

  if (stats.percentUsed > 95) {
    suggestions.push("🔴 CRITICAL: Storage is 95%+ full. Take action immediately to prevent data loss.");
  } else if (stats.percentUsed > 80) {
    suggestions.push("🟡 WARNING: Storage is 80%+ full. Consider cleanup soon.");
  }

  // Suggest clearing old autosaves if they exist and are taking space
  if (breakdown.autosaves > 500 * 1024) { // > 500KB
    suggestions.push(`Autosaves: ${formatBytes(breakdown.autosaves)} - Consider clearing old autosaves.`);
  }

  // Note: Never suggest clearing backups automatically
  if (breakdown.backups > 0) {
    suggestions.push(`Backups: ${formatBytes(breakdown.backups)} - Export important backups to files if storage is full.`);
  }

  if (breakdown.other > 1024 * 1024) { // > 1MB
    suggestions.push(`Other data: ${formatBytes(breakdown.other)} - Some cache data could be cleared.`);
  }

  return suggestions;
}

/**
 * Check if a new data item will fit in storage
 */
export function canFitInStorage(dataSize: number): boolean {
  const stats = getStorageStats();
  return stats.available > dataSize + (100 * 1024); // Keep 100KB buffer
}

/**
 * Get percentage of storage used (0-100)
 */
export function getStoragePercentage(): number {
  return getStorageStats().percentUsed;
}

/**
 * Clear old autosaves to free up space (keeping most recent 3)
 */
export function clearOldAutosaves(): number {
  try {
    const autosaves = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTOSAVES) || "[]");

    if (autosaves.length <= 3) {
      return 0; // Nothing to clear
    }

    const oldSize = JSON.stringify(autosaves).length;
    const kept = autosaves.slice(0, 3);
    const newSize = JSON.stringify(kept).length;
    const freed = oldSize - newSize;

    localStorage.setItem(STORAGE_KEYS.AUTOSAVES, JSON.stringify(kept));

    return freed;
  } catch (error) {
    console.error("Error clearing old autosaves:", error);
    return 0;
  }
}
