// Performance configuration for handling large datasets
export const PERFORMANCE_THRESHOLDS = {
  // Switch to optimized components when data exceeds these thresholds
  EMPLOYEES: 100,
  JOBS: 200,
  TIME_ENTRIES: 1000,

  // Pagination settings for different data sizes
  SMALL_DATASET_PAGE_SIZE: 25,
  MEDIUM_DATASET_PAGE_SIZE: 50,
  LARGE_DATASET_PAGE_SIZE: 100,

  // Virtual scrolling settings
  VIRTUAL_SCROLL_THRESHOLD: 50,
  VIRTUAL_ROW_HEIGHT: 48,
  VIRTUAL_TABLE_HEIGHT: 500,

  // Search debounce timing
  SEARCH_DEBOUNCE_MS: 300,

  // Data loading batch sizes
  BATCH_SIZE_SMALL: 50,
  BATCH_SIZE_MEDIUM: 100,
  BATCH_SIZE_LARGE: 200,
};

export interface DataMetrics {
  employeeCount: number;
  jobCount: number;
  timeEntryCount: number;
}

export function shouldUseOptimizedComponents(metrics: DataMetrics): boolean {
  return (
    metrics.employeeCount > PERFORMANCE_THRESHOLDS.EMPLOYEES ||
    metrics.jobCount > PERFORMANCE_THRESHOLDS.JOBS ||
    metrics.timeEntryCount > PERFORMANCE_THRESHOLDS.TIME_ENTRIES
  );
}

export function getOptimalPageSize(dataCount: number): number {
  if (dataCount <= 100) {
    return PERFORMANCE_THRESHOLDS.SMALL_DATASET_PAGE_SIZE;
  } else if (dataCount <= 500) {
    return PERFORMANCE_THRESHOLDS.MEDIUM_DATASET_PAGE_SIZE;
  } else {
    return PERFORMANCE_THRESHOLDS.LARGE_DATASET_PAGE_SIZE;
  }
}

export function shouldUseVirtualScrolling(dataCount: number): boolean {
  return dataCount > PERFORMANCE_THRESHOLDS.VIRTUAL_SCROLL_THRESHOLD;
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  startTiming(operation: string): string {
    const id = `${operation}-${Date.now()}`;
    performance.mark(`${id}-start`);
    return id;
  }

  endTiming(id: string): number {
    performance.mark(`${id}-end`);
    performance.measure(id, `${id}-start`, `${id}-end`);

    const measure = performance.getEntriesByName(id)[0];
    const duration = measure.duration;

    const operation = id.split("-")[0];
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(duration);

    // Keep only last 100 measurements
    if (operationMetrics.length > 100) {
      operationMetrics.shift();
    }

    // Clean up performance entries
    performance.clearMarks(`${id}-start`);
    performance.clearMarks(`${id}-end`);
    performance.clearMeasures(id);

    return duration;
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation);
    if (!times || times.length === 0) return 0;

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getSlowOperations(threshold: number = 100): string[] {
    const slowOps: string[] = [];

    for (const [operation, times] of this.metrics.entries()) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      if (avgTime > threshold) {
        slowOps.push(operation);
      }
    }

    return slowOps;
  }

  logPerformanceReport(): void {
    console.group("🚀 Performance Report");

    for (const [operation, times] of this.metrics.entries()) {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`📊 ${operation}:`, {
        average: `${avgTime.toFixed(2)}ms`,
        min: `${minTime.toFixed(2)}ms`,
        max: `${maxTime.toFixed(2)}ms`,
        samples: times.length,
      });
    }

    const slowOps = this.getSlowOperations();
    if (slowOps.length > 0) {
      console.warn("⚠️ Slow operations detected:", slowOps);
    }

    console.groupEnd();
  }
}

// Memory usage monitoring
export function getMemoryUsage(): { used: string; total: string } | null {
  if ("memory" in performance) {
    const memory = (performance as any).memory;
    return {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
    };
  }
  return null;
}

// Data processing utilities for large datasets
export function processInBatches<T, R>(
  data: T[],
  batchSize: number,
  processor: (batch: T[]) => R[],
): R[] {
  const results: R[] = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = processor(batch);
    results.push(...batchResults);
  }

  return results;
}

// Debounced function utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Local storage utilities for large data
export function getStorageSize(): { used: string; available: string } {
  let used = 0;

  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // Rough estimate of available space (5MB typical limit)
  const total = 5 * 1024 * 1024; // 5MB in bytes
  const available = total - used;

  return {
    used: `${(used / 1024).toFixed(2)} KB`,
    available: `${(available / 1024).toFixed(2)} KB`,
  };
}

export function isStorageNearLimit(): boolean {
  const { available } = getStorageSize();
  const availableKB = parseFloat(available.split(" ")[0]);
  return availableKB < 500; // Less than 500KB available
}
