/**
 * Web Worker for heavy calculation tasks
 * Offloads expensive operations from main thread
 */

interface CalculationMessage {
  type: "CALCULATE_SUMMARIES" | "CALCULATE_PROFIT" | "CALCULATE_AGGREGATES";
  payload: any;
  id: string;
}

interface CalculationResult {
  type: string;
  result: any;
  id: string;
  processingTime: number;
}

// Worker message handler
self.onmessage = function (e: MessageEvent<CalculationMessage>) {
  const { type, payload, id } = e.data;
  const startTime = performance.now();

  let result: any;

  try {
    switch (type) {
      case "CALCULATE_SUMMARIES":
        result = calculateTimeEntrySummaries(payload);
        break;
      case "CALCULATE_PROFIT":
        result = calculateJobProfitData(payload);
        break;
      case "CALCULATE_AGGREGATES":
        result = calculateAggregateData(payload);
        break;
      default:
        throw new Error(`Unknown calculation type: ${type}`);
    }

    const processingTime = performance.now() - startTime;

    const response: CalculationResult = {
      type,
      result,
      id,
      processingTime,
    };

    self.postMessage(response);
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      result: error instanceof Error ? error.message : "Unknown error",
      id,
      processingTime: performance.now() - startTime,
    });
  }
};

function calculateTimeEntrySummaries(data: {
  timeEntries: any[];
  employees: any[];
  jobs: any[];
  hourTypes: any[];
  provinces: any[];
}) {
  const { timeEntries, employees, jobs, hourTypes, provinces } = data;

  // Create lookup maps for O(1) access
  const employeeMap = new Map(employees.map((emp) => [emp.id, emp]));
  const jobMap = new Map(jobs.map((job) => [job.id, job]));
  const hourTypeMap = new Map(hourTypes.map((ht) => [ht.id, ht]));
  const provinceMap = new Map(provinces.map((prov) => [prov.id, prov]));

  function computeEmprigEffectiveHours(hours) {
    const h = Math.max(0, hours || 0);
    const reg = Math.min(8, h);
    const ot = Math.min(4, Math.max(0, h - 8));
    const dt = Math.max(0, h - 12);
    return reg * 1 + ot * 1.5 + dt * 2;
  }
  function computeRigPremiumDollars(hours) {
    const h = Math.max(0, hours || 0);
    const reg = Math.min(8, h);
    const ot = Math.min(4, Math.max(0, h - 8));
    const dt = Math.max(0, h - 12);
    return reg * 3 + ot * 4.5 + dt * 6;
  }

  return timeEntries.map((entry) => {
    const employee = employeeMap.get(entry.employeeId);
    const job = jobMap.get(entry.jobId);
    const hourType = hourTypeMap.get(entry.hourTypeId);
    const province = provinceMap.get(entry.provinceId);

    const isRigTiered = hourType?.name === "Employee Rig" || hourType?.name === "NS Employee Rig";
  const isRigNS = hourType?.name === "NS Employee Rig";
  const baseMultiplier = hourType?.multiplier || 1;
  const effectiveHoursRaw = isRigTiered
    ? computeEmprigEffectiveHours(entry.hours)
    : entry.hours * baseMultiplier;
  const premiumDollars = isRigNS ? computeRigPremiumDollars(entry.hours) : 0;

    let adjustedBillableWage = entry.billableWageUsed || 0;
    let adjustedCostWage = entry.costWageUsed || 0;

    // NS wage adjustment
    if (hourType?.name?.startsWith("NS ") && hourType?.name !== "NS Employee Rig") {
      adjustedBillableWage += 3;
      adjustedCostWage += 3;
    }

    // Calculate billable amount
    let totalBillableAmount = (isRigTiered ? entry.hours : effectiveHoursRaw) * adjustedBillableWage + premiumDollars;
    let totalCost = 0;

    // DSP rate logic
    const entryEmployeeCategory = entry.employeeCategory || employee?.category;
    const manager = employee?.managerId
      ? employeeMap.get(employee.managerId)
      : null;
    const shouldUse1xRates =
      entryEmployeeCategory === "dsp" ||
      (employee?.managerId && manager?.category === "dsp");

    if (isRigTiered) {
    totalCost = effectiveHoursRaw * adjustedCostWage + premiumDollars; // Rig tiered; NS adds premium
  } else if (shouldUse1xRates) {
      totalCost = entry.hours * adjustedCostWage; // 1x for DSPs
    } else {
      totalCost = effectiveHoursRaw * adjustedCostWage; // Normal rates
    }

    // LOA calculations
    const loaCost = (entry.loaCount || 0) * (entry.loaAmount || 200);
    const loaBillable = (entry.loaCount || 0) * (entry.loaAmount || 200);
    totalBillableAmount += loaBillable;
    totalCost += loaCost;

    return {
      employeeName: employee?.name || "Unknown Employee",
      employeeTitle: entry.title || employee?.title || "Unknown Title",
      jobNumber: job?.jobNumber || "Unknown Job",
      jobName: job?.name || "Unknown Job Name",
      hourTypeName: hourType?.name || "Unknown Hour Type",
      provinceName: province?.name || "Unknown Province",
      date: entry.date,
      hours: hourType?.name === "Billable" ? 0 : entry.hours,
      effectiveHours: hourType?.name === "Billable" ? 0 : effectiveHoursRaw,
      loaCount: entry.loaCount,
      billableWage: entry.billableWageUsed || 0,
      costWage: adjustedCostWage,
      totalBillableAmount,
      totalCost,
    };
  });
}

