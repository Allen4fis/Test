// Memory optimization utilities for long-term application stability

export interface MemoryProfile {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss?: number;
}

export interface LeakDetectionResult {
  potentialLeaks: string[];
  memoryGrowthRate: number;
  recommendations: string[];
  severity: "low" | "medium" | "high" | "critical";
}

class MemoryProfiler {
  private profiles: MemoryProfile[] = [];
  private maxProfiles = 100;
  private monitoringInterval?: NodeJS.Timeout;

  startProfiling(intervalMs: number = 10000) {
    this.stopProfiling();
    this.monitoringInterval = setInterval(() => {
      this.captureProfile();
    }, intervalMs);
    this.captureProfile(); // Initial capture
  }

  stopProfiling() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private captureProfile(): void {
    const profile: MemoryProfile = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
    };

    // Use performance.memory if available (Chrome)
    if ("memory" in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      profile.heapUsed = memory.usedJSHeapSize;
      profile.heapTotal = memory.totalJSHeapSize;
      profile.external = memory.totalJSHeapSize - memory.usedJSHeapSize;
    }

    this.profiles.push(profile);

    // Keep only recent profiles
    if (this.profiles.length > this.maxProfiles) {
      this.profiles = this.profiles.slice(-this.maxProfiles);
    }
  }

  getProfiles(): MemoryProfile[] {
    return [...this.profiles];
  }

  detectLeaks(): LeakDetectionResult {
    if (this.profiles.length < 10) {
      return {
        potentialLeaks: [],
        memoryGrowthRate: 0,
        recommendations: ["Insufficient data for leak detection"],
        severity: "low",
      };
    }

    const potentialLeaks: string[] = [];
    const recommendations: string[] = [];

    // Calculate memory growth rate
    const firstProfile = this.profiles[0];
    const lastProfile = this.profiles[this.profiles.length - 1];
    const timeDiff = lastProfile.timestamp - firstProfile.timestamp;
    const memoryDiff = lastProfile.heapUsed - firstProfile.heapUsed;
    const growthRate = (memoryDiff / firstProfile.heapUsed) * 100;

    // Analyze trends
    const recentProfiles = this.profiles.slice(-20);
    const trends = this.analyzeTrends(recentProfiles);

    if (trends.consistentGrowth > 0.8) {
      potentialLeaks.push("Consistent memory growth detected");
      recommendations.push("Review component cleanup and event listeners");
    }

    if (trends.volatility > 0.5) {
      potentialLeaks.push("High memory volatility detected");
      recommendations.push("Optimize data structures and reduce object churn");
    }

    if (lastProfile.heapUsed > 100 * 1024 * 1024) {
      // 100MB
      potentialLeaks.push("High memory usage detected");
      recommendations.push("Consider data archiving or pagination");
    }

    // Determine severity
    let severity: "low" | "medium" | "high" | "critical" = "low";
    if (growthRate > 50 || lastProfile.heapUsed > 200 * 1024 * 1024) {
      severity = "critical";
    } else if (growthRate > 20 || lastProfile.heapUsed > 100 * 1024 * 1024) {
      severity = "high";
    } else if (growthRate > 10 || trends.consistentGrowth > 0.6) {
      severity = "medium";
    }

    return {
      potentialLeaks,
      memoryGrowthRate: growthRate,
      recommendations,
      severity,
    };
  }

  private analyzeTrends(profiles: MemoryProfile[]): {
    consistentGrowth: number;
    volatility: number;
  } {
    if (profiles.length < 3) {
      return { consistentGrowth: 0, volatility: 0 };
    }

    let growthCount = 0;
    let totalChange = 0;
    const changes: number[] = [];

    for (let i = 1; i < profiles.length; i++) {
      const change = profiles[i].heapUsed - profiles[i - 1].heapUsed;
      changes.push(change);
      totalChange += Math.abs(change);

      if (change > 0) {
        growthCount++;
      }
    }

    const consistentGrowth = growthCount / changes.length;

    // Calculate volatility (coefficient of variation)
    const mean = changes.reduce((a, b) => a + b, 0) / changes.length;
    const variance =
      changes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance) / Math.abs(mean || 1);

    return {
      consistentGrowth,
      volatility: Math.min(volatility, 1), // Cap at 1
    };
  }

  clearProfiles(): void {
    this.profiles = [];
  }
}

// Memory cleanup utilities
export class MemoryCleanup {
  private cleanupTasks: Array<() => void> = [];
  private intervalCleanup?: NodeJS.Timeout;

  // Register cleanup task
  addCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task);
  }

  // Start periodic cleanup
  startPeriodicCleanup(intervalMs: number = 60000): void {
    this.stopPeriodicCleanup();
    this.intervalCleanup = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  stopPeriodicCleanup(): void {
    if (this.intervalCleanup) {
      clearInterval(this.intervalCleanup);
      this.intervalCleanup = undefined;
    }
  }

  // Manual cleanup
  runCleanup(): void {
    // Clear caches
    this.clearDOMCaches();
    this.clearComponentCaches();
    this.clearCalculationCaches();

    // Run custom cleanup tasks
    this.cleanupTasks.forEach((task) => {
      try {
        task();
      } catch (error) {
        console.warn("Cleanup task failed:", error);
      }
    });

    // Force garbage collection if available
    this.requestGarbageCollection();
  }

  private clearDOMCaches(): void {
    // Clear any DOM element references that might be cached
    const elementsToClean = [
      "data-cached-element",
      "data-temp-element",
      "data-processed",
    ];

    elementsToClean.forEach((attr) => {
      const elements = document.querySelectorAll(`[${attr}]`);
      elements.forEach((el) => el.removeAttribute(attr));
    });
  }

  private clearComponentCaches(): void {
    // Clear React component caches if any are manually maintained
    // This would be specific to the application's caching strategy

    // Clear any global component state
    if ((window as any).__COMPONENT_CACHE__) {
      (window as any).__COMPONENT_CACHE__ = {};
    }
  }

  private clearCalculationCaches(): void {
    // Clear any calculation caches that might exist
    if ((window as any).__CALCULATION_CACHE__) {
      (window as any).__CALCULATION_CACHE__ = new Map();
    }
  }

  private requestGarbageCollection(): void {
    // Request garbage collection if available
    if (window.gc && typeof window.gc === "function") {
      try {
        window.gc();
      } catch (error) {
        // GC not available or failed
      }
    }
  }
}

