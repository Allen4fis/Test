/**
 * Request Debouncing Middleware for Performance Optimization
 * Provides intelligent request batching and debouncing to reduce API calls and improve performance
 */

interface DebouncedRequest {
  id: string;
  resolver: (value: any) => void;
  rejector: (error: any) => void;
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number;
  debounceDelay: number;
}

class RequestDebouncer {
  private pendingRequests: Map<string, DebouncedRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchConfig;

  constructor(config: Partial<BatchConfig> = {}) {
    this.config = {
      maxBatchSize: 10,
      maxWaitTime: 100,
      debounceDelay: 50,
      ...config,
    };
  }

  /**
   * Debounce a request by key, batching similar requests together
   */
  debounce<T>(
    key: string,
    requestFn: (batchedData: any[]) => Promise<T[]>,
    data: any,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: DebouncedRequest = {
        id: Math.random().toString(36),
        resolver: resolve,
        rejector: reject,
        timestamp: Date.now(),
      };

      // Add to pending requests
      if (!this.pendingRequests.has(key)) {
        this.pendingRequests.set(key, []);
      }
      this.pendingRequests.get(key)!.push(request);

      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.executeBatch(key, requestFn, data);
      }, this.config.debounceDelay);

      this.timers.set(key, timer);

      // Check if we've reached max batch size
      const pendingCount = this.pendingRequests.get(key)!.length;
      if (pendingCount >= this.config.maxBatchSize) {
        clearTimeout(timer);
        this.executeBatch(key, requestFn, data);
      }
    });
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch<T>(
    key: string,
    requestFn: (batchedData: any[]) => Promise<T[]>,
    sampleData: any,
  ): Promise<void> {
    const requests = this.pendingRequests.get(key) || [];
    if (requests.length === 0) return;

    // Clear pending requests and timer
    this.pendingRequests.delete(key);
    this.timers.delete(key);

    try {
      // Create batch data (for now, just use sample data structure)
      const batchData = requests.map(() => sampleData);

      // Execute the batched request
      const results = await requestFn(batchData);

      // Resolve all pending requests with their respective results
      requests.forEach((request, index) => {
        const result = results[index] || results[0]; // Fallback to first result
        request.resolver(result);
      });
    } catch (error) {
      // Reject all pending requests
      requests.forEach((request) => {
        request.rejector(error);
      });
    }
  }

  /**
   * Clear all pending requests for cleanup
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Reject all pending requests
    this.pendingRequests.forEach((requests) => {
      requests.forEach((request) => {
        request.rejector(new Error("Request debouncer cleared"));
      });
    });
    this.pendingRequests.clear();
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): { pendingBatches: number; totalPending: number } {
    const pendingBatches = this.pendingRequests.size;
    const totalPending = Array.from(this.pendingRequests.values()).reduce(
      (sum, requests) => sum + requests.length,
      0,
    );

    return { pendingBatches, totalPending };
  }
}

// Global debouncer instance
const globalDebouncer = new RequestDebouncer();

/**
 * Debounced calculation function for time entry summaries
 */
export const debouncedCalculation = <T>(
  calculationType: string,
  calculationFn: (data: any[]) => Promise<T[]>,
  data: any,
): Promise<T> => {
  return globalDebouncer.debounce(calculationType, calculationFn, data);
};

/**
 * Debounced save operation
 */
export const debouncedSave = (
  key: string,
  saveFn: (data: any[]) => Promise<boolean[]>,
  data: any,
): Promise<boolean> => {
  return globalDebouncer.debounce(`save_${key}`, saveFn, data);
};

/**
 * Debounced search operation
 */
export const debouncedSearch = (
  searchTerm: string,
  searchFn: (terms: string[]) => Promise<any[]>,
  debounceMs: number = 300,
): Promise<any> => {
  const customDebouncer = new RequestDebouncer({
    debounceDelay: debounceMs,
    maxBatchSize: 1, // Search should be individual
  });

  return customDebouncer.debounce(`search_${searchTerm}`, searchFn, searchTerm);
};

/**
 * Performance monitoring for debounced requests
 */
export const getDebouncerStats = () => globalDebouncer.getStats();

/**
 * Clear all pending debounced requests (for cleanup)
 */
export const clearDebouncedRequests = () => globalDebouncer.clear();

export default RequestDebouncer;
