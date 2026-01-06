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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarIcon,
  Clock,
  DollarSign,
  Filter,
  Receipt,
  User,
  Mail,
  Download,
  FileText,
  Send,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import {
  parseLocalDate,
  formatLocalDate,
  getTodayString,
} from "@/utils/dateUtils";

// Helper function to get the last n days
const getLastNDays = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

const getInitialDateFilter = () => {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    start: startOfMonth.toISOString().split("T")[0],
    end: getTodayString(),
  };
};

export const Paystubs = () => {
  const {
    employees,
    jobs,
    hourTypes,
    provinces,
    timeEntries,
    timeEntrySummaries,
  } = useTimeTracking();

  // State for filters
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedEmployeeType, setSelectedEmployeeType] =
    useState<string>("all");

  // State for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  // Get hierarchical employee summaries for filtering logic similar to Payroll Information
  const hierarchicalEmployeeSummaries = useMemo(() => {
    // Group employees and determine their relationships
    const employeeMap = new Map();

    employees.forEach((emp) => {
      employeeMap.set(emp.id, {
        ...emp,
        subordinates: [],
        isSubordinate: false,
        employeeCategory: emp.category || "employee",
      });
    });

    // Mark subordinates and build hierarchy
    employees.forEach((emp) => {
      if (emp.managerId) {
        const manager = employeeMap.get(emp.managerId);
        const subordinate = employeeMap.get(emp.id);
        if (manager && subordinate) {
          manager.subordinates.push(subordinate);
          subordinate.isSubordinate = true;
        }
      }
    });

    return Array.from(employeeMap.values());
  }, [employees]);

  // Filter summaries based on date range, employee selection, and employee type
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      // Date filter
      if (summary.date < dateFilter.start || summary.date > dateFilter.end) {
        return false;
      }

      // Employee filter
      if (
        selectedEmployee !== "all" &&
        summary.employeeName !== selectedEmployee
      ) {
        return false;
      }

      // Employee type filter
      if (selectedEmployeeType !== "all") {
        const employee = employees.find(
          (emp) => emp.name === summary.employeeName,
        );
        if (!employee) return false;

        const hierarchicalEmployee = hierarchicalEmployeeSummaries.find(
          (emp) => emp.id === employee.id,
        );
        if (!hierarchicalEmployee) return false;

        if (selectedEmployeeType === "dsps-with-subordinates") {
          // Show only DSPs (employees who have subordinates)
          if (
            !hierarchicalEmployee.subordinates ||
            hierarchicalEmployee.subordinates.length === 0
          ) {
            return false;
          }
        } else if (selectedEmployeeType === "regular-employees") {
          // Show only regular employees (no subordinates, not subordinates themselves, and not DSPs/DSPOTs)
          if (
            (hierarchicalEmployee.subordinates &&
              hierarchicalEmployee.subordinates.length > 0) ||
            hierarchicalEmployee.isSubordinate ||
            hierarchicalEmployee.employeeCategory === "dsp" ||
            hierarchicalEmployee.employeeCategory === "dspot"
          ) {
            return false;
          }
        } else if (selectedEmployeeType === "dsps-only") {
          // Show only DSPs and DSPOTs who have no subordinates
          if (
            !(
              hierarchicalEmployee.employeeCategory === "dsp" ||
              hierarchicalEmployee.employeeCategory === "dspot"
            ) ||
            (hierarchicalEmployee.subordinates &&
              hierarchicalEmployee.subordinates.length > 0)
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    timeEntrySummaries,
    dateFilter,
    selectedEmployee,
    selectedEmployeeType,
    hierarchicalEmployeeSummaries,
  ]);

  // Group summaries by employee for paystub display
  const employeePaystubs = useMemo(() => {
    const grouped = filteredSummaries.reduce(
      (acc, summary) => {
        const key = summary.employeeName;

        if (!acc[key]) {
          acc[key] = {
            employeeName: summary.employeeName,
            employeeTitle: summary.employeeTitle,
            totalHours: 0,
            totalCost: 0,
            totalLoaCount: 0,
            totalLoaAmount: 0,
            entries: [],
          };
        }

        acc[key].totalHours += summary.hours || 0;
        acc[key].totalCost += summary.totalCost || 0;
        acc[key].totalLoaCount += summary.loaCount || 0;
        acc[key].totalLoaAmount += (summary.loaCount || 0) * (summary.loaAmount || 200);
        acc[key].entries.push(summary);

        return acc;
      },
      {} as Record<
        string,
        {
          employeeName: string;
          employeeTitle: string;
          totalHours: number;
          totalCost: number;
          totalLoaCount: number;
          totalLoaAmount: number;
          entries: (typeof summary)[];
        }
      >,
    );

    return Object.values(grouped).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );
  }, [filteredSummaries]);

  // Get unique employee names for dropdown
  const employeeNames = useMemo(() => {
    const names = new Set(
      timeEntrySummaries.map((summary) => summary.employeeName),
    );
    return Array.from(names).sort();
  }, [timeEntrySummaries]);

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setSelectedEmployee("all");
    setSelectedEmployeeType("all");
  };

  // Function to generate PDF for a specific paystub using optimized browser print
  const generatePDF = async (
    paystub: (typeof employeePaystubs)[0],
    download = true,
  ) => {
    const employeeName = paystub.employeeName;
    setIsGeneratingPDF(employeeName);

    try {
      const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;

      // Create print window with minimal size for faster loading
      const printWindow = window.open("", "_blank", "width=600,height=800");
      if (!printWindow) {
        alert("Please allow popups for this site to generate PDFs");
        return null;
      }

      // Pre-calculate data to avoid runtime processing
      const sortedEntries = paystub.entries.sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const tableRows = sortedEntries
        .map((entry) => {
          const hourType = hourTypes.find(
            (ht) => ht.name === entry.hourTypeName,
          );
          const isEmprig = hourType?.name === "Employee Rig" || hourType?.name === "NS Employee Rig";
          let rateDisplay: string;
          if (isEmprig) {
            const loaAmount = (entry.loaCount || 0) * (entry.loaAmount || 200);
            const avgRate = (entry.totalCost - loaAmount) / Math.max(1, entry.hours);
            rateDisplay = `$${avgRate.toFixed(2)}/h (tiered)`;
          } else {
            const multiplier = hourType?.multiplier || 1;
            const effectiveRate = entry.costWage * multiplier;
            rateDisplay =
              multiplier === 1
                ? `$${entry.costWage.toFixed(2)}/h`
                : `$${effectiveRate.toFixed(2)}/h (${multiplier}x)`;
          }

          const loaPercentOrAmount = (entry.loaCount || 0) > 0 ? `${entry.loaCount} × $${(entry.loaAmount || 200).toFixed(2)}` : "—";
          return `<tr><td>${formatLocalDate(entry.date)}</td><td>${entry.jobNumber}</td><td>${entry.hourTypeName}</td><td>${entry.hours.toFixed(2)}h</td><td>${loaPercentOrAmount}</td><td>${rateDisplay}</td><td>$${entry.totalCost.toFixed(2)}</td></tr>`;
        })
        .join("");

      // Simplified, optimized HTML structure
      const paystubHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Pay Preview - ${paystub.employeeName} - ${periodText}</title>
  <style>
    @media print { * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; } }
    body { font-family: Arial, sans-serif; margin: 0; padding: 15px; background: #f8fafc; color: #1f2937; font-size: 11px; line-height: 1.4; }
    .container { max-width: 8in; margin: 0 auto; background: white; padding: 20px; border: 2px solid #e5e7eb; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { text-align: center; background: linear-gradient(135deg, #374151 0%, #4b5563 100%); color: white; padding: 20px; margin: -20px -20px 20px -20px; border-radius: 6px 6px 0 0; }
    .logo { font-size: 18px; font-weight: bold; color: #f97316; margin-bottom: 8px; }
    .title { font-size: 24px; font-weight: bold; color: #f97316; margin: 8px 0; }
    .employee { font-size: 18px; font-weight: bold; margin: 8px 0; color: #e5e7eb; }
    .period { font-size: 14px; margin: 8px 0; color: #d1d5db; }
    .summary { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border: 2px solid #374151; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .summary-title { font-size: 14px; font-weight: bold; color: #374151; border-bottom: 2px solid #374151; padding-bottom: 8px; margin-bottom: 12px; }
    .summary-item { margin: 8px 0; display: flex; justify-content: space-between; padding: 8px; background: #f8fafc; border: 1px solid #d1d5db; border-left: 3px solid #f97316; border-radius: 3px; }
    .table-section { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border: 2px solid #374151; padding: 15px; margin: 15px 0; border-radius: 6px; }
    .table { width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #9ca3af; }
    .table th { background: linear-gradient(135deg, #374151 0%, #4b5563 100%); color: #f97316; padding: 8px 6px; text-align: left; font-weight: bold; font-size: 9px; border-bottom: 2px solid #f97316; }
    .table td { border: 1px solid #d1d5db; padding: 6px; font-size: 10px; }
    .table tr:nth-child(even) { background: #f8fafc; }
    .table tr:nth-child(odd) { background: #f1f5f9; }
    .text-right { text-align: right; }
    .footer { border-top: 3px solid #f97316; border-bottom: 3px solid #374151; padding: 15px; text-align: center; margin: 20px 0; background: linear-gradient(135deg, #f8fafc 0%, #e5e7eb 100%); border-radius: 6px; }
    .total { font-size: 18px; font-weight: bold; color: #ea580c; margin: 10px 0; }
    .disclaimer { font-size: 10px; color: #7c2d12; margin: 15px 0; padding: 10px; background: #fef3e2; border: 1px solid #f97316; border-radius: 4px; }
    .adp { font-size: 11px; color: #1f2937; margin: 15px 0; padding: 10px; background: #e0f2fe; border: 1px solid #0ea5e9; border-radius: 4px; }
    .generated { font-size: 9px; color: #9ca3af; margin: 10px 0; }
    @media print { .container { margin: 0; padding: 10px; border: none; box-shadow: none; } body { margin: 0; padding: 0; background: white; } }
  </style>
</head>
<body>
  <div class="paystub-container">


    <div class="paystub-header">
      <div class="company-logo">4Front Trackity-doo</div>
      <div class="paystub-title">PAY PREVIEW</div>
      <div class="employee-name">${paystub.employeeName}</div>
      <div class="employee-title">${paystub.employeeTitle}</div>
      <div class="period-text">Pay Period: ${periodText}</div>
    </div>

    <div class="summary-section">
      <div class="summary-title">PAYROLL SUMMARY</div>
      <div class="summary-item">
        <strong>Total Labor Cost:</strong>
        <span style="color: #374151; font-weight: 600;">$${paystub.totalCost.toFixed(2)}</span>
      </div>
      <div class="summary-item">
        <strong>Total Hours Worked:</strong>
        <span style="color: #374151; font-weight: 600;">${paystub.totalHours.toFixed(1)} hours</span>
      </div>
      ${paystub.totalLoaCount > 0 ? `<div class="summary-item"><strong>Live Out Allowances:</strong> <span style="color: #374151; font-weight: 600;">${paystub.totalLoaCount} × $200.00 = $${paystub.totalLoaAmount.toFixed(2)}</span></div>` : ""}
    </div>

    <div class="table-section">
      <div class="table-title">DETAILED WORK BREAKDOWN</div>



      <table class="details-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Job Number</th>
            <th>Hour Type</th>
            <th class="text-right">Hours</th>
            <th class="text-right">LOA</th>
            <th class="text-right">Rate</th>
            <th class="text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
              ${paystub.entries
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((entry) => {
                  const hourType = hourTypes.find(
                    (ht) => ht.name === entry.hourTypeName,
                  );
                  const isEmprig = hourType?.name === "Employee Rig" || hourType?.name === "NS Employee Rig";
                  let rateDisplay: string;
                  if (isEmprig) {
                    const loaAmount = (entry.loaCount || 0) * (entry.loaAmount || 200);
                    const avgRate = (entry.totalCost - loaAmount) / Math.max(1, entry.hours);
                    rateDisplay = `$${avgRate.toFixed(2)}/h (tiered)`;
                  } else {
                    const multiplier = hourType?.multiplier || 1;
                    const effectiveRate = entry.costWage * multiplier;
                    rateDisplay =
                      multiplier === 1
                        ? `$${entry.costWage.toFixed(2)}/h`
                        : `$${effectiveRate.toFixed(2)}/h (${multiplier}x)`;
                  }

                  const loaPercentOrAmount = (entry.loaCount || 0) > 0 ? `${entry.loaCount} × $${(entry.loaAmount || 200).toFixed(2)}` : "—";
                  return `
                    <tr>
                      <td>${formatLocalDate(entry.date)}</td>
                      <td>${entry.jobNumber}</td>
                      <td>${entry.hourTypeName}</td>
                      <td class="text-right">${entry.hours.toFixed(2)}h</td>
                      <td class="text-right">${loaPercentOrAmount}</td>
                      <td class="text-right">${rateDisplay}</td>
                      <td class="text-right">$${entry.totalCost.toFixed(2)}</td>
                    </tr>
                  `;
                })
                .join("")}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="total-cost">TOTAL LABOR COST: $${paystub.totalCost.toFixed(2)}</div>

      <div class="disclaimer">
        <strong>PAY PREVIEW ONLY</strong> - This is NOT an official paystub. Labor costs shown exclude taxes, remittances, and other deductions.
        Live Out Allowances (LOAs) are displayed separately when applicable.
      </div>

      <div class="adp-notice">
        <strong>OFFICIAL PAYSTUBS:</strong> Your official paystubs with complete tax calculations can be accessed through your ADP Payroll login on the Friday of each pay period. Your ADP login credentials have already been emailed to you.
      </div>

      <div class="generated-by">Generated by 4Front Trackity-doo Payroll System • ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
</body>
</html>`;

      // Write content and immediately trigger print for speed
      printWindow.document.write(paystubHTML);
      printWindow.document.close();

      // Immediate print trigger with faster response
      printWindow.focus();
      printWindow.print();

      // Auto-close window after print for cleanup
      setTimeout(() => {
        printWindow.close();
      }, 1000);

      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error opening print window. Please try again.");
      return null;
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // Function to generate PDF and open email
  const generatePDFAndEmail = async (paystub: (typeof employeePaystubs)[0]) => {
    try {
      const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;
      const subject = `Pay Preview - ${paystub.employeeName} (${periodText})`;

      // Create email body
      const emailBody = `Dear ${paystub.employeeName},

Please find attached your pay preview for the period ${periodText}.

IMPORTANT: This is a pay preview only and is NOT an official paystub. Official paystubs with proper tax calculations will be provided separately.

Summary:
- Total Labor Cost: $${paystub.totalCost.toFixed(2)} (excludes taxes/remittances)
- Total Hours: ${paystub.totalHours.toFixed(1)}${
        paystub.totalLoaCount > 0
          ? `
- Live Out Allowances: ${paystub.totalLoaCount} × $200 = $${paystub.totalLoaAmount.toFixed(2)}`
          : ""
      }

If you have any questions regarding this pay preview, please don't hesitate to contact us.

XOXO,
4Front Trackity-doo`;

      // Generate PDF (this will auto-download)
      const result = await generatePDF(paystub, true);
      if (!result) return;

      // Small delay then open email
      setTimeout(() => {
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

        const link = document.createElement("a");
        link.href = mailtoLink;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, 2000);
    } catch (error) {
      console.error("Error in PDF and email workflow:", error);
      alert("Error generating PDF and email. Please try again.");
    }
  };

  // Function to generate paystub content for email
  const generatePaystubEmail = (paystub: (typeof employeePaystubs)[0]) => {
    const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;

    // Create concise paystub content (keep it shorter due to mailto length limits)
    const paystubContent = `PAYSTUB - ${paystub.employeeName}
Position: ${paystub.employeeTitle}
Period: ${periodText}

SUMMARY:
Total Labor Cost: $${paystub.totalCost.toFixed(2)} (excludes taxes/remittances)
Total Hours: ${paystub.totalHours.toFixed(1)}${
      paystub.totalLoaCount > 0
        ? `
Live Out Allowances: ${paystub.totalLoaCount} × $200 = $${paystub.totalLoaAmount.toFixed(2)}`
        : ""
    }

DETAILS:
${paystub.entries
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 15) // Limit to first 15 entries to avoid mailto length limits
  .map(
    (entry) =>
      `${formatLocalDate(entry.date)} | ${entry.jobNumber} | ${entry.hourTypeName} | ${entry.hours.toFixed(2)}h @ $${entry.costWage.toFixed(2)}/h${(entry.loaCount || 0) > 0 ? ` + ${entry.loaCount} LOA` : ""} = $${entry.totalCost.toFixed(2)}`,
  )
  .join(
    "\n",
  )}${paystub.entries.length > 15 ? "\n... (additional entries truncated)" : ""}

TOTAL: $${paystub.totalCost.toFixed(2)}

Generated by 4Front Trackity-doo`;

    // Create email
    const subject = `Paystub - ${paystub.employeeName} (${periodText})`;
    const body = paystubContent;

    // Try multiple approaches to open email client
    try {
      // Method 1: Create a mailto link and click it
      const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // Create a temporary link element
      const link = document.createElement("a");
      link.href = mailtoLink;
      link.style.display = "none";
      document.body.appendChild(link);

      // Click the link to trigger email client
      link.click();

      // Clean up
      document.body.removeChild(link);

      console.log("Email client should now open with paystub content");
    } catch (error) {
      console.error("Error opening email client:", error);

      // Fallback: Copy content to clipboard and show instructions
      try {
        navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
        alert(
          "Email client could not be opened automatically. The paystub content has been copied to your clipboard. Please paste it into your email client.",
        );
      } catch (clipboardError) {
        console.error("Clipboard access failed:", clipboardError);
        alert(
          "Unable to open email client automatically. Please manually create an email with the paystub information.",
        );
      }
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
            <Receipt className="h-8 w-8 text-orange-400" />
            Pay Preview
          </h1>
          <p className="text-gray-300 mt-1">
            Employee pay preview including LOAs, excluding taxes and remittances
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <Filter className="h-5 w-5 text-orange-400" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                Start Date
              </Label>
              <Input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    start: e.target.value,
                  }))
                }
                className="bg-gray-800 border-gray-600 text-gray-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                End Date
              </Label>
              <Input
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    end: e.target.value,
                  }))
                }
                className="bg-gray-800 border-gray-600 text-gray-100"
              />
            </div>

            {/* Employee Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                Employee Type
              </Label>
              <Select
                value={selectedEmployeeType}
                onValueChange={setSelectedEmployeeType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  <SelectItem value="dsps-with-subordinates">
                    DSPs with Subordinates
                  </SelectItem>
                  <SelectItem value="dsps-only">
                    DSP's & DSPOT's Only
                  </SelectItem>
                  <SelectItem value="regular-employees">
                    Regular Employees Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">
                Employee
              </Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            <div className="flex items-end">
              <Button
                onClick={resetFilters}
                variant="outline"
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateFilter({
                  start: getLastNDays(7),
                  end: getTodayString(),
                })
              }
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setDateFilter({
                  start: getLastNDays(30),
                  end: getTodayString(),
                })
              }
            >
              Last 30 Days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                const startOfMonth = new Date(
                  today.getFullYear(),
                  today.getMonth(),
                  1,
                );
                setDateFilter({
                  start: startOfMonth.toISOString().split("T")[0],
                  end: getTodayString(),
                });
              }}
            >
              This Month
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Total Employees
                </p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs.length}
                </p>
              </div>
              <User className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Hours</p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs
                    .reduce((sum, emp) => sum + emp.totalHours, 0)
                    .toFixed(1)}
                  h
                </p>
              </div>
              <Clock className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total LOAs</p>
                <p className="text-2xl font-bold text-gray-100">
                  {employeePaystubs.reduce(
                    (sum, emp) => sum + emp.totalLoaCount,
                    0,
                  )}
                </p>
                <p className="text-sm text-amber-400">
                  $
                  {employeePaystubs
                    .reduce((sum, emp) => sum + emp.totalLoaAmount, 0)
                    .toFixed(2)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-400 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-300">Total Cost</p>
                <p className="text-2xl font-bold text-gray-100">
                  $
                  {employeePaystubs
                    .reduce((sum, emp) => sum + emp.totalCost, 0)
                    .toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-rose-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Paystubs */}
      <div className="space-y-6">
        {employeePaystubs.length === 0 ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-12 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-lg font-medium text-gray-200">
                No pay preview data found
              </p>
              <p className="text-sm text-gray-400 mt-1">
                No entries match your current filters and date range.
              </p>
            </CardContent>
          </Card>
        ) : (
          employeePaystubs.map((paystub) => (
            <Card
              key={paystub.employeeName}
              className="border-l-4 border-l-orange-400 shadow-lg bg-gray-800/50 border-gray-700"
            >
              <CardHeader className="bg-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
                      <User className="h-5 w-5 text-orange-400" />
                      {paystub.employeeName}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {paystub.employeeTitle} •{" "}
                      {formatLocalDate(dateFilter.start)} to{" "}
                      {formatLocalDate(dateFilter.end)}
                    </CardDescription>
                    <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-amber-200 font-medium">
                        ⚠️ PAY PREVIEW ONLY - Not an official paystub. Costs
                        exclude taxes and remittances. LOAs shown separately.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right space-y-1">
                      <div className="text-2xl font-bold text-emerald-400">
                        ${paystub.totalCost.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                        Labor Cost Only
                      </div>
                      <div className="text-sm text-gray-300 flex items-center gap-4">
                        <span>{paystub.totalHours.toFixed(1)} hours</span>
                        {paystub.totalLoaCount > 0 && (
                          <span className="text-amber-400">
                            {paystub.totalLoaCount} LOA$
                            {paystub.totalLoaCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generatePDF(paystub)}
                        disabled={isGeneratingPDF === paystub.employeeName}
                        className="bg-gray-800/50 hover:bg-gray-700 border-gray-600 text-gray-200"
                      >
                        {isGeneratingPDF === paystub.employeeName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => generatePDFAndEmail(paystub)}
                        disabled={isGeneratingPDF === paystub.employeeName}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isGeneratingPDF === paystub.employeeName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-1" />
                            PDF & Email
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-700/50 border-b-2 border-gray-600">
                      <TableHead className="font-semibold text-gray-200">
                        Date
                      </TableHead>
                      <TableHead className="font-semibold text-gray-200">
                        Job
                      </TableHead>
                      <TableHead className="font-semibold text-gray-200">
                        Hour Type
                      </TableHead>
                      <TableHead className="font-semibold text-gray-200">
                        Province
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">
                        Hours
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">
                        LOA
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">
                        Rate
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">
                        Cost
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paystub.entries
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry, index) => (
                        <TableRow
                          key={`${entry.date}-${entry.jobNumber}-${entry.hourTypeName}-${index}`}
                          className="hover:bg-gray-700/30 border-gray-700"
                        >
                          <TableCell className="font-medium text-gray-200">
                            {formatLocalDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-100">
                                {entry.jobNumber}
                              </div>
                              <div className="text-sm text-gray-400 truncate max-w-32">
                                {entry.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-900/30 text-blue-300 border-blue-500/50"
                            >
                              {entry.hourTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className="text-xs bg-purple-900/30 text-purple-300 border-purple-500/50"
                            >
                              {entry.provinceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-200">
                            {entry.hours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {(entry.loaCount || 0) > 0 ? (
                              <div className="text-amber-400 font-medium">
                                {entry.loaCount} × ${(entry.loaAmount || 200).toFixed(2)}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            {(() => {
                              // Find the hour type to get the multiplier
                              const hourType = hourTypes.find(
                                (ht) => ht.name === entry.hourTypeName,
                              );
                              const multiplier = hourType?.multiplier || 1;
                              const effectiveRate = entry.costWage * multiplier;

                              if (multiplier === 1) {
                                return `$${entry.costWage.toFixed(2)}/h`;
                              } else {
                                return `$${effectiveRate.toFixed(2)}/h (${multiplier}x)`;
                              }
                            })()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-emerald-400">
                            ${entry.totalCost.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
