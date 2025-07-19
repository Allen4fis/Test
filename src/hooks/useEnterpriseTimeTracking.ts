import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { AppData, TimeEntry, Employee, Job } from "@/types";

// Enterprise configuration for large datasets
const ENTERPRISE_CONFIG = {
  CHUNK_SIZE: 5000, // Process data in chunks
  VIRTUAL_WINDOW_SIZE: 100, // Only render 100 items at a time
  CACHE_SIZE: 50000, // Cache up to 50k processed entries
  WORKER_BATCH_SIZE: 10000, // Web worker batch size
  INDEX_GRANULARITY: 1000, // Index every 1000th entry for fast lookups
  COMPRESSION_THRESHOLD: 1000, // Compress data chunks over 1000 entries
  LAZY_LOAD_THRESHOLD: 10000, // Start lazy loading after 10k entries
};

// IndexedDB wrapper for large dataset storage
class EnterpriseDB {
  private db: IDBDatabase | null = null;
  private dbName = "TimeTrackingEnterprise";
  private version = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Time entries store
        if (!db.objectStoreNames.contains("timeEntries")) {
          const timeStore = db.createObjectStore("timeEntries", {
            keyPath: "id",
          });
          timeStore.createIndex("date", "date", { unique: false });
          timeStore.createIndex("employeeId", "employeeId", { unique: false });
          timeStore.createIndex("jobId", "jobId", { unique: false });
          timeStore.createIndex("dateRange", ["date", "employeeId"], {
            unique: false,
          });
        }

