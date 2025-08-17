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
import html2pdf from 'html2pdf.js';
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
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>("all");

  // State for PDF generation
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<string | null>(null);

  // Filter summaries based on date range, employee selection, and employee type
  const filteredSummaries = useMemo(() => {
    return timeEntrySummaries.filter((summary) => {
      // Date filter
      if (
        summary.date < dateFilter.start ||
        summary.date > dateFilter.end
      ) {
        return false;
      }

      // Employee filter
      if (selectedEmployee !== "all" && summary.employeeName !== selectedEmployee) {
        return false;
      }

      // Employee type filter
      if (selectedEmployeeType !== "all") {
        // Find the employee from the time entry to get their category
        const timeEntry = timeEntries.find(entry =>
          entry.date === summary.date &&
          entry.employeeId === employees.find(emp => emp.name === summary.employeeName)?.id
        );
        const employeeCategory = timeEntry?.employeeCategory || "employee";

        if (employeeCategory !== selectedEmployeeType) {
          return false;
        }
      }

      return true;
    });
  }, [timeEntrySummaries, dateFilter, selectedEmployee, selectedEmployeeType, timeEntries, employees]);

  // Group summaries by employee for paystub display
  const employeePaystubs = useMemo(() => {
    const grouped = filteredSummaries.reduce((acc, summary) => {
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
      acc[key].totalLoaAmount += (summary.loaCount || 0) * 200; // Default LOA amount
      acc[key].entries.push(summary);

      return acc;
    }, {} as Record<string, {
      employeeName: string;
      employeeTitle: string;
      totalHours: number;
      totalCost: number;
      totalLoaCount: number;
      totalLoaAmount: number;
      entries: typeof summary[];
    }>);

    return Object.values(grouped).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
  }, [filteredSummaries]);

  // Get unique employee names for dropdown
  const employeeNames = useMemo(() => {
    const names = new Set(timeEntrySummaries.map(summary => summary.employeeName));
    return Array.from(names).sort();
  }, [timeEntrySummaries]);

  // Get unique employee types for dropdown
  const employeeTypes = useMemo(() => {
    const types = new Set(timeEntries.map(entry => entry.employeeCategory || "employee"));
    return Array.from(types).sort();
  }, [timeEntries]);

  const resetFilters = () => {
    setDateFilter(getInitialDateFilter());
    setSelectedEmployee("all");
    setSelectedEmployeeType("all");
  };

  // Function to generate PDF for a specific paystub using browser print
  const generatePDF = async (paystub: typeof employeePaystubs[0], download = true) => {
    const employeeName = paystub.employeeName;
    setIsGeneratingPDF(employeeName);

    try {
      const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;

      // Create a new window for the paystub
      const printWindow = window.open('', '_blank', 'width=800,height=1000');
      if (!printWindow) {
        alert('Please allow popups for this site to generate PDFs');
        return null;
      }

      // Build the paystub HTML content
      const paystubHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Pay Preview - ${paystub.employeeName}</title>
  <style>
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      color: #1f2937;
      font-size: 12px;
      line-height: 1.5;
    }

    .paystub-container {
      max-width: 8.5in;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border: 1px solid #e5e7eb;
    }

    .paystub-header {
      text-align: center;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: white;
      padding: 30px 20px;
      margin: -40px -40px 40px -40px;
      position: relative;
      overflow: hidden;
    }

    .paystub-header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%),
                  linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%);
      background-size: 20px 20px;
      background-position: 0 0, 10px 10px;
    }

    .company-logo {
      font-size: 24px;
      font-weight: 900;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 1px;
      position: relative;
      z-index: 1;
    }

    .paystub-title {
      font-size: 32px;
      font-weight: 800;
      margin: 15px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 3px;
      position: relative;
      z-index: 1;
    }

    .employee-name {
      font-size: 24px;
      font-weight: 700;
      margin: 15px 0;
      position: relative;
      z-index: 1;
    }

    .employee-title {
      font-size: 16px;
      margin: 8px 0;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }

    .period-text {
      font-size: 16px;
      margin: 15px 0;
      font-weight: 600;
      position: relative;
      z-index: 1;
    }

    .summary-section {
      margin-bottom: 35px;
      background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
      padding: 25px;
      border-radius: 12px;
      border-left: 6px solid #f97316;
      border-right: 3px solid #374151;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.1);
    }

    .summary-title {
      font-size: 18px;
      font-weight: 700;
      color: #ea580c;
      border-bottom: 3px solid #f97316;
      padding-bottom: 10px;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .summary-item {
      margin: 12px 0;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(249, 115, 22, 0.2);
    }

    .summary-item strong {
      color: #ea580c;
      font-weight: 600;
    }

    .table-section {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 25px;
      border-radius: 12px;
      border: 2px solid #374151;
      margin: 25px 0;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .table-title {
      font-size: 18px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-bottom: 3px solid #374151;
      padding-bottom: 10px;
    }

    .column-descriptors {
      background: #374151;
      color: #e5e7eb;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      font-size: 10px;
      line-height: 1.6;
    }

    .column-descriptors h4 {
      color: #f97316;
      font-size: 11px;
      font-weight: 600;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .descriptor-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }

    .descriptor-item {
      display: flex;
      flex-direction: column;
      padding: 8px;
      background: rgba(249, 115, 22, 0.1);
      border-radius: 4px;
      border-left: 3px solid #f97316;
    }

    .descriptor-label {
      font-weight: 600;
      color: #f97316;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .descriptor-text {
      color: #d1d5db;
      font-size: 8px;
      margin-top: 2px;
    }

    .details-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border: 2px solid #374151;
    }

    .details-table th {
      background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
      color: #f97316;
      border: none;
      padding: 15px 10px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 10px;
      border-bottom: 2px solid #f97316;
    }

    .details-table td {
      border: 1px solid #d1d5db;
      padding: 12px 10px;
      color: #374151;
    }

    .details-table tr:nth-child(even) {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    }

    .details-table tr:nth-child(odd) {
      background: white;
    }

    .details-table tr:hover {
      background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
      transform: scale(1.01);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .details-table tbody tr {
      border-left: 3px solid transparent;
      transition: all 0.2s ease;
    }

    .details-table tbody tr:hover {
      border-left: 3px solid #f97316;
    }

    .text-right {
      text-align: right;
      font-weight: 500;
    }

    .footer {
      border-top: 4px solid #f97316;
      border-bottom: 4px solid #374151;
      padding-top: 30px;
      text-align: center;
      margin-top: 40px;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      padding: 30px 20px;
      border-radius: 12px;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
    }

    .total-cost {
      font-size: 24px;
      font-weight: 800;
      margin: 15px 0;
      color: #ea580c;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
    }

    .disclaimer {
      font-size: 11px;
      color: #7c2d12;
      font-style: italic;
      margin: 20px 0;
      padding: 15px;
      background: linear-gradient(135deg, #fef3e2 0%, #fed7aa 100%);
      border: 2px solid #f97316;
      border-radius: 8px;
      line-height: 1.6;
    }

    .adp-notice {
      font-size: 12px;
      color: #1f2937;
      margin: 20px 0;
      padding: 20px;
      background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      font-weight: 600;
      line-height: 1.6;
    }

    .generated-by {
      font-size: 10px;
      color: #9ca3af;
      margin: 15px 0;
      font-weight: 500;
    }

    .print-button {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      cursor: pointer;
      border-radius: 8px;
      margin: 20px 0;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s ease;
    }

    .print-button:hover {
      background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }

    @media print {
      .print-button { display: none; }
      .paystub-container { margin: 0; padding: 20px; box-shadow: none; }
      body { margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="paystub-container">
    <button class="print-button" onclick="window.print()">🖨️ Print Pay Preview to PDF (Ctrl+P)</button>

    <div class="paystub-header">
      <div class="company-logo">4Front Trackity-doo</div>
      <div class="paystub-title">PAY PREVIEW</div>
      <div class="employee-name">${paystub.employeeName}</div>
      <div class="employee-title">${paystub.employeeTitle}</div>
      <div class="period-text">Pay Period: ${periodText}</div>
    </div>

    <div class="summary-section">
      <div class="summary-title">PAYROLL SUMMARY</div>
      <div class="summary-item"><strong>Total Labor Cost:</strong> $${paystub.totalCost.toFixed(2)}</div>
      <div class="summary-item"><strong>Total Hours Worked:</strong> ${paystub.totalHours.toFixed(1)} hours</div>
      ${paystub.totalLoaCount > 0 ? `<div class="summary-item"><strong>Live Out Allowances:</strong> ${paystub.totalLoaCount} × $200.00 = $${paystub.totalLoaAmount.toFixed(2)}</div>` : ''}
    </div>

    <div class="table-section">
      <div class="table-title">DETAILED WORK BREAKDOWN</div>

      <div class="column-descriptors">
        <h4>📋 Column Reference Guide</h4>
        <div class="descriptor-grid">
          <div class="descriptor-item">
            <span class="descriptor-label">Date</span>
            <span class="descriptor-text">Work day (YYYY-MM-DD format)</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">Job Number</span>
            <span class="descriptor-text">Project/client identifier</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">Hour Type</span>
            <span class="descriptor-text">Regular, Overtime, Double Time, etc.</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">Hours</span>
            <span class="descriptor-text">Time worked (decimal format)</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">LOA</span>
            <span class="descriptor-text">Live Out Allowance ($200 each)</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">Rate</span>
            <span class="descriptor-text">Hourly rate (includes multipliers)</span>
          </div>
          <div class="descriptor-item">
            <span class="descriptor-label">Cost</span>
            <span class="descriptor-text">Total labor cost for entry</span>
          </div>
        </div>
      </div>

      <table class="details-table">
        <thead>
          <tr>
            <th>📅 Date</th>
            <th>🏗️ Job Number</th>
            <th>⏰ Hour Type</th>
            <th class="text-right">🕐 Hours</th>
            <th class="text-right">🏠 LOA</th>
            <th class="text-right">💰 Rate</th>
            <th class="text-right">💵 Cost</th>
          </tr>
        </thead>
        <tbody>
              ${paystub.entries
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(entry => {
                  // Calculate effective rate with multiplier
                  const hourType = hourTypes.find(ht => ht.name === entry.hourTypeName);
                  const multiplier = hourType?.multiplier || 1;
                  const effectiveRate = entry.costWage * multiplier;
                  const rateDisplay = multiplier === 1
                    ? `$${entry.costWage.toFixed(2)}/h`
                    : `$${effectiveRate.toFixed(2)}/h (${multiplier}x)`;

                  return `
                    <tr>
                      <td>${formatLocalDate(entry.date)}</td>
                      <td>${entry.jobNumber}</td>
                      <td>${entry.hourTypeName}</td>
                      <td class="text-right">${entry.hours.toFixed(2)}h</td>
                      <td class="text-right">${(entry.loaCount || 0) > 0 ? `${entry.loaCount} × $200` : '—'}</td>
                      <td class="text-right">${rateDisplay}</td>
                      <td class="text-right">$${entry.totalCost.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('')}
        </tbody>
      </table>
    </div>

    <div class="footer">
      <div class="total-cost">TOTAL LABOR COST: $${paystub.totalCost.toFixed(2)}</div>

      <div class="disclaimer">
        ⚠️ <strong>PAY PREVIEW ONLY</strong> - This is NOT an official paystub. Labor costs shown exclude taxes, remittances, and other deductions.
        Live Out Allowances (LOAs) are displayed separately when applicable.
      </div>

      <div class="adp-notice">
        📧 <strong>OFFICIAL PAYSTUBS:</strong> Your official paystubs with complete tax calculations can be accessed through your ADP Payroll login on the Friday of each pay period. Your ADP login credentials have already been emailed to you.
      </div>

      <div class="generated-by">Generated by 4Front Trackity-doo Payroll System • ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
</body>
</html>`;

      // Write the content to the new window
      printWindow.document.write(paystubHTML);
      printWindow.document.close();

      // Focus the window and trigger print
      printWindow.focus();

      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);

      return true;
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error opening print window. Please try again.');
      return null;
    } finally {
      setIsGeneratingPDF(null);
    }
  };

  // Function to generate PDF and open email
  const generatePDFAndEmail = async (paystub: typeof employeePaystubs[0]) => {
    try {
      const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;
      const subject = `Pay Preview - ${paystub.employeeName} (${periodText})`;

      // Create email body
      const emailBody = `Dear ${paystub.employeeName},

Please find attached your pay preview for the period ${periodText}.

IMPORTANT: This is a pay preview only and is NOT an official paystub. Official paystubs with proper tax calculations will be provided separately.

Summary:
- Total Labor Cost: $${paystub.totalCost.toFixed(2)} (excludes taxes/remittances)
- Total Hours: ${paystub.totalHours.toFixed(1)}${paystub.totalLoaCount > 0 ? `
- Live Out Allowances: ${paystub.totalLoaCount} × $200 = $${paystub.totalLoaAmount.toFixed(2)}` : ''}

If you have any questions regarding this paystub, please don't hesitate to contact us.

Best regards,
4Front Trackity-doo Payroll`;

      // Generate PDF (this will auto-download)
      const result = await generatePDF(paystub, true);
      if (!result) return;

      // Small delay then open email
      setTimeout(() => {
        const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

        const link = document.createElement('a');
        link.href = mailtoLink;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Show instructions
        alert(`PDF downloaded successfully! Please attach the downloaded PDF file to your email.

Note: Due to browser security limitations, PDF files cannot be automatically attached to emails. You'll need to manually attach the downloaded PDF file.`);
      }, 2000);

    } catch (error) {
      console.error('Error in PDF and email workflow:', error);
      alert('Error generating PDF and email. Please try again.');
    }
  };



  // Function to generate paystub content for email
  const generatePaystubEmail = (paystub: typeof employeePaystubs[0]) => {
    const periodText = `${formatLocalDate(dateFilter.start)} to ${formatLocalDate(dateFilter.end)}`;

    // Create concise paystub content (keep it shorter due to mailto length limits)
    const paystubContent = `PAYSTUB - ${paystub.employeeName}
Position: ${paystub.employeeTitle}
Period: ${periodText}

SUMMARY:
Total Labor Cost: $${paystub.totalCost.toFixed(2)} (excludes taxes/remittances)
Total Hours: ${paystub.totalHours.toFixed(1)}${paystub.totalLoaCount > 0 ? `
Live Out Allowances: ${paystub.totalLoaCount} × $200 = $${paystub.totalLoaAmount.toFixed(2)}` : ''}

DETAILS:
${paystub.entries
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 15) // Limit to first 15 entries to avoid mailto length limits
  .map(entry =>
    `${formatLocalDate(entry.date)} | ${entry.jobNumber} | ${entry.hourTypeName} | ${entry.hours.toFixed(2)}h @ $${entry.costWage.toFixed(2)}/h${(entry.loaCount || 0) > 0 ? ` + ${entry.loaCount} LOA` : ''} = $${entry.totalCost.toFixed(2)}`
  ).join('\n')}${paystub.entries.length > 15 ? '\n... (additional entries truncated)' : ''}

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
      const link = document.createElement('a');
      link.href = mailtoLink;
      link.style.display = 'none';
      document.body.appendChild(link);

      // Click the link to trigger email client
      link.click();

      // Clean up
      document.body.removeChild(link);

      console.log('Email client should now open with paystub content');
    } catch (error) {
      console.error('Error opening email client:', error);

      // Fallback: Copy content to clipboard and show instructions
      try {
        navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
        alert('Email client could not be opened automatically. The paystub content has been copied to your clipboard. Please paste it into your email client.');
      } catch (clipboardError) {
        console.error('Clipboard access failed:', clipboardError);
        alert('Unable to open email client automatically. Please manually create an email with the paystub information.');
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
              <Label className="text-sm font-medium text-gray-200">Start Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFilter.start}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, start: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">End Date</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={dateFilter.end}
                  onChange={(e) =>
                    setDateFilter((prev) => ({ ...prev, end: e.target.value }))
                  }
                  className="pl-10"
                />
              </div>
            </div>

            {/* Employee Type Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">Employee Type</Label>
              <Select value={selectedEmployeeType} onValueChange={setSelectedEmployeeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {employeeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type === "dsp" ? "DSP" : type === "dspot" ? "DSPOT" : "Employee"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-200">Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
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
              <Button onClick={resetFilters} variant="outline" className="w-full">
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
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
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
                <p className="text-sm font-medium text-gray-300">Total Employees</p>
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
                  {employeePaystubs.reduce((sum, emp) => sum + emp.totalHours, 0).toFixed(1)}h
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
                  {employeePaystubs.reduce((sum, emp) => sum + emp.totalLoaCount, 0)}
                </p>
                <p className="text-sm text-amber-400">
                  ${employeePaystubs.reduce((sum, emp) => sum + emp.totalLoaAmount, 0).toFixed(2)}
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
                  ${employeePaystubs.reduce((sum, emp) => sum + emp.totalCost, 0).toFixed(2)}
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
              <p className="text-lg font-medium text-gray-200">No pay preview data found</p>
              <p className="text-sm text-gray-400 mt-1">
                No entries match your current filters and date range.
              </p>
            </CardContent>
          </Card>
        ) : (
          employeePaystubs.map((paystub) => (
            <Card key={paystub.employeeName} className="border-l-4 border-l-orange-400 shadow-lg bg-gray-800/50 border-gray-700">
              <CardHeader className="bg-gray-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-gray-100 flex items-center gap-2">
                      <User className="h-5 w-5 text-orange-400" />
                      {paystub.employeeName}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {paystub.employeeTitle} • {formatLocalDate(dateFilter.start)} to {formatLocalDate(dateFilter.end)}
                    </CardDescription>
                    <div className="mt-2 p-2 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                      <p className="text-xs text-amber-200 font-medium">
                        ⚠️ PAY PREVIEW ONLY - Not an official paystub. Costs exclude taxes and remittances. LOAs shown separately.
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
                            {paystub.totalLoaCount} LOA${paystub.totalLoaCount > 1 ? 's' : ''}
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
                      <TableHead className="font-semibold text-gray-200">Date</TableHead>
                      <TableHead className="font-semibold text-gray-200">Job</TableHead>
                      <TableHead className="font-semibold text-gray-200">Hour Type</TableHead>
                      <TableHead className="font-semibold text-gray-200">Province</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Hours</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">LOA</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Rate</TableHead>
                      <TableHead className="text-right font-semibold text-gray-200">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paystub.entries
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((entry, index) => (
                        <TableRow key={`${entry.date}-${entry.jobNumber}-${entry.hourTypeName}-${index}`} className="hover:bg-gray-700/30 border-gray-700">
                          <TableCell className="font-medium text-gray-200">
                            {formatLocalDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-100">{entry.jobNumber}</div>
                              <div className="text-sm text-gray-400 truncate max-w-32">
                                {entry.jobName}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-blue-900/30 text-blue-300 border-blue-500/50">
                              {entry.hourTypeName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs bg-purple-900/30 text-purple-300 border-purple-500/50">
                              {entry.provinceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-gray-200">
                            {entry.hours.toFixed(2)}h
                          </TableCell>
                          <TableCell className="text-right">
                            {(entry.loaCount || 0) > 0 ? (
                              <div className="text-amber-400 font-medium">
                                {entry.loaCount} × $200
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-300">
                            {(() => {
                              // Find the hour type to get the multiplier
                              const hourType = hourTypes.find(ht => ht.name === entry.hourTypeName);
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
