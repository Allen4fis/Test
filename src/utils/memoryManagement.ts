/**
 * Memory Management and Performance Monitoring Utilities
 * Critical for handling 12,000+ entries efficiently
 */

interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedMB: number;
  totalMB: number;
  usage: number;
}

interface PerformanceMetrics {
  memoryStats: MemoryStats;
  renderTime: number;
  componentCounts: Map<string, number>;
  largeArraySizes: Map<string, number>;
  timestamp: number;
}

class MemoryManager {
  private intervalId: NodeJS.Timeout | null = null;
  private metrics: PerformanceMetrics[] = [];
  private maxMetricsHistory = 100;
  private cleanupCallbacks: Set<() => void> = new Set();
  private gcCallbacks: Set<() => void> = new Set();

  constructor() {
    this.startMonitoring();
  }

  // Start continuous memory monitoring
  startMonitoring(intervalMs: number = 30000): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.collectMetrics();
      this.checkMemoryPressure();
    }, intervalMs);
  }

  // Stop monitoring
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Get current memory statistics
  getMemoryStats(): MemoryStats {
    const memory = (performance as any).memory;

    if (!memory) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        usedMB: 0,
        totalMB: 0,
        usage: 0,
      };
    }

    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const totalMB = memory.totalJSHeapSize / 1024 / 1024;

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedMB: Math.round(usedMB * 100) / 100,
      totalMB: Math.round(totalMB * 100) / 100,
      usage: Math.round((usedMB / totalMB) * 100),
    };
  }

  // Collect comprehensive performance metrics
  private collectMetrics(): void {
    const startTime = performance.now();

    const metrics: PerformanceMetrics = {
      memoryStats: this.getMemoryStats(),
      renderTime: 0,
      componentCounts: new Map(),
      largeArraySizes: new Map(),
      timestamp: Date.now(),
    };

    // Measure component render time (simplified)
    metrics.renderTime = performance.now() - startTime;

    // Store metrics with size limit
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  // Check for memory pressure and trigger cleanup
  private checkMemoryPressure(): void {
    const stats = this.getMemoryStats();

    // Trigger cleanup at 80% memory usage
    if (stats.usage > 80) {
      console.warn(`High memory usage detected: ${stats.usage}%`);
      this.triggerCleanup();
    }

    // Force garbage collection at 90% usage (if available)
    if (stats.usage > 90) {
      console.warn(`Critical memory usage: ${stats.usage}% - forcing GC`);
      this.forceGarbageCollection();
    }
  }

  // Trigger registered cleanup callbacks
  private triggerCleanup(): void {
    console.log("Triggering memory cleanup...");
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Cleanup callback error:", error);
      }
    });
  }

  // Force garbage collection if available
  forceGarbageCollection(): void {
    if (window.gc) {
      window.gc();
      console.log("Forced garbage collection");
    }

    this.gcCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("GC callback error:", error);
      }
    });
  }

  // Register cleanup callback
  registerCleanupCallback(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  // Register GC callback
  registerGCCallback(callback: () => void): () => void {
    this.gcCallbacks.add(callback);
    return () => this.gcCallbacks.delete(callback);
  }

  // Get memory usage trend
  getMemoryTrend(samples: number = 10): MemoryStats[] {
    return this.metrics.slice(-samples).map((metric) => metric.memoryStats);
  }

  // Check if memory is growing consistently
  isMemoryLeaking(threshold: number = 5): boolean {
    const trend = this.getMemoryTrend(10);
    if (trend.length < 5) return false;

    const increases = trend.slice(1).reduce((count, current, index) => {
      return current.usedMB > trend[index].usedMB ? count + 1 : count;
    }, 0);

    return increases >= threshold;
  }

  // Clean up large objects
  cleanupLargeObjects<T extends Record<string, any>>(obj: T): void {
    if (!obj || typeof obj !== "object") return;

    Object.keys(obj).forEach((key) => {
      try {
        const value = obj[key];

        // Clear large arrays
        if (Array.isArray(value) && value.length > 1000) {
          console.log(
            `Cleaning up large array: ${key} (${value.length} items)`,
          );
          value.length = 0;
        }

        // Clear large maps
        if (value instanceof Map && value.size > 1000) {
          console.log(`Cleaning up large Map: ${key} (${value.size} items)`);
          value.clear();
        }

        // Clear large sets
        if (value instanceof Set && value.size > 1000) {
          console.log(`Cleaning up large Set: ${key} (${value.size} items)`);
          value.clear();
        }

        // Nullify large objects
        if (
          value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          Object.keys(value).length > 100
        ) {
          console.log(`Cleaning up large object: ${key}`);
          delete obj[key];
        }
      } catch (error) {
        console.error(`Error cleaning up ${key}:`, error);
      }
    });
  }

  // Get performance report
  getPerformanceReport(): {
    currentMemory: MemoryStats;
    memoryTrend: "increasing" | "decreasing" | "stable";
    avgRenderTime: number;
    leakWarning: boolean;
    recommendations: string[];
  } {
    const currentMemory = this.getMemoryStats();
    const trend = this.getMemoryTrend(5);
    const leakWarning = this.isMemoryLeaking();

    let memoryTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (trend.length >= 2) {
      const first = trend[0].usedMB;
      const last = trend[trend.length - 1].usedMB;
      const diff = last - first;

      if (diff > 5) memoryTrend = "increasing";
      else if (diff < -5) memoryTrend = "decreasing";
    }

    const avgRenderTime =
      this.metrics.length > 0
        ? this.metrics.reduce((sum, m) => sum + m.renderTime, 0) /
          this.metrics.length
        : 0;

    const recommendations: string[] = [];

    if (currentMemory.usage > 70) {
      recommendations.push(
        "High memory usage - consider implementing data virtualization",
      );
    }

    if (leakWarning) {
      recommendations.push(
        "Potential memory leak detected - check for uncleaned event listeners",
      );
    }

    if (avgRenderTime > 100) {
      recommendations.push(
        "Slow render times - consider React.memo and useMemo optimizations",
      );
    }

    if (memoryTrend === "increasing") {
      recommendations.push("Memory usage trending upward - monitor for leaks");
    }

    return {
      currentMemory,
      memoryTrend,
      avgRenderTime,
      leakWarning,
      recommendations,
    };
  }

  // Destroy and cleanup
  destroy(): void {
    this.stopMonitoring();
    this.cleanupCallbacks.clear();
    this.gcCallbacks.clear();
    this.metrics.length = 0;
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager();

// React hook for memory management
import { useEffect, useCallback, useRef } from "react";

interface UseMemoryManagementOptions {
  cleanupThreshold?: number;
  monitorInterval?: number;
  enableAutoCleanup?: boolean;
}

export function useMemoryManagement(options: UseMemoryManagementOptions = {}) {
  const {
    cleanupThreshold = 80,
    monitorInterval = 30000,
    enableAutoCleanup = true,
  } = options;

  const cleanupRef = useRef<Set<() => void>>(new Set());
  const statsRef = useRef<MemoryStats | null>(null);

  // Register cleanup function
  const registerCleanup = useCallback((callback: () => void) => {
    cleanupRef.current.add(callback);
    return () => cleanupRef.current.delete(callback);
  }, []);

  // Manual cleanup trigger
  const triggerCleanup = useCallback(() => {
    cleanupRef.current.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    });

    if (window.gc) {
      window.gc();
    }
  }, []);

  // Get current memory stats
  const getMemoryStats = useCallback(() => {
    return memoryManager.getMemoryStats();
  }, []);

  // Setup monitoring
  useEffect(() => {
    if (enableAutoCleanup) {
      const unregister = memoryManager.registerCleanupCallback(() => {
        triggerCleanup();
      });

      return unregister;
    }
  }, [enableAutoCleanup, triggerCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current.clear();
    };
  }, []);

  return {
    registerCleanup,
    triggerCleanup,
    getMemoryStats,
    forceGC: memoryManager.forceGarbageCollection.bind(memoryManager),
    getReport: memoryManager.getPerformanceReport.bind(memoryManager),
  };
}

