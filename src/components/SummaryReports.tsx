import {
  useState,
  useMemo,
  useRef,
  useCallback,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/usePagination";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  CalendarIcon,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Download,
  Filter,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";

// Helper function to get the last n days
const getLastNDays = (days: number) => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
};

// Get all-time date range (from year 2000 to today)
const getAllTimeDateRange = () => {
  const startDate = new Date(2000, 0, 1);
  const endDate = new Date();
  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0],
  };
};

// Alias for quick date range buttons
const getDateRange = getLastNDays;

// Helper function to format date range for display
const formatDateRange = (start: string, end: string) => {
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  return `${formatLocalDate(startDate, { month: "short", day: "numeric" })} - ${formatLocalDate(endDate, { month: "short", day: "numeric" })}`;
};

// Helper function to sum values by hour type
const sumByHourType = (
  entries: any[],
  hourTypeField: string,
  valueField: string,
) => {
  return entries.reduce(
    (acc, entry) => {
      const hourType = entry[hourTypeField] || "Unknown";
      acc[hourType] = (acc[hourType] || 0) + (entry[valueField] || 0);
      return acc;
    },
    {} as Record<string, number>,
  );
};

// Helper function to calculate 5% GST for non-employee categories
// This version uses the employee's current category as a fallback
const calculateGST = (employee: any, totalCost: number): number => {
  // Apply 5% GST to DSPs, DSPOTs and contractors (anyone not explicitly marked as "employee")
  if (employee?.category === "dsp" || employee?.category === "dspot") {
    return totalCost * 0.05;
  }
  // Also apply GST to employees who have managers but no explicit category (subordinate contractors)
  if (
    employee?.managerId &&
    employee?.category !== "employee" &&
    !employee?.category
  ) {
    return totalCost * 0.05;
  }
  return 0;
};

// Helper function to calculate GST based on time entries (uses stored categories)
const calculateGSTFromEntries = (
  employeeName: string,
  timeEntries: any[],
  employees: any[],
): number => {
  const employee = employees.find((emp) => emp.name === employeeName);
  if (!employee) return 0;

  // Get all time entries for this employee within the current filter
  const employeeEntries = timeEntries.filter(
    (entry) => entry.employeeId === employee.id,
  );

  let totalGST = 0;
  employeeEntries.forEach((entry) => {
    // Use stored category from entry, fallback to current employee category
    const entryCategory = entry.employeeCategory || employee.category;

    // Calculate the cost for this individual entry
    const hourType = timeEntries.find((te) => te.id === entry.id);
    if (!hourType) return;

    // Apply GST logic per entry based on stored category
    if (entryCategory === "dsp" || entryCategory === "dspot") {
      // For entries that were created when employee was DSP/DSPOT
      totalGST += (entry.costWageUsed || 0) * entry.hours * 0.05;
    } else if (
      employee.managerId &&
      entryCategory !== "employee" &&
      !entryCategory
    ) {
      // For subordinate contractor entries
      totalGST += (entry.costWageUsed || 0) * entry.hours * 0.05;
    }
  });

  return totalGST;
};

const getInitialDateFilter = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: today.toISOString().split("T")[0],
  };
};

