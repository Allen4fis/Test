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

      return {
        ...entry,
        employeeName: employee?.name || "Unknown",
        employeeTitle: employee?.title || "Unknown",
        jobNumber: job?.jobNumber || "Unknown",
        jobName: job?.name || "Unknown Job",
        hourTypeName: hourType?.name || "Regular",
        hourTypeMultiplier: hourType?.multiplier || 1,
        provinceName: province?.name || "Unknown",
        provinceCode: province?.code || "XX",
        effectiveHours,
        laborCost,
        billableAmount,
        profit: billableAmount - laborCost,
        isInvoiced: job?.invoicedDates.includes(entry.date) || false,
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
        employeeName: employee?.name || "Unassigned",
        duration,
        totalCost,
        isInvoiced: job?.invoicedDates.includes(entry.startDate) || false,
      };
    });
  }, [filteredRentalEntries, rentalItems, jobs, employees]);

  // Summary calculations
  const summary = useMemo(() => {
    const totalLaborHours = detailedTimeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0,
    );
    const totalEffectiveHours = detailedTimeEntries.reduce(
      (sum, entry) => sum + entry.effectiveHours,
      0,
    );
    const totalLaborCost = detailedTimeEntries.reduce(
      (sum, entry) => sum + entry.laborCost,
      0,
    );
    const totalBillableAmount = detailedTimeEntries.reduce(
      (sum, entry) => sum + entry.billableAmount,
      0,
    );
    const totalRentalRevenue = detailedRentalEntries.reduce(
      (sum, entry) => sum + entry.totalCost,
      0,
    );
    const totalRevenue = totalBillableAmount + totalRentalRevenue;
    const totalProfit = totalRevenue - totalLaborCost;

    // Invoiced vs Non-invoiced breakdown
    const invoicedLaborAmount = detailedTimeEntries
      .filter((entry) => entry.isInvoiced)
      .reduce((sum, entry) => sum + entry.billableAmount, 0);
    const invoicedRentalAmount = detailedRentalEntries
      .filter((entry) => entry.isInvoiced)
      .reduce((sum, entry) => sum + entry.totalCost, 0);
    const uninvoicedLaborAmount = totalBillableAmount - invoicedLaborAmount;
    const uninvoicedRentalAmount = totalRentalRevenue - invoicedRentalAmount;

    return {
      totalLaborHours,
      totalEffectiveHours,
      totalLaborCost,
      totalBillableAmount,
      totalRentalRevenue,
      totalRevenue,
      totalProfit,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      invoicedAmount: invoicedLaborAmount + invoicedRentalAmount,
      uninvoicedAmount: uninvoicedLaborAmount + uninvoicedRentalAmount,
      invoicedLaborAmount,
      invoicedRentalAmount,
      uninvoicedLaborAmount,
      uninvoicedRentalAmount,
    };
  }, [detailedTimeEntries, detailedRentalEntries]);

  // Export functions
  const generateCSV = () => {
    const csvData = [];

    // Header information
    csvData.push(["4Front Trackity-doo - Comprehensive Financial Report"]);
    csvData.push([
      `Date Range: ${dateRange.startDate} to ${dateRange.endDate}`,
    ]);
    csvData.push([`Generated: ${new Date().toLocaleString()}`]);
    csvData.push([""]);

    // Summary section
    csvData.push(["FINANCIAL SUMMARY"]);
    csvData.push(["Metric", "Amount"]);
    csvData.push(["Total Labor Hours", summary.totalLaborHours.toFixed(2)]);
    csvData.push([
      "Total Effective Hours",
      summary.totalEffectiveHours.toFixed(2),
    ]);
    csvData.push(["Total Labor Cost", `$${summary.totalLaborCost.toFixed(2)}`]);
    csvData.push([
      "Total Labor Revenue",
      `$${summary.totalBillableAmount.toFixed(2)}`,
    ]);
    csvData.push([
      "Total Rental Revenue",
      `$${summary.totalRentalRevenue.toFixed(2)}`,
    ]);
    csvData.push(["Total Revenue", `$${summary.totalRevenue.toFixed(2)}`]);
    csvData.push(["Total Profit", `$${summary.totalProfit.toFixed(2)}`]);
    csvData.push(["Profit Margin", `${summary.profitMargin.toFixed(2)}%`]);
    csvData.push([""]);

    // Invoice status
    csvData.push(["INVOICE STATUS"]);
    csvData.push(["Status", "Labor", "Rental", "Total"]);
    csvData.push([
      "Invoiced",
      `$${summary.invoicedLaborAmount.toFixed(2)}`,
      `$${summary.invoicedRentalAmount.toFixed(2)}`,
      `$${summary.invoicedAmount.toFixed(2)}`,
    ]);
    csvData.push([
      "Uninvoiced",
      `$${summary.uninvoicedLaborAmount.toFixed(2)}`,
      `$${summary.uninvoicedRentalAmount.toFixed(2)}`,
      `$${summary.uninvoicedAmount.toFixed(2)}`,
    ]);
    csvData.push([""]);

    // Time entries
    csvData.push(["TIME ENTRIES DETAIL"]);
    csvData.push([
      "Date",
      "Employee",
      "Title",
      "Job Number",
      "Job Name",
      "Hour Type",
      "Province",
      "Hours",
      "Effective Hours",
      "Cost Wage",
      "Billable Wage",
      "Labor Cost",
      "Billable Amount",
      "Profit",
      "Invoiced",
      "Description",
    ]);

    detailedTimeEntries.forEach((entry) => {
      csvData.push([
        entry.date,
        entry.employeeName,
        entry.employeeTitle,
        entry.jobNumber,
        entry.jobName,
        entry.hourTypeName,
        entry.provinceCode,
        entry.hours,
        entry.effectiveHours.toFixed(2),
        `$${entry.costWageUsed.toFixed(2)}`,
        `$${entry.billableWageUsed.toFixed(2)}`,
        `$${entry.laborCost.toFixed(2)}`,
        `$${entry.billableAmount.toFixed(2)}`,
        `$${entry.profit.toFixed(2)}`,
        entry.isInvoiced ? "Yes" : "No",
        entry.description || "",
      ]);
    });

    csvData.push([""]);

    // Rental entries
    csvData.push(["RENTAL ENTRIES DETAIL"]);
    csvData.push([
      "Start Date",
      "End Date",
      "Item Name",
      "Category",
      "Job Number",
      "Job Name",
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

    // Employee summary
    csvData.push([""]);
    csvData.push(["EMPLOYEE SUMMARY"]);
    csvData.push([
      "Employee",
      "Title",
      "Hours",
      "Effective Hours",
      "Cost",
      "Revenue",
      "Profit",
    ]);

    const employeeSummary = employees.map((employee) => {
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
      const profit = revenue - cost;

      return [
        employee.name,
        employee.title,
        hours.toFixed(2),
        effectiveHours.toFixed(2),
        `$${cost.toFixed(2)}`,
        `$${revenue.toFixed(2)}`,
        `$${profit.toFixed(2)}`,
      ];
    });

    csvData.push(...employeeSummary);

    // Job summary
    csvData.push([""]);
    csvData.push(["JOB SUMMARY"]);
    csvData.push([
      "Job Number",
      "Job Name",
      "Labor Hours",
      "Labor Cost",
      "Labor Revenue",
      "Rental Revenue",
      "Total Revenue",
      "Profit",
    ]);

    const jobSummary = jobs.map((job) => {
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
      const profit = totalRevenue - laborCost;

      return [
        job.jobNumber,
        job.name,
        laborHours.toFixed(2),
        `$${laborCost.toFixed(2)}`,
        `$${laborRevenue.toFixed(2)}`,
        `$${rentalRevenue.toFixed(2)}`,
        `$${totalRevenue.toFixed(2)}`,
        `$${profit.toFixed(2)}`,
      ];
    });

    csvData.push(...jobSummary);

    // Convert to CSV string
    const csvString = csvData
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",") ? `"${cell}"` : cell,
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
      `4front-trackity-doo-export-${dateRange.startDate}-to-${dateRange.endDate}.csv`,
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
            Data Export for Accountant Review
            <Badge variant="secondary" className="ml-2">
              Professional Financial Report
            </Badge>
          </CardTitle>
          <CardDescription>
            Export comprehensive financial data for accounting review and tax
            preparation
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
              <Label htmlFor="format">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">
                    Comprehensive Report
                  </SelectItem>
                  <SelectItem value="summary">Summary Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={generateCSV} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export CSV
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

      {/* Summary Cards */}
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700">
              <DollarSign className="h-5 w-5" />
              <span className="font-medium">Total Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              ${summary.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Labor: ${summary.totalBillableAmount.toFixed(2)} | Rental: $
              {summary.totalRentalRevenue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <Calculator className="h-5 w-5" />
              <span className="font-medium">Total Profit</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              ${summary.totalProfit.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">
              Margin: {summary.profitMargin.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-700">
              <FileText className="h-5 w-5" />
              <span className="font-medium">Uninvoiced</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              ${summary.uninvoicedAmount.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600">Pending billing</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Labor Revenue</TableHead>
                <TableHead>Rental Revenue</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Badge
                    variant="default"
                    className="bg-green-100 text-green-800"
                  >
                    Invoiced
                  </Badge>
                </TableCell>
                <TableCell>${summary.invoicedLaborAmount.toFixed(2)}</TableCell>
                <TableCell>
                  ${summary.invoicedRentalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold">
                  ${summary.invoicedAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {summary.totalRevenue > 0
                    ? (
                        (summary.invoicedAmount / summary.totalRevenue) *
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
                    Uninvoiced
                  </Badge>
                </TableCell>
                <TableCell>
                  ${summary.uninvoicedLaborAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  ${summary.uninvoicedRentalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-semibold">
                  ${summary.uninvoicedAmount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {summary.totalRevenue > 0
                    ? (
                        (summary.uninvoicedAmount / summary.totalRevenue) *
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

      {/* Print-only detailed sections */}
      <div className="print:block hidden">
        <div className="page-break">
          <h2 className="text-xl font-bold mb-4">Detailed Time Entries</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Invoiced</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailedTimeEntries.slice(0, 50).map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.employeeName}</TableCell>
                  <TableCell>{entry.jobNumber}</TableCell>
                  <TableCell>{entry.effectiveHours.toFixed(2)}</TableCell>
                  <TableCell>${entry.laborCost.toFixed(2)}</TableCell>
                  <TableCell>${entry.billableAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={entry.isInvoiced ? "default" : "secondary"}>
                      {entry.isInvoiced ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary by Job */}
      <Card>
        <CardHeader>
          <CardTitle>Summary by Job</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Number</TableHead>
                <TableHead>Job Name</TableHead>
                <TableHead>Labor Hours</TableHead>
                <TableHead>Labor Revenue</TableHead>
                <TableHead>Rental Revenue</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => {
                const jobTimeEntries = detailedTimeEntries.filter(
                  (e) => e.jobId === job.id,
                );
                const jobRentalEntries = detailedRentalEntries.filter(
                  (e) => e.jobId === job.id,
                );

                const laborHours = jobTimeEntries.reduce(
                  (sum, e) => sum + e.hours,
                  0,
                );
                const laborCost = jobTimeEntries.reduce(
                  (sum, e) => sum + e.laborCost,
                  0,
                );
                const laborRevenue = jobTimeEntries.reduce(
                  (sum, e) => sum + e.billableAmount,
                  0,
                );
                const rentalRevenue = jobRentalEntries.reduce(
                  (sum, e) => sum + e.totalCost,
                  0,
                );
                const totalRevenue = laborRevenue + rentalRevenue;
                const profit = totalRevenue - laborCost;

                if (totalRevenue === 0) return null;

                return (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">
                      {job.jobNumber}
                    </TableCell>
                    <TableCell>{job.name}</TableCell>
                    <TableCell>{laborHours.toFixed(2)}</TableCell>
                    <TableCell>${laborRevenue.toFixed(2)}</TableCell>
                    <TableCell>${rentalRevenue.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">
                      ${totalRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={
                        profit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      ${profit.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="print:block hidden">
        <CardContent className="p-4">
          <div className="text-center text-sm text-gray-600">
            <p>4Front Trackity-doo Professional Time Tracking System</p>
            <p>Generated on {new Date().toLocaleString()}</p>
            <p>
              Date Range: {dateRange.startDate} to {dateRange.endDate}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