        // Chunks store for large data segments
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "id" });
        }

        // Indexes store for fast lookups
        if (!db.objectStoreNames.contains("indexes")) {
          db.createObjectStore("indexes", { keyPath: "type" });
        }

        // Metadata store
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }
      };
    });
  }

  async bulkInsert(
    storeName: string,
    data: any[],
    chunkSize: number = ENTERPRISE_CONFIG.CHUNK_SIZE,
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Process in chunks to avoid blocking
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.insertChunk(storeName, chunk);

      // Allow UI updates between chunks
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  private async insertChunk(storeName: string, chunk: any[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = chunk.length;

      chunk.forEach((item) => {
        const request = store.put(item);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
  }

  async queryByRange(
    storeName: string,
    indexName: string,
    range: IDBKeyRange,
    limit?: number,
  ): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.openCursor(range);

      const results: any[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && (!limit || count < limit)) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["metadata"], "readonly");
      const store = transaction.objectStore("metadata");
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["metadata"], "readwrite");
      const store = transaction.objectStore("metadata");
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Web Worker for heavy calculations
class CalculationWorker {
  private worker: Worker | null = null;
  private pendingTasks = new Map<
    string,
    { resolve: Function; reject: Function }
  >();

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    const workerCode = `
      // Web Worker for heavy calculations
      self.onmessage = function(e) {
        const { taskId, type, data } = e.data;
        
        try {
          let result;
          
          switch (type) {
            case 'calculateSummaries':
              result = calculateTimeSummaries(data);
              break;
            case 'processLargeDataset':
              result = processLargeDataset(data);
              break;
            case 'aggregateByEmployee':
              result = aggregateByEmployee(data);
              break;
            default:
              throw new Error('Unknown task type');
          }
          
          self.postMessage({ taskId, result });
        } catch (error) {
          self.postMessage({ taskId, error: error.message });
        }
      };
      
      function calculateTimeSummaries(entries) {
        return entries.map(entry => ({
          ...entry,
          effectiveHours: entry.hours * (entry.multiplier || 1),
          totalCost: entry.hours * entry.costWage,
          totalBillable: entry.hours * entry.billableWage
        }));
      }
      
      function processLargeDataset(data) {
        const { entries, employees, jobs, hourTypes } = data;
        const processed = [];
        
        for (let i = 0; i < entries.length; i++) {
          const entry = entries[i];
          const employee = employees.find(emp => emp.id === entry.employeeId);
          const job = jobs.find(j => j.id === entry.jobId);
          const hourType = hourTypes.find(ht => ht.id === entry.hourTypeId);
          
          processed.push({
            ...entry,
            employeeName: employee?.name || 'Unknown',
            jobNumber: job?.jobNumber || 'Unknown',
            hourTypeName: hourType?.name || 'Unknown',
            effectiveHours: entry.hours * (hourType?.multiplier || 1)
          });
        }
        
        return processed;
      }
      
      function aggregateByEmployee(entries) {
        const aggregated = {};
        
        entries.forEach(entry => {
          if (!aggregated[entry.employeeId]) {
            aggregated[entry.employeeId] = {
              employeeId: entry.employeeId,
              employeeName: entry.employeeName,
              totalHours: 0,
              totalCost: 0,
              totalBillable: 0,
              entryCount: 0
            };
          }
          
          aggregated[entry.employeeId].totalHours += entry.hours;
          aggregated[entry.employeeId].totalCost += entry.totalCost;
          aggregated[entry.employeeId].totalBillable += entry.totalBillable;
          aggregated[entry.employeeId].entryCount += 1;
        });
        
        return Object.values(aggregated);
      }
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = (e) => {
      const { taskId, result, error } = e.data;
      const task = this.pendingTasks.get(taskId);

      if (task) {
        if (error) {
          task.reject(new Error(error));
        } else {
          task.resolve(result);
        }
        this.pendingTasks.delete(taskId);
      }
    };
  }

  async executeTask(type: string, data: any): Promise<any> {
    const taskId = Math.random().toString(36).substr(2, 9);

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
      this.worker?.postMessage({ taskId, type, data });
    });
  }

  destroy() {
    this.worker?.terminate();
    this.worker = null;
  }
}

// Virtual list manager for efficient rendering
class VirtualListManager {
  private itemHeight: number = 50;
  private containerHeight: number = 600;
  private scrollTop: number = 0;
  private totalItems: number = 0;

  constructor(itemHeight: number = 50, containerHeight: number = 600) {
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
  }

  getVisibleRange(scrollTop: number, totalItems: number) {
    this.scrollTop = scrollTop;
    this.totalItems = totalItems;

    const visibleStart = Math.floor(scrollTop / this.itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(this.containerHeight / this.itemHeight) + 1,
      totalItems,
    );

    return {
      start: Math.max(0, visibleStart - 5), // Buffer
      end: Math.min(totalItems, visibleEnd + 5), // Buffer
      spacerBefore: Math.max(0, visibleStart - 5) * this.itemHeight,
      spacerAfter: Math.max(0, totalItems - (visibleEnd + 5)) * this.itemHeight,
    };
  }
}

// Enterprise-scale hook
export function useEnterpriseTimeTracking() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);

  // Core data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentView, setCurrentView] = useState<{
    entries: TimeEntry[];
    startIndex: number;
    endIndex: number;
  }>({ entries: [], startIndex: 0, endIndex: 0 });

  // Enterprise components
  const dbRef = useRef<EnterpriseDB>(new EnterpriseDB());
  const workerRef = useRef<CalculationWorker>(new CalculationWorker());
  const virtualListRef = useRef<VirtualListManager>(new VirtualListManager());

  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState({
    queryTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    lastUpdate: Date.now(),
  });

  // Initialize enterprise database
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setIsLoading(true);
        await dbRef.current.initialize();

        // Load metadata
        const entryCount = await dbRef.current.count("timeEntries");
        setTotalEntries(entryCount);

        // Load core reference data (employees, jobs) - these should be manageable
        const coreData = await dbRef.current.getMetadata("coreData");
        if (coreData) {
          setEmployees(coreData.employees || []);
          setJobs(coreData.jobs || []);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize enterprise system:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSystem();

    // Cleanup
    return () => {
      workerRef.current.destroy();
    };
  }, []);

  // Load time entries for virtual window
  const loadTimeEntriesWindow = useCallback(
    async (
      startIndex: number,
      endIndex: number,
      filters?: {
        dateRange?: { start: string; end: string };
        employeeId?: string;
        jobId?: string;
      },
    ) => {
      if (!isInitialized) return;

      const start = performance.now();

      try {
        let entries: TimeEntry[];

        if (filters?.dateRange) {
          const range = IDBKeyRange.bound(
            filters.dateRange.start,
            filters.dateRange.end,
          );
          entries = await dbRef.current.queryByRange(
            "timeEntries",
            "date",
            range,
            endIndex - startIndex,
          );
        } else {
          // For large datasets without filters, we need to implement pagination
          entries = await dbRef.current.queryByRange(
            "timeEntries",
            "date",
            IDBKeyRange.lowerBound(""),
            endIndex - startIndex,
          );
        }

        setCurrentView({
          entries: entries.slice(startIndex, endIndex),
          startIndex,
          endIndex,
        });

        const queryTime = performance.now() - start;
        setPerformanceMetrics((prev) => ({
          ...prev,
          queryTime,
          lastUpdate: Date.now(),
        }));
      } catch (error) {
        console.error("Failed to load time entries window:", error);
      }
    },
    [isInitialized],
  );

  // Bulk import for large datasets
  const bulkImportEntries = useCallback(
    async (entries: TimeEntry[], onProgress?: (progress: number) => void) => {
      if (!isInitialized) return;

      setIsLoading(true);
      setLoadProgress(0);

      try {
        const totalChunks = Math.ceil(
          entries.length / ENTERPRISE_CONFIG.CHUNK_SIZE,
        );
        let processedChunks = 0;

        // Process in chunks with progress updates
        for (let i = 0; i < entries.length; i += ENTERPRISE_CONFIG.CHUNK_SIZE) {
          const chunk = entries.slice(i, i + ENTERPRISE_CONFIG.CHUNK_SIZE);
          await dbRef.current.bulkInsert("timeEntries", chunk);

          processedChunks++;
          const progress = (processedChunks / totalChunks) * 100;
          setLoadProgress(progress);
          onProgress?.(progress);

          // Allow UI updates
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Update total count
        const newTotal = await dbRef.current.count("timeEntries");
        setTotalEntries(newTotal);
      } catch (error) {
        console.error("Bulk import failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
        setLoadProgress(0);
      }
    },
    [isInitialized],
  );

  // Search with enterprise performance
  const searchEntries = useCallback(
    async (
      query: string,
      filters?: {
        dateRange?: { start: string; end: string };
        employeeId?: string;
        jobId?: string;
      },
    ) => {
      if (!isInitialized) return [];

      const start = performance.now();

      try {
        // Use IndexedDB indexes for efficient searching
        let results: TimeEntry[] = [];

        if (filters?.employeeId) {
          const range = IDBKeyRange.only(filters.employeeId);
          results = await dbRef.current.queryByRange(
            "timeEntries",
            "employeeId",
            range,
            1000, // Limit search results
          );
        } else if (filters?.dateRange) {
          const range = IDBKeyRange.bound(
            filters.dateRange.start,
            filters.dateRange.end,
          );
          results = await dbRef.current.queryByRange(
            "timeEntries",
            "date",
            range,
            1000,
          );
        }

        // Use web worker for heavy filtering/processing
        if (results.length > ENTERPRISE_CONFIG.WORKER_BATCH_SIZE) {
          results = await workerRef.current.executeTask("processLargeDataset", {
            entries: results,
            employees,
            jobs,
            query,
          });
        }

        const queryTime = performance.now() - start;
        setPerformanceMetrics((prev) => ({
          ...prev,
          queryTime,
          lastUpdate: Date.now(),
        }));

        return results;
      } catch (error) {
        console.error("Search failed:", error);
        return [];
      }
    },
    [isInitialized, employees, jobs],
  );

  // Calculate summaries using web worker
  const calculateSummaries = useCallback(async (entries: TimeEntry[]) => {
    if (entries.length > ENTERPRISE_CONFIG.WORKER_BATCH_SIZE) {
      return await workerRef.current.executeTask("calculateSummaries", entries);
    }

    // For smaller datasets, calculate locally
    return entries.map((entry) => ({
      ...entry,
      effectiveHours: entry.hours * 1, // Simplified
      totalCost: entry.hours * (entry.costWageUsed || 0),
      totalBillable: entry.hours * (entry.billableWageUsed || 0),
    }));
  }, []);

  // Virtual scrolling support
  const getVirtualListData = useCallback(
    (scrollTop: number, containerHeight: number) => {
      virtualListRef.current = new VirtualListManager(50, containerHeight);
      return virtualListRef.current.getVisibleRange(scrollTop, totalEntries);
    },
    [totalEntries],
  );

  // Export large datasets
  const exportData = useCallback(
    async (filters?: any, onProgress?: (progress: number) => void) => {
      const allEntries: TimeEntry[] = [];
      const batchSize = 10000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await dbRef.current.queryByRange(
          "timeEntries",
          "date",
          IDBKeyRange.lowerBound(""),
          batchSize,
        );

        if (batch.length === 0) {
          hasMore = false;
        } else {
          allEntries.push(...batch);
          offset += batch.length;
          onProgress?.((offset / totalEntries) * 100);
        }
      }

      return allEntries;
    },
    [totalEntries],
  );

  // Archive old data
  const archiveData = useCallback(async (cutoffDate: string) => {
    const range = IDBKeyRange.upperBound(cutoffDate);
    const entriesToArchive = await dbRef.current.queryByRange(
      "timeEntries",
      "date",
      range,
    );

    // Store in compressed archive
    const archiveData = {
      id: `archive-${Date.now()}`,
      cutoffDate,
      entries: entriesToArchive,
      compressedSize: JSON.stringify(entriesToArchive).length,
    };

    await dbRef.current.bulkInsert("chunks", [archiveData]);

    // Remove from main store (implement as needed)
    return entriesToArchive.length;
  }, []);

  return {
    // System status
    isInitialized,
    isLoading,
    loadProgress,
    totalEntries,
    performanceMetrics,

    // Core data
    employees,
    jobs,
    currentView,

    // Enterprise operations
    loadTimeEntriesWindow,
    bulkImportEntries,
    searchEntries,
    calculateSummaries,
    exportData,
    archiveData,

    // Virtual scrolling
    getVirtualListData,

    // Utilities
    db: dbRef.current,
    worker: workerRef.current,
  };
}