export function SummaryReports() {
  const {
    employees,
    jobs,
    timeEntries,
    timeEntrySummaries,
    rentalSummaries,
    hourTypes,
    provinces,
  } = useTimeTracking();

  // Filter state
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]); // Changed to array for multi-select
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [jobSearchTerm, setJobSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all-provinces");
  const [billableFilter, setBillableFilter] = useState("all");
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState("all");
  const [includeInvoiced, setIncludeInvoiced] = useState(true);
  const [includeUninvoiced, setIncludeUninvoiced] = useState(true);
  const [includePaid, setIncludePaid] = useState(true);
  const [includeUnpaid, setIncludeUnpaid] = useState(true);
  const [showEmptyResults, setShowEmptyResults] = useState(false);

  const jobSearchInputRef = useRef<HTMLInputElement | null>(null);

  const focusJobSearchInput = useCallback((cursorPosition: number) => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      if (jobSearchInputRef.current) {
        jobSearchInputRef.current.focus();
        jobSearchInputRef.current.setSelectionRange(
          cursorPosition,
          cursorPosition,
        );
      }
    });
  }, []);

  const toggleJobSelection = (jobNumber: string) => {
    setSelectedJobs((prev) =>
      prev.includes(jobNumber)
        ? prev.filter((num) => num !== jobNumber)
        : [...prev, jobNumber],
    );
  };

  const isJobSelected = (jobNumber: string) => selectedJobs.includes(jobNumber);

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const numberCompare = a.jobNumber.localeCompare(b.jobNumber, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (numberCompare !== 0) {
        return numberCompare;
      }
      return (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      });
    });
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const query = jobSearchTerm.trim().toLowerCase();
    if (!query) {
      return sortedJobs;
    }
    return sortedJobs.filter((job) => {
      const jobNumberLower = job.jobNumber.toLowerCase();
      const jobNameLower = (job.name || "").toLowerCase();
      return jobNumberLower.includes(query) || jobNameLower.includes(query);
    });
  }, [sortedJobs, jobSearchTerm]);

  const handleJobQuickSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.target === jobSearchInputRef.current) {
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        setJobSearchTerm((prev) => {
          if (prev.length === 0) {
            focusJobSearchInput(0);
            return prev;
          }
          const next = prev.slice(0, -1);
          focusJobSearchInput(next.length);
          return next;
        });
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setJobSearchTerm("");
        focusJobSearchInput(0);
        return;
      }

      if (event.key.length === 1 && /^[0-9a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        setJobSearchTerm((prev) => {
          const next = `${prev}${event.key}`;
          focusJobSearchInput(next.length);
          return next;
        });
      }
    },
    [focusJobSearchInput],
  );

  // Filter time entries based on criteria
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      // Date filter
      if (summary.date < dateFilter.start || summary.date > dateFilter.end) {
        return false;
      }

      // Employee filter - if any employees are selected, only show those
      if (
        selectedEmployees.length > 0 &&
        !selectedEmployees.includes(summary.employeeName)
      ) {
        return false;
      }

      // Job filter
      if (
        selectedJobs.length > 0 &&
        !selectedJobs.includes(summary.jobNumber)
      ) {
        return false;
      }

      // Province filter
      if (
        provinceFilter !== "all-provinces" &&
        summary.provinceName !== provinceFilter
      ) {
        return false;
      }

      // Billable filter
      if (billableFilter !== "all") {
        const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
        if (
          (billableFilter === "billable" && job?.isBillable !== true) ||
          (billableFilter === "non-billable" && job?.isBillable !== false)
        ) {
          return false;
        }
      }

      // Invoice and Payment status filters
      const job = jobs.find((j) => j.jobNumber === summary.jobNumber);
      const isInvoiced = job?.invoicedDates.includes(summary.date) || false;
      const isPaid = job?.paidDates.includes(summary.date) || false;

      // Invoice status filter
      if (!includeInvoiced && isInvoiced) {
        return false;
      }
      if (!includeUninvoiced && !isInvoiced) {
        return false;
      }

      // Payment status filter
      if (!includePaid && isPaid) {
        return false;
      }
      if (!includeUnpaid && !isPaid) {
        return false;
      }

      return true;
    });
  }, [
    timeEntrySummaries,
    dateFilter,
    selectedEmployees,
    selectedJobs,
    provinceFilter,
    billableFilter,
    includeInvoiced,
    includeUninvoiced,
    includePaid,
    includeUnpaid,
    jobs,
  ]);

  // Filter rental summaries based on same criteria
  const filteredRentalSummaries = useMemo(() => {
    return rentalSummaries.filter((rental) => {
      // Date filter
      if (
        rental.startDate < dateFilter.start ||
        rental.startDate > dateFilter.end
      ) {
        return false;
      }

      // Employee filter (if rental has employee assigned)
      if (
        selectedEmployees.length > 0 &&
        rental.employeeName &&
        !selectedEmployees.includes(rental.employeeName)
      ) {
        return false;
      }

      // Job filter
      if (selectedJobs.length > 0 && !selectedJobs.includes(rental.jobNumber)) {
        return false;
      }

      // Invoice and Payment status filters for rentals
      const job = jobs.find((j) => j.jobNumber === rental.jobNumber);
      const isInvoiced = job?.invoicedDates.includes(rental.startDate) || false;
      const isPaid = job?.paidDates.includes(rental.startDate) || false;

      // Invoice status filter
      if (!includeInvoiced && isInvoiced) {
        return false;
      }
      if (!includeUninvoiced && !isInvoiced) {
        return false;
      }

      // Payment status filter
      if (!includePaid && isPaid) {
        return false;
      }
      if (!includeUnpaid && !isPaid) {
        return false;
      }

      return true;
    });
  }, [
    rentalSummaries,
    dateFilter,
    selectedEmployees,
    selectedJobs,
    includeInvoiced,
    includeUninvoiced,
    includePaid,
    includeUnpaid,
    jobs,
  ]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalHours = filteredSummaries.reduce(
      (sum, summary) => sum + summary.hours,
      0,
    );
    const totalCost = filteredSummaries.reduce(
      (sum, summary) => {
        // Include full totalCost which already includes LoA cost
        return sum + summary.totalCost;
      },
      0,
    );
    const totalGst = filteredSummaries.reduce((sum, summary) => {
      const employee = employees.find(
        (emp) => emp.name === summary.employeeName,
      );
      // Calculate GST on full totalCost which includes LoA
      return sum + calculateGST(employee, summary.totalCost);
    }, 0);
    const rentalBillable = filteredRentalSummaries.reduce(
      (sum, rental) => sum + rental.totalBillable,
      0,
    );
    const rentalCost = filteredRentalSummaries.reduce(
      (sum, rental) => sum + rental.totalCost,
      0,
    );
    const totalDspEarnings = rentalCost; // DSP earnings are now properly calculated in totalCost

    return {
      totalHours,
      totalCost,
      totalGst,
      rentalBillable,
      rentalCost,
      totalDspEarnings,
      totalCombinedCost: totalCost + rentalCost,
      totalCombinedBillable: totalCost + rentalBillable,
    };
  }, [filteredSummaries, filteredRentalSummaries, employees]);

  // Optimized employee summaries with single pass calculation including DSP rates
  const employeeSummariesData = useMemo(() => {
    const employeeGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = summary.employeeName;
        if (!acc[key]) {
          acc[key] = {
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            totalLoaAmount: 0,
            totalDspEarnings: 0,
            dspRateInfo: {},
            entries: [],
            hourTypeBreakdown: {},
            loaAmountDetails: {},
            hasAdjustedLoa: false,
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        // Include full totalCost which already includes LoA cost
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.entries.push(summary);

        // Calculate DSP earnings for this employee from rental entries
        const employeeRentalEntries = filteredRentalSummaries.filter(
          (rental) => rental.employeeName === summary.employeeName,
        );

        let employeeDspTotal = 0;
        const dspRatesByItem = {};

        employeeRentalEntries.forEach((rental) => {
          const dspRate = rental.dspRate || 0;
          const dspEarning = dspRate * rental.duration * rental.quantity;
          employeeDspTotal += dspEarning;

          // Track DSP rates by rental item for detailed breakdown
          if (dspRate > 0) {
            if (!dspRatesByItem[rental.rentalItemName]) {
              dspRatesByItem[rental.rentalItemName] = {
                rate: dspRate,
                totalEarnings: 0,
                totalDuration: 0,
                entries: [],
              };
            }
            dspRatesByItem[rental.rentalItemName].totalEarnings += dspEarning;
            dspRatesByItem[rental.rentalItemName].totalDuration +=
              rental.duration * rental.quantity;
            dspRatesByItem[rental.rentalItemName].entries.push(rental);
          }
        });

        group.totalDspEarnings = employeeDspTotal;
        group.dspRateInfo = dspRatesByItem;

        // Build hour type breakdown from individual summary data
        const hourTypeName = summary.hourTypeName || "Unknown";
        const provinceName = summary.provinceName || "Unknown";

        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
            hourlyCost: 0,
            loaCost: 0,
            loaCount: 0,
            provinces: {},
            rateEntries: [],
            loaAmounts: {},
          };
        }

        const employeeRecord = employees.find(
          (emp) => emp.name === summary.employeeName,
        );
        const hourTypeRecord = hourTypes.find(
          (ht) => ht.name === summary.hourTypeName,
        );
        const timeEntry = timeEntries.find(
          (entry) =>
            entry.employeeId === employeeRecord?.id &&
            entry.date === summary.date &&
            entry.hourTypeId === hourTypeRecord?.id,
        );
        const actualLoaAmount = timeEntry?.loaAmount || 200;
        const entryLoaCost = (summary.loaCount || 0) * actualLoaAmount;
        const hourlyCost = summary.totalCost;

        group.totalLoaAmount = (group.totalLoaAmount || 0) + entryLoaCost;
        if (summary.loaCount) {
          const amountKey = actualLoaAmount.toFixed(2);
          group.loaAmountDetails[amountKey] =
            (group.loaAmountDetails[amountKey] || 0) + summary.loaCount;
          group.hourTypeBreakdown[hourTypeName].loaAmounts[amountKey] =
            (group.hourTypeBreakdown[hourTypeName].loaAmounts[amountKey] || 0) +
            summary.loaCount;
          if (Math.abs(actualLoaAmount - 200) > 0.01) {
            group.hasAdjustedLoa = true;
          }
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        // Track full cost including LOA
        group.hourTypeBreakdown[hourTypeName].cost += hourlyCost || 0;
        group.hourTypeBreakdown[hourTypeName].hourlyCost += hourlyCost;
        group.hourTypeBreakdown[hourTypeName].loaCost += entryLoaCost;
        group.hourTypeBreakdown[hourTypeName].loaCount += summary.loaCount || 0;

        // Track individual rate entries for this hour type
        if (summary.hours > 0) {
          const effectiveHourlyRate =
            summary.hours > 0 ? hourlyCost / summary.hours : 0;

          group.hourTypeBreakdown[hourTypeName].rateEntries.push({
            date: summary.date,
            jobNumber: summary.jobNumber,
            hours: summary.hours,
            effectiveHours: summary.effectiveHours,
            hourlyRate: effectiveHourlyRate,
            hourlyCost: hourlyCost,
            loaCount: summary.loaCount || 0,
            loaAmount: actualLoaAmount,
            loaCost: entryLoaCost,
            totalCost: summary.totalCost,
          });
        }

        // Track province breakdown for this hour type
        if (!group.hourTypeBreakdown[hourTypeName].provinces[provinceName]) {
          group.hourTypeBreakdown[hourTypeName].provinces[provinceName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }

        group.hourTypeBreakdown[hourTypeName].provinces[provinceName].hours +=
          summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].provinces[
          provinceName
        ].effectiveHours += summary.effectiveHours || 0;
        // Track full cost including LOA
        group.hourTypeBreakdown[hourTypeName].provinces[provinceName].cost +=
          hourlyCost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(employeeGroups).filter(
      (group) => showEmptyResults || group.totalHours > 0,
    );
  }, [filteredSummaries, filteredRentalSummaries, showEmptyResults]);

  // Calculate hierarchical employee summaries (managers and subordinates)
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

    // First, enhance all employees with hierarchy data and GST calculations
    const enhancedEmployees = employeeSummariesData.map((emp) => {
      const employee = employeeMap.get(emp.employeeName);
      const manager = employee?.managerId
        ? employees.find((e) => e.id === employee.managerId)
        : null;

      // Calculate GST for non-employee categories using entry-specific logic
      // Get time entries for this employee in the filtered date range
      const employeeTimeEntries = timeEntries.filter((entry) => {
        const entryEmployee = employees.find((e) => e.id === entry.employeeId);
        return (
          entryEmployee?.name === emp.employeeName &&
          entry.date >= dateFilter.start &&
          entry.date <= dateFilter.end
        );
      });

      // Calculate GST using exactly 5% of wage cost (excluding LOA)
      // For DSP/DSPOT employees, GST = 5% of their total labor cost (excluding LOA)
      // Note: emp.totalCost already excludes LOA (from employeeSummariesData grouping)
      let gstAmount = 0;

      if (employee?.category === "dsp" || employee?.category === "dspot") {
        gstAmount = (emp.totalCost || 0) * 0.05;
      } else if (
        employee?.managerId &&
        employee?.category !== "employee" &&
        !employee?.category
      ) {
        // Subordinate contractors without explicit category
        gstAmount = (emp.totalCost || 0) * 0.05;
      }

      return {
        ...emp,
        employeeCategory: employee?.category,
        isSubordinate: !!employee?.managerId,
        managerName: manager?.name,
        managerId: employee?.managerId,
        gstAmount,
        baseCostWage: employee?.costWage || 0,
      };
    });

    // Get all managers who appear in the filtered results (including those who are subordinates themselves)
    const managersInResults = new Set();
    enhancedEmployees.forEach((emp) => {
      if (!emp.isSubordinate) {
        managersInResults.add(emp.employeeName);
      }
      // Also add managers of subordinates who appear in results
      if (emp.isSubordinate && emp.managerName) {
        managersInResults.add(emp.managerName);
      }
    });

    // Create enhanced employee data for ALL subordinates of managers in results,
    // even if the subordinates don't have entries on this specific job
    const allSubordinatesOfRelevantManagers = employees
      .filter((emp) => {
        if (!emp.managerId) return false;
        const manager = employees.find((e) => e.id === emp.managerId);
        return manager && managersInResults.has(manager.name);
      })
      .map((emp) => {
        const manager = employees.find((e) => e.id === emp.managerId);
        // Check if this subordinate already has data from time entries
        const existingData = enhancedEmployees.find(
          (existing) => existing.employeeName === emp.name,
        );

        if (existingData) {
          // Use existing data if subordinate has time entries
          return existingData;
        } else {
          // Create empty data structure for subordinates without entries on this job
          const gstAmount = 0; // No GST if no time entries
          return {
            employeeName: emp.name,
            employeeTitle: emp.title,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            totalLoaAmount: 0,
            totalDspEarnings: 0,
            dspRateInfo: {},
            entries: [],
            hourTypeBreakdown: {},
            loaAmountDetails: {},
            hasAdjustedLoa: false,
            employeeCategory: emp.category,
            isSubordinate: true,
            managerName: manager?.name,
            managerId: emp.managerId,
            gstAmount,
            baseCostWage: emp.costWage || 0,
          };
        }
      });

    // Group subordinates by their managers
    const subordinatesByManager = allSubordinatesOfRelevantManagers.reduce(
      (acc, emp) => {
        const managerName = emp.managerName || "Unknown";
        if (!acc[managerName]) {
          acc[managerName] = [];
        }
        acc[managerName].push(emp);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Calculate subordinate GST totals for managers
    const managersWithSubordinateGST = enhancedEmployees
      .filter((emp) => !emp.isSubordinate)
      .map((manager) => {
        const subordinates = subordinatesByManager[manager.employeeName] || [];
        const managerEmployee = employees.find((e) => e.name === manager.employeeName);

        // Recalculate MANAGER'S OWN GST with current filters applied
        let recalculatedManagerGst = 0;
        if (managerEmployee?.category === "dsp" || managerEmployee?.category === "dspot") {
          const managerEntries = timeEntries.filter((entry) => {
            if (entry.employeeId !== managerEmployee.id) return false;
            if (entry.date < dateFilter.start || entry.date > dateFilter.end) return false;

            // Apply job filtering
            if (selectedJobs.length > 0) {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (!job || !selectedJobs.includes(job.jobNumber)) return false;
            }

            // Apply billable filtering
            if (billableFilter !== "all") {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (billableFilter === "billable" && !job?.isBillable) return false;
              if (billableFilter === "non-billable" && job?.isBillable !== false) return false;
            }

            // Apply invoice and payment filters
            const job = jobs.find((j) => j.id === entry.jobId);
            const isInvoiced = job?.invoicedDates?.includes(entry.date) || false;
            const isPaid = job?.paidDates?.includes(entry.date) || false;

            if (!includeInvoiced && isInvoiced) return false;
            if (!includeUninvoiced && !isInvoiced) return false;
            if (!includePaid && isPaid) return false;
            if (!includeUnpaid && !isPaid) return false;

            return true;
          });

          // Calculate GST from filtered entries for the manager
          recalculatedManagerGst = managerEntries.reduce((total, entry) => {
            const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
            if (!hourType) return total;

            let adjustedCostWage = entry.costWageUsed || 0;

            // Add $3 for NS hour types
            if (hourType.name.startsWith("NS ") && hourType.name !== "NS Employee Rig") {
              adjustedCostWage += 3;
            }

            // DSP costs are 1x for wage
            const wageCost = entry.hours * adjustedCostWage;

            // GST is only applied to wage, not to LOA
            const gstOnWage = wageCost * 0.05;

            return total + gstOnWage;
          }, 0);
        }

        // Calculate subordinate GST based on their totalCost (which includes LoA)
        const subordinateGstTotal = subordinates.reduce((sum, sub) => {
          const subGst = (sub.totalCost || 0) * 0.05;
          return sum + subGst;
        }, 0);

        // Update subordinate objects with recalculated GST amounts
        const updatedSubordinates = subordinates.map((sub) => {
          const subordinateEmployee = employees.find(
            (e) => e.name === sub.employeeName,
          );
          if (!subordinateEmployee) return sub;

          // Get filtered time entries for this subordinate (same logic as above)
          const subordinateEntries = timeEntries.filter((entry) => {
            if (entry.employeeId !== subordinateEmployee.id) return false;
            if (entry.date < dateFilter.start || entry.date > dateFilter.end)
              return false;

            if (selectedJobs.length > 0) {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (!job || !selectedJobs.includes(job.jobNumber)) {
                return false;
              }
            }

            if (billableFilter !== "all") {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (billableFilter === "billable" && !job?.isBillable)
                return false;
              if (
                billableFilter === "non-billable" &&
                job?.isBillable !== false
              )
                return false;
            }

            const job = jobs.find((j) => j.id === entry.jobId);
            const isInvoiced = job?.invoicedDates.includes(entry.date) || false;
            const isPaid = job?.paidDates.includes(entry.date) || false;

            if (!includeInvoiced && isInvoiced) return false;
            if (!includeUninvoiced && !isInvoiced) return false;
            if (!includePaid && isPaid) return false;
            if (!includeUnpaid && !isPaid) return false;

            return true;
          });

          // Calculate updated GST for this subordinate including LoA
          const updatedGstAmount = subordinateEntries.reduce((total, entry) => {
            const entryCategory =
              entry.employeeCategory || subordinateEmployee?.category;
            const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
            if (!hourType) return total;

            const effectiveHours = entry.hours * hourType.multiplier;
            let adjustedCostWage = entry.costWageUsed || 0;
            let entryCost = 0;

            if (
              hourType.name.startsWith("NS ") &&
              hourType.name !== "NS Employee Rig"
            ) {
              adjustedCostWage += 3;
            }

            if (entryCategory === "dsp") {
              entryCost = entry.hours * adjustedCostWage;
            } else {
              entryCost = effectiveHours * adjustedCostWage;
            }

            // Add LoA to the cost for GST calculation
            const loaCost = (entry.loaCount || 0) * (entry.loaAmount || 200);
            const totalEntryCost = entryCost + loaCost;

            if (entryCategory === "dsp" || entryCategory === "dspot") {
              return total + totalEntryCost * 0.05;
            } else if (
              subordinateEmployee.managerId &&
              entryCategory !== "employee" &&
              !entryCategory
            ) {
              return total + totalEntryCost * 0.05;
            }

            return total;
          }, 0);

          return {
            ...sub,
            gstAmount: updatedGstAmount,
          };
        });

        return {
          ...manager,
          gstAmount: recalculatedManagerGst, // Use recalculated GST with filters applied
          subordinates: updatedSubordinates,
          subordinateGstTotal,
        };
      });

    // Also include managers who don't have direct entries but have subordinates with entries
    const managersOnlyFromSubordinates = Array.from(managersInResults)
      .filter(
        (managerName) =>
          !managersWithSubordinateGST.find(
            (m) => m.employeeName === managerName,
          ),
      )
      .map((managerName) => {
        const manager = employees.find((emp) => emp.name === managerName);
        if (!manager) return null;

        const subordinates = subordinatesByManager[managerName] || [];

        // Calculate subordinate GST based on their totalCost (which includes LoA)
        const subordinateGstTotal = subordinates.reduce((sum, sub) => {
          const subGst = (sub.totalCost || 0) * 0.05;
          return sum + subGst;
        }, 0);

        // Update subordinate objects with recalculated GST amounts
        const updatedSubordinates = subordinates.map((sub) => {
          const subordinateEmployee = employees.find(
            (e) => e.name === sub.employeeName,
          );
          if (!subordinateEmployee) return sub;

          // Get filtered time entries for this subordinate (same logic as above)
          const subordinateEntries = timeEntries.filter((entry) => {
            if (entry.employeeId !== subordinateEmployee.id) return false;
            if (entry.date < dateFilter.start || entry.date > dateFilter.end)
              return false;

            if (selectedJobs.length > 0) {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (!job || !selectedJobs.includes(job.jobNumber)) {
                return false;
              }
            }

            if (billableFilter !== "all") {
              const job = jobs.find((j) => j.id === entry.jobId);
              if (billableFilter === "billable" && !job?.isBillable)
                return false;
              if (
                billableFilter === "non-billable" &&
                job?.isBillable !== false
              )
                return false;
            }

            const job = jobs.find((j) => j.id === entry.jobId);
            const isInvoiced = job?.invoicedDates.includes(entry.date) || false;
            const isPaid = job?.paidDates.includes(entry.date) || false;

            if (!includeInvoiced && isInvoiced) return false;
            if (!includeUninvoiced && !isInvoiced) return false;
            if (!includePaid && isPaid) return false;
            if (!includeUnpaid && !isPaid) return false;

            return true;
          });

          // Calculate updated GST for this subordinate including LoA
          const updatedGstAmount = subordinateEntries.reduce((total, entry) => {
            const entryCategory =
              entry.employeeCategory || subordinateEmployee?.category;
            const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
            if (!hourType) return total;

            const effectiveHours = entry.hours * hourType.multiplier;
            let adjustedCostWage = entry.costWageUsed || 0;
            let entryCost = 0;

            if (
              hourType.name.startsWith("NS ") &&
              hourType.name !== "NS Employee Rig"
            ) {
              adjustedCostWage += 3;
            }

            if (entryCategory === "dsp") {
              entryCost = entry.hours * adjustedCostWage;
            } else {
              entryCost = effectiveHours * adjustedCostWage;
            }

            // Add LoA to the cost for GST calculation
            const loaCost = (entry.loaCount || 0) * (entry.loaAmount || 200);
            const totalEntryCost = entryCost + loaCost;

            if (entryCategory === "dsp" || entryCategory === "dspot") {
              return total + totalEntryCost * 0.05;
            } else if (
              subordinateEmployee.managerId &&
              entryCategory !== "employee" &&
              !entryCategory
            ) {
              return total + totalEntryCost * 0.05;
            }

            return total;
          }, 0);

          return {
            ...sub,
            gstAmount: updatedGstAmount,
          };
        });

        const gstAmount = 0; // Manager has no direct entries
        return {
          employeeName: manager.name,
          employeeTitle: manager.title,
          totalHours: 0,
          totalEffectiveHours: 0,
          totalCost: 0,
          totalLoaCount: 0,
          totalLoaAmount: 0,
          totalDspEarnings: 0,
          dspRateInfo: {},
          entries: [],
          hourTypeBreakdown: {},
          loaAmountDetails: {},
          hasAdjustedLoa: false,
          employeeCategory: manager.category,
          isSubordinate: false,
          managerName: null,
          managerId: null,
          gstAmount,
          baseCostWage: manager.costWage || 0,
          subordinates: updatedSubordinates,
          subordinateGstTotal,
        };
      })
      .filter(Boolean);

    return [...managersWithSubordinateGST, ...managersOnlyFromSubordinates];
  }, [employeeSummariesData, employees]);

  // Apply employee type filtering
  const filteredHierarchicalSummaries = useMemo(() => {
    if (employeeTypeFilter === "all") {
      return hierarchicalEmployeeSummaries;
    }

    if (employeeTypeFilter === "dsps-with-subordinates") {
      // Show only DSPs (employees who have subordinates)
      return hierarchicalEmployeeSummaries.filter(
        (emp) => emp.subordinates && emp.subordinates.length > 0,
      );
    }

    if (employeeTypeFilter === "regular-employees") {
      // Show only regular employees (no subordinates, not subordinates themselves, and not DSPs/DSPOTs)
      return hierarchicalEmployeeSummaries.filter(
        (emp) =>
          (!emp.subordinates || emp.subordinates.length === 0) &&
          !emp.isSubordinate &&
          emp.employeeCategory !== "dsp" &&
          emp.employeeCategory !== "dspot",
      );
    }

    if (employeeTypeFilter === "dsps-only") {
      // Show only DSPs and DSPOTs who have no subordinates
      return hierarchicalEmployeeSummaries.filter(
        (emp) =>
          (emp.employeeCategory === "dsp" ||
            emp.employeeCategory === "dspot") &&
          (!emp.subordinates || emp.subordinates.length === 0),
      );
    }

    return hierarchicalEmployeeSummaries;
  }, [hierarchicalEmployeeSummaries, employeeTypeFilter]);

  // Sort employees alphabetically
  const sortedHierarchicalSummaries = useMemo(() => {
    return [...filteredHierarchicalSummaries].sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );
  }, [filteredHierarchicalSummaries]);

  // Calculate summary statistics based on filtered employees
  const filteredSummaryStats = useMemo(() => {
    // Calculate totals directly from hierarchical summaries (which already have recalculated GST)
    const totalHours = sortedHierarchicalSummaries.reduce((sum, emp) => {
      return sum + (emp.totalHours || 0);
    }, 0);

    const totalCost = sortedHierarchicalSummaries.reduce((sum, emp) => {
      // totalCost includes LOA (from employeeSummariesData)
      let managerCost = emp.totalCost || 0;
      let teamCost = 0;
      if (emp.subordinates && emp.subordinates.length > 0) {
        emp.subordinates.forEach((sub) => {
          teamCost += sub.totalCost || 0;
        });
      }
      return sum + managerCost + teamCost;
    }, 0);

    // Use the recalculated GST from hierarchical summaries
    const totalGst = sortedHierarchicalSummaries.reduce((sum, emp) => {
      const managerGst = emp.gstAmount || 0;
      const subordinateGst = emp.subordinateGstTotal || 0;
      return sum + managerGst + subordinateGst;
    }, 0);

    // Get the names of employees that are currently being displayed (for rentals)
    const displayedEmployeeNames = new Set();
    sortedHierarchicalSummaries.forEach((emp) => {
      displayedEmployeeNames.add(emp.employeeName);
      // Also include subordinates if they're being shown
      if (emp.subordinates && emp.subordinates.length > 0) {
        emp.subordinates.forEach((sub) => {
          displayedEmployeeNames.add(sub.employeeName);
        });
      }
    });

    // Filter rental summaries to only include displayed employees
    const relevantRentalSummaries = filteredRentalSummaries.filter((rental) =>
      displayedEmployeeNames.has(rental.employeeName),
    );

    const rentalBillable = relevantRentalSummaries.reduce(
      (sum, rental) => sum + rental.totalBillable,
      0,
    );
    const rentalCost = relevantRentalSummaries.reduce(
      (sum, rental) => sum + rental.totalCost,
      0,
    );
    const totalDspEarnings = rentalCost; // DSP earnings are now properly calculated in totalCost

    return {
      totalHours,
      totalCost,
      totalGst,
      rentalBillable,
      rentalCost,
      totalDspEarnings,
      totalCombinedCost: totalCost + rentalCost,
      totalCombinedBillable: totalCost + rentalBillable,
    };
  }, [
    sortedHierarchicalSummaries,
    filteredRentalSummaries,
  ]);

  // Pagination for employee summaries
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const pagination = usePagination({
    data: sortedHierarchicalSummaries,
    itemsPerPage,
  });

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setSelectedEmployees([]);
    setSelectedJobs([]);
    setProvinceFilter("all-provinces");
    setBillableFilter("all");
    setEmployeeTypeFilter("all");
    setIncludeInvoiced(true);
    setIncludeUninvoiced(true);
    setIncludePaid(true);
    setIncludeUnpaid(true);
    setShowEmptyResults(false);
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-100">
            Summary Reports
          </h1>
          <p className="text-gray-400 mt-1">
            Comprehensive analysis of time entries, costs, and performance
            metrics
          </p>
        </div>
        <Button onClick={resetFilters} variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Reset Filters
        </Button>
      </div>

      <Tabs defaultValue="payroll-info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="payroll-info">Payroll Information</TabsTrigger>
        </TabsList>

        {/* Payroll Information Tab */}
        <TabsContent value="payroll-info">
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-100">
                <Users className="h-5 w-5 text-orange-400" />
                Payroll Information
              </CardTitle>
              <CardDescription className="text-gray-300">
                Employee cost breakdown with hierarchical reporting structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-3 mb-6 p-3 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg">
                {/* Date Range Section */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Date Range</Label>
                  {/* Manual Date Input Controls */}
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label
                        htmlFor="start-date"
                        className="text-xs text-gray-400 mb-1 block"
                      >
                        From
                      </Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={dateFilter.start}
                        onChange={(e) =>
                          setDateFilter({
                            ...dateFilter,
                            start: e.target.value,
                          })
                        }
                        className="bg-gray-800 border-gray-600 text-gray-100"
                      />
                    </div>
                    <div className="flex-1">
                      <Label
                        htmlFor="end-date"
                        className="text-xs text-gray-400 mb-1 block"
                      >
                        To
                      </Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={dateFilter.end}
                        onChange={(e) =>
                          setDateFilter({
                            ...dateFilter,
                            end: e.target.value,
                          })
                        }
                        className="bg-gray-800 border-gray-600 text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Quick Date Range Buttons */}
                  <div className="flex gap-1 flex-wrap pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter(getDateRange(7))}
                      className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 text-xs"
                    >
                      7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter(getDateRange(30))}
                      className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 text-xs"
                    >
                      30 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter(getDateRange(90))}
                      className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 text-xs"
                    >
                      90 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateFilter(getAllTimeDateRange())}
                      className="bg-gray-800 border-gray-600 text-gray-100 hover:bg-gray-700 text-xs"
                    >
                      All Time
                    </Button>
                  </div>
                </div>

                {/* Other Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Employees</Label>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setSelectedEmployees(
                              employees
                                .filter((emp) => emp.isActive !== false)
                                .map((emp) => emp.name),
                            )
                          }
                          className="h-5 px-1.5 text-xs text-orange-400 hover:text-orange-300"
                        >
                          All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEmployees([])}
                          className="h-5 px-1.5 text-xs text-orange-400 hover:text-orange-300"
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-gray-800 border border-gray-600 rounded-md">
                      {employees.length === 0 ? (
                        <p className="text-gray-400 text-sm">
                          No employees available
                        </p>
                      ) : (
                        employees
                          .filter((employee) => employee.isActive !== false)
                          .map((employee) => (
                            <div
                              key={employee.id}
                              className="flex items-center space-x-2"
                            >
                              <input
                                type="checkbox"
                                id={`employee-${employee.id}`}
                                checked={selectedEmployees.includes(
                                  employee.name,
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedEmployees((prev) => [
                                      ...prev,
                                      employee.name,
                                    ]);
                                  } else {
                                    setSelectedEmployees((prev) =>
                                      prev.filter(
                                        (name) => name !== employee.name,
                                      ),
                                    );
                                  }
                                }}
                                className="rounded border-gray-600 text-orange-500 bg-gray-700 focus:ring-orange-500 focus:ring-2"
                              />
                              <label
                                htmlFor={`employee-${employee.id}`}
                                className="text-sm text-gray-100 cursor-pointer flex-1"
                              >
                                {employee.name}
                                <span className="text-xs text-gray-400 ml-2">
                                  ({employee.title})
                                </span>
                              </label>
                            </div>
                          ))
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {selectedEmployees.length === 0
                        ? "All employees shown"
                        : `${selectedEmployees.length} employee${selectedEmployees.length === 1 ? "" : "s"} selected`}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Jobs</Label>
                    <div
                      className="bg-gray-800 border border-gray-600 rounded-lg p-2"
                      tabIndex={0}
                      role="group"
                      aria-label="Job filter"
                      onKeyDown={handleJobQuickSearchKeyDown}
                    >
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                        <span className="truncate">
                          {selectedJobs.length === 0
                            ? "All"
                            : `${selectedJobs.length}`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJobs([]);
                            setJobSearchTerm("");
                            focusJobSearchInput(0);
                          }}
                          disabled={
                            selectedJobs.length === 0 &&
                            jobSearchTerm.trim() === ""
                          }
                          className="text-orange-400 hover:text-orange-300 transition-colors disabled:text-gray-600 disabled:cursor-not-allowed text-xs"
                        >
                          Clear
                        </button>
                      </div>
                      <Input
                        ref={jobSearchInputRef}
                        value={jobSearchTerm}
                        onChange={(event) =>
                          setJobSearchTerm(event.target.value)
                        }
                        placeholder="Search"
                        className="bg-gray-900 border-gray-700 text-gray-100 h-7 text-xs mb-2"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      {filteredJobs.length === 0 ? (
                        <div className="text-xs text-gray-500">
                          {jobs.length === 0
                            ? "No jobs"
                            : "No match"}
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {filteredJobs.map((job) => {
                            const checked = isJobSelected(job.jobNumber);
                            return (
                              <label
                                key={job.id}
                                className={`flex items-start gap-1.5 p-1.5 rounded border border-transparent hover:border-orange-500/40 transition-colors ${checked ? "bg-orange-500/10 border-orange-500/50" : "bg-gray-800/60"}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 w-3 h-3 text-orange-500 bg-gray-900 border-gray-600 rounded focus:ring-orange-500"
                                  checked={checked}
                                  onChange={() =>
                                    toggleJobSelection(job.jobNumber)
                                  }
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-100 truncate">
                                    {job.jobNumber} - {job.name}
                                  </div>
                                  {job.isBillable === false && (
                                    <div className="text-[9px] uppercase tracking-wide text-orange-300 mt-0.5">
                                      NB
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Province</Label>
                    <Select
                      value={provinceFilter}
                      onValueChange={setProvinceFilter}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all-provinces"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All Provinces
                        </SelectItem>
                        {provinces.map((province) => (
                          <SelectItem
                            key={province.id}
                            value={province.name}
                            className="text-gray-100 focus:bg-orange-500/20"
                          >
                            {province.name} ({province.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Billing Type</Label>
                    <Select
                      value={billableFilter}
                      onValueChange={setBillableFilter}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All
                        </SelectItem>
                        <SelectItem
                          value="billable"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          Billable
                        </SelectItem>
                        <SelectItem
                          value="non-billable"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          Non-Billable
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Employee Type</Label>
                    <Select
                      value={employeeTypeFilter}
                      onValueChange={setEmployeeTypeFilter}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem
                          value="all"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          All
                        </SelectItem>
                        <SelectItem
                          value="dsps-with-subordinates"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          DSPs w/ Subs
                        </SelectItem>
                        <SelectItem
                          value="dsps-only"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          DSP/DSPOT
                        </SelectItem>
                        <SelectItem
                          value="regular-employees"
                          className="text-gray-100 focus:bg-orange-500/20"
                        >
                          Regular
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Invoice and Payment Status Toggles */}
                  <div className="grid grid-cols-2 gap-2 col-span-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Invoice Status
                      </Label>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            id="include-invoiced"
                            checked={includeInvoiced}
                            onChange={(e) =>
                              setIncludeInvoiced(e.target.checked)
                            }
                            className="w-3 h-3 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-1"
                          />
                          <Label
                            htmlFor="include-invoiced"
                            className="text-xs text-gray-300"
                          >
                            Invoiced
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            id="include-uninvoiced"
                            checked={includeUninvoiced}
                            onChange={(e) =>
                              setIncludeUninvoiced(e.target.checked)
                            }
                            className="w-3 h-3 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-1"
                          />
                          <Label
                            htmlFor="include-uninvoiced"
                            className="text-xs text-gray-300"
                          >
                            Uninvoiced
                          </Label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Payment Status
                      </Label>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            id="include-paid"
                            checked={includePaid}
                            onChange={(e) => setIncludePaid(e.target.checked)}
                            className="w-3 h-3 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-1"
                          />
                          <Label
                            htmlFor="include-paid"
                            className="text-xs text-gray-300"
                          >
                            Paid
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="checkbox"
                            id="include-unpaid"
                            checked={includeUnpaid}
                            onChange={(e) => setIncludeUnpaid(e.target.checked)}
                            className="w-3 h-3 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500 focus:ring-1"
                          />
                          <Label
                            htmlFor="include-unpaid"
                            className="text-xs text-gray-300"
                          >
                            Unpaid
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {filteredSummaries.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-100 mb-2">
                      No Data Available
                    </h3>
                    <p className="text-gray-400 mb-4">
                      No time entries found for the selected filters.
                    </p>
                    <Button onClick={resetFilters} variant="outline">
                      Reset Filters
                    </Button>
                  </div>
                ) : (
                  <div className="mt-6">
                    {/* Weekly OT warning banner */}
                    {(() => {
                      try {
                        // Build a quick filtered list of raw entries respecting date range and displayed employees (after employee type filter)
                        const startDate = dateFilter.start;
                        const endDate = dateFilter.end;

                        // Determine currently displayed employees by name (includes subordinates when visible)
                        const displayedEmployeeNames = new Set<string>();
                        sortedHierarchicalSummaries.forEach((emp) => {
                          displayedEmployeeNames.add(emp.employeeName);
                          if (emp.subordinates && emp.subordinates.length > 0) {
                            emp.subordinates.forEach((sub) => {
                              displayedEmployeeNames.add(sub.employeeName);
                            });
                          }
                        });

                        // Convert displayed names to IDs
                        const allowedIds = new Set(
                          employees
                            .filter((e) => displayedEmployeeNames.has(e.name))
                            .map((e) => e.id),
                        );

                        const regularIds = new Set(
                          hourTypes
                            .filter((ht) =>
                              [
                                "Regular Time",
                                "NS Regular Time"
                              ].includes(ht.name),
                            )
                            .map((ht) => ht.id),
                        );
                        const rigIds = hourTypes
                          .filter(
                            (ht) =>
                              ht.name === "Employee Rig" ||
                              ht.name === "NS Employee Rig",
                          )
                          .map((ht) => ht.id);
                        const getWeekStartSunday = (dateStr: string) => {
                          const d = parseLocalDate(dateStr);
                          const day = d.getDay();
                          const sunday = new Date(d);
                          sunday.setDate(d.getDate() - day);
                          return sunday.toISOString().split("T")[0];
                        };
                        const totals: Record<
                          string,
                          Record<string, number>
                        > = {};
                        timeEntries.forEach((entry) => {
                          if (entry.date < startDate || entry.date > endDate)
                            return;
                          if (!allowedIds.has(entry.employeeId)) return;
                          const wk = getWeekStartSunday(entry.date);
                          if (!totals[entry.employeeId])
                            totals[entry.employeeId] = {};

                          if (rigIds.includes(entry.hourTypeId)) {
                            const add = Math.min(8, entry.hours || 0);
                            totals[entry.employeeId][wk] =
                              (totals[entry.employeeId][wk] || 0) + add;
                          } else if (regularIds.has(entry.hourTypeId)) {
                            totals[entry.employeeId][wk] =
                              (totals[entry.employeeId][wk] || 0) +
                              (entry.hours || 0);
                          }
                        });
                        const details: {
                          employeeId: string;
                          employeeName: string;
                          weekStart: string;
                          totalHours: number;
                        }[] = [];
                        Object.entries(totals).forEach(([empId, weeks]) => {
                          Object.entries(weeks).forEach(([wk, total]) => {
                            if (total > 40) {
                              const emp = employees.find((e) => e.id === empId);
                              details.push({
                                employeeId: empId,
                                employeeName: emp?.name || empId,
                                weekStart: wk,
                                totalHours: total,
                              });
                            }
                          });
                        });
                        return (
                          details.length > 0 && (
                            <div className="p-4 mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
                                <div>
                                  <div className="text-yellow-300 font-semibold">
                                    Weekly overtime threshold exceeded (&gt;40
                                    regular hours) in selected range
                                  </div>
                                  <div className="text-xs text-yellow-200 mt-1 space-y-1 max-h-48 overflow-y-auto pr-1">
                                    {details.map((d) => (
                                      <div
                                        key={`${d.employeeId}-${d.weekStart}`}
                                      >
                                        {d.employeeName}:{" "}
                                        {d.totalHours.toFixed(2)}h (week
                                        starting {d.weekStart})
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        );
                      } catch (e) {
                        console.error("weekly OT banner error", e);
                        return null;
                      }
                    })()}

                    {/* Summary Statistics */}
                    <div className="grid grid-cols-4 gap-4 p-4 mb-6 bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20 rounded-lg">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {filteredSummaryStats.totalHours.toFixed(2)}h
                        </div>
                        <div className="text-sm text-gray-300">Total Hours</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          ${filteredSummaryStats.totalCombinedCost.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">Total Cost</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-400">
                          ${filteredSummaryStats.totalGst.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">Total GST</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                          ${filteredSummaryStats.totalDspEarnings.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-300">
                          Total DSP Rentals
                        </div>
                      </div>
                    </div>

                    {/* Employee Count Indicator */}
                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-400" />
                        <span className="text-sm text-gray-300">
                          Showing {pagination.paginatedData.length} of{" "}
                          {filteredHierarchicalSummaries.length} employees
                          {employeeTypeFilter !== "all" && (
                            <span className="text-orange-400 font-medium">
                              {" "}
                              (
                              {employeeTypeFilter === "dsps-with-subordinates"
                                ? "DSPs with Subordinates"
                                : employeeTypeFilter === "dsps-only"
                                  ? "DSPs & DSPOTs Only"
                                  : employeeTypeFilter === "regular-employees"
                                    ? "Regular Employees"
                                    : ""}
                              )
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Hierarchical Employee Display */}
                    {pagination.paginatedData.map((employee, index) => {
                      const totalGst =
                        (employee.gstAmount || 0) +
                        (employee.subordinateGstTotal || 0);

                      return (
                        <div key={employee.employeeName}>
                          {/* Manager Card */}
                          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                                    index < 3
                                      ? "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                                      : index < 10
                                        ? "bg-gradient-to-br from-blue-400 to-blue-600 text-white"
                                        : "bg-gradient-to-br from-gray-500 to-gray-700 text-white"
                                  }`}
                                >
                                  {employee.employeeName.charAt(0)}
                                </span>
                                <div>
                                  <div className="font-semibold text-gray-100">
                                    {employee.employeeName}
                                  </div>
                                  <div className="text-sm text-gray-300">
                                    {employee.employeeTitle}
                                  </div>
                                </div>
                              </div>
                              <div
                                className="grid grid-cols-8 gap-4 text-center"
                                style={{
                                  gridTemplateColumns:
                                    "minmax(60px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(70px, 1fr) minmax(80px, 1fr) minmax(70px, 1fr)",
                                }}
                              >
                                <div>
                                  <div className="text-lg font-bold text-blue-400">
                                    {employee.totalHours.toFixed(2)}h
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Hours
                                  </div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-red-400">
                                    ${employee.totalCost.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Labor Cost
                                  </div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-yellow-400">
                                    $
                                    {employee.totalHours > 0
                                      ? (
                                          employee.totalCost /
                                          employee.totalHours
                                        ).toFixed(2)
                                      : "0.00"}
                                    /h
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Hourly Cost
                                  </div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-emerald-400">
                                    $
                                    {(() => {
                                      // Calculate total billable amount for this employee's entries from billable jobs only
                                      const employeeFilteredEntries =
                                        filteredSummaries.filter((entry) => {
                                          const job = jobs.find(
                                            (j) =>
                                              j.jobNumber === entry.jobNumber,
                                          );
                                          return (
                                            entry.employeeName ===
                                              employee.employeeName &&
                                            job?.isBillable !== false
                                          );
                                        });
                                      const totalBillable =
                                        employeeFilteredEntries.reduce(
                                          (sum, entry) =>
                                            sum +
                                            (entry.totalBillableAmount || 0),
                                          0,
                                        );
                                      return totalBillable.toFixed(2);
                                    })()}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Billable Amount
                                  </div>
                                </div>
                                <div>
                                  <div className="text-lg font-bold text-cyan-400">
                                    $
                                    {(() => {
                                      if (employee.totalHours === 0)
                                        return "0.00";
                                      // Calculate total billable amount for this employee's entries from billable jobs only
                                      const employeeFilteredEntries =
                                        filteredSummaries.filter((entry) => {
                                          const job = jobs.find(
                                            (j) =>
                                              j.jobNumber === entry.jobNumber,
                                          );
                                          return (
                                            entry.employeeName ===
                                              employee.employeeName &&
                                            job?.isBillable !== false
                                          );
                                        });
                                      const totalBillable =
                                        employeeFilteredEntries.reduce(
                                          (sum, entry) =>
                                            sum +
                                            (entry.totalBillableAmount || 0),
                                          0,
                                        );
                                      return (
                                        totalBillable / employee.totalHours
                                      ).toFixed(2);
                                    })()}
                                    /h
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Hourly Billable
                                  </div>
                                </div>
                                {totalGst > 0 ? (
                                  <div>
                                    <div className="text-lg font-bold text-orange-400">
                                      ${totalGst.toFixed(2)}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      {employee.subordinateGstTotal > 0
                                        ? "Total GST"
                                        : "GST"}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="text-lg font-bold text-gray-500">
                                      $0.00
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      GST
                                    </div>
                                  </div>
                                )}
                                <div>
                                  {employee.totalDspEarnings > 0 ? (
                                    <div>
                                      <div className="text-lg font-bold text-cyan-400">
                                        ${employee.totalDspEarnings.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        DSP Earnings
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="text-lg font-bold text-gray-500">
                                        $0.00
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        DSP Earnings
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  {(() => {
                                    const loaCount =
                                      employee.totalLoaCount || 0;
                                    const totalLoaAmount =
                                      employee.totalLoaAmount || 0;
                                    const loaAmountDetails: Record<
                                      string,
                                      number
                                    > = employee.loaAmountDetails || {};
                                    const uniqueLoaAmounts = Object.keys(
                                      loaAmountDetails,
                                    )
                                      .map((amount) => parseFloat(amount))
                                      .filter((amount) => !Number.isNaN(amount))
                                      .sort((a, b) => a - b);
                                    const hasAdjustedLoa =
                                      employee.hasAdjustedLoa ||
                                      uniqueLoaAmounts.some(
                                        (amount) =>
                                          Math.abs(amount - 200) > 0.01,
                                      );
                                    const loaAmountSummary = uniqueLoaAmounts
                                      .map((amount) => `$${amount.toFixed(2)}`)
                                      .join(", ");
                                    const valueClass =
                                      loaCount > 0
                                        ? hasAdjustedLoa
                                          ? "text-amber-300"
                                          : "text-purple-400"
                                        : "text-gray-500";
                                    const totalClass = hasAdjustedLoa
                                      ? "text-amber-200"
                                      : "text-gray-500";

                                    return (
                                      <div className="flex flex-col items-center gap-1">
                                        <div
                                          className={`text-lg font-bold ${valueClass}`}
                                        >
                                          {loaCount}
                                        </div>
                                        <div className="text-xs text-gray-400 flex flex-col items-center gap-0.5">
                                          <span>
                                            LOA{hasAdjustedLoa ? " (adj)" : ""}
                                          </span>
                                          {loaCount > 0 && (
                                            <span
                                              className={`text-[10px] ${totalClass}`}
                                            >
                                              ${totalLoaAmount.toFixed(2)} total
                                            </span>
                                          )}
                                          {hasAdjustedLoa &&
                                            loaAmountSummary && (
                                              <span className="text-[10px] text-amber-200">
                                                @ {loaAmountSummary}
                                              </span>
                                            )}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* DSP/DSPOT Invoice Summary - For matching invoices and bills */}
                            {(employee.employeeCategory === "dsp" ||
                              employee.employeeCategory === "dspot") && (
                              <div className="mt-3 p-3 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                                <h4 className="text-sm font-semibold text-purple-300 mb-2">
                                  {employee.employeeCategory === "dspot"
                                    ? "DSPOT"
                                    : "DSP"}{" "}
                                  Invoice Summary
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  {/* Individual DSP Cost & GST */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-purple-200">
                                        Cost Amount:
                                      </span>
                                      <span className="text-emerald-300 font-medium">
                                        ${employee.totalCost.toFixed(2)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-purple-200">
                                        GST Amount:
                                      </span>
                                      <span className="text-orange-300 font-medium">
                                        ${(employee.gstAmount || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Subordinates Totals (if applicable) */}
                                  {employee.subordinates &&
                                    employee.subordinates.length > 0 && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                          <span className="text-purple-200">
                                            Team Cost:
                                          </span>
                                          <span className="text-emerald-300 font-medium">
                                            $
                                            {(() => {
                                              let teamCost = 0;
                                              employee.subordinates.forEach(
                                                (sub) => {
                                                  teamCost +=
                                                    sub.totalCost || 0;
                                                },
                                              );
                                              return teamCost.toFixed(2);
                                            })()}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                          <span className="text-purple-200">
                                            Team GST:
                                          </span>
                                          <span className="text-orange-300 font-medium">
                                            $
                                            {(
                                              employee.subordinateGstTotal || 0
                                            ).toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                </div>

                                {/* Combined Totals for DSPs with subordinates */}
                                {employee.subordinates &&
                                  employee.subordinates.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-purple-500/30">
                                      <h5 className="text-xs font-semibold text-purple-300 mb-2">
                                        Combined Totals
                                      </h5>
                                      <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div className="text-center">
                                          <div className="text-emerald-300 font-bold text-lg">
                                            $
                                            {(() => {
                                              // Manager's cost
                                              const managerCost =
                                                employee.totalCost || 0;

                                              // Team cost
                                              let teamCost = 0;
                                              employee.subordinates.forEach(
                                                (sub) => {
                                                  teamCost +=
                                                    sub.totalCost || 0;
                                                },
                                              );

                                              return (
                                                managerCost + teamCost
                                              ).toFixed(2);
                                            })()}
                                          </div>
                                          <div className="text-xs text-purple-400">
                                            Total Cost
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-orange-300 font-bold text-lg">
                                            $
                                            {(
                                              (employee.gstAmount || 0) +
                                              (employee.subordinateGstTotal ||
                                                0)
                                            ).toFixed(2)}
                                          </div>
                                          <div className="text-xs text-purple-400">
                                            Total GST
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-purple-300 font-bold text-lg">
                                            $
                                            {(() => {
                                              // Manager's cost
                                              const managerCost =
                                                employee.totalCost || 0;

                                              // Team cost
                                              let teamCost = 0;
                                              employee.subordinates.forEach(
                                                (sub) => {
                                                  teamCost +=
                                                    sub.totalCost || 0;
                                                },
                                              );

                                              const totalCost =
                                                managerCost + teamCost;
                                              const totalGst =
                                                (employee.gstAmount || 0) +
                                                (employee.subordinateGstTotal ||
                                                  0);
                                              return (
                                                totalCost + totalGst
                                              ).toFixed(2);
                                            })()}
                                          </div>
                                          <div className="text-xs text-purple-400">
                                            Grand Total
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                {/* Total for DSPs without subordinates */}
                                {(!employee.subordinates ||
                                  employee.subordinates.length === 0) && (
                                  <div className="mt-3 pt-3 border-t border-purple-500/30">
                                    <div className="text-center">
                                      <div className="text-purple-300 font-bold text-lg">
                                        $
                                        {(
                                          (employee.totalCost || 0) +
                                          (employee.gstAmount || 0)
                                        ).toFixed(2)}
                                      </div>
                                      <div className="text-xs text-purple-400">
                                        Cost + GST Total
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* DSP Rate Breakdown */}
                            {employee.totalDspEarnings > 0 &&
                              Object.keys(employee.dspRateInfo).length > 0 && (
                                <div className="mt-3 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                                  <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                                    DSP Rate Breakdown
                                  </h4>
                                  <div className="grid gap-2">
                                    {Object.entries(employee.dspRateInfo).map(
                                      ([itemName, info]: [string, any]) => (
                                        <div
                                          key={itemName}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="text-cyan-200">
                                              {itemName}
                                            </span>
                                            <Badge
                                              variant="outline"
                                              className="bg-cyan-400/10 text-cyan-300 border-cyan-400/30"
                                            >
                                              ${info.rate.toFixed(2)}/unit
                                            </Badge>
                                          </div>
                                          <div className="text-right">
                                            <div className="text-cyan-300 font-medium">
                                              ${info.totalEarnings.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-cyan-400">
                                              {info.totalDuration} units
                                            </div>
                                          </div>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-cyan-500/20 text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-cyan-300 font-medium">
                                        Total DSP Earnings:
                                      </span>
                                      <span className="text-cyan-300 font-bold">
                                        ${employee.totalDspEarnings.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                            {/* GST Breakdown - NEW SECTION */}
                            {totalGst > 0 && (
                              <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                                <h4 className="text-sm font-semibold text-orange-300 mb-2">
                                  GST Breakdown
                                </h4>
                                <div className="grid gap-2">
                                  {/* Manager's own GST */}
                                  {(employee.gstAmount || 0) > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="text-orange-200">
                                          {employee.employeeName} (Manager)
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="bg-orange-400/10 text-orange-300 border-orange-400/30"
                                        >
                                          5% GST
                                        </Badge>
                                      </div>
                                      <div className="text-orange-300 font-medium">
                                        ${(employee.gstAmount || 0).toFixed(2)}
                                      </div>
                                    </div>
                                  )}

                                  {/* Subordinates GST */}
                                  {(employee.subordinateGstTotal || 0) > 0 && (
                                    <>
                                      <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className="text-orange-200">
                                            Team Members (
                                            {employee.subordinates?.length || 0}
                                            )
                                          </span>
                                          <Badge
                                            variant="outline"
                                            className="bg-orange-400/10 text-orange-300 border-orange-400/30"
                                          >
                                            Combined
                                          </Badge>
                                        </div>
                                        <div className="text-orange-300 font-medium">
                                          $
                                          {(
                                            employee.subordinateGstTotal || 0
                                          ).toFixed(2)}
                                        </div>
                                      </div>

                                      {/* Individual subordinate GST breakdown */}
                                      {employee.subordinates &&
                                        employee.subordinates.length > 0 && (
                                          <div className="ml-4 space-y-1 border-l-2 border-orange-500/20 pl-2">
                                            {employee.subordinates
                                              .filter(
                                                (sub) =>
                                                  (sub.gstAmount || 0) > 0,
                                              )
                                              .map((subordinate) => (
                                                <div
                                                  key={subordinate.employeeName}
                                                  className="flex items-center justify-between text-xs"
                                                >
                                                  <span className="text-orange-200/80">
                                                    ↳ {subordinate.employeeName}
                                                  </span>
                                                  <span className="text-orange-300">
                                                    $
                                                    {(
                                                      subordinate.gstAmount || 0
                                                    ).toFixed(2)}
                                                  </span>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                                <div className="mt-2 pt-2 border-t border-orange-500/20 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-orange-300 font-medium">
                                      Total GST Collected:
                                    </span>
                                    <span className="text-orange-300 font-bold">
                                      ${totalGst.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-orange-400 mt-1">
                                    Applies to DSPs and contractors only
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Hour Type Breakdown */}
                            {employee.hourTypeBreakdown &&
                              Object.keys(employee.hourTypeBreakdown).length >
                                0 && (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-300">
                                    Hour Type Breakdown
                                  </h4>
                                  <div className="flex flex-wrap gap-2 p-2 rounded border bg-gray-800/60 border-gray-700">
                                    {Object.entries(employee.hourTypeBreakdown)
                                      .sort(([a], [b]) => {
                                        const order = [
                                          "Regular Time",
                                          "NS Regular Time",
                                          "Overtime",
                                          "NS Overtime",
                                          "Double Time",
                                          "NS Double Time",
                                          "Travel Hours",
                                          "Holiday",
                                          "Stat Holiday",
                                          "NS Stat Holiday OT",
                                          "Stat Holiday OT",
                                        ];
                                        const ai = order.indexOf(a);
                                        const bi = order.indexOf(b);
                                        const aIndex =
                                          ai === -1
                                            ? 100 + a.localeCompare(b)
                                            : ai;
                                        const bIndex =
                                          bi === -1
                                            ? 100 + b.localeCompare(a)
                                            : bi;
                                        return aIndex - bIndex;
                                      })
                                      .map(
                                        ([hourType, data]: [string, any]) => {
                                          const color =
                                            hourType === "Regular Time"
                                              ? "bg-emerald-700/40 border-emerald-500/60 text-emerald-200"
                                              : hourType === "NS Regular Time"
                                                ? "bg-emerald-700/30 border-emerald-500/50 text-emerald-200"
                                                : hourType === "Overtime"
                                                  ? "bg-amber-700/40 border-amber-500/60 text-amber-200"
                                                  : hourType === "NS Overtime"
                                                    ? "bg-amber-700/30 border-amber-500/50 text-amber-200"
                                                    : hourType ===
                                                        "Travel Hours"
                                                      ? "bg-sky-700/40 border-sky-500/60 text-sky-200"
                                                      : hourType ===
                                                          "Double Time"
                                                        ? "bg-rose-700/40 border-rose-500/60 text-rose-200"
                                                        : hourType ===
                                                            "NS Double Time"
                                                          ? "bg-rose-700/30 border-rose-500/50 text-rose-200"
                                                          : hourType ===
                                                              "Holiday"
                                                            ? "bg-teal-700/40 border-teal-500/60 text-teal-200"
                                                            : hourType ===
                                                                "Stat Holiday"
                                                              ? "bg-violet-700/40 border-violet-500/60 text-violet-200"
                                                              : hourType ===
                                                                  "NS Stat Holiday OT"
                                                                ? "bg-purple-700/40 border-purple-500/60 text-purple-200"
                                                                : hourType ===
                                                                    "Stat Holiday OT"
                                                                  ? "bg-fuchsia-700/40 border-fuchsia-500/60 text-fuchsia-200"
                                                                  : "bg-gray-700/40 border-gray-500/60 text-gray-200";
                                          return (
                                            <div
                                              key={`banner-${hourType}`}
                                              className={`px-2 py-1 rounded border text-xs font-semibold ${color}`}
                                            >
                                              {data.hours.toFixed(2)}h —{" "}
                                              {hourType}
                                            </div>
                                          );
                                        },
                                      )}
                                  </div>
                                  <div className="grid gap-2">
                                    {Object.entries(employee.hourTypeBreakdown)
                                      .sort(([a], [b]) => {
                                        const order = [
                                          "Regular Time",
                                          "NS Regular Time",
                                          "Overtime",
                                          "NS Overtime",
                                          "Double Time",
                                          "NS Double Time",
                                          "Travel Hours",
                                          "Holiday",
                                          "Stat Holiday",
                                          "NS Stat Holiday OT",
                                          "Stat Holiday OT",
                                        ];
                                        const ai = order.indexOf(a);
                                        const bi = order.indexOf(b);
                                        const aIndex =
                                          ai === -1
                                            ? 100 + a.localeCompare(b)
                                            : ai;
                                        const bIndex =
                                          bi === -1
                                            ? 100 + b.localeCompare(a)
                                            : bi;
                                        return aIndex - bIndex;
                                      })
                                      .map(
                                        ([hourType, data]: [string, any]) => (
                                          <div
                                            key={hourType}
                                            className="bg-gray-700/30 rounded p-2"
                                          >
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm font-medium text-gray-200">
                                                {hourType}
                                              </span>
                                              <div className="text-sm text-gray-300">
                                                {data.hours.toFixed(2)}h (
                                                {data.effectiveHours.toFixed(2)}{" "}
                                                effective) - $
                                                {data.hourlyCost.toFixed(2)}
                                                {data.loaCount > 0 && (
                                                  <span className="text-yellow-400">
                                                    {" "}
                                                    + {data.loaCount} LOA ($
                                                    {data.loaCost.toFixed(2)}{" "}
                                                    total
                                                    {(() => {
                                                      const loaAmountDetails: Record<
                                                        string,
                                                        number
                                                      > = data.loaAmounts || {};
                                                      const uniqueLoaAmounts =
                                                        Object.keys(
                                                          loaAmountDetails,
                                                        )
                                                          .map((amount) =>
                                                            parseFloat(amount),
                                                          )
                                                          .filter(
                                                            (amount) =>
                                                              !Number.isNaN(
                                                                amount,
                                                              ),
                                                          )
                                                          .sort(
                                                            (a, b) => a - b,
                                                          );
                                                      const hasAdjustedLoa =
                                                        uniqueLoaAmounts.some(
                                                          (amount) =>
                                                            Math.abs(
                                                              amount - 200,
                                                            ) > 0.01,
                                                        );
                                                      if (
                                                        !hasAdjustedLoa ||
                                                        uniqueLoaAmounts.length ===
                                                          0
                                                      ) {
                                                        return null;
                                                      }
                                                      const summary =
                                                        uniqueLoaAmounts
                                                          .map(
                                                            (amount) =>
                                                              `$${amount.toFixed(2)}`,
                                                          )
                                                          .join(", ");
                                                      return (
                                                        <span className="text-amber-200">
                                                          {" "}
                                                          @ {summary}
                                                        </span>
                                                      );
                                                    })()}
                                                    )
                                                  </span>
                                                )}
                                                {data.loaCount > 0 && (
                                                  <span className="text-gray-300">
                                                    {" "}
                                                    = ${data.cost.toFixed(2)}
                                                  </span>
                                                )}
                                              </div>
                                            </div>

                                            {/* Detailed entries breakdown for this hour type */}
                                            {data.rateEntries &&
                                              data.rateEntries.length > 0 && (
                                                <div className="mt-2">
                                                  <div className="text-xs text-gray-400 mb-1">
                                                    Daily Breakdown (
                                                    {data.rateEntries.length}{" "}
                                                    entries):
                                                  </div>
                                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {data.rateEntries.map(
                                                      (
                                                        entry: any,
                                                        index: number,
                                                      ) => (
                                                        <div
                                                          key={`${entry.date}-${index}`}
                                                          className="text-xs bg-gray-600/30 px-2 py-1 rounded flex justify-between items-center"
                                                        >
                                                          <span className="text-gray-300">
                                                            {entry.date}
                                                            {entry.jobNumber && (
                                                              <span className="ml-1 text-blue-300">
                                                                [
                                                                {
                                                                  entry.jobNumber
                                                                }
                                                                ]
                                                              </span>
                                                            )}
                                                          </span>
                                                          <span className="text-gray-200">
                                                            {entry.hours.toFixed(
                                                              2,
                                                            )}
                                                            h
                                                            {entry.effectiveHours !==
                                                              entry.hours && (
                                                              <span className="text-gray-400">
                                                                {" "}
                                                                (
                                                                {entry.effectiveHours.toFixed(
                                                                  2,
                                                                )}{" "}
                                                                eff)
                                                              </span>
                                                            )}{" "}
                                                            @ $
                                                            {entry.hourlyRate.toFixed(
                                                              2,
                                                            )}
                                                            /h = $
                                                            {entry.hourlyCost.toFixed(
                                                              2,
                                                            )}
                                                            {entry.loaCount >
                                                              0 && (
                                                              <span className="text-yellow-400">
                                                                {" "}
                                                                +{" "}
                                                                {
                                                                  entry.loaCount
                                                                }{" "}
                                                                LOA ($
                                                                {entry.loaCost.toFixed(
                                                                  2,
                                                                )}{" "}
                                                                total
                                                                {(() => {
                                                                  const perLoaAmount =
                                                                    entry.loaCount &&
                                                                    entry.loaCount >
                                                                      0
                                                                      ? entry.loaAmount !==
                                                                        undefined
                                                                        ? entry.loaAmount
                                                                        : entry.loaCost /
                                                                          entry.loaCount
                                                                      : 0;
                                                                  const amountClass =
                                                                    Math.abs(
                                                                      perLoaAmount -
                                                                        200,
                                                                    ) > 0.01
                                                                      ? "text-amber-200"
                                                                      : "text-gray-300";
                                                                  return (
                                                                    <span
                                                                      className={
                                                                        amountClass
                                                                      }
                                                                    >
                                                                      {" "}
                                                                      @ $
                                                                      {perLoaAmount.toFixed(
                                                                        2,
                                                                      )}
                                                                    </span>
                                                                  );
                                                                })()}
                                                                )
                                                              </span>
                                                            )}
                                                            {entry.loaCount >
                                                              0 && (
                                                              <span className="text-gray-300">
                                                                {" "}
                                                                = $
                                                                {entry.totalCost.toFixed(
                                                                  2,
                                                                )}
                                                              </span>
                                                            )}
                                                          </span>
                                                        </div>
                                                      ),
                                                    )}
                                                  </div>
                                                </div>
                                              )}

                                            {/* Province breakdown for this hour type */}
                                            {Object.keys(data.provinces)
                                              .length > 0 && (
                                              <div className="mt-2">
                                                <div className="text-xs text-gray-400 mb-1">
                                                  Provinces:
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                  {Object.entries(
                                                    data.provinces,
                                                  ).map(
                                                    ([
                                                      provinceName,
                                                      provinceData,
                                                    ]: [string, any]) => (
                                                      <div
                                                        key={provinceName}
                                                        className="text-xs bg-gray-600/50 px-2 py-1 rounded"
                                                      >
                                                        {provinceName}:{" "}
                                                        {provinceData.hours.toFixed(
                                                          2,
                                                        )}
                                                        h
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ),
                                      )}
                                  </div>
                                  {Object.keys(employee.hourTypeBreakdown)
                                    .length > 0 && (
                                    <div className="text-xs text-gray-400 mt-2">
                                      Total:{" "}
                                      {
                                        Object.keys(employee.hourTypeBreakdown)
                                          .length
                                      }{" "}
                                      hour type
                                      {Object.keys(employee.hourTypeBreakdown)
                                        .length !== 1
                                        ? "s"
                                        : ""}
                                    </div>
                                  )}
                                </div>
                              )}

                            {/* Subordinates */}
                            {employee.subordinates &&
                              employee.subordinates.length > 0 && (
                                <div className="ml-8 space-y-2 mt-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-sm font-semibold text-blue-300">
                                      Team Members
                                    </h4>
                                    <Badge
                                      variant="outline"
                                      className="bg-blue-400/10 text-blue-300 border-blue-400/30"
                                    >
                                      {employee.subordinates.length} subordinate
                                      {employee.subordinates.length !== 1
                                        ? "s"
                                        : ""}
                                    </Badge>
                                  </div>
                                  {employee.subordinates.map((subordinate) => (
                                    <div
                                      key={subordinate.employeeName}
                                      className="relative bg-blue-900/10 border border-blue-500/30 rounded-lg p-3 space-y-3"
                                    >
                                      <div className="absolute -left-4 top-4 w-3 h-3 border-l-2 border-b-2 border-blue-400"></div>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                                            ↳
                                          </span>
                                          <div>
                                            <div className="font-medium text-blue-300">
                                              {subordinate.employeeName}
                                            </div>
                                            <div className="text-xs text-blue-200">
                                              {subordinate.employeeTitle}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        className="grid grid-cols-7 gap-4 text-center"
                                        style={{
                                          gridTemplateColumns:
                                            "minmax(60px, 1fr) minmax(80px, 1fr) minmax(80px, 1fr) minmax(90px, 1fr) minmax(90px, 1fr) minmax(80px, 1fr) minmax(70px, 1fr)",
                                        }}
                                      >
                                        <div className="text-center">
                                          <div className="font-semibold text-blue-300">
                                            {subordinate.totalHours.toFixed(2)}h
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            Hours
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-semibold text-yellow-300">
                                            $
                                            {subordinate.totalHours > 0
                                              ? (
                                                  subordinate.totalCost /
                                                  subordinate.totalHours
                                                ).toFixed(2)
                                              : "0.00"}
                                            /h
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            Hourly Cost
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-semibold text-red-300">
                                            ${subordinate.totalCost.toFixed(2)}
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            Labor Cost
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-semibold text-emerald-300">
                                            $
                                            {(() => {
                                              // Calculate total billable amount for this subordinate's entries from billable jobs only
                                              const subordinateFilteredEntries =
                                                filteredSummaries.filter(
                                                  (entry) => {
                                                    const job = jobs.find(
                                                      (j) =>
                                                        j.jobNumber ===
                                                        entry.jobNumber,
                                                    );
                                                    return (
                                                      entry.employeeName ===
                                                        subordinate.employeeName &&
                                                      job?.isBillable !== false
                                                    );
                                                  },
                                                );
                                              const totalBillable =
                                                subordinateFilteredEntries.reduce(
                                                  (sum, entry) =>
                                                    sum +
                                                    (entry.totalBillableAmount ||
                                                      0),
                                                  0,
                                                );
                                              return totalBillable.toFixed(2);
                                            })()}
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            Billable Amount
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <div className="font-semibold text-orange-300">
                                            $
                                            {(
                                              subordinate.gstAmount || 0
                                            ).toFixed(2)}
                                          </div>
                                          <div className="text-xs text-blue-400">
                                            GST
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          {subordinate.totalDspEarnings > 0 ? (
                                            <div className="font-semibold text-cyan-300">
                                              $
                                              {subordinate.totalDspEarnings.toFixed(
                                                2,
                                              )}
                                            </div>
                                          ) : (
                                            <div className="text-blue-400">
                                              $0.00
                                            </div>
                                          )}
                                          <div className="text-xs text-blue-400">
                                            DSP Earnings
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          {(() => {
                                            const loaCount =
                                              subordinate.totalLoaCount || 0;
                                            const totalLoaAmount =
                                              subordinate.totalLoaAmount || 0;
                                            const loaAmountDetails: Record<
                                              string,
                                              number
                                            > =
                                              subordinate.loaAmountDetails ||
                                              {};
                                            const uniqueLoaAmounts =
                                              Object.keys(loaAmountDetails)
                                                .map((amount) =>
                                                  parseFloat(amount),
                                                )
                                                .filter(
                                                  (amount) =>
                                                    !Number.isNaN(amount),
                                                )
                                                .sort((a, b) => a - b);
                                            const hasAdjustedLoa =
                                              subordinate.hasAdjustedLoa ||
                                              uniqueLoaAmounts.some(
                                                (amount) =>
                                                  Math.abs(amount - 200) > 0.01,
                                              );
                                            const loaAmountSummary =
                                              uniqueLoaAmounts
                                                .map(
                                                  (amount) =>
                                                    `$${amount.toFixed(2)}`,
                                                )
                                                .join(", ");
                                            const valueClass =
                                              loaCount > 0
                                                ? hasAdjustedLoa
                                                  ? "text-amber-300"
                                                  : "text-purple-300"
                                                : "text-blue-400";
                                            const totalClass = hasAdjustedLoa
                                              ? "text-amber-200"
                                              : "text-blue-300";

                                            return (
                                              <div className="flex flex-col items-center gap-1">
                                                <div
                                                  className={`font-semibold ${valueClass}`}
                                                >
                                                  {loaCount}
                                                </div>
                                                <div className="text-xs text-blue-400 flex flex-col items-center gap-0.5">
                                                  <span>
                                                    LOA
                                                    {hasAdjustedLoa
                                                      ? " (adj)"
                                                      : ""}
                                                  </span>
                                                  {loaCount > 0 && (
                                                    <span
                                                      className={`text-[10px] ${totalClass}`}
                                                    >
                                                      $
                                                      {totalLoaAmount.toFixed(
                                                        2,
                                                      )}{" "}
                                                      total
                                                    </span>
                                                  )}
                                                  {hasAdjustedLoa &&
                                                    loaAmountSummary && (
                                                      <span className="text-[10px] text-amber-200">
                                                        @ {loaAmountSummary}
                                                      </span>
                                                    )}
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>

                                      {/* Subordinate DSP Rate Breakdown */}
                                      {subordinate.totalDspEarnings > 0 &&
                                        subordinate.dspRateInfo &&
                                        Object.keys(subordinate.dspRateInfo)
                                          .length > 0 && (
                                          <div className="mt-2 p-2 bg-cyan-900/20 border border-cyan-500/30 rounded">
                                            <h5 className="text-xs font-semibold text-cyan-300 mb-1">
                                              DSP Rate Breakdown
                                            </h5>
                                            <div className="grid gap-1">
                                              {Object.entries(
                                                subordinate.dspRateInfo,
                                              ).map(
                                                ([itemName, info]: [
                                                  string,
                                                  any,
                                                ]) => (
                                                  <div
                                                    key={itemName}
                                                    className="flex items-center justify-between text-xs"
                                                  >
                                                    <span className="text-cyan-200">
                                                      {itemName} ($
                                                      {info.rate.toFixed(2)}
                                                      /unit)
                                                    </span>
                                                    <span className="text-cyan-300 font-medium">
                                                      $
                                                      {info.totalEarnings.toFixed(
                                                        2,
                                                      )}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          </div>
                                        )}

                                      {/* Subordinate Hour Type Breakdown */}
                                      {subordinate.hourTypeBreakdown &&
                                        Object.keys(
                                          subordinate.hourTypeBreakdown,
                                        ).length > 0 && (
                                          <div className="mt-2">
                                            <h5 className="text-xs font-semibold text-blue-300 mb-1">
                                              Hour Type Breakdown
                                            </h5>
                                            <div className="flex flex-wrap gap-2 p-2 rounded border bg-blue-900/40 border-blue-700 mb-1">
                                              {Object.entries(
                                                subordinate.hourTypeBreakdown,
                                              )
                                                .sort(([a], [b]) => {
                                                  const order = [
                                                    "Regular Time",
                                                    "NS Regular Time",
                                                    "Overtime",
                                                    "NS Overtime",
                                                    "Double Time",
                                                    "NS Double Time",
                                                    "Travel Hours",
                                                    "Holiday",
                                                    "Stat Holiday",
                                                    "NS Stat Holiday OT",
                                                    "Stat Holiday OT",
                                                  ];
                                                  const ai = order.indexOf(a);
                                                  const bi = order.indexOf(b);
                                                  const aIndex =
                                                    ai === -1
                                                      ? 100 + a.localeCompare(b)
                                                      : ai;
                                                  const bIndex =
                                                    bi === -1
                                                      ? 100 + b.localeCompare(a)
                                                      : bi;
                                                  return aIndex - bIndex;
                                                })
                                                .map(
                                                  ([hourType, data]: [
                                                    string,
                                                    any,
                                                  ]) => {
                                                    const color =
                                                      hourType ===
                                                      "Regular Time"
                                                        ? "bg-emerald-700/40 border-emerald-500/60 text-emerald-200"
                                                        : hourType ===
                                                            "NS Regular Time"
                                                          ? "bg-emerald-700/30 border-emerald-500/50 text-emerald-200"
                                                          : hourType ===
                                                              "Overtime"
                                                            ? "bg-amber-700/40 border-amber-500/60 text-amber-200"
                                                            : hourType ===
                                                                "NS Overtime"
                                                              ? "bg-amber-700/30 border-amber-500/50 text-amber-200"
                                                              : hourType ===
                                                                  "Travel Hours"
                                                                ? "bg-sky-700/40 border-sky-500/60 text-sky-200"
                                                                : hourType ===
                                                                    "Double Time"
                                                                  ? "bg-rose-700/40 border-rose-500/60 text-rose-200"
                                                                  : hourType ===
                                                                      "NS Double Time"
                                                                    ? "bg-rose-700/30 border-rose-500/50 text-rose-200"
                                                                    : hourType ===
                                                                        "Holiday"
                                                                      ? "bg-teal-700/40 border-teal-500/60 text-teal-200"
                                                                      : hourType ===
                                                                          "Stat Holiday"
                                                                        ? "bg-violet-700/40 border-violet-500/60 text-violet-200"
                                                                        : hourType ===
                                                                            "NS Stat Holiday OT"
                                                                          ? "bg-purple-700/40 border-purple-500/60 text-purple-200"
                                                                          : hourType ===
                                                                              "Stat Holiday OT"
                                                                            ? "bg-fuchsia-700/40 border-fuchsia-500/60 text-fuchsia-200"
                                                                            : "bg-gray-700/40 border-gray-500/60 text-gray-200";
                                                    return (
                                                      <div
                                                        key={`banner-sub-${hourType}`}
                                                        className={`px-2 py-1 rounded border text-[10px] font-semibold ${color}`}
                                                      >
                                                        {data.hours.toFixed(2)}h
                                                        — {hourType}
                                                      </div>
                                                    );
                                                  },
                                                )}
                                            </div>
                                            <div className="grid gap-1">
                                              {Object.entries(
                                                subordinate.hourTypeBreakdown,
                                              )
                                                .sort(([a], [b]) => {
                                                  const order = [
                                                    "Regular Time",
                                                    "NS Regular Time",
                                                    "Overtime",
                                                    "NS Overtime",
                                                    "Double Time",
                                                    "NS Double Time",
                                                    "Travel Hours",
                                                    "Holiday",
                                                    "Stat Holiday",
                                                    "NS Stat Holiday OT",
                                                    "Stat Holiday OT",
                                                  ];
                                                  const ai = order.indexOf(a);
                                                  const bi = order.indexOf(b);
                                                  const aIndex =
                                                    ai === -1
                                                      ? 100 + a.localeCompare(b)
                                                      : ai;
                                                  const bIndex =
                                                    bi === -1
                                                      ? 100 + b.localeCompare(a)
                                                      : bi;
                                                  return aIndex - bIndex;
                                                })
                                                .map(
                                                  ([hourType, data]: [
                                                    string,
                                                    any,
                                                  ]) => (
                                                    <div
                                                      key={hourType}
                                                      className="bg-blue-800/20 rounded p-2"
                                                    >
                                                      <div className="flex items-center justify-between text-xs">
                                                        <span className="text-blue-200 font-medium">
                                                          {hourType}
                                                        </span>
                                                        <div className="text-blue-300">
                                                          {data.hours.toFixed(
                                                            2,
                                                          )}
                                                          h
                                                          {data.effectiveHours !==
                                                            data.hours && (
                                                            <span className="text-blue-400">
                                                              {" "}
                                                              (
                                                              {data.effectiveHours.toFixed(
                                                                2,
                                                              )}{" "}
                                                              eff)
                                                            </span>
                                                          )}{" "}
                                                          - $
                                                          {data.hourlyCost.toFixed(
                                                            2,
                                                          )}
                                                          {data.loaCount >
                                                            0 && (
                                                            <span className="text-yellow-400">
                                                              {" "}
                                                              + {
                                                                data.loaCount
                                                              }{" "}
                                                              LOA ($
                                                              {data.loaCost.toFixed(
                                                                2,
                                                              )}{" "}
                                                              total
                                                              {(() => {
                                                                const loaAmountDetails: Record<
                                                                  string,
                                                                  number
                                                                > =
                                                                  data.loaAmounts ||
                                                                  {};
                                                                const uniqueLoaAmounts =
                                                                  Object.keys(
                                                                    loaAmountDetails,
                                                                  )
                                                                    .map(
                                                                      (
                                                                        amount,
                                                                      ) =>
                                                                        parseFloat(
                                                                          amount,
                                                                        ),
                                                                    )
                                                                    .filter(
                                                                      (
                                                                        amount,
                                                                      ) =>
                                                                        !Number.isNaN(
                                                                          amount,
                                                                        ),
                                                                    )
                                                                    .sort(
                                                                      (a, b) =>
                                                                        a - b,
                                                                    );
                                                                const hasAdjustedLoa =
                                                                  uniqueLoaAmounts.some(
                                                                    (amount) =>
                                                                      Math.abs(
                                                                        amount -
                                                                          200,
                                                                      ) > 0.01,
                                                                  );
                                                                if (
                                                                  !hasAdjustedLoa ||
                                                                  uniqueLoaAmounts.length ===
                                                                    0
                                                                ) {
                                                                  return null;
                                                                }
                                                                const summary =
                                                                  uniqueLoaAmounts
                                                                    .map(
                                                                      (
                                                                        amount,
                                                                      ) =>
                                                                        `$${amount.toFixed(2)}`,
                                                                    )
                                                                    .join(", ");
                                                                return (
                                                                  <span className="text-amber-200">
                                                                    {" "}
                                                                    @ {summary}
                                                                  </span>
                                                                );
                                                              })()}
                                                              )
                                                            </span>
                                                          )}
                                                          {data.loaCount >
                                                            0 && (
                                                            <span className="text-blue-300">
                                                              {" "}
                                                              = $
                                                              {data.cost.toFixed(
                                                                2,
                                                              )}
                                                            </span>
                                                          )}
                                                          {subordinate.baseCostWage >
                                                            0 && (
                                                            <span className="text-yellow-300">
                                                              {" "}
                                                              ($
                                                              {subordinate.baseCostWage.toFixed(
                                                                2,
                                                              )}
                                                              /h)
                                                            </span>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Detailed entries breakdown for subordinate hour type */}
                                                      {data.rateEntries &&
                                                        data.rateEntries
                                                          .length > 0 && (
                                                          <div className="mt-1">
                                                            <div className="text-xs text-blue-400 mb-1">
                                                              Daily Breakdown (
                                                              {
                                                                data.rateEntries
                                                                  .length
                                                              }{" "}
                                                              entries):
                                                            </div>
                                                            <div className="space-y-1 max-h-24 overflow-y-auto">
                                                              {data.rateEntries.map(
                                                                (
                                                                  entry: any,
                                                                  index: number,
                                                                ) => (
                                                                  <div
                                                                    key={`${entry.date}-${index}`}
                                                                    className="text-xs bg-blue-700/20 px-2 py-1 rounded flex justify-between items-center"
                                                                  >
                                                                    <span className="text-blue-300">
                                                                      {
                                                                        entry.date
                                                                      }
                                                                      {entry.jobNumber && (
                                                                        <span className="ml-1 text-cyan-300">
                                                                          [
                                                                          {
                                                                            entry.jobNumber
                                                                          }
                                                                          ]
                                                                        </span>
                                                                      )}
                                                                    </span>
                                                                    <span className="text-blue-200">
                                                                      {entry.hours.toFixed(
                                                                        2,
                                                                      )}
                                                                      h
                                                                      {entry.effectiveHours !==
                                                                        entry.hours && (
                                                                        <span className="text-blue-400">
                                                                          {" "}
                                                                          (
                                                                          {entry.effectiveHours.toFixed(
                                                                            2,
                                                                          )}{" "}
                                                                          eff)
                                                                        </span>
                                                                      )}{" "}
                                                                      @ $
                                                                      {entry.hourlyRate.toFixed(
                                                                        2,
                                                                      )}
                                                                      /h = $
                                                                      {entry.hourlyCost.toFixed(
                                                                        2,
                                                                      )}
                                                                      {entry.loaCount >
                                                                        0 && (
                                                                        <span className="text-yellow-400">
                                                                          {" "}
                                                                          +{" "}
                                                                          {
                                                                            entry.loaCount
                                                                          }{" "}
                                                                          LOA ($
                                                                          {entry.loaCost.toFixed(
                                                                            2,
                                                                          )}{" "}
                                                                          total
                                                                          {(() => {
                                                                            const perLoaAmount =
                                                                              entry.loaCount &&
                                                                              entry.loaCount >
                                                                                0
                                                                                ? entry.loaAmount !==
                                                                                  undefined
                                                                                  ? entry.loaAmount
                                                                                  : entry.loaCost /
                                                                                    entry.loaCount
                                                                                : 0;
                                                                            const amountClass =
                                                                              Math.abs(
                                                                                perLoaAmount -
                                                                                  200,
                                                                              ) >
                                                                              0.01
                                                                                ? "text-amber-200"
                                                                                : "text-gray-300";
                                                                            return (
                                                                              <span
                                                                                className={
                                                                                  amountClass
                                                                                }
                                                                              >
                                                                                {" "}
                                                                                @
                                                                                $
                                                                                {perLoaAmount.toFixed(
                                                                                  2,
                                                                                )}
                                                                              </span>
                                                                            );
                                                                          })()}
                                                                          )
                                                                        </span>
                                                                      )}
                                                                      {entry.loaCount >
                                                                        0 && (
                                                                        <span className="text-blue-200">
                                                                          {" "}
                                                                          = $
                                                                          {entry.totalCost.toFixed(
                                                                            2,
                                                                          )}
                                                                        </span>
                                                                      )}
                                                                    </span>
                                                                  </div>
                                                                ),
                                                              )}
                                                            </div>
                                                          </div>
                                                        )}

                                                      {/* Province breakdown for subordinate hour types */}
                                                      {Object.keys(
                                                        data.provinces,
                                                      ).length > 0 && (
                                                        <div className="mt-1">
                                                          <div className="flex flex-wrap gap-1">
                                                            {Object.entries(
                                                              data.provinces,
                                                            ).map(
                                                              ([
                                                                provinceName,
                                                                provinceData,
                                                              ]: [
                                                                string,
                                                                any,
                                                              ]) => (
                                                                <div
                                                                  key={
                                                                    provinceName
                                                                  }
                                                                  className="text-xs bg-blue-700/30 px-1 py-0.5 rounded"
                                                                >
                                                                  {provinceName}
                                                                  :{" "}
                                                                  {provinceData.hours.toFixed(
                                                                    1,
                                                                  )}
                                                                  h
                                                                </div>
                                                              ),
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ),
                                                )}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {hierarchicalEmployeeSummaries.length > itemsPerPage && (
                      <div className="mt-6">
                        <PaginationControls
                          currentPage={pagination.currentPage}
                          totalPages={pagination.totalPages}
                          totalItems={pagination.totalItems}
                          pageInfo={pagination.pageInfo}
                          canGoNext={pagination.canGoNext}
                          canGoPrevious={pagination.canGoPrevious}
                          onPageChange={pagination.goToPage}
                          onNextPage={pagination.goToNextPage}
                          onPreviousPage={pagination.goToPreviousPage}
                          itemsPerPage={itemsPerPage}
                          onItemsPerPageChange={(newItemsPerPage) => {
                            setItemsPerPage(newItemsPerPage);
                            pagination.goToPage(1);
                          }}
                          itemsPerPageOptions={[5, 10, 20, 50]}
                          className="border-t border-gray-700/50 pt-4"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