// React hook for memory management
export function useMemoryManagement() {
  const profiler = new MemoryProfiler();
  const cleanup = new MemoryCleanup();

  const startMonitoring = () => {
    profiler.startProfiling(10000); // Every 10 seconds
    cleanup.startPeriodicCleanup(60000); // Every minute
  };

  const stopMonitoring = () => {
    profiler.stopProfiling();
    cleanup.stopPeriodicCleanup();
  };

  const getMemoryReport = () => {
    const profiles = profiler.getProfiles();
    const leakDetection = profiler.detectLeaks();

    return {
      profiles,
      leakDetection,
      currentMemory: profiles[profiles.length - 1] || null,
    };
  };

  const forceCleanup = () => {
    cleanup.runCleanup();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, []);

  return {
    startMonitoring,
    stopMonitoring,
    getMemoryReport,
    forceCleanup,
  };
}

// Data structure optimization utilities
export class DataOptimizer {
  // Optimize large arrays by removing unnecessary properties
  static optimizeTimeEntries(entries: any[]): any[] {
    return entries.map((entry) => ({
      id: entry.id,
      employeeId: entry.employeeId,
      jobId: entry.jobId,
      hourTypeId: entry.hourTypeId,
      provinceId: entry.provinceId,
      date: entry.date,
      hours: entry.hours,
      loaCount: entry.loaCount || 0,
      billableWageUsed: entry.billableWageUsed || 0,
      costWageUsed: entry.costWageUsed || 0,
      title: entry.title || "",
      description: entry.description || "",
      createdAt: entry.createdAt,
    }));
  }

  // Create indices for fast lookups
  static createIndex<T>(
    items: T[],
    keyFn: (item: T) => string,
  ): Map<string, T[]> {
    const index = new Map<string, T[]>();

    for (const item of items) {
      const key = keyFn(item);
      if (!index.has(key)) {
        index.set(key, []);
      }
      index.get(key)!.push(item);
    }

    return index;
  }

  // Compress data for storage
  static compressData(data: any): string {
    try {
      // Simple compression by removing whitespace and using shorter keys
      const compressed = JSON.stringify(data, (key, value) => {
        // Shorten common keys
        const keyMap: Record<string, string> = {
          employeeId: "eId",
          jobId: "jId",
          hourTypeId: "hId",
          provinceId: "pId",
          billableWageUsed: "bWage",
          costWageUsed: "cWage",
          createdAt: "cAt",
          description: "desc",
        };

        return keyMap[key] || value;
      });

      return compressed;
    } catch (error) {
      console.error("Data compression failed:", error);
      return JSON.stringify(data);
    }
  }

  // Decompress data from storage
  static decompressData(compressedData: string): any {
    try {
      const data = JSON.parse(compressedData);

      // Restore original keys
      const keyMap: Record<string, string> = {
        eId: "employeeId",
        jId: "jobId",
        hId: "hourTypeId",
        pId: "provinceId",
        bWage: "billableWageUsed",
        cWage: "costWageUsed",
        cAt: "createdAt",
        desc: "description",
      };

      const restoreKeys = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(restoreKeys);
        }

        if (obj && typeof obj === "object") {
          const restored: any = {};
          for (const [key, value] of Object.entries(obj)) {
            const originalKey = keyMap[key] || key;
            restored[originalKey] = restoreKeys(value);
          }
          return restored;
        }

        return obj;
      };

      return restoreKeys(data);
    } catch (error) {
      console.error("Data decompression failed:", error);
      return JSON.parse(compressedData);
    }
  }
}

// Performance monitoring singleton
export const memoryProfiler = new MemoryProfiler();
export const memoryCleanup = new MemoryCleanup();

// Global memory management setup
export function initializeMemoryManagement(): void {
  // Set up automatic cleanup tasks
  memoryCleanup.addCleanupTask(() => {
    // Clear any React query caches
    if ((window as any).queryClient) {
      (window as any).queryClient.clear();
    }
  });

  memoryCleanup.addCleanupTask(() => {
    // Clear console logs to prevent memory buildup in dev mode
    if (console.clear && process.env.NODE_ENV === "development") {
      const logs = (console as any)._logs;
      if (logs && logs.length > 1000) {
        logs.splice(0, logs.length - 500);
      }
    }
  });

  // Start monitoring in production
  if (process.env.NODE_ENV === "production") {
    memoryProfiler.startProfiling(30000); // Every 30 seconds
    memoryCleanup.startPeriodicCleanup(300000); // Every 5 minutes
  }
}

declare global {
  interface Window {
    gc?: () => void;
    __COMPONENT_CACHE__?: any;
    __CALCULATION_CACHE__?: Map<string, any>;
  }
}
