import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  FileText,
  Calendar,
  DollarSign,
  Users,
  Briefcase,
  Clock,
  Truck,
  Calculator,
  TrendingUp,
  AlertCircle,
  PieChart,
  BarChart3,
} from "lucide-react";

import { useTimeTracking } from "@/hooks/useTimeTracking";

// Helper function to get local date string in YYYY-MM-DD format
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Calculate rental duration
const calculateDuration = (
  startDate: string,
  endDate: string,
  unit: string,
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());

  switch (unit) {
    case "hour":
      return Math.ceil(diffTime / (1000 * 60 * 60));
    case "day":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    case "week":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    case "month":
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    default:
      return 1;
  }
};

// Calculate GST for DSPs and contractors
const calculateGST = (employee: any, amount: number): number => {
  // Apply 5% GST to DSPs and contractors (anyone not explicitly marked as "employee")
  if (employee?.category === "dsp") {
    return amount * 0.05;
  }
  // Also apply GST to employees who have managers but no explicit category (subordinate contractors)
  if (
    employee?.managerId &&
    employee?.category !== "employee" &&
    !employee?.category
  ) {
    return amount * 0.05;
  }
  return 0;
};

export function DataExport() {
  const {
    employees,
    jobs,
    timeEntries,
    rentalItems,
    rentalEntries,
    hourTypes,
    provinces,
  } = useTimeTracking();

  const [dateRange, setDateRange] = useState({
    startDate: getLocalDateString(new Date(new Date().getFullYear(), 0, 1)), // Start of year
    endDate: getLocalDateString(),
  });

  const [exportFormat, setExportFormat] = useState("comprehensive");

  // Filter data by date range
  const filteredTimeEntries = useMemo(() => {
    return timeEntries.filter(
      (entry) =>
        entry.date >= dateRange.startDate && entry.date <= dateRange.endDate,
    );
  }, [timeEntries, dateRange]);

  const filteredRentalEntries = useMemo(() => {
    return rentalEntries.filter(
      (entry) =>
        entry.startDate >= dateRange.startDate &&
        entry.startDate <= dateRange.endDate,
    );
  }, [rentalEntries, dateRange]);

  // Calculate detailed summaries
  const detailedTimeEntries = useMemo(() => {
    return filteredTimeEntries.map((entry) => {
      const employee = employees.find((emp) => emp.id === entry.employeeId);
      const job = jobs.find((j) => j.id === entry.jobId);
      const hourType = hourTypes.find((ht) => ht.id === entry.hourTypeId);
      const province = provinces.find((p) => p.id === entry.provinceId);

      const effectiveHours = entry.hours * (hourType?.multiplier || 1);
      const laborCost = effectiveHours * entry.costWageUsed;
      const billableAmount = effectiveHours * entry.billableWageUsed;
      const gstAmount = calculateGST(employee, billableAmount);

      return {
        ...entry,
        employeeName: employee?.name || "Unknown",
        employeeTitle: employee?.title || "Unknown",
        employeeCategory: employee?.category || "employee",
        managerId: employee?.managerId,
        jobNumber: job?.jobNumber || "Unknown",
        jobName: job?.name || "Unknown Job",
        jobIsBillable: job?.isBillable ?? true,
        hourTypeName: hourType?.name || "Regular",
        hourTypeMultiplier: hourType?.multiplier || 1,
        provinceName: province?.name || "Unknown",
        provinceCode: province?.code || "XX",
        effectiveHours,
        laborCost,
        billableAmount,
        gstAmount,
        totalWithGST: billableAmount + gstAmount,
        profit: billableAmount - laborCost,
        isInvoiced: job?.invoicedDates?.includes(entry.date) || false,
      };
    });
  }, [filteredTimeEntries, employees, jobs, hourTypes, provinces]);

  const detailedRentalEntries = useMemo(() => {
    return filteredRentalEntries.map((entry) => {
      const item = rentalItems.find((item) => item.id === entry.rentalItemId);
      const job = jobs.find((j) => j.id === entry.jobId);
      const employee = entry.employeeId
        ? employees.find((emp) => emp.id === entry.employeeId)
        : null;

      const duration = calculateDuration(
        entry.startDate,
        entry.endDate,
        entry.billingUnit,
      );
      const totalCost = duration * entry.quantity * entry.rateUsed;

      return {
        ...entry,
        itemName: item?.name || "Unknown Item",
        itemCategory: item?.category || "Unknown",
        jobNumber: job?.jobNumber || "Unknown",
        jobName: job?.name || "Unknown Job",
        jobIsBillable: job?.isBillable ?? true,
        employeeName: employee?.name || "Unassigned",
        duration,
        totalCost,
        isInvoiced: job?.invoicedDates?.includes(entry.startDate) || false,
      };
    });
  }, [filteredRentalEntries, rentalItems, jobs, employees]);

  // Enhanced summary calculations with tax considerations
  const summary = useMemo(() => {
    // Separate billable vs non-billable calculations
    const billableTimeEntries = detailedTimeEntries.filter(
      (entry) => entry.jobIsBillable,
    );
    const nonBillableTimeEntries = detailedTimeEntries.filter(
      (entry) => !entry.jobIsBillable,
    );
    const billableRentalEntries = detailedRentalEntries.filter(
      (entry) => entry.jobIsBillable,
    );
    const nonBillableRentalEntries = detailedRentalEntries.filter(
      (entry) => !entry.jobIsBillable,
    );

    // Billable calculations
    const totalBillableLaborHours = billableTimeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0,
    );
    const totalBillableEffectiveHours = billableTimeEntries.reduce(
      (sum, entry) => sum + entry.effectiveHours,
      0,
    );
    const totalBillableLaborCost = billableTimeEntries.reduce(
      (sum, entry) => sum + entry.laborCost,
      0,
    );
    const totalBillableAmount = billableTimeEntries.reduce(
      (sum, entry) => sum + entry.billableAmount,
      0,
    );
    const totalBillableGST = billableTimeEntries.reduce(
      (sum, entry) => sum + entry.gstAmount,
      0,
    );
    const totalBillableRentalRevenue = billableRentalEntries.reduce(
      (sum, entry) => sum + entry.totalCost,
      0,
    );

    // Non-billable calculations (cost tracking only)
    const totalNonBillableLaborHours = nonBillableTimeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0,
    );
    const totalNonBillableEffectiveHours = nonBillableTimeEntries.reduce(
      (sum, entry) => sum + entry.effectiveHours,
      0,
    );
    const totalNonBillableLaborCost = nonBillableTimeEntries.reduce(
      (sum, entry) => sum + entry.laborCost,
      0,
    );
    const totalNonBillableRentalCost = nonBillableRentalEntries.reduce(
      (sum, entry) => sum + entry.totalCost,
      0,
    );

    // Combined totals
    const totalLaborHours =
      totalBillableLaborHours + totalNonBillableLaborHours;
    const totalEffectiveHours =
      totalBillableEffectiveHours + totalNonBillableEffectiveHours;
    const totalLaborCost = totalBillableLaborCost + totalNonBillableLaborCost;
    const totalRentalCost =
      totalBillableRentalRevenue + totalNonBillableRentalCost;
    const totalBillableRevenue =
      totalBillableAmount + totalBillableRentalRevenue;
    const totalNonBillableCost =
      totalNonBillableLaborCost + totalNonBillableRentalCost;
    const totalCombinedCost = totalLaborCost + totalRentalCost;
    const totalProfit = totalBillableRevenue - totalBillableLaborCost;

    // Tax breakdowns by employee category and province
    const employeeCategoriesByProvince = employees.reduce(
      (acc, emp) => {
        const category = emp.category || "employee";
        const empEntries = billableTimeEntries.filter(
          (e) => e.employeeId === emp.id,
        );

        // Group entries by province for this employee
        const entriesByProvince = empEntries.reduce(
          (provAcc, entry) => {
            const province = provinces.find((p) => p.id === entry.provinceId);
            const provinceName = province?.name || "Unknown Province";

            if (!provAcc[provinceName]) {
              provAcc[provinceName] = { cost: 0, revenue: 0, gst: 0, hours: 0 };
            }
            provAcc[provinceName].cost += entry.laborCost;
            provAcc[provinceName].revenue += entry.billableAmount;
            provAcc[provinceName].gst += entry.gstAmount;
            provAcc[provinceName].hours += entry.hours;
            return provAcc;
          },
          {} as Record<
            string,
            { cost: number; revenue: number; gst: number; hours: number }
          >,
        );

        // Add to category totals for each province
        Object.entries(entriesByProvince).forEach(([provinceName, data]) => {
          const key = `${category}-${provinceName}`;
          if (!acc[key]) {
            acc[key] = {
              category,
              province: provinceName,
              cost: 0,
              revenue: 0,
              gst: 0,
              count: 0,
              hours: 0,
            };
          }
          acc[key].cost += data.cost;
          acc[key].revenue += data.revenue;
          acc[key].gst += data.gst;
          acc[key].hours += data.hours;
          acc[key].count += 1; // Count employees who worked in this province
        });

        return acc;
      },
      {} as Record<
        string,
        {
          category: string;
          province: string;
          cost: number;
          revenue: number;
          gst: number;
          count: number;
          hours: number;
        }
      >,
    );

    // Legacy format for backward compatibility (aggregated by category only)
    const employeeCategories = Object.values(
      employeeCategoriesByProvince,
    ).reduce(
      (acc, item) => {
        if (!acc[item.category]) {
          acc[item.category] = {
            cost: 0,
            revenue: 0,
            gst: 0,
            count: 0,
            hours: 0,
          };
        }
        acc[item.category].cost += item.cost;
        acc[item.category].revenue += item.revenue;
        acc[item.category].gst += item.gst;
        acc[item.category].hours += item.hours;
        // Note: count is handled differently for province breakdown
        return acc;
      },
      {} as Record<
        string,
        {
          cost: number;
          revenue: number;
          gst: number;
          count: number;
          hours: number;
        }
      >,
    );

    // Calculate unique employee counts per category
    Object.keys(employeeCategories).forEach((category) => {
      employeeCategories[category].count = employees.filter(
        (emp) => (emp.category || "employee") === category,
      ).length;
    });

    // Province breakdown
    const provinceBreakdown = provinces.reduce(
      (acc, prov) => {
        const provEntries = billableTimeEntries.filter(
          (e) => e.provinceId === prov.id,
        );
        const cost = provEntries.reduce((sum, e) => sum + e.laborCost, 0);
        const revenue = provEntries.reduce(
          (sum, e) => sum + e.billableAmount,
          0,
        );
        const hours = provEntries.reduce((sum, e) => sum + e.hours, 0);

        if (hours > 0) {
          acc[prov.name] = { cost, revenue, hours, code: prov.code };
        }
        return acc;
      },
      {} as Record<
        string,
        { cost: number; revenue: number; hours: number; code: string }
      >,
    );

    // Monthly breakdown
    const monthlyBreakdown = filteredTimeEntries.reduce(
      (acc, entry) => {
        const month = entry.date.substring(0, 7); // YYYY-MM format
        const detailedEntry = detailedTimeEntries.find(
          (de) => de.id === entry.id,
        );
        if (!detailedEntry) return acc;

        if (!acc[month]) {
          acc[month] = {
            cost: 0,
            revenue: 0,
            hours: 0,
            billableRevenue: 0,
            nonBillableCost: 0,
          };
        }

        acc[month].cost += detailedEntry.laborCost;
        acc[month].hours += detailedEntry.hours;

        if (detailedEntry.jobIsBillable) {
          acc[month].billableRevenue += detailedEntry.billableAmount;
        } else {
          acc[month].nonBillableCost += detailedEntry.laborCost;
        }

        return acc;
      },
      {} as Record<
        string,
        {
          cost: number;
          revenue: number;
          hours: number;
          billableRevenue: number;
          nonBillableCost: number;
        }
      >,
    );

    // Invoiced vs Non-invoiced breakdown
    const invoicedLaborAmount = billableTimeEntries
      .filter((entry) => entry.isInvoiced)
      .reduce((sum, entry) => sum + entry.billableAmount, 0);
    const invoicedGST = billableTimeEntries
      .filter((entry) => entry.isInvoiced)
      .reduce((sum, entry) => sum + entry.gstAmount, 0);
    const invoicedRentalAmount = billableRentalEntries
      .filter((entry) => entry.isInvoiced)
      .reduce((sum, entry) => sum + entry.totalCost, 0);
    const uninvoicedLaborAmount = totalBillableAmount - invoicedLaborAmount;
    const uninvoicedGST = totalBillableGST - invoicedGST;
    const uninvoicedRentalAmount =
      totalBillableRentalRevenue - invoicedRentalAmount;

    return {
      // Billable totals
      totalBillableLaborHours,
      totalBillableEffectiveHours,
      totalBillableLaborCost,
      totalBillableAmount,
      totalBillableGST,
      totalBillableRentalRevenue,
      totalBillableRevenue,

      // Non-billable totals
      totalNonBillableLaborHours,
      totalNonBillableEffectiveHours,
      totalNonBillableLaborCost,
      totalNonBillableRentalCost,
      totalNonBillableCost,

      // Combined totals
      totalLaborHours,
      totalEffectiveHours,
      totalLaborCost,
      totalRentalCost,
      totalCombinedCost,
      totalProfit,
      profitMargin:
        totalBillableRevenue > 0
          ? (totalProfit / totalBillableRevenue) * 100
          : 0,

      // Invoice status
      invoicedAmount: invoicedLaborAmount + invoicedRentalAmount,
      uninvoicedAmount: uninvoicedLaborAmount + uninvoicedRentalAmount,
      invoicedLaborAmount,
      invoicedGST,
      invoicedRentalAmount,
      uninvoicedLaborAmount,
      uninvoicedGST,
      uninvoicedRentalAmount,

      // Detailed breakdowns
      employeeCategories,
      provinceBreakdown,
      monthlyBreakdown,
    };
  }, [
    detailedTimeEntries,
    detailedRentalEntries,
    employees,
    provinces,
    filteredTimeEntries,
  ]);

  // Export functions
  const generateCSV = () => {
    const csvData = [];

    // Header information
    csvData.push(["4Front Trackity-doo - COMPREHENSIVE ACCOUNTANT REPORT"]);
    csvData.push([
      `Date Range: ${dateRange.startDate} to ${dateRange.endDate}`,
    ]);
    csvData.push([`Generated: ${new Date().toLocaleString()}`]);
    csvData.push([
      `Report Type: ${exportFormat === "comprehensive" ? "Full Detail" : "Summary Only"}`,
    ]);
    csvData.push([""]);

    // EXECUTIVE SUMMARY
    csvData.push(["EXECUTIVE FINANCIAL SUMMARY"]);
    csvData.push(["Category", "Amount", "Notes"]);
    csvData.push([
      "Total Billable Revenue",
      `$${summary.totalBillableRevenue.toFixed(2)}`,
      "Revenue from billable work",
    ]);
    csvData.push([
      "Total Billable Labor Cost",
      `$${summary.totalBillableLaborCost.toFixed(2)}`,
      "Direct labor costs for billable work",
    ]);
    csvData.push([
      "Total Non-Billable Cost",
      `$${summary.totalNonBillableCost.toFixed(2)}`,
      "Internal/overhead costs",
    ]);
    csvData.push([
      "Total Combined Costs",
      `$${summary.totalCombinedCost.toFixed(2)}`,
      "All labor and rental costs",
    ]);
    csvData.push([
      "Net Profit (Billable)",
      `$${summary.totalProfit.toFixed(2)}`,
      "Billable revenue minus billable costs",
    ]);
    csvData.push([
      "Profit Margin",
      `${summary.profitMargin.toFixed(2)}%`,
      "Profit as % of billable revenue",
    ]);
    csvData.push([
      "Total GST Collected",
      `$${summary.totalBillableGST.toFixed(2)}`,
      "5% GST on contractor/DSP payments",
    ]);
    csvData.push([""]);

    // BILLABLE VS NON-BILLABLE BREAKDOWN
    csvData.push(["BILLABLE VS NON-BILLABLE BREAKDOWN"]);
    csvData.push(["Type", "Labor Hours", "Labor Cost", "Revenue/Cost", "GST"]);
    csvData.push([
      "Billable Work",
      summary.totalBillableLaborHours.toFixed(2),
      `$${summary.totalBillableLaborCost.toFixed(2)}`,
      `$${summary.totalBillableRevenue.toFixed(2)}`,
      `$${summary.totalBillableGST.toFixed(2)}`,
    ]);
    csvData.push([
      "Non-Billable Work",
      summary.totalNonBillableLaborHours.toFixed(2),
      `$${summary.totalNonBillableLaborCost.toFixed(2)}`,
      "Cost Only",
      "$0.00",
    ]);
    csvData.push([""]);

    // TAX COMPLIANCE - EMPLOYEE CATEGORY BREAKDOWN BY PROVINCE
    csvData.push(["TAX COMPLIANCE - EMPLOYEE CATEGORY BREAKDOWN BY PROVINCE"]);
    csvData.push([
      "Category",
      "Province",
      "Employee Count",
      "Hours",
      "Labor Cost",
      "Revenue",
      "GST Collected",
      "Tax Treatment",
    ]);

    // Sort by category, then by province for better readability
    const sortedCategoryData = Object.values(
      summary.employeeCategoriesByProvince,
    ).sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.province.localeCompare(b.province);
    });

    sortedCategoryData.forEach((data) => {
      csvData.push([
        data.category === "dsp"
          ? "DSP (Contractor)"
          : data.category === "employee"
            ? "Employee (T4)"
            : "Contractor",
        data.province,
        data.count.toString(),
        data.hours.toFixed(2),
        `$${data.cost.toFixed(2)}`,
        `$${data.revenue.toFixed(2)}`,
        `$${data.gst.toFixed(2)}`,
        data.category === "employee"
          ? "T4 Employment Income"
          : "T4A Other Income + GST",
      ]);
    });
    csvData.push([""]);

    // TAX COMPLIANCE - CATEGORY SUMMARY (Totals across all provinces)
    csvData.push(["TAX COMPLIANCE - CATEGORY SUMMARY"]);
    csvData.push([
      "Category",
      "Total Employee Count",
      "Total Hours",
      "Total Labor Cost",
      "Total Revenue",
      "Total GST Collected",
      "Tax Treatment",
    ]);
    Object.entries(summary.employeeCategories).forEach(([category, data]) => {
      csvData.push([
        category === "dsp"
          ? "DSP (Contractor)"
          : category === "employee"
            ? "Employee (T4)"
            : "Contractor",
        data.count.toString(),
        data.hours.toFixed(2),
        `$${data.cost.toFixed(2)}`,
        `$${data.revenue.toFixed(2)}`,
        `$${data.gst.toFixed(2)}`,
        category === "employee"
          ? "T4 Employment Income"
          : "T4A Other Income + GST",
      ]);
    });
    csvData.push([""]);

    // PROVINCIAL BREAKDOWN
    csvData.push(["PROVINCIAL BREAKDOWN"]);
    csvData.push(["Province", "Code", "Hours", "Labor Cost", "Revenue"]);
    Object.entries(summary.provinceBreakdown).forEach(([province, data]) => {
      csvData.push([
        province,
        data.code,
        data.hours.toFixed(2),
        `$${data.cost.toFixed(2)}`,
        `$${data.revenue.toFixed(2)}`,
      ]);
    });
    csvData.push([""]);

    // MONTHLY BREAKDOWN
    csvData.push(["MONTHLY BREAKDOWN"]);
    csvData.push([
      "Month",
      "Total Hours",
      "Total Cost",
      "Billable Revenue",
      "Non-Billable Cost",
      "Net Profit",
    ]);
    Object.entries(summary.monthlyBreakdown)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([month, data]) => {
        csvData.push([
          month,
          data.hours.toFixed(2),
          `$${data.cost.toFixed(2)}`,
          `$${data.billableRevenue.toFixed(2)}`,
          `$${data.nonBillableCost.toFixed(2)}`,
          `$${(data.billableRevenue - data.cost).toFixed(2)}`,
        ]);
      });
    csvData.push([""]);

    // INVOICE STATUS ANALYSIS
    csvData.push(["INVOICE STATUS ANALYSIS"]);
    csvData.push(["Status", "Labor Revenue", "GST", "Rental Revenue", "Total"]);
    csvData.push([
      "Invoiced (Billed)",
      `$${summary.invoicedLaborAmount.toFixed(2)}`,
      `$${summary.invoicedGST.toFixed(2)}`,
      `$${summary.invoicedRentalAmount.toFixed(2)}`,
      `$${summary.invoicedAmount.toFixed(2)}`,
    ]);
    csvData.push([
      "Uninvoiced (Pending)",
      `$${summary.uninvoicedLaborAmount.toFixed(2)}`,
      `$${summary.uninvoicedGST.toFixed(2)}`,
      `$${summary.uninvoicedRentalAmount.toFixed(2)}`,
      `$${summary.uninvoicedAmount.toFixed(2)}`,
    ]);
    csvData.push([""]);

    if (exportFormat === "comprehensive") {
      // DETAILED TIME ENTRIES
      csvData.push(["DETAILED TIME ENTRIES"]);
      csvData.push([
        "Date",
        "Employee",
        "Title",
        "Category",
        "Job Number",
        "Job Name",
        "Job Type",
        "Hour Type",
        "Province",
        "Hours",
        "Effective Hours",
        "Cost Wage",
        "Billable Wage",
        "Labor Cost",
        "Billable Amount",
        "GST",
        "Total w/ GST",
        "Profit",
        "Invoiced",
        "Description",
      ]);

      detailedTimeEntries.forEach((entry) => {
        csvData.push([
          entry.date,
          entry.employeeName,
          entry.employeeTitle,
          entry.employeeCategory === "dsp"
            ? "DSP"
            : entry.employeeCategory === "employee"
              ? "Employee"
              : "Contractor",
          entry.jobNumber,
          entry.jobName,
          entry.jobIsBillable ? "Billable" : "Non-Billable",
          entry.hourTypeName,
          entry.provinceCode,
          entry.hours,
          entry.effectiveHours.toFixed(2),
          `$${entry.costWageUsed.toFixed(2)}`,
          `$${entry.billableWageUsed.toFixed(2)}`,
          `$${entry.laborCost.toFixed(2)}`,
          `$${entry.billableAmount.toFixed(2)}`,
          `$${entry.gstAmount.toFixed(2)}`,
          `$${entry.totalWithGST.toFixed(2)}`,
          `$${entry.profit.toFixed(2)}`,
          entry.isInvoiced ? "Yes" : "No",
          entry.description || "",
        ]);
      });

      csvData.push([""]);

      // DETAILED RENTAL ENTRIES
      csvData.push(["DETAILED RENTAL ENTRIES"]);
      csvData.push([
        "Start Date",
        "End Date",
        "Item Name",
        "Category",
        "Job Number",
        "Job Name",
        "Job Type",
        "Employee",
        "Quantity",
        "Duration",
        "Unit",
        "Rate",
        "Total Cost",
        "Invoiced",
        "Description",
      ]);

      detailedRentalEntries.forEach((entry) => {
        csvData.push([
          entry.startDate,
          entry.endDate,
          entry.itemName,
          entry.itemCategory,
          entry.jobNumber,
          entry.jobName,
          entry.jobIsBillable ? "Billable" : "Non-Billable",
          entry.employeeName,
          entry.quantity,
          entry.duration,
          entry.billingUnit,
          `$${entry.rateUsed.toFixed(2)}`,
          `$${entry.totalCost.toFixed(2)}`,
          entry.isInvoiced ? "Yes" : "No",
          entry.description || "",
        ]);
      });

      csvData.push([""]);
    }

    // EMPLOYEE SUMMARY FOR PAYROLL
    csvData.push(["EMPLOYEE SUMMARY FOR PAYROLL"]);
    csvData.push([
      "Employee",
      "Title",
      "Category",
      "Hours",
      "Effective Hours",
      "Cost",
      "Revenue",
      "GST",
      "Profit",
    ]);

    employees.forEach((employee) => {
      const employeeEntries = detailedTimeEntries.filter(
        (e) => e.employeeId === employee.id,
      );
      const hours = employeeEntries.reduce((sum, e) => sum + e.hours, 0);
      const effectiveHours = employeeEntries.reduce(
        (sum, e) => sum + e.effectiveHours,
        0,
      );
      const cost = employeeEntries.reduce((sum, e) => sum + e.laborCost, 0);
      const revenue = employeeEntries.reduce(
        (sum, e) => sum + e.billableAmount,
        0,
      );
      const gst = employeeEntries.reduce((sum, e) => sum + e.gstAmount, 0);
      const profit = revenue - cost;

      if (hours > 0) {
        csvData.push([
          employee.name,
          employee.title,
          employee.category === "dsp"
            ? "DSP"
            : employee.category === "employee"
              ? "Employee"
              : "Contractor",
          hours.toFixed(2),
          effectiveHours.toFixed(2),
          `$${cost.toFixed(2)}`,
          `$${revenue.toFixed(2)}`,
          `$${gst.toFixed(2)}`,
          `$${profit.toFixed(2)}`,
        ]);
      }
    });

    csvData.push([""]);

    // JOB PROFITABILITY ANALYSIS
    csvData.push(["JOB PROFITABILITY ANALYSIS"]);
    csvData.push([
      "Job Number",
      "Job Name",
      "Type",
      "Labor Hours",
      "Labor Cost",
      "Labor Revenue",
      "Rental Revenue",
      "Total Revenue",
      "Gross Profit",
      "Profit Margin %",
    ]);

    jobs.forEach((job) => {
      const jobTimeEntries = detailedTimeEntries.filter(
        (e) => e.jobId === job.id,
      );
      const jobRentalEntries = detailedRentalEntries.filter(
        (e) => e.jobId === job.id,
      );

      const laborHours = jobTimeEntries.reduce((sum, e) => sum + e.hours, 0);
      const laborCost = jobTimeEntries.reduce((sum, e) => sum + e.laborCost, 0);
      const laborRevenue = jobTimeEntries.reduce(
        (sum, e) => sum + e.billableAmount,
        0,
      );
      const rentalRevenue = jobRentalEntries.reduce(
        (sum, e) => sum + e.totalCost,
        0,
      );
      const totalRevenue = laborRevenue + rentalRevenue;
      const profit = job.isBillable ? totalRevenue - laborCost : 0;
      const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

      if (laborHours > 0 || rentalRevenue > 0) {
        csvData.push([
          job.jobNumber,
          job.name,
          (job.isBillable ?? true) ? "Billable" : "Non-Billable",
          laborHours.toFixed(2),
          `$${laborCost.toFixed(2)}`,
          `$${laborRevenue.toFixed(2)}`,
          `$${rentalRevenue.toFixed(2)}`,
          `$${totalRevenue.toFixed(2)}`,
          `$${profit.toFixed(2)}`,
          `${profitMargin.toFixed(1)}%`,
        ]);
      }
    });

    csvData.push([""]);
    csvData.push(["REPORT NOTES FOR ACCOUNTANT"]);
    csvData.push(["• DSPs and contractors are subject to 5% GST collection"]);
    csvData.push(["• Employees receive T4 employment income"]);
    csvData.push(["• Contractors/DSPs receive T4A other income"]);
    csvData.push(["• Non-billable jobs track internal costs only"]);
    csvData.push(["• Uninvoiced amounts represent pending receivables"]);
    csvData.push([
      "• Hour types include overtime multipliers in effective hours",
    ]);
    csvData.push([
      `• Generated from 4Front Trackity-doo on ${new Date().toLocaleString()}`,
    ]);

    // Convert to CSV string
    const csvString = csvData
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" &&
            (cell.includes(",") || cell.includes('"'))
              ? `"${cell.replace(/"/g, '""')}"`
              : cell,
          )
          .join(","),
      )
      .join("\n");

    // Download CSV
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `4front-comprehensive-accountant-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Comprehensive Data Export for Accountant Review
            <Badge variant="secondary" className="ml-2">
              CPA-Ready Financial Report
            </Badge>
          </CardTitle>
          <CardDescription>
            Export detailed financial data for accounting review, tax
            preparation, and CPA analysis. Includes GST tracking, employee
            categorization, and billable vs non-billable breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="format">Export Detail Level</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">
                    Comprehensive Report (All Details)
                  </SelectItem>
                  <SelectItem value="summary">
                    Summary Only (No Line Items)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={generateCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Comprehensive CSV
            </Button>
            <Button
              onClick={printReport}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-700">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {summary.totalEffectiveHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600">
              {summary.totalLaborHours.toFixed(1)} actual hours
            </p>
            <div className="text-xs text-gray-500 mt-1">
              Billable: {summary.totalBillableEffectiveHours.toFixed(1)}h |{" "}
              Internal: {summary.totalNonBillableEffectiveHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Billable Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              ${summary.totalBillableRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Labor: ${summary.totalBillableAmount.toFixed(2)} | Rental: $
              {summary.totalBillableRentalRevenue.toFixed(2)}
            </p>
            <div className="text-xs text-gray-500 mt-1">
              + ${summary.totalBillableGST.toFixed(2)} GST collected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Calculator className="h-5 w-5" />
              <span className="font-medium">Net Profit</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              ${summary.totalProfit.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Margin: {summary.profitMargin.toFixed(1)}%
            </p>
            <div className="text-xs text-gray-500 mt-1">
              Non-billable cost: ${summary.totalNonBillableCost.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Uninvoiced</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              ${summary.uninvoicedAmount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Pending receivables</p>
            <div className="text-xs text-gray-500 mt-1">
              + ${summary.uninvoicedGST.toFixed(2)} GST pending
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Compliance - Employee Categories by Province */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Tax Compliance - Employee Categories by Province
          </CardTitle>
          <CardDescription>
            Breakdown by employee type and province for T4/T4A reporting and GST compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>GST Collected</TableHead>
                <TableHead>Tax Treatment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(summary.employeeCategoriesByProvince)
                .sort((a, b) => {
                  if (a.category !== b.category) {
                    return a.category.localeCompare(b.category);
                  }
                  return a.province.localeCompare(b.province);
                })
                .map((data) => (
                  <TableRow key={`${data.category}-${data.province}`}>
                    <TableCell className="font-medium">
                      <Badge
                        variant={
                          data.category === "employee" ? "default" : "secondary"
                        }
                        className={
                          data.category === "dsp"
                            ? "bg-orange-100 text-orange-800"
                            : ""
                        }
                      >
                        {data.category === "dsp"
                          ? "DSP (Contractor)"
                          : data.category === "employee"
                            ? "Employee (T4)"
                            : "Contractor"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {data.province}
                      </Badge>
                    </TableCell>
                    <TableCell>{data.count}</TableCell>
                    <TableCell>{data.hours.toFixed(1)}h</TableCell>
                    <TableCell>${data.cost.toFixed(2)}</TableCell>
                    <TableCell>${data.revenue.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      ${data.gst.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {data.category === "employee"
                        ? "T4 Employment Income"
                        : "T4A Other Income + GST"}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {/* Category Summary Totals */}
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-3">Category Summary (All Provinces)</h4>
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Total Count</TableHead>
                  <TableHead className="font-semibold">Total Hours</TableHead>
                  <TableHead className="font-semibold">Total Cost</TableHead>
                  <TableHead className="font-semibold">Total Revenue</TableHead>
                  <TableHead className="font-semibold">Total GST</TableHead>
                  <TableHead className="font-semibold">Tax Treatment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.employeeCategories).map(
                  ([category, data]) => (
                    <TableRow key={`summary-${category}`} className="bg-gray-25">
                      <TableCell className="font-medium">
                        <Badge
                          variant={
                            category === "employee" ? "default" : "secondary"
                          }
                          className={
                            category === "dsp"
                              ? "bg-orange-100 text-orange-800"
                              : ""
                          }
                        >
                          {category === "dsp"
                            ? "DSP (Contractor)"
                            : category === "employee"
                              ? "Employee (T4)"
                              : "Contractor"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{data.count}</TableCell>
                      <TableCell className="font-semibold">{data.hours.toFixed(1)}h</TableCell>
                      <TableCell className="font-semibold">${data.cost.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">${data.revenue.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-orange-600">
                        ${data.gst.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {category === "employee"
                          ? "T4 Employment Income"
                          : "T4A Other Income + GST"}
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Original Category Totals for Reference */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Billable vs Non-Billable Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Billable vs Non-Billable Work Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Type</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Labor Cost</TableHead>
                <TableHead>Revenue/Cost</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Profit/Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">
                    Billable Work
                  </Badge>
                </TableCell>
                <TableCell>
                  {summary.totalBillableLaborHours.toFixed(1)}h
                </TableCell>
                <TableCell>
                  ${summary.totalBillableLaborCost.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold text-green-600">
                  ${summary.totalBillableRevenue.toFixed(2)}
                </TableCell>
                <TableCell>${summary.totalBillableGST.toFixed(2)}</TableCell>
                <TableCell className="font-semibold text-green-600">
                  +${summary.totalProfit.toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800"
                  >
                    Non-Billable Work
                  </Badge>
                </TableCell>
                <TableCell>
                  {summary.totalNonBillableLaborHours.toFixed(1)}h
                </TableCell>
                <TableCell>
                  ${summary.totalNonBillableLaborCost.toFixed(2)}
                </TableCell>
                <TableCell className="text-gray-600">Cost Only</TableCell>
                <TableCell>$0.00</TableCell>
                <TableCell className="font-semibold text-red-600">
                  -${summary.totalNonBillableCost.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Financial Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Total Hours</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Billable Revenue</TableHead>
                <TableHead>Non-Billable Cost</TableHead>
                <TableHead>Net Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summary.monthlyBreakdown)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, data]) => (
                  <TableRow key={month}>
                    <TableCell className="font-medium">{month}</TableCell>
                    <TableCell>{data.hours.toFixed(1)}h</TableCell>
                    <TableCell>${data.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600">
                      ${data.billableRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-orange-600">
                      ${data.nonBillableCost.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={
                        data.billableRevenue - data.cost >= 0
                          ? "font-semibold text-green-600"
                          : "font-semibold text-red-600"
                      }
                    >
                      ${(data.billableRevenue - data.cost).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoice Status Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Invoice Status & Receivables Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Labor Revenue</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Rental Revenue</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Badge className="bg-green-100 text-green-800">
                    Invoiced (Billed)
                  </Badge>
                </TableCell>
                <TableCell>${summary.invoicedLaborAmount.toFixed(2)}</TableCell>
                <TableCell>${summary.invoicedGST.toFixed(2)}</TableCell>
                <TableCell>
                  ${summary.invoicedRentalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold">
                  ${summary.invoicedAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {summary.totalBillableRevenue > 0
                    ? (
                        (summary.invoicedAmount /
                          summary.totalBillableRevenue) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800"
                  >
                    Uninvoiced (Pending)
                  </Badge>
                </TableCell>
                <TableCell>
                  ${summary.uninvoicedLaborAmount.toFixed(2)}
                </TableCell>
                <TableCell>${summary.uninvoicedGST.toFixed(2)}</TableCell>
                <TableCell>
                  ${summary.uninvoicedRentalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold">
                  ${summary.uninvoicedAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {summary.totalBillableRevenue > 0
                    ? (
                        (summary.uninvoicedAmount /
                          summary.totalBillableRevenue) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Provincial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Provincial Work Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Province</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(summary.provinceBreakdown).map(
                ([province, data]) => (
                  <TableRow key={province}>
                    <TableCell className="font-medium">{province}</TableCell>
                    <TableCell>{data.code}</TableCell>
                    <TableCell>{data.hours.toFixed(1)}h</TableCell>
                    <TableCell>${data.cost.toFixed(2)}</TableCell>
                    <TableCell>${data.revenue.toFixed(2)}</TableCell>
                    <TableCell
                      className={
                        data.revenue - data.cost >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      ${(data.revenue - data.cost).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Accountant Notes */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">
            Important Notes for Accountant
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-orange-800 mb-2">
                Tax Compliance:
              </h4>
              <ul className="space-y-1 text-orange-700">
                <li>• DSPs and contractors are subject to 5% GST collection</li>
                <li>• Employees receive T4 employment income</li>
                <li>• Contractors/DSPs receive T4A other income</li>
                <li>• All GST amounts are tracked and included in totals</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-orange-800 mb-2">
                Financial Tracking:
              </h4>
              <ul className="space-y-1 text-orange-700">
                <li>• Non-billable jobs track internal costs only</li>
                <li>• Uninvoiced amounts represent pending receivables</li>
                <li>• Hour types include overtime multipliers</li>
                <li>
                  • Provincial breakdown for multi-jurisdiction compliance
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="print:block hidden">
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold">
              4Front Trackity-doo Professional Time Tracking System
            </p>
            <p>
              Comprehensive Accountant Report - Generated on{" "}
              {new Date().toLocaleString()}
            </p>
            <p>
              Date Range: {dateRange.startDate} to {dateRange.endDate}
            </p>
            <p className="text-xs mt-2">
              This report provides detailed financial data for accounting
              review, tax preparation, and regulatory compliance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}