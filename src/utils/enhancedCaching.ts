/**
 * Enhanced Caching Layer for Maximum Performance
 * Provides intelligent multi-level caching with automatic invalidation and optimization
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  dependencies?: string[];
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  maxEntries: number;
  compressionThreshold: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

class EnhancedCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();
  private stats: Omit<CacheStats, "hitRate" | "memoryUsage"> = {
    hits: 0,
    misses: 0,
    size: 0,
    entries: 0,
  };
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 10 * 60 * 1000, // 10 minutes
      maxEntries: 1000,
      compressionThreshold: 1024, // 1KB
      ...config,
    };
  }

  /**
   * Get value from cache with intelligent access tracking
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.config.defaultTTL) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache with intelligent eviction
   */
  set(key: string, value: T, ttl?: number, dependencies?: string[]): void {
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      dependencies,
    };

    this.cache.set(key, entry);
    this.stats.entries++;
    this.stats.size += size;

    // Update dependency graph
    if (dependencies) {
      for (const dep of dependencies) {
        if (!this.dependencyGraph.has(dep)) {
          this.dependencyGraph.set(dep, new Set());
        }
        this.dependencyGraph.get(dep)!.add(key);
      }
    }
  }

  /**
   * Delete entry and its dependents
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.stats.entries--;
    this.stats.size -= entry.size;

    // Invalidate dependent entries
    const dependents = this.dependencyGraph.get(key);
    if (dependents) {
      for (const dependent of dependents) {
        this.delete(dependent);
      }
      this.dependencyGraph.delete(key);
    }

    return true;
  }

  /**
   * Get or compute value with caching
   */
  async getOrCompute<R extends T>(
    key: string,
    computeFn: () => Promise<R> | R,
    ttl?: number,
    dependencies?: string[],
  ): Promise<R> {
    const cached = this.get(key) as R;
    if (cached !== null) {
      return cached;
    }

    const value = await computeFn();
    this.set(key, value, ttl, dependencies);
    return value;
  }

  /**
   * Batch get multiple keys
   */
  getBatch(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    for (const key of keys) {
      results.set(key, this.get(key));
    }
    return results;
  }

  /**
   * Batch set multiple entries
   */
  setBatch(
    entries: Array<{
      key: string;
      value: T;
      ttl?: number;
      dependencies?: string[];
    }>,
  ): void {
    for (const entry of entries) {
      this.set(entry.key, entry.value, entry.ttl, entry.dependencies);
    }
  }

  /**
   * Invalidate by dependency
   */
  invalidateByDependency(dependency: string): void {
    const dependents = this.dependencyGraph.get(dependency);
    if (dependents) {
      for (const dependent of dependents) {
        this.delete(dependent);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.dependencyGraph.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      memoryUsage: this.stats.size,
    };
  }

  /**
   * Optimize cache by removing least used entries
   */
  optimize(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Sort by priority (least recently used + least accessed)
    entries.sort(([, a], [, b]) => {
      const aScore = a.accessCount / Math.max(1, (now - a.lastAccessed) / 1000);
      const bScore = b.accessCount / Math.max(1, (now - b.lastAccessed) / 1000);
      return aScore - bScore;
    });

    // Remove bottom 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.delete(entries[i][0]);
    }
  }

  /**
   * Private: Estimate size of value
   */
  private estimateSize(value: T): number {
    if (typeof value === "string") {
      return value.length * 2; // UTF-16
    }
    if (typeof value === "object" && value !== null) {
      return JSON.stringify(value).length * 2;
    }
    return 8; // Default for primitives
  }

  /**
   * Private: Evict entries if needed
   */
  private evictIfNeeded(newEntrySize: number): void {
    // Evict if we would exceed max size or max entries
    while (
      this.stats.size + newEntrySize > this.config.maxSize ||
      this.stats.entries >= this.config.maxEntries
    ) {
      this.evictLeastUsed();
    }
  }

  /**
   * Private: Evict least used entry
   */
  private evictLeastUsed(): void {
    if (this.cache.size === 0) return;

    let leastUsedKey = "";
    let leastUsedScore = Infinity;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      // Score based on access frequency and recency
      const timeSinceAccess = now - entry.lastAccessed;
      const score = entry.accessCount / Math.max(1, timeSinceAccess / 1000);

      if (score < leastUsedScore) {
        leastUsedScore = score;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.delete(leastUsedKey);
    }
  }
}

// Global cache instances
export const calculationCache = new EnhancedCache({
  maxSize: 25 * 1024 * 1024, // 25MB for calculations
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  maxEntries: 500,
});

export const dataCache = new EnhancedCache({
  maxSize: 25 * 1024 * 1024, // 25MB for data
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxEntries: 300,
});

export const viewCache = new EnhancedCache({
  maxSize: 10 * 1024 * 1024, // 10MB for views
  defaultTTL: 2 * 60 * 1000, // 2 minutes
  maxEntries: 200,
});

/**
 * Cache-aware calculation wrapper
 */
export const withCaching = <T extends (...args: any[]) => any>(
  fn: T,
  cache: EnhancedCache = calculationCache,
  keyGenerator?: (...args: Parameters<T>) => string,
): T => {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    return cache.getOrCompute(key, () => fn(...args));
  }) as T;
};

/**
 * Invalidate caches when data changes
 */
export const invalidateDataCaches = (dataType: string): void => {
  calculationCache.invalidateByDependency(dataType);
  dataCache.invalidateByDependency(dataType);
  viewCache.invalidateByDependency(dataType);
};

/**
 * Get combined cache statistics
 */
export const getAllCacheStats = () => ({
  calculation: calculationCache.getStats(),
  data: dataCache.getStats(),
  view: viewCache.getStats(),
});

/**
 * Optimize all caches
 */
export const optimizeAllCaches = (): void => {
  calculationCache.optimize();
  dataCache.optimize();
  viewCache.optimize();
};

export { EnhancedCache };
