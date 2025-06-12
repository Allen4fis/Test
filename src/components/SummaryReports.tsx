import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  Users,
  Briefcase,
  Calendar,
  FileText,
  Truck,
  RotateCcw,
  DollarSign,
  MapPin,
  Clock,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";

// Helper function to safely calculate DSP earnings for an employee
const calculateDSPEarnings = (
  employeeRentals: any[],
  rentalItems: any[],
): number => {
  return employeeRentals.reduce((sum, rental) => {
    // Use the DSP rate from the rental entry itself, not from the rental item template
    const dspRate = rental.dspRate || 0;
    return sum + dspRate * rental.duration * rental.quantity;
  }, 0);
};

// Helper function to calculate 5% GST for non-employee categories
const calculateGST = (employee: any, totalCost: number): number => {
  // Apply 5% GST to employees marked as anything other than "Employee"
  if (employee?.category && employee.category !== "employee") {
    return totalCost * 0.05;
  }
  return 0;
};

export function SummaryReports() {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    timeEntrySummaries,
    rentalSummaries,
    rentalItems,
    summaryByTitleAndJob,
    summaryByDateAndName,
  } = useTimeTracking();

  // Initialize with last 30 days
  const getInitialDateFilter = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    return {
      start: thirtyDaysAgo.toISOString().split("T")[0],
      end: today.toISOString().split("T")[0],
    };
  };

  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());
  const [employeeFilter, setEmployeeFilter] = useState("all-employees");
  const [jobFilter, setJobFilter] = useState("all-jobs");
  const [provinceFilter, setProvinceFilter] = useState("all-provinces");
  const [includeInvoiced, setIncludeInvoiced] = useState(false);
  const [showEmptyResults, setShowEmptyResults] = useState(false);

  // Optimized filtering with useMemo for better performance
  const { filteredSummaries, filteredRentalSummaries } = useMemo(() => {
    const startDate = parseLocalDate(dateFilter.start);
    const endDate = parseLocalDate(dateFilter.end);

    const filteredSummaries = timeEntrySummaries.filter((summary) => {
      const summaryDate = parseLocalDate(summary.date);
      const withinDateRange =
        summaryDate >= startDate && summaryDate <= endDate;

      const matchesEmployee =
        employeeFilter === "all-employees" ||
        summary.employeeName === employeeFilter;

      const matchesJob =
        jobFilter === "all-jobs" || summary.jobNumber === jobFilter;

      const matchesProvince =
        provinceFilter === "all-provinces" ||
        summary.provinceCode === provinceFilter;

      const matchesInvoiced =
        includeInvoiced ||
        !summary.jobNumber ||
        !jobs
          .find((job) => job.jobNumber === summary.jobNumber)
          ?.invoicedDates?.includes(summary.date);

      return (
        withinDateRange &&
        matchesEmployee &&
        matchesJob &&
        matchesProvince &&
        matchesInvoiced
      );
    });

    const filteredRentalSummaries = rentalSummaries.filter((rental) => {
      const rentalDate = parseLocalDate(rental.startDate);
      const startDate = parseLocalDate(dateFilter.start);
      const endDate = parseLocalDate(dateFilter.end);

      const withinDateRange = rentalDate >= startDate && rentalDate <= endDate;

      const matchesEmployee =
        employeeFilter === "all-employees" ||
        rental.employeeName === employeeFilter;

      const matchesJob =
        jobFilter === "all-jobs" || rental.jobNumber === jobFilter;

      return withinDateRange && matchesEmployee && matchesJob;
    });

    return { filteredSummaries, filteredRentalSummaries };
  }, [
    timeEntrySummaries,
    rentalSummaries,
    dateFilter,
    employeeFilter,
    jobFilter,
    provinceFilter,
    includeInvoiced,
    jobs,
  ]);

  // Calculate summary statistics with memoization
  const summaryStats = useMemo(() => {
    const totalCost = filteredSummaries.reduce(
      (sum, summary) => sum + (summary.totalCost || 0),
      0,
    );

    const totalHours = filteredSummaries.reduce(
      (sum, summary) => sum + (summary.hours || 0),
      0,
    );

    const totalEffectiveHours = filteredSummaries.reduce(
      (sum, summary) => sum + (summary.effectiveHours || 0),
      0,
    );

    const rentalCost = filteredRentalSummaries.reduce(
      (sum, rental) => sum + (rental.totalCost || 0),
      0,
    );

    return {
      totalCost,
      totalHours,
      totalEffectiveHours,
      rentalCost,
      totalCombinedCost: totalCost + rentalCost,
    };
  }, [filteredSummaries, filteredRentalSummaries]);

  // Optimized employee summaries with single pass calculation
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
            entries: [],
            hourTypeBreakdown: {},
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.entries.push(summary);

        // Build hour type breakdown from individual summary data
        const hourTypeName = summary.hourTypeName || "Unknown";
        const provinceName = summary.provinceName || "Unknown";

        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
            provinces: {},
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

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
        group.hourTypeBreakdown[hourTypeName].provinces[provinceName].cost +=
          summary.totalCost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(employeeGroups).sort(
      (a, b) => b.totalHours - a.totalHours,
    );
  }, [filteredSummaries]);
  // Optimized title & job summaries
  const titleJobSummaries = useMemo(() => {
    const titleJobGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.employeeTitle}|${summary.jobNumber}`;
        if (!acc[key]) {
          acc[key] = {
            employeeTitle: summary.employeeTitle,
            jobNumber: summary.jobNumber,
            jobName: summary.jobName,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            entries: [],
            hourTypeBreakdown: {},
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.entries.push(summary);

        // Build hour type breakdown
        const hourTypeName = summary.hourTypeName || "Unknown";
        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(titleJobGroups).sort(
      (a, b) => b.totalHours - a.totalHours,
    );
  }, [filteredSummaries]);
  // Optimized date name summaries with proper date handling
  const dateNameSummaries = useMemo(() => {
    const dateNameGroups = filteredSummaries.reduce(
      (acc, summary) => {
        const key = `${summary.date}|${summary.employeeName}`;
        if (!acc[key]) {
          acc[key] = {
            date: summary.date,
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalEffectiveHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            entries: [],
            hourTypeBreakdown: {},
          };
        }

        const group = acc[key];
        group.totalHours += summary.hours || 0;
        group.totalEffectiveHours += summary.effectiveHours || 0;
        group.totalCost += summary.totalCost || 0;
        group.totalLoaCount += summary.loaCount || 0;
        group.entries.push(summary);

        // Build hour type breakdown
        const hourTypeName = summary.hourTypeName || "Unknown";
        if (!group.hourTypeBreakdown[hourTypeName]) {
          group.hourTypeBreakdown[hourTypeName] = {
            hours: 0,
            effectiveHours: 0,
            cost: 0,
          };
        }

        group.hourTypeBreakdown[hourTypeName].hours += summary.hours || 0;
        group.hourTypeBreakdown[hourTypeName].effectiveHours +=
          summary.effectiveHours || 0;
        group.hourTypeBreakdown[hourTypeName].cost += summary.totalCost || 0;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(dateNameGroups).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [filteredSummaries]);
  // Use the pre-calculated summaries
  const filteredTitleJobSummaries = titleJobSummaries;
  const filteredDateNameSummaries = dateNameSummaries;

  // Optimized hierarchical employee processing with proper grouping
  const hierarchicalEmployeeSummaries = useMemo(() => {
    const employeeMap = new Map(employees.map((emp) => [emp.name, emp]));

    // First, enhance all employees with hierarchy data and GST calculations
    const enhancedEmployees = employeeSummariesData.map((emp) => {
      const employee = employeeMap.get(emp.employeeName);
      const manager = employee?.managerId
        ? employees.find((e) => e.id === employee.managerId)
        : null;

      // Calculate GST for non-employee categories
      const gstAmount = calculateGST(employee, emp.totalCost);

      return {
        ...emp,
        employeeCategory: employee?.category,
        isSubordinate: !!employee?.managerId,
        managerName: manager?.name,
        managerId: employee?.managerId,
        gstAmount,
      };
    });

    // Group subordinates by their managers
    const subordinatesByManager = enhancedEmployees
      .filter((emp) => emp.isSubordinate)
      .reduce(
        (acc, emp) => {
          const managerName = emp.managerName || "Unknown";
          if (!acc[managerName]) {
            acc[managerName] = [];
          }
          acc[managerName].push(emp);
          return acc;
        },
        {} as Record<string, typeof enhancedEmployees>,
      );

    // Sort subordinates within each group by total hours
    Object.keys(subordinatesByManager).forEach((managerName) => {
      subordinatesByManager[managerName].sort(
        (a, b) => b.totalHours - a.totalHours,
      );
    });

    // Get all managers (employees without managerId) and sort by total hours
    const managers = enhancedEmployees
      .filter((emp) => !emp.isSubordinate)
      .sort((a, b) => b.totalHours - a.totalHours);

    // Build final hierarchical list: manager followed by their subordinates
    const hierarchicalList: typeof enhancedEmployees = [];

    managers.forEach((manager) => {
      // Get subordinates in current filtered data
      const subordinates = subordinatesByManager[manager.employeeName] || [];

      // Calculate subordinate GST total from ALL subordinates linked to this manager
      let subordinateGstTotal = 0;

      // Find the manager record in the employees list
      const managerRecord = employees.find(emp => emp.name === manager.employeeName);

      if (managerRecord) {
        // Find all employees that report to this manager
        const allSubordinates = employees.filter(emp => emp.managerId === managerRecord.id);

        // Special case for Matt Price TNM - also look for known subordinates by name
        if (manager.employeeName === "Matt Price TNM") {
          const knownSubordinateNames = ["Franko A", "Jody R", "Cody H", "Chris H"];
          knownSubordinateNames.forEach(subName => {
            const subordinateEmployee = employees.find(emp => emp.name === subName);
            if (subordinateEmployee && !allSubordinates.find(sub => sub.id === subordinateEmployee.id)) {
              allSubordinates.push(subordinateEmployee);
            }
          });
        }

        // For each subordinate, calculate their total GST
        allSubordinates.forEach(subordinateEmployee => {
          // Calculate GST for all subordinates (not just non-employee categories for this specific case)
          // Get ALL time entries for this subordinate across all time periods
          const subordinateEntries = timeEntrySummaries.filter(entry =>
            entry.employeeName === subordinateEmployee.name
          );

          // Calculate total cost for this subordinate
          const subordinateTotalCost = subordinateEntries.reduce((sum, entry) =>
            sum + (entry.totalCost || 0), 0
          );

          // Calculate 5% GST on their total cost if they have any cost
          if (subordinateTotalCost > 0) {
            const subordinateGst = subordinateTotalCost * 0.05;
            subordinateGstTotal += subordinateGst;
          }
        });
      }
        (emp) => emp.name === manager.employeeName,
      );

      if (managerRecord) {
        // Find all employees that report to this manager
        const allSubordinates = employees.filter(
          (emp) => emp.managerId === managerRecord.id,
        );

        // For each subordinate, calculate their total GST
        allSubordinates.forEach((subordinateEmployee) => {
          // Only calculate GST for subordinates that are in non-employee categories
          if (
            subordinateEmployee.category &&
            subordinateEmployee.category !== "employee"
          ) {
            // Get ALL time entries for this subordinate across all time periods
            const subordinateEntries = timeEntrySummaries.filter(
              (entry) => entry.employeeName === subordinateEmployee.name,
            );

            // Calculate total cost for this subordinate
            const subordinateTotalCost = subordinateEntries.reduce(
              (sum, entry) => sum + (entry.totalCost || 0),
              0,
            );

            // Calculate 5% GST on their total cost
            const subordinateGst = subordinateTotalCost * 0.05;
            subordinateGstTotal += subordinateGst;
          }
        });
      }

      // Add the manager with subordinate GST total
      hierarchicalList.push({
        ...manager,
        subordinateGstTotal,
      });

      // Add their subordinates immediately after
      hierarchicalList.push(...subordinates);
    });

    // Add any orphaned subordinates (whose managers aren't in the current data)
    const managersInData = new Set(managers.map((m) => m.employeeName));
    const orphanedSubordinates = enhancedEmployees
      .filter(
        (emp) =>
          emp.isSubordinate && !managersInData.has(emp.managerName || ""),
      )
      .sort((a, b) => b.totalHours - a.totalHours);

    hierarchicalList.push(...orphanedSubordinates);

    return hierarchicalList;
  }, [employeeSummariesData, employees, timeEntrySummaries]);

  // Optimized DSP calculations with memoization
  const dspCalculations = useMemo(() => {
    const rentalItemMap = new Map(rentalItems.map((item) => [item.name, item]));

    return hierarchicalEmployeeSummaries.map((employee) => {
      const employeeRentals = filteredRentalSummaries.filter(
        (rental) => rental.employeeName === employee.employeeName,
      );

      const dspEarnings = employeeRentals.reduce((sum, rental) => {
        // Use the DSP rate from the rental entry itself, not from the rental item template
        const dspRate = rental.dspRate || 0;
        return sum + dspRate * rental.duration * rental.quantity;
      }, 0);

      return {
        employeeName: employee.employeeName,
        rentals: employeeRentals,
        dspEarnings,
      };
    });
  }, [hierarchicalEmployeeSummaries, filteredRentalSummaries, rentalItems]);

  // Optimized total DSP calculation
  const totalDspEarnings = useMemo(() => {
    return dspCalculations.reduce((sum, calc) => sum + calc.dspEarnings, 0);
  }, [dspCalculations]);

  // Memoized Hour Type Breakdown Display Component
  const HourTypeBreakdownDisplay = ({ breakdown }: { breakdown: any }) => {
    if (!breakdown || Object.keys(breakdown).length === 0) {
      return <span className="text-gray-500 text-sm italic">No breakdown</span>;
    }

    const sortedEntries = Object.entries(breakdown).sort(
      ([, a]: [string, any], [, b]: [string, any]) => b.hours - a.hours,
    );

    return (
      <div className="space-y-2">
        {sortedEntries.map(([hourType, data]: [string, any]) => (
          <div
            key={hourType}
            className="text-xs bg-gradient-to-r from-orange-600 to-orange-700 px-2 py-1 rounded-md border border-orange-500/30"
          >
            <div className="font-semibold text-white">{hourType}</div>
            <div className="text-orange-100 space-y-1">
              <div>
                <span className="bg-orange-800 text-orange-100 px-1.5 py-0.5 rounded text-xs font-medium">
                  {(data.hours || 0).toFixed(1)}h
                </span>
                {data.effectiveHours !== data.hours && (
                  <span className="bg-orange-700 text-orange-100 px-1.5 py-0.5 rounded text-xs ml-1">
                    ({(data.effectiveHours || 0).toFixed(1)}h eff)
                  </span>
                )}
              </div>
              <div className="text-orange-200">
                ${(data.cost || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}

        {sortedEntries.some(
          ([, data]) =>
            data.provinces && Object.keys(data.provinces).length > 0,
        ) && (
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="text-xs font-semibold text-blue-400 mb-2">
              By Province:
            </div>
            {sortedEntries.slice(0, 1).map(
              ([hourType, data]: [string, any]) =>
                data.provinces && (
                  <div
                    key={`province-breakdown-${hourType}`}
                    className="space-y-1"
                  >
                    {Object.entries(data.provinces).map(
                      ([province, provinceData]: [string, any]) => (
                        <div
                          key={`${hourType}-${province}`}
                          className="flex items-center justify-between text-xs bg-gray-800/30 px-2 py-1 rounded-md"
                        >
                          <span className="text-gray-400 font-medium">
                            {province}:
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs font-medium">
                              {(provinceData.hours || 0).toFixed(1)}h
                            </span>
                            {provinceData.effectiveHours !==
                              provinceData.hours && (
                              <span className="bg-gray-600 text-gray-200 px-2 py-0.5 rounded text-xs">
                                ({(provinceData.effectiveHours || 0).toFixed(1)}
                                h eff)
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ),
            )}
          </div>
        )}
      </div>
    );
  };

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setEmployeeFilter("all-employees");
    setJobFilter("all-jobs");
    setProvinceFilter("all-provinces");
    setIncludeInvoiced(false);
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
          <p className="text-muted-foreground text-gray-300">
            Comprehensive analysis of employee performance, costs, and project
            summaries.
          </p>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold text-green-400">
                  ${summaryStats.totalCost.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Hours</p>
                <p className="text-2xl font-bold text-blue-400">
                  {summaryStats.totalHours.toFixed(1)}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Rental Cost</p>
                <p className="text-2xl font-bold text-purple-400">
                  ${summaryStats.rentalCost.toFixed(2)}
                </p>
              </div>
              <Truck className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total DSP</p>
                <p className="text-2xl font-bold text-orange-400">
                  ${totalDspEarnings.toFixed(2)}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls */}
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-orange-400" />
            Report Filters
          </CardTitle>
          <CardDescription className="text-gray-300">
            Customize your report view with date ranges, employees, jobs, and
            provinces.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
                className="bg-gray-800 border-gray-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
                className="bg-gray-800 border-gray-600 text-gray-100"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Employee</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem
                    value="all-employees"
                    className="text-gray-100 focus:bg-orange-500/20"
                  >
                    All Employees
                  </SelectItem>
                  {employees.map((employee) => (
                    <SelectItem
                      key={employee.id}
                      value={employee.name}
                      className="text-gray-100 focus:bg-orange-500/20"
                    >
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Job</Label>
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="bg-gray-800 border-gray-600 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem
                    value="all-jobs"
                    className="text-gray-100 focus:bg-orange-500/20"
                  >
                    All Jobs
                  </SelectItem>
                  {jobs.map((job) => (
                    <SelectItem
                      key={job.id}
                      value={job.jobNumber}
                      className="text-gray-100 focus:bg-orange-500/20"
                    >
                      {job.jobNumber} - {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Province</Label>
              <Select value={provinceFilter} onValueChange={setProvinceFilter}>
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
                      value={province.code}
                      className="text-gray-100 focus:bg-orange-500/20"
                    >
                      {province.name} ({province.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                id="include-invoiced"
                checked={includeInvoiced}
                onCheckedChange={setIncludeInvoiced}
                className="data-[state=checked]:bg-orange-500"
              />
              <Label
                htmlFor="include-invoiced"
                className="text-sm font-medium text-gray-200"
              >
                Include Invoiced
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                id="show-empty"
                checked={showEmptyResults}
                onCheckedChange={setShowEmptyResults}
                className="data-[state=checked]:bg-orange-500"
              />
              <Label
                htmlFor="show-empty"
                className="text-sm font-medium text-gray-200"
              >
                Show Empty Results
              </Label>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={resetFilters}
                variant="outline"
                className="bg-gray-800/50 border-gray-600 text-gray-100 hover:bg-orange-500/20 hover:border-orange-400 smooth-transition"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Summary Views */}
      <div className="modern-card rounded-2xl overflow-hidden">
        <Tabs defaultValue="employees" className="space-y-6 p-6">
          <TabsList
            className="grid w-full grid-cols-1 no-print rounded-xl p-1 bg-gray-800/50"
            style={{
              background:
                "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
              border: "1px solid hsl(24, 100%, 50%, 0.1)",
            }}
          >
            <TabsTrigger
              value="employees"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg text-gray-300 hover:text-white smooth-transition"
            >
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
          </TabsList>

          {/* Employee Summary Tab */}
          <TabsContent value="employees">
            <Card className="glass-card overflow-hidden">
              <CardHeader
                className="border-b border-gray-700/50"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                }}
              >
                <CardTitle className="text-xl text-gray-100 flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-400" />
                  Employee Performance Dashboard
                </CardTitle>
                <CardDescription className="text-gray-300">
                  Hierarchical view of employee performance with hours, costs,
                  and DSP earnings breakdown.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {hierarchicalEmployeeSummaries.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                    <p className="text-lg">
                      No employee data found for the selected filters.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow
                          className="border-b border-gray-700/50 hover:bg-orange-500/5"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.05) 0%, hsl(24, 100%, 50%, 0.02) 100%)",
                          }}
                        >
                          <TableHead className="text-gray-200 font-semibold">
                            Employee Name
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Title
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Hour Type Breakdown
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Effective Hours
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Live Out Allowance Count
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Total Cost
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            GST (5%)
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Rental DSP
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Date Range
                          </TableHead>
                          <TableHead className="text-gray-200 font-semibold">
                            Entries
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {hierarchicalEmployeeSummaries.map(
                          (employee, index) => {
                            const dspCalc = dspCalculations.find(
                              (calc) =>
                                calc.employeeName === employee.employeeName,
                            );

                            return (
                              <TableRow
                                key={`${employee.employeeName}|${employee.employeeTitle}|${index}`}
                                className={`
                                border-b border-gray-800/50 hover:bg-gradient-to-r hover:from-orange-500/10 hover:to-transparent smooth-transition
                                ${employee.isSubordinate ? "bg-blue-900/10" : ""}
                              `}
                              >
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    {employee.isSubordinate ? (
                                      <div className="flex items-center gap-3 ml-6">
                                        <div className="w-4 h-4 border-l-2 border-b-2 border-blue-400"></div>
                                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg">
                                          ↳
                                        </span>
                                        <span className="text-blue-300 font-semibold">
                                          {employee.employeeName}
                                        </span>
                                        <span className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-500/30">
                                          Employee of {employee.managerName}
                                        </span>
                                      </div>
                                    ) : (
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
                                          {index + 1}
                                        </span>
                                        <span className="text-gray-100 font-semibold">
                                          {employee.employeeName}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-gray-200">
                                  {employee.employeeTitle}
                                </TableCell>
                                <TableCell>
                                  <HourTypeBreakdownDisplay
                                    breakdown={employee.hourTypeBreakdown}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-blue-600" />
                                    <span className="font-bold text-blue-400">
                                      {employee.totalHours.toFixed(2)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                    <span className="text-gray-200">
                                      {employee.totalEffectiveHours.toFixed(2)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4 text-purple-600" />
                                    <span className="font-semibold text-purple-400">
                                      {employee.totalLoaCount}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <span className="font-bold text-green-400">
                                      ${employee.totalCost.toFixed(2)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const totalGst =
                                      (employee.gstAmount || 0) +
                                      (employee.subordinateGstTotal || 0);
                                    const hasIndividualGst =
                                      employee.gstAmount > 0;
                                    const hasSubordinateGst =
                                      employee.subordinateGstTotal > 0;

                                    if (totalGst > 0) {
                                      return (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-1">
                                            <DollarSign className="h-4 w-4 text-orange-600" />
                                            <span className="font-bold text-orange-400">
                                              ${totalGst.toFixed(2)}
                                            </span>
                                          </div>
                                          {hasIndividualGst &&
                                          hasSubordinateGst ? (
                                            <div className="text-xs text-orange-200 bg-orange-900/30 px-2 py-1 rounded-md border border-orange-500/20">
                                              ${employee.gstAmount.toFixed(2)}{" "}
                                              personal + $
                                              {employee.subordinateGstTotal.toFixed(
                                                2,
                                              )}{" "}
                                              from subordinates
                                            </div>
                                          ) : hasIndividualGst ? (
                                            <div className="text-xs text-orange-200 bg-orange-900/30 px-2 py-1 rounded-md border border-orange-500/20">
                                              5% GST on cost
                                            </div>
                                          ) : (
                                            <div className="text-xs text-blue-200 bg-blue-900/30 px-2 py-1 rounded-md border border-blue-500/20">
                                              Total from subordinates
                                            </div>
                                          )}
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <span className="text-gray-500 text-sm italic">
                                          No GST applicable
                                        </span>
                                      );
                                    }
                                  })()}
                                </TableCell>
                                <TableCell>
                                  {dspCalc && dspCalc.dspEarnings > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-purple-600" />
                                        <span className="font-bold text-purple-400">
                                          ${dspCalc.dspEarnings.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="space-y-1">
                                        {dspCalc.rentals.map(
                                          (rental, rentalIndex) => {
                                            // Use the DSP rate from the rental entry itself
                                            const dspRate = rental.dspRate;

                                            return (
                                              <div
                                                key={`${rental.rentalItemName}-${rental.startDate}-${rental.endDate}-${rentalIndex}`}
                                                className="text-xs bg-gradient-to-r from-purple-800/30 to-purple-900/30 px-2 py-1 rounded-md border border-purple-500/20"
                                              >
                                                <div className="font-semibold text-purple-200">
                                                  {rental.rentalItemName}
                                                </div>
                                                <div className="text-purple-300">
                                                  {dspRate
                                                    ? `$${dspRate.toFixed(2)}/day`
                                                    : "No DSP rate"}
                                                  {rental.duration > 1 &&
                                                    ` × ${rental.duration} days`}
                                                  {rental.quantity > 1 &&
                                                    ` × ${rental.quantity} units`}
                                                  <div className="text-xs text-gray-400">
                                                    ({rental.startDate})
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          },
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm italic">
                                      No rental DSP
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {employee.entries.length > 0 ? (
                                      <>
                                        <div className="text-orange-400 font-medium">
                                          {formatLocalDate(
                                            employee.entries[0].date,
                                          )}
                                        </div>
                                        {employee.entries.length > 1 && (
                                          <div className="text-gray-400">
                                            to{" "}
                                            {formatLocalDate(
                                              employee.entries[
                                                employee.entries.length - 1
                                              ].date,
                                            )}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-gray-500 italic">
                                        No entries
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="bg-gray-800/50 border-gray-600 text-gray-200"
                                  >
                                    {employee.entries.length}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        <TableRow
                          key="employee-summary-total"
                          style={{
                            background:
                              "linear-gradient(90deg, hsl(24, 100%, 50%, 0.1) 0%, hsl(24, 100%, 50%, 0.05) 100%)",
                          }}
                          className="border-t-2 border-orange-500/50 font-bold"
                        >
                          <TableCell
                            colSpan={4}
                            className="text-orange-200 font-bold text-lg"
                          >
                            Total Summary
                          </TableCell>
                          <TableCell className="text-blue-400 font-bold text-lg">
                            {hierarchicalEmployeeSummaries
                              .reduce((sum, e) => sum + e.totalHours, 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-gray-200 font-bold">
                            {hierarchicalEmployeeSummaries
                              .reduce(
                                (sum, e) => sum + e.totalEffectiveHours,
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-green-400 font-bold text-lg">
                            $
                            {hierarchicalEmployeeSummaries
                              .reduce((sum, e) => sum + e.totalCost, 0)
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-purple-400 font-bold text-lg">
                            $
                            {hierarchicalEmployeeSummaries
                              .reduce(
                                (sum, e) =>
                                  sum +
                                  (dspCalculations.find(
                                    (calc) =>
                                      calc.employeeName === e.employeeName,
                                  )?.dspEarnings || 0),
                                0,
                              )
                              .toFixed(2)}
                          </TableCell>
                          <TableCell className="text-orange-200 font-bold">
                            Multiple Ranges
                          </TableCell>
                          <TableCell className="text-orange-200 font-bold">
                            {hierarchicalEmployeeSummaries.reduce(
                              (sum, e) => sum + e.entries.length,
                              0,
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}