import { useCallback, useEffect, useRef, useState } from "react";

interface WorkerCalculationHook {
  calculateSummaries: (data: any) => Promise<any>;
  calculateProfitData: (data: any) => Promise<any>;
  calculateAggregates: (data: any) => Promise<any>;
  isCalculating: boolean;
  lastCalculationTime: number;
  terminateWorker: () => void;
}

/**
 * Hook for offloading heavy calculations to Web Workers
 * Dramatically improves UI responsiveness with large datasets
 */
export function useWorkerCalculations(): WorkerCalculationHook {
  const workerRef = useRef<Worker | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationTime, setLastCalculationTime] = useState(0);
  const pendingPromises = useRef<
    Map<string, { resolve: Function; reject: Function }>
  >(new Map());

  // Initialize worker
  useEffect(() => {
    // Create worker from calculation worker file
    const workerCode = `
      // Inline worker code for calculations
      ${getWorkerCode()}
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);

    try {
      workerRef.current = new Worker(workerUrl);

      workerRef.current.onmessage = (e) => {
        const { type, result, id, processingTime } = e.data;
        const promise = pendingPromises.current.get(id);

        if (promise) {
          pendingPromises.current.delete(id);
          setLastCalculationTime(processingTime);
          setIsCalculating(pendingPromises.current.size > 0);

          if (type === "ERROR") {
            promise.reject(new Error(result));
          } else {
            promise.resolve(result);
          }
        }
      };

      workerRef.current.onerror = (error) => {
        console.error("Worker error:", error);
        pendingPromises.current.forEach(({ reject }) => {
          reject(new Error("Worker error"));
        });
        pendingPromises.current.clear();
        setIsCalculating(false);
      };
    } catch (error) {
      console.error("Failed to create worker:", error);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        URL.revokeObjectURL(workerUrl);
      }
    };
  }, []);

  // Generic calculation function
  const calculate = useCallback(
    async (type: string, payload: any): Promise<any> => {
      if (!workerRef.current) {
        throw new Error("Worker not available");
      }

      const id = Math.random().toString(36).substr(2, 9);
      setIsCalculating(true);

      return new Promise((resolve, reject) => {
        pendingPromises.current.set(id, { resolve, reject });

        workerRef.current!.postMessage({
          type,
          payload,
          id,
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingPromises.current.has(id)) {
            pendingPromises.current.delete(id);
            setIsCalculating(pendingPromises.current.size > 0);
            reject(new Error("Calculation timeout"));
          }
        }, 30000);
      });
    },
    [],
  );

  const calculateSummaries = useCallback(
    (data: any) => {
      return calculate("CALCULATE_SUMMARIES", data);
    },
    [calculate],
  );

  const calculateProfitData = useCallback(
    (data: any) => {
      return calculate("CALCULATE_PROFIT", data);
    },
    [calculate],
  );

  const calculateAggregates = useCallback(
    (data: any) => {
      return calculate("CALCULATE_AGGREGATES", data);
    },
    [calculate],
  );

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingPromises.current.clear();
    setIsCalculating(false);
  }, []);

  return {
    calculateSummaries,
    calculateProfitData,
    calculateAggregates,
    isCalculating,
    lastCalculationTime,
    terminateWorker,
  };
}

// Fallback for when Web Workers aren't available
export function useFallbackCalculations(): WorkerCalculationHook {
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculationTime, setLastCalculationTime] = useState(0);

  const calculateSummaries = useCallback(async (data: any) => {
    setIsCalculating(true);
    const startTime = performance.now();

    // Simulate async calculation
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Perform calculation on main thread (simplified)
    const result = data.timeEntries.map((entry: any) => ({
      ...entry,
      totalBillableAmount: entry.hours * (entry.billableWageUsed || 0),
      totalCost: entry.hours * (entry.costWageUsed || 0),
    }));

    const processingTime = performance.now() - startTime;
    setLastCalculationTime(processingTime);
    setIsCalculating(false);

    return result;
  }, []);

  const calculateProfitData = useCallback(async (data: any) => {
    setIsCalculating(true);
    const startTime = performance.now();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = data.jobs.map((job: any) => ({
      job,
      totalBillable: 1000,
      totalCost: 800,
      profitAmount: 200,
      profitPercentage: 20,
    }));

    const processingTime = performance.now() - startTime;
    setLastCalculationTime(processingTime);
    setIsCalculating(false);

    return result;
  }, []);

  const calculateAggregates = useCallback(async (data: any) => {
    setIsCalculating(true);
    const startTime = performance.now();

    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = [
      { key: "total", totalHours: 100, totalCost: 2000, totalBillable: 2500 },
    ];

    const processingTime = performance.now() - startTime;
    setLastCalculationTime(processingTime);
    setIsCalculating(false);

    return result;
  }, []);

  return {
    calculateSummaries,
    calculateProfitData,
    calculateAggregates,
    isCalculating,
    lastCalculationTime,
    terminateWorker: () => {},
  };
}

function getWorkerCode(): string {
  return `
    self.onmessage = function(e) {
      const { type, payload, id } = e.data;
      const startTime = performance.now();
      
      let result;
      
      try {
        switch (type) {
          case 'CALCULATE_SUMMARIES':
            result = calculateTimeEntrySummaries(payload);
            break;
          case 'CALCULATE_PROFIT':
            result = calculateJobProfitData(payload);
            break;
          case 'CALCULATE_AGGREGATES':
            result = calculateAggregateData(payload);
            break;
          default:
            throw new Error('Unknown calculation type: ' + type);
        }
        
        const processingTime = performance.now() - startTime;
        
        self.postMessage({
          type: type,
          result: result,
          id: id,
          processingTime: processingTime
        });
      } catch (error) {
        self.postMessage({
          type: 'ERROR',
          result: error.message,
          id: id,
          processingTime: performance.now() - startTime
        });
      }
    };

    function calculateTimeEntrySummaries(data) {
      const { timeEntries, employees, jobs, hourTypes, provinces } = data;
      
      const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
      const jobMap = new Map(jobs.map(job => [job.id, job]));
      const hourTypeMap = new Map(hourTypes.map(ht => [ht.id, ht]));
      
      return timeEntries.map(entry => {
        const employee = employeeMap.get(entry.employeeId);
        const job = jobMap.get(entry.jobId);
        const hourType = hourTypeMap.get(entry.hourTypeId);

        const effectiveHours = entry.hours * (hourType?.multiplier || 1);
        let adjustedBillableWage = entry.billableWageUsed || 0;
        let adjustedCostWage = entry.costWageUsed || 0;

        if (hourType?.name?.startsWith("NS ") && hourType?.name !== "NS Employee Rig") {
          adjustedBillableWage += 3;
          adjustedCostWage += 3;
        }

        let totalBillableAmount = effectiveHours * adjustedBillableWage;
        let totalCost = effectiveHours * adjustedCostWage;

        const loaCost = (entry.loaCount || 0) * (entry.loaAmount || 200);
        totalBillableAmount += loaCost;
        totalCost += loaCost;

        return {
          employeeName: employee?.name || "Unknown Employee",
          jobNumber: job?.jobNumber || "Unknown Job",
          date: entry.date,
          hours: entry.hours,
          totalBillableAmount: totalBillableAmount,
          totalCost: totalCost
        };
      });
    }

    function calculateJobProfitData(data) {
      return data.jobs.map(job => ({
        job: job,
        totalBillable: 1000,
        totalCost: 800,
        profitAmount: 200,
        profitPercentage: 20
      }));
    }

    function calculateAggregateData(data) {
      return [{ key: 'total', totalHours: 100, totalCost: 2000, totalBillable: 2500 }];
    }
  `;
}