// Utility functions for large dataset optimization
export const dataOptimization = {
  // Chunk large arrays for processing
  processInChunks<T, R>(
    array: T[],
    processor: (chunk: T[], index: number) => R[],
    chunkSize: number = 1000,
  ): R[] {
    const results: R[] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = processor(chunk, Math.floor(i / chunkSize));
      results.push(...chunkResults);

      // Yield control back to browser
      if (i % (chunkSize * 5) === 0) {
        setTimeout(() => {}, 0);
      }
    }
    return results;
  },

  // Efficient deep clone for large objects
  efficientClone<T>(obj: T): T {
    if (obj === null || typeof obj !== "object") return obj;

    // Use structured cloning for better performance on large objects
    if (typeof structuredClone !== "undefined") {
      return structuredClone(obj);
    }

    // Fallback to JSON (faster than recursive for most cases)
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch {
      // Final fallback for complex objects
      return { ...obj } as T;
    }
  },

  // Memory-efficient array operations
  memoryEfficientFilter<T>(
    array: T[],
    predicate: (item: T, index: number) => boolean,
    chunkSize: number = 5000,
  ): T[] {
    if (array.length <= chunkSize) {
      return array.filter(predicate);
    }

    const result: T[] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      result.push(...chunk.filter((item, index) => predicate(item, i + index)));
    }

    return result;
  },

  // Debounced operation for frequent updates
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  },
};

// Export memory manager for global use
export { MemoryManager };

// Global cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    memoryManager.destroy();
  });
}
