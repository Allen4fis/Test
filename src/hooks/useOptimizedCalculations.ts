import { useMemo, useRef, useCallback } from 'react';
import { TimeEntry, Employee, Job, HourType } from '@/types';

interface CalculationCache {
  timeEntrySummaries: Map<string, any>;
  jobProfitData: Map<string, any>;
  employeeSummaries: Map<string, any>;
  lastUpdated: number;
  version: number;
}

interface OptimizedCalculations {
  getTimeEntrySummaries: (entries: TimeEntry[]) => any[];
  getJobProfitData: (jobs: Job[], entries: TimeEntry[]) => any[];
  getEmployeeSummaries: (employees: Employee[], entries: TimeEntry[]) => any[];
  clearCache: () => void;
  getCacheStats: () => { hitRate: number; size: number; version: number };
}

/**
 * Optimized calculation hook with intelligent caching
 * Dramatically improves performance with large datasets
 */
export function useOptimizedCalculations(): OptimizedCalculations {
  const cacheRef = useRef<CalculationCache>({
    timeEntrySummaries: new Map(),
    jobProfitData: new Map(),
    employeeSummaries: new Map(),
    lastUpdated: 0,
    version: 0
  });
  
  const statsRef = useRef({ hits: 0, misses: 0 });

  // Generate cache key from data
  const generateCacheKey = useCallback((data: any[], type: string): string => {
    const dataString = JSON.stringify({
      type,
      length: data.length,
      firstId: data[0]?.id,
      lastId: data[data.length - 1]?.id,
      checksum: data.reduce((sum, item) => sum + (item.id?.charCodeAt(0) || 0), 0)
    });
    return btoa(dataString).slice(0, 16);
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback((key: string, maxAge: number = 30000): boolean => {
    const cache = cacheRef.current;
    const now = Date.now();
    return cache.lastUpdated > 0 && (now - cache.lastUpdated) < maxAge;
  }, []);

  // Optimized time entry summaries with incremental updates
  const getTimeEntrySummaries = useCallback((entries: TimeEntry[]) => {
    const cache = cacheRef.current;
    const cacheKey = generateCacheKey(entries, 'timeEntries');
    
    // Check cache first
    if (cache.timeEntrySummaries.has(cacheKey) && isCacheValid(cacheKey)) {
      statsRef.current.hits++;
      return cache.timeEntrySummaries.get(cacheKey);
    }

    statsRef.current.misses++;
    
    // Calculate summaries with optimization
    const summaries = entries.map(entry => {
      // Cached individual entry calculations
      const entryKey = `entry-${entry.id}-${entry.hours}-${entry.billableWageUsed}`;
      
      if (cache.timeEntrySummaries.has(entryKey)) {
        return cache.timeEntrySummaries.get(entryKey);
      }

      const hourType = { multiplier: 1.5 }; // This would come from actual hourTypes
      const effectiveHours = entry.hours * (hourType.multiplier || 1);
      
      let adjustedBillableWage = entry.billableWageUsed || 0;
      let adjustedCostWage = entry.costWageUsed || 0;

      // NS wage adjustment
      if (entry.hourTypeId === '6' || entry.hourTypeId === '7' || entry.hourTypeId === '8') {
        adjustedBillableWage += 3;
        adjustedCostWage += 3;
      }

      const totalBillableAmount = effectiveHours * adjustedBillableWage;
      const totalCost = effectiveHours * adjustedCostWage;

      // LOA calculations
      const loaCost = (entry.loaCount || 0) * (entry.loaAmount || 200);
      const loaBillable = (entry.loaCount || 0) * (entry.loaAmount || 200);

      const summary = {
        ...entry,
        effectiveHours,
        totalBillableAmount: totalBillableAmount + loaBillable,
        totalCost: totalCost + loaCost,
        adjustedBillableWage,
        adjustedCostWage
      };

      // Cache individual entry
      cache.timeEntrySummaries.set(entryKey, summary);
      return summary;
    });

    // Cache the full result
    cache.timeEntrySummaries.set(cacheKey, summaries);
    cache.lastUpdated = Date.now();
    cache.version++;

    return summaries;
  }, [generateCacheKey, isCacheValid]);

  // Optimized job profit calculations
  const getJobProfitData = useCallback((jobs: Job[], entries: TimeEntry[]) => {
    const cache = cacheRef.current;
    const cacheKey = generateCacheKey([...jobs, ...entries], 'jobProfit');
    
    if (cache.jobProfitData.has(cacheKey) && isCacheValid(cacheKey)) {
      statsRef.current.hits++;
      return cache.jobProfitData.get(cacheKey);
    }

    statsRef.current.misses++;

    // Group entries by job for efficient processing
    const entriesByJob = new Map<string, TimeEntry[]>();
    entries.forEach(entry => {
      if (!entriesByJob.has(entry.jobId)) {
        entriesByJob.set(entry.jobId, []);
      }
      entriesByJob.get(entry.jobId)!.push(entry);
    });

    const profitData = jobs.map(job => {
      const jobKey = `job-${job.id}-${entriesByJob.get(job.id)?.length || 0}`;
      
      if (cache.jobProfitData.has(jobKey)) {
        return cache.jobProfitData.get(jobKey);
      }

      const jobEntries = entriesByJob.get(job.id) || [];
      
      const totals = jobEntries.reduce((acc, entry) => {
        const effectiveHours = entry.hours * 1.5; // Simplified multiplier
        const billableAmount = effectiveHours * (entry.billableWageUsed || 0);
        const cost = effectiveHours * (entry.costWageUsed || 0);
        
        return {
          totalBillable: acc.totalBillable + billableAmount,
          totalCost: acc.totalCost + cost,
          totalHours: acc.totalHours + entry.hours
        };
      }, { totalBillable: 0, totalCost: 0, totalHours: 0 });

      const profit = totals.totalBillable - totals.totalCost;
      const profitMargin = totals.totalBillable > 0 ? (profit / totals.totalBillable) * 100 : 0;

      const result = {
        job,
        ...totals,
        profit,
        profitMargin
      };

      cache.jobProfitData.set(jobKey, result);
      return result;
    });

    cache.jobProfitData.set(cacheKey, profitData);
    cache.lastUpdated = Date.now();
    cache.version++;

    return profitData;
  }, [generateCacheKey, isCacheValid]);

  // Optimized employee summaries
  const getEmployeeSummaries = useCallback((employees: Employee[], entries: TimeEntry[]) => {
    const cache = cacheRef.current;
    const cacheKey = generateCacheKey([...employees, ...entries], 'employeeSummaries');
    
    if (cache.employeeSummaries.has(cacheKey) && isCacheValid(cacheKey)) {
      statsRef.current.hits++;
      return cache.employeeSummaries.get(cacheKey);
    }

    statsRef.current.misses++;

    // Group entries by employee
    const entriesByEmployee = new Map<string, TimeEntry[]>();
    entries.forEach(entry => {
      if (!entriesByEmployee.has(entry.employeeId)) {
        entriesByEmployee.set(entry.employeeId, []);
      }
      entriesByEmployee.get(entry.employeeId)!.push(entry);
    });

    const summaries = employees.map(employee => {
      const employeeEntries = entriesByEmployee.get(employee.id) || [];
      
      const totals = employeeEntries.reduce((acc, entry) => {
        return {
          totalHours: acc.totalHours + entry.hours,
          totalCost: acc.totalCost + (entry.hours * (entry.costWageUsed || 0)),
          totalBillable: acc.totalBillable + (entry.hours * (entry.billableWageUsed || 0)),
          entryCount: acc.entryCount + 1
        };
      }, { totalHours: 0, totalCost: 0, totalBillable: 0, entryCount: 0 });

      return {
        employee,
        ...totals,
        averageHoursPerEntry: totals.entryCount > 0 ? totals.totalHours / totals.entryCount : 0,
        profit: totals.totalBillable - totals.totalCost
      };
    });

    cache.employeeSummaries.set(cacheKey, summaries);
    cache.lastUpdated = Date.now();
    cache.version++;

    return summaries;
  }, [generateCacheKey, isCacheValid]);

  // Clear cache
  const clearCache = useCallback(() => {
    const cache = cacheRef.current;
    cache.timeEntrySummaries.clear();
    cache.jobProfitData.clear();
    cache.employeeSummaries.clear();
    cache.lastUpdated = 0;
    cache.version = 0;
    statsRef.current = { hits: 0, misses: 0 };
  }, []);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const stats = statsRef.current;
    const total = stats.hits + stats.misses;
    return {
      hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
      size: cacheRef.current.timeEntrySummaries.size + 
            cacheRef.current.jobProfitData.size + 
            cacheRef.current.employeeSummaries.size,
      version: cacheRef.current.version
    };
  }, []);

  return {
    getTimeEntrySummaries,
    getJobProfitData,
    getEmployeeSummaries,
    clearCache,
    getCacheStats
  };
}

/**
 * Hook for date-range filtered calculations with caching
 */
export function useDateRangeCalculations(
  entries: TimeEntry[],
  startDate: string,
  endDate: string
) {
  return useMemo(() => {
    // Efficient date filtering
    const filteredEntries = entries.filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });

    // Group by month for faster aggregation
    const monthlyData = filteredEntries.reduce((acc, entry) => {
      const month = entry.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) {
        acc[month] = { hours: 0, cost: 0, billable: 0, count: 0 };
      }
      
      acc[month].hours += entry.hours;
      acc[month].cost += entry.hours * (entry.costWageUsed || 0);
      acc[month].billable += entry.hours * (entry.billableWageUsed || 0);
      acc[month].count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    return {
      filteredEntries,
      monthlyData,
      totalHours: filteredEntries.reduce((sum, entry) => sum + entry.hours, 0),
      totalCost: filteredEntries.reduce((sum, entry) => sum + (entry.hours * (entry.costWageUsed || 0)), 0),
      totalBillable: filteredEntries.reduce((sum, entry) => sum + (entry.hours * (entry.billableWageUsed || 0)), 0)
    };
  }, [entries, startDate, endDate]);
}
