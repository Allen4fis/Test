/**
 * ENTERPRISE-GRADE PERFORMANCE OPTIMIZATION
 * For Multi-Million Dollar Business Operations
 *
 * Implements advanced optimization techniques for maximum performance and reliability
 */

// Database optimization utilities
export class DatabaseOptimizer {
  private static instance: DatabaseOptimizer;
  private queryCache = new Map<string, any>();
  private readonly maxCacheSize = 1000;
  private readonly cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DatabaseOptimizer {
    if (!DatabaseOptimizer.instance) {
      DatabaseOptimizer.instance = new DatabaseOptimizer();
    }
    return DatabaseOptimizer.instance;
  }

  // Optimized query with intelligent caching
  async optimizedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    options: {
      cacheable?: boolean;
      priority?: "low" | "medium" | "high";
      timeout?: number;
    } = {},
  ): Promise<T> {
    const { cacheable = true, priority = "medium", timeout = 10000 } = options;

    // Check cache first
    if (cacheable && this.queryCache.has(key)) {
      const cached = this.queryCache.get(key);
      if (Date.now() - cached.timestamp < this.cacheExpiryMs) {
        return cached.data;
      }
      this.queryCache.delete(key);
    }

    // Execute query with timeout
    const result = await Promise.race([
      queryFn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Query timeout")), timeout),
      ),
    ]);

    // Cache result if cacheable
    if (cacheable) {
      this.optimizeCacheSize();
      this.queryCache.set(key, {
        data: result,
        timestamp: Date.now(),
        priority,
      });
    }

    return result;
  }

  private optimizeCacheSize(): void {
    if (this.queryCache.size >= this.maxCacheSize) {
      // Remove oldest low-priority entries
      const entries = Array.from(this.queryCache.entries())
        .filter(([_, value]) => value.priority === "low")
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = Math.ceil(this.maxCacheSize * 0.1); // Remove 10%
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.queryCache.delete(entries[i][0]);
      }
    }
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}

// Memory management and leak prevention
export class MemoryManager {
  private static observers = new Set<PerformanceObserver>();
  private static cleanupCallbacks = new Set<() => void>();
  private static memoryThreshold = 100 * 1024 * 1024; // 100MB

  static registerCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  static unregisterCleanup(callback: () => void): void {
    this.cleanupCallbacks.delete(callback);
  }

  static performCleanup(): void {
    this.cleanupCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    });
  }

  static startMemoryMonitoring(): void {
    if ("memory" in performance) {
      const checkMemory = () => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > this.memoryThreshold) {
          console.warn("⚠️ High memory usage detected, performing cleanup");
          this.performCleanup();

          // Force garbage collection if available
          if ("gc" in window) {
            (window as any).gc();
          }
        }
      };

      setInterval(checkMemory, 30000); // Check every 30 seconds
    }
  }

  static monitorLongTasks(): void {
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "longtask") {
              console.warn(
                `🐌 Long task detected: ${entry.duration.toFixed(2)}ms`,
              );
            }
          }
        });

        observer.observe({ entryTypes: ["longtask"] });
        this.observers.add(observer);
      } catch (error) {
        console.warn("Long task monitoring not supported");
      }
    }
  }

  static stopMonitoring(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
  }
}

// Advanced data processing optimizations
export class DataProcessor {
  // Optimized batch processing for large datasets
  static async processBatch<T, R>(
    data: T[],
    processor: (item: T) => R | Promise<R>,
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
    } = {},
  ): Promise<R[]> {
    const { batchSize = 1000, concurrency = 4, onProgress } = options;
    const results: R[] = new Array(data.length);

    const batches: T[][] = [];
    for (let i = 0; i < data.length; i += batchSize) {
      batches.push(data.slice(i, i + batchSize));
    }

    let completed = 0;
    const processBatch = async (batch: T[], startIndex: number) => {
      for (let i = 0; i < batch.length; i++) {
        results[startIndex + i] = await processor(batch[i]);
        completed++;
        if (onProgress && completed % 100 === 0) {
          onProgress(completed, data.length);
        }
      }
    };

    // Process batches with limited concurrency
    const promises: Promise<void>[] = [];
    for (let i = 0; i < batches.length; i++) {
      const promise = processBatch(batches[i], i * batchSize);
      promises.push(promise);

      // Limit concurrency
      if (promises.length >= concurrency) {
        await Promise.race(promises);
        promises.splice(
          promises.findIndex((p) => p === (await Promise.race(promises))),
          1,
        );
      }
    }

    await Promise.all(promises);
    return results;
  }

  // Optimized filtering with early exit
  static optimizedFilter<T>(
    data: T[],
    predicate: (item: T, index: number) => boolean,
    maxResults?: number,
  ): T[] {
    const results: T[] = [];

    for (let i = 0; i < data.length; i++) {
      if (predicate(data[i], i)) {
        results.push(data[i]);
        if (maxResults && results.length >= maxResults) {
          break;
        }
      }
    }

    return results;
  }

  // Optimized grouping with Map for better performance
  static optimizedGroupBy<T, K>(
    data: T[],
    keySelector: (item: T) => K,
  ): Map<K, T[]> {
    const groups = new Map<K, T[]>();

    for (const item of data) {
      const key = keySelector(item);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    return groups;
  }

  // Optimized aggregation with reduce
  static optimizedAggregate<T, R>(
    data: T[],
    initialValue: R,
    aggregator: (accumulator: R, current: T, index: number) => R,
  ): R {
    let result = initialValue;

    for (let i = 0; i < data.length; i++) {
      result = aggregator(result, data[i], i);
    }

    return result;
  }
}

