/**
 * Performance Optimization Utilities
 * Collection of utilities to improve application performance
 */

import { useMemo, useCallback, useRef, useEffect } from "react";

// Debounce hook for expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttle hook for scroll/resize events
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall.current;

      if (timeSinceLastCall >= delay) {
        lastCall.current = now;
        return callback(...args);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          lastCall.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay],
  ) as T;
}

// Memoization with stable references
export function useStableMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  isEqual?: (a: T, b: T) => boolean,
): T {
  const valueRef = useRef<T>();
  const depsRef = useRef<React.DependencyList>();

  const hasChanged = useMemo(() => {
    if (!depsRef.current) return true;
    if (depsRef.current.length !== deps.length) return true;
    return deps.some((dep, index) => dep !== depsRef.current![index]);
  }, deps);

  if (hasChanged) {
    const newValue = factory();
    if (isEqual && valueRef.current && !isEqual(valueRef.current, newValue)) {
      valueRef.current = newValue;
      depsRef.current = deps;
    } else if (!isEqual) {
      valueRef.current = newValue;
      depsRef.current = deps;
    }
  }

  return valueRef.current!;
}

// Efficient array operations
export const arrayUtils = {
  // Chunked processing for large arrays
  processInChunks<T, R>(
    array: T[],
    processor: (chunk: T[]) => R[],
    chunkSize: number = 1000,
  ): R[] {
    const results: R[] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      results.push(...processor(chunk));
    }
    return results;
  },

  // Optimized filter + map combination
  filterMap<T, R>(
    array: T[],
    predicate: (item: T) => boolean,
    mapper: (item: T) => R,
  ): R[] {
    const result: R[] = [];
    for (const item of array) {
      if (predicate(item)) {
        result.push(mapper(item));
      }
    }
    return result;
  },

  // Efficient groupBy
  groupBy<T, K extends string | number>(
    array: T[],
    keyExtractor: (item: T) => K,
  ): Record<K, T[]> {
    const groups = {} as Record<K, T[]>;
    for (const item of array) {
      const key = keyExtractor(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    }
    return groups;
  },

  // Stable sort (maintains relative order of equal elements)
  stableSort<T>(array: T[], compareFn: (a: T, b: T) => number): T[] {
    return array
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const result = compareFn(a.item, b.item);
        return result !== 0 ? result : a.index - b.index;
      })
      .map(({ item }) => item);
  },
};

// Memory management utilities
export const memoryUtils = {
  // Clear large objects from memory
  cleanup<T extends object>(obj: T): void {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        delete (obj as any)[key];
      });
    }
  },

  // Monitor memory usage
  getMemoryUsage(): { used: number; total: number; percentage: number } {
    const memory = (performance as any).memory;
    if (memory) {
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      return {
        used: used / 1024 / 1024, // MB
        total: total / 1024 / 1024, // MB
        percentage: (used / total) * 100,
      };
    }
    return { used: 0, total: 0, percentage: 0 };
  },

  // Force garbage collection if available
  forceGC(): void {
    if (window.gc) {
      window.gc();
    }
  },
};

// Performance monitoring
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();
  private measurements: Map<string, number[]> = new Map();

  startTiming(label: string): void {
    this.marks.set(label, performance.now());
  }

  endTiming(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start time found for timing label: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.marks.delete(label);

    // Store measurement
    if (!this.measurements.has(label)) {
      this.measurements.set(label, []);
    }
    this.measurements.get(label)!.push(duration);

    return duration;
  }

  getAverageTime(label: string): number {
    const times = this.measurements.get(label);
    if (!times || times.length === 0) return 0;
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getMetrics(): Record<
    string,
    { average: number; count: number; total: number }
  > {
    const metrics: Record<
      string,
      { average: number; count: number; total: number }
    > = {};

    for (const [label, times] of this.measurements.entries()) {
      const total = times.reduce((sum, time) => sum + time, 0);
      metrics[label] = {
        average: total / times.length,
        count: times.length,
        total,
      };
    }

    return metrics;
  }

  reset(): void {
    this.marks.clear();
    this.measurements.clear();
  }
}

// Component performance optimization helpers
export const componentUtils = {
  // Create stable callback references
  createStableCallback<T extends (...args: any[]) => any>(
    callback: T,
    deps: React.DependencyList,
  ): T {
    return useCallback(callback, deps);
  },

  // Prevent unnecessary re-renders
  shouldComponentUpdate<T extends Record<string, any>>(
    prevProps: T,
    nextProps: T,
    keys?: (keyof T)[],
  ): boolean {
    const keysToCheck = keys || (Object.keys(nextProps) as (keyof T)[]);
    return keysToCheck.some((key) => prevProps[key] !== nextProps[key]);
  },

  // Optimize large list rendering
  getVisibleRange(
    scrollTop: number,
    itemHeight: number,
    containerHeight: number,
    totalItems: number,
  ): { start: number; end: number } {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 2, totalItems); // +2 for buffer

    return {
      start: Math.max(0, start - 1), // -1 for buffer
      end,
    };
  },
};

// Bundle optimization helpers
export const bundleUtils = {
  // Lazy load components
  lazyImport<T = any>(
    importFunction: () => Promise<{ default: T }>,
  ): React.LazyExoticComponent<T> {
    return React.lazy(importFunction);
  },

  // Preload critical resources
  preloadResource(href: string, as: string = "script"): void {
    const link = document.createElement("link");
    link.rel = "preload";
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  // Check if code splitting is beneficial
  shouldCodeSplit(componentSize: number, usageFrequency: number): boolean {
    // Split if component is large (>100KB) and used infrequently (<20%)
    return componentSize > 100 * 1024 && usageFrequency < 0.2;
  },
};

// Export performance tracker instance
export const performanceTracker = new PerformanceTracker();

// React import for hooks
import React from "react";