function calculateJobProfitData(data: {
  jobs: any[];
  timeEntrySummaries: any[];
  rentalSummaries: any[];
}) {
  const { jobs, timeEntrySummaries, rentalSummaries } = data;

  // Group summaries by job for efficient processing
  const timeEntriesByJob = new Map();
  const rentalEntriesByJob = new Map();

  timeEntrySummaries.forEach((summary) => {
    const jobNumber = summary.jobNumber;
    if (!timeEntriesByJob.has(jobNumber)) {
      timeEntriesByJob.set(jobNumber, []);
    }
    timeEntriesByJob.get(jobNumber).push(summary);
  });

  rentalSummaries.forEach((summary) => {
    const jobNumber = summary.jobNumber;
    if (!rentalEntriesByJob.has(jobNumber)) {
      rentalEntriesByJob.set(jobNumber, []);
    }
    rentalEntriesByJob.get(jobNumber).push(summary);
  });

  return jobs.map((job) => {
    const jobTimeEntries = timeEntriesByJob.get(job.jobNumber) || [];
    const jobRentalEntries = rentalEntriesByJob.get(job.jobNumber) || [];

    // Calculate totals using reduce for better performance
    const laborCost = jobTimeEntries.reduce(
      (sum, entry) => sum + entry.totalCost,
      0,
    );
    const laborBillable = jobTimeEntries.reduce(
      (sum, entry) => sum + entry.totalBillableAmount,
      0,
    );
    const rentalBillable = jobRentalEntries.reduce(
      (sum, entry) => sum + entry.totalBillable,
      0,
    );
    const rentalCost = jobRentalEntries.reduce(
      (sum, entry) => sum + entry.totalCost,
      0,
    );

    const totalBillable = laborBillable + rentalBillable;
    const totalCost = laborCost + rentalCost;
    const profitAmount = totalBillable - totalCost;
    const profitPercentage =
      totalBillable > 0 ? (profitAmount / totalBillable) * 100 : 0;

    return {
      job,
      totalBillable,
      totalCost,
      profitAmount,
      profitPercentage,
      laborCost,
      laborBillable,
      rentalBillable,
      rentalCost,
    };
  });
}

function calculateAggregateData(data: {
  summaries: any[];
  groupBy: "employee" | "job" | "date" | "month";
}) {
  const { summaries, groupBy } = data;

  const groups = new Map();

  summaries.forEach((summary) => {
    let key: string;

    switch (groupBy) {
      case "employee":
        key = summary.employeeName;
        break;
      case "job":
        key = summary.jobNumber;
        break;
      case "date":
        key = summary.date;
        break;
      case "month":
        key = summary.date.substring(0, 7); // YYYY-MM
        break;
      default:
        key = "total";
    }

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        totalHours: 0,
        totalCost: 0,
        totalBillable: 0,
        entryCount: 0,
        loaCount: 0,
      });
    }

    const group = groups.get(key);
    group.totalHours += summary.hours;
    group.totalCost += summary.totalCost;
    group.totalBillable += summary.totalBillableAmount;
    group.entryCount += 1;
    group.loaCount += summary.loaCount || 0;
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (groupBy === "date" || groupBy === "month") {
      return a.key.localeCompare(b.key);
    }
    return b.totalBillable - a.totalBillable; // Sort by revenue desc
  });
}

// Export for TypeScript
export {};