// Component performance optimization
export class ComponentOptimizer {
  // Memoization utility for expensive calculations
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = fn(...args);
      cache.set(key, result);

      // Limit cache size
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    }) as T;
  }

  // Debounce utility for performance optimization
  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  }

  // Throttle utility for performance optimization
  static throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number,
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  }
}

// Network and API optimization
export class NetworkOptimizer {
  private static requestCache = new Map<string, Promise<any>>();

  // Deduplicate identical requests
  static async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
  ): Promise<T> {
    if (this.requestCache.has(key)) {
      return this.requestCache.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.requestCache.delete(key);
    });

    this.requestCache.set(key, promise);
    return promise;
  }

  // Batch multiple requests
  static createBatchProcessor<T, R>(
    processor: (items: T[]) => Promise<R[]>,
    options: {
      maxBatchSize?: number;
      maxWaitTime?: number;
    } = {},
  ): (item: T) => Promise<R> {
    const { maxBatchSize = 10, maxWaitTime = 100 } = options;
    let batch: {
      item: T;
      resolve: (value: R) => void;
      reject: (error: any) => void;
    }[] = [];
    let timer: NodeJS.Timeout | null = null;

    const processBatch = async () => {
      if (batch.length === 0) return;

      const currentBatch = batch;
      batch = [];

      try {
        const items = currentBatch.map((b) => b.item);
        const results = await processor(items);

        currentBatch.forEach((b, index) => {
          b.resolve(results[index]);
        });
      } catch (error) {
        currentBatch.forEach((b) => b.reject(error));
      }
    };

    return (item: T): Promise<R> => {
      return new Promise((resolve, reject) => {
        batch.push({ item, resolve, reject });

        if (batch.length >= maxBatchSize) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          processBatch();
        } else if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            processBatch();
          }, maxWaitTime);
        }
      });
    };
  }
}

// Financial calculation optimization with precision
export class FinancialCalculator {
  private static readonly PRECISION = 2;

  // Precise decimal calculations to avoid floating point errors
  static multiply(a: number, b: number): number {
    const factor = Math.pow(10, this.PRECISION);
    return Math.round(a * factor * b * factor) / (factor * factor);
  }

  static add(a: number, b: number): number {
    const factor = Math.pow(10, this.PRECISION);
    return Math.round(a * factor + b * factor) / factor;
  }

  static subtract(a: number, b: number): number {
    const factor = Math.pow(10, this.PRECISION);
    return Math.round(a * factor - b * factor) / factor;
  }

  static divide(a: number, b: number): number {
    if (b === 0) return 0;
    const factor = Math.pow(10, this.PRECISION);
    return Math.round((a / b) * factor) / factor;
  }

  // Calculate GST with precision
  static calculateGST(amount: number, rate: number = 0.05): number {
    return this.multiply(amount, rate);
  }

  // Calculate profit margin with precision
  static calculateProfitMargin(revenue: number, cost: number): number {
    if (revenue === 0) return 0;
    return this.multiply(
      this.divide(this.subtract(revenue, cost), revenue),
      100,
    );
  }
}

// Initialize enterprise optimizations
export function initializeEnterpriseOptimizations(): void {
  console.log("🚀 Initializing Enterprise Optimizations...");

  // Start memory monitoring
  MemoryManager.startMemoryMonitoring();
  MemoryManager.monitorLongTasks();

  // Set up global error handling
  window.addEventListener("error", (event) => {
    console.error("Global error caught:", event.error);
    // In production, send to error reporting service
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled promise rejection:", event.reason);
    // In production, send to error reporting service
  });

  // Set up performance monitoring
  if ("PerformanceObserver" in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            console.log(`Page load time: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ["navigation"] });
    } catch (error) {
      console.warn("Performance monitoring not fully supported");
    }
  }

  console.log("✅ Enterprise Optimizations Initialized");
}

// Clean up resources
export function cleanupEnterpriseOptimizations(): void {
  MemoryManager.stopMonitoring();
  MemoryManager.performCleanup();
  DatabaseOptimizer.getInstance().clearCache();
}
