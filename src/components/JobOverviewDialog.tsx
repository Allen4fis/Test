import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import { Job, TimeEntrySummary } from "@/types";

interface JobOverviewDialogProps {
  job: Job | null;
  timeEntrySummaries: TimeEntrySummary[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const safeNumber = (value: any): number => {
  const num = Number(value) || 0;
  return isNaN(num) ? 0 : num;
};

export function JobOverviewDialog({
  job,
  timeEntrySummaries,
  isOpen,
  onOpenChange,
}: JobOverviewDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [viewMode, setViewMode] = useState<"internal" | "client" | "dsp">("internal");
  const [selectedDSPEmployees, setSelectedDSPEmployees] = useState<string[]>([]);

  if (!job) return null;

  const jobEntries = (timeEntrySummaries || []).filter((entry) => {
    return entry.jobNumber === job.jobNumber;
  });

  const totalHours = jobEntries.reduce(
    (sum, entry) => sum + safeNumber(entry.hours),
    0
  );
  const totalCost = jobEntries.reduce(
    (sum, entry) => sum + safeNumber(entry.totalCost),
    0
  );
  const totalBillable = jobEntries.reduce(
    (sum, entry) => sum + safeNumber(entry.totalBillableAmount),
    0
  );

  const employeeBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const key = entry.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          name: entry.employeeName,
          hours: 0,
          travelHours: 0,
          cost: 0,
          billable: 0,
        });
      }
      const data = map.get(key)!;
      const isTravelHours = entry.hourTypeName === 'Travel Hours';
      if (isTravelHours) {
        data.travelHours += safeNumber(entry.hours);
      } else {
        data.hours += safeNumber(entry.hours);
      }
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      return map;
    }, new Map<string, { name: string; hours: number; travelHours: number; cost: number; billable: number }>()).values()
  ).sort((a, b) => (b.hours + b.travelHours) - (a.hours + a.travelHours));

  const titleBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const key = entry.employeeTitle;
      if (!map.has(key)) {
        map.set(key, {
          title: entry.employeeTitle,
          hours: 0,
          travelHours: 0,
          cost: 0,
          billable: 0,
        });
      }
      const data = map.get(key)!;
      const isTravelHours = entry.hourTypeName === 'Travel Hours';
      if (isTravelHours) {
        data.travelHours += safeNumber(entry.hours);
      } else {
        data.hours += safeNumber(entry.hours);
      }
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      return map;
    }, new Map<string, { title: string; hours: number; travelHours: number; cost: number; billable: number }>()).values()
  ).sort((a, b) => (b.hours + b.travelHours) - (a.hours + a.travelHours));

  const monthlyBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          key: monthKey,
          label: monthLabel,
          hours: 0,
          travelHours: 0,
          cost: 0,
          billable: 0,
          entries: [],
        });
      }
      const data = map.get(monthKey)!;
      const isTravelHours = entry.hourTypeName === 'Travel Hours';
      if (isTravelHours) {
        data.travelHours += safeNumber(entry.hours);
      } else {
        data.hours += safeNumber(entry.hours);
      }
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      data.entries.push(entry);
      return map;
    }, new Map<string, { key: string; label: string; hours: number; travelHours: number; cost: number; billable: number; entries: TimeEntrySummary[] }>()).values()
  ).sort((a, b) => a.key.localeCompare(b.key));

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const weeklyBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const date = new Date(entry.date);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      if (!map.has(weekKey)) {
        map.set(weekKey, {
          key: weekKey,
          label: weekLabel,
          hours: 0,
          travelHours: 0,
          cost: 0,
          billable: 0,
          entries: [],
        });
      }
      const data = map.get(weekKey)!;
      const isTravelHours = entry.hourTypeName === 'Travel Hours';
      if (isTravelHours) {
        data.travelHours += safeNumber(entry.hours);
      } else {
        data.hours += safeNumber(entry.hours);
      }
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      data.entries.push(entry);
      return map;
    }, new Map<string, { key: string; label: string; hours: number; travelHours: number; cost: number; billable: number; entries: TimeEntrySummary[] }>()).values()
  ).sort((a, b) => a.key.localeCompare(b.key));

  const dateBasedBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const key = entry.date;
      if (!map.has(key)) {
        map.set(key, {
          date: entry.date,
          entries: [],
        });
      }
      const data = map.get(key)!;
      data.entries.push(entry);
      return map;
    }, new Map<string, { date: string; entries: TimeEntrySummary[] }>()).values()
  ).sort((a, b) => a.date.localeCompare(b.date));

  const handleExportPDF = () => {
    try {
      // Simple approach: create element and use html2pdf
      const element = document.createElement('div');
      element.style.padding = '20px';
      element.style.backgroundColor = 'white';
      element.style.color = 'black';

      const dateBasedBreakdownHTML = dateBasedBreakdown.map((dayData) => {
        // Parse date string as local date, not UTC
        const [year, month, day] = dayData.date.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        const formattedDate = dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        const dayTotalHours = dayData.entries.reduce((sum, e) => sum + safeNumber(e.hours), 0);
        const employeesByDate = Array.from(
          dayData.entries.reduce((map, entry) => {
            const key = entry.employeeName;
            if (!map.has(key)) {
              map.set(key, { name: entry.employeeName, workHours: 0, travelHours: 0, loaCount: 0 });
            }
            const data = map.get(key)!;
            const isTravelHours = entry.hourTypeName === 'Travel Hours';
            if (isTravelHours) {
              data.travelHours += safeNumber(entry.hours);
            } else {
              data.workHours += safeNumber(entry.hours);
            }
            data.loaCount += safeNumber(entry.loaCount) || 0;
            return map;
          }, new Map<string, { name: string; workHours: number; travelHours: number; loaCount: number }>()).values()
        );

        const empLines = employeesByDate.map(emp => {
          const loaText = emp.loaCount > 0 ? ` • ${emp.loaCount} LoA` : '';
          const totalEmpHours = emp.workHours + emp.travelHours;
          const hoursDisplay = emp.travelHours > 0
            ? `${emp.workHours.toFixed(2)}HR - ${emp.travelHours.toFixed(2)}TRV`
            : `${totalEmpHours.toFixed(2)}HR`;
          return `<div style="display: flex; justify-content: space-between; padding-left: 12px; font-size: 13px; margin: 4px 0; color: #000000;">
            <span>${emp.name}</span>
            <span>${hoursDisplay}${loaText}</span>
          </div>`;
        }).join('');

        return `
          <div style="margin-bottom: 16px; padding: 12px; border: 2px solid #000000; background-color: #ffffff;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: bold; color: #000000;">
              <span>${formattedDate}</span>
              <span>${dayTotalHours.toFixed(2)}h</span>
            </div>
            ${empLines}
          </div>
        `;
      }).join('');

      element.innerHTML = `
        <h1 style="margin-top: 0; font-size: 28px; color: #000000;">Job Overview</h1>
        <p style="margin: 0 0 20px 0; font-size: 14px; color: #000000;"><strong>${job.jobNumber} - ${job.name}</strong></p>

        <div style="margin-bottom: 16px; padding: 12px; border: 2px solid #000000; background-color: #ffffff;">
          <p style="margin: 0; font-size: 12px; color: #000000; font-weight: bold;">Total Hours</p>
          <p style="margin: 8px 0 0 0; font-size: 32px; font-weight: bold; color: #000000;">${safeNumber(totalHours).toFixed(2)}</p>
        </div>

        <div style="margin-bottom: 20px; padding: 12px; border: 2px solid #000000; background-color: #ffffff;">
          <span style="font-weight: bold; color: #000000;">Status: </span>
          <span style="color: #000000;">${job.isActive ? 'Active' : 'Inactive'}</span>
        </div>

        ${employeeBreakdown.length > 0 ? `
          <h2 style="font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px; color: #000000;">Employee Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #333333;">
                <th style="text-align: left; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Employee</th>
                <th style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${employeeBreakdown.map(emp => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #000000; color: #000000;">${emp.name}</td>
                  <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                    ${safeNumber(emp.hours + emp.travelHours).toFixed(2)}h
                    ${emp.travelHours > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(emp.hours).toFixed(2)}h + ${safeNumber(emp.travelHours).toFixed(2)}h trv)</div>` : ''}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #cccccc;">
                <td style="padding: 8px; border: 1px solid #000000; color: #000000;">Total</td>
                <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                  ${safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.hours + e.travelHours, 0)).toFixed(2)}h
                  ${employeeBreakdown.reduce((sum, e) => sum + e.travelHours, 0) > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.hours, 0)).toFixed(2)}h + ${safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.travelHours, 0)).toFixed(2)}h trv)</div>` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${titleBreakdown.length > 0 ? `
          <h2 style="font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px; color: #000000;">Title Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #333333;">
                <th style="text-align: left; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Title</th>
                <th style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${titleBreakdown.map(title => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #000000; color: #000000;">${title.title}</td>
                  <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                    ${safeNumber(title.hours + title.travelHours).toFixed(2)}h
                    ${title.travelHours > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(title.hours).toFixed(2)}h + ${safeNumber(title.travelHours).toFixed(2)}h trv)</div>` : ''}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #cccccc;">
                <td style="padding: 8px; border: 1px solid #000000; color: #000000;">Total</td>
                <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                  ${safeNumber(titleBreakdown.reduce((sum, t) => sum + t.hours + t.travelHours, 0)).toFixed(2)}h
                  ${titleBreakdown.reduce((sum, t) => sum + t.travelHours, 0) > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(titleBreakdown.reduce((sum, t) => sum + t.hours, 0)).toFixed(2)}h + ${safeNumber(titleBreakdown.reduce((sum, t) => sum + t.travelHours, 0)).toFixed(2)}h trv)</div>` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${monthlyBreakdown.length > 0 ? `
          <h2 style="font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px; color: #000000;">Monthly Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #333333;">
                <th style="text-align: left; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Month</th>
                <th style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyBreakdown.map(month => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #000000; color: #000000;">${month.label}</td>
                  <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                    ${safeNumber(month.hours + month.travelHours).toFixed(2)}h
                    ${month.travelHours > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(month.hours).toFixed(2)}h + ${safeNumber(month.travelHours).toFixed(2)}h trv)</div>` : ''}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #cccccc;">
                <td style="padding: 8px; border: 1px solid #000000; color: #000000;">Total</td>
                <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                  ${safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.hours + m.travelHours, 0)).toFixed(2)}h
                  ${monthlyBreakdown.reduce((sum, m) => sum + m.travelHours, 0) > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.hours, 0)).toFixed(2)}h + ${safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.travelHours, 0)).toFixed(2)}h trv)</div>` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${weeklyBreakdown.length > 0 ? `
          <h2 style="font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px; color: #000000;">Weekly Breakdown</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #333333;">
                <th style="text-align: left; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Week</th>
                <th style="text-align: right; font-weight: bold; padding: 8px; border: 1px solid #000000; color: #ffffff;">Total Hours</th>
              </tr>
            </thead>
            <tbody>
              ${weeklyBreakdown.map(week => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #000000; color: #000000;">${week.label}</td>
                  <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                    ${safeNumber(week.hours + week.travelHours).toFixed(2)}h
                    ${week.travelHours > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(week.hours).toFixed(2)}h + ${safeNumber(week.travelHours).toFixed(2)}h trv)</div>` : ''}
                  </td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background-color: #cccccc;">
                <td style="padding: 8px; border: 1px solid #000000; color: #000000;">Total</td>
                <td style="padding: 8px; border: 1px solid #000000; text-align: right; color: #000000;">
                  ${safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.hours + w.travelHours, 0)).toFixed(2)}h
                  ${weeklyBreakdown.reduce((sum, w) => sum + w.travelHours, 0) > 0 ? `<div style="font-size: 11px; color: #666666; margin-top: 2px;">(${safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.hours, 0)).toFixed(2)}h + ${safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.travelHours, 0)).toFixed(2)}h trv)</div>` : ''}
                </td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${dateBasedBreakdown.length > 0 ? `
          <h2 style="font-size: 18px; margin: 20px 0 10px 0; border-bottom: 2px solid #000000; padding-bottom: 5px; color: #000000;">Time Entry Details</h2>
          ${dateBasedBreakdownHTML}
        ` : ''}
      `;

      const opt = {
        margin: 5,
        filename: `${job.jobNumber.replace(/\//g, '-')}-${job.name.replace(/\s+/g, '-')}-overview.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' },
      };

      (html2pdf as any)().set(opt).from(element).save();
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting PDF. Please check the console.');
    }
  };

  return (
    <>

      {/* Screen dialog version */}
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Job Overview</DialogTitle>
            <DialogDescription>
              {job.jobNumber} - {job.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* View Toggle */}
            <div className="bg-gray-100 p-3 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {viewMode === "internal" && "👨‍💼 Internal View"}
                  {viewMode === "client" && "👥 Client View"}
                  {viewMode === "dsp" && "💼 DSP Billing View"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("internal")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === "internal"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:border-blue-500"
                  }`}
                >
                  Internal
                </button>
                <button
                  onClick={() => setViewMode("client")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === "client"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:border-blue-500"
                  }`}
                >
                  Client
                </button>
                <button
                  onClick={() => setViewMode("dsp")}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    viewMode === "dsp"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:border-blue-500"
                  }`}
                >
                  DSP Billing
                </button>
              </div>

              {/* DSP Employee Selection */}
              {viewMode === "dsp" && employeeBreakdown.length > 0 && (
                <div className="bg-white p-3 rounded border border-gray-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">Select Employees to Display:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {employeeBreakdown.map((emp) => (
                      <label key={emp.name} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDSPEmployees.includes(emp.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDSPEmployees([...selectedDSPEmployees, emp.name]);
                            } else {
                              setSelectedDSPEmployees(
                                selectedDSPEmployees.filter((n) => n !== emp.name)
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-xs text-gray-700">{emp.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            {viewMode !== "dsp" && viewMode !== "client" && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium">Total Hours</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {safeNumber(totalHours).toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600 font-medium">Total Cost</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    ${safeNumber(totalCost).toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-600 font-medium">Total Billable</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    ${safeNumber(totalBillable).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {viewMode === "client" && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600 font-medium">Total Hours</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {safeNumber(totalHours).toFixed(2)}
                </p>
              </div>
            )}

            {/* DSP Billing View */}
            {viewMode === "dsp" && (
              <div>
                {selectedDSPEmployees.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-gray-700 font-medium">Select employees above to view their daily billing details</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-xs font-medium text-gray-600">Total Hours (Selected Employees)</p>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {safeNumber(
                          dateBasedBreakdown.reduce((sum, day) => {
                            const dayTotal = day.entries
                              .filter((e) => selectedDSPEmployees.includes(e.employeeName))
                              .reduce((s, e) => s + safeNumber(e.hours), 0);
                            return sum + dayTotal;
                          }, 0)
                        ).toFixed(2)}h
                      </p>
                    </div>

                    {/* DSP Daily Breakdown */}
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Daily Billing Details</h3>
                      {dateBasedBreakdown.map((dayData) => {
                        const [year, month, day] = dayData.date.split('-');
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        const formattedDate = dateObj.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });

                        const filteredEntries = dayData.entries.filter((e) =>
                          selectedDSPEmployees.includes(e.employeeName)
                        );

                        if (filteredEntries.length === 0) return null;

                        const employeesByDate = Array.from(
                          filteredEntries.reduce((map, entry) => {
                            const key = entry.employeeName;
                            if (!map.has(key)) {
                              map.set(key, { name: entry.employeeName, workHours: 0, travelHours: 0, loaCount: 0 });
                            }
                            const data = map.get(key)!;
                            const isTravelHours = entry.hourTypeName === 'Travel Hours';
                            if (isTravelHours) {
                              data.travelHours += safeNumber(entry.hours);
                            } else {
                              data.workHours += safeNumber(entry.hours);
                            }
                            data.loaCount += safeNumber(entry.loaCount) || 0;
                            return map;
                          }, new Map<string, { name: string; workHours: number; travelHours: number; loaCount: number }>()).values()
                        );

                        const dayTotalHours = filteredEntries.reduce((sum, e) => sum + safeNumber(e.hours), 0);

                        return (
                          <div key={dayData.date} className="border rounded-lg p-3 bg-white">
                            <div className="flex items-center justify-between mb-3 pb-2 border-b">
                              <p className="font-bold text-blue-700">{formattedDate}</p>
                              <p className="text-sm font-semibold text-blue-600">{dayTotalHours.toFixed(2)}h</p>
                            </div>
                            <div className="space-y-2">
                              {employeesByDate.map((emp) => {
                                const loaText = emp.loaCount > 0 ? ` • ${emp.loaCount} LoA` : '';
                                const totalEmpHours = emp.workHours + emp.travelHours;
                                return (
                                  <div key={emp.name} className="flex items-center justify-between text-sm pl-3">
                                    <span className="font-medium text-gray-900">{emp.name}</span>
                                    <span className="font-semibold text-blue-600">
                                      {emp.workHours > 0 && `${emp.workHours.toFixed(2)}h`}
                                      {emp.travelHours > 0 && ` • ${emp.travelHours.toFixed(2)} Travel`}
                                      {loaText}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Job Details */}
            <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge variant={job.isActive ? "default" : "secondary"}>
                  {job.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {job.description && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Description:</span> {job.description}
                </div>
              )}
              {!isClientView && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Billable:</span> {job.isBillable ? "Yes" : "No"}
                </div>
              )}
            </div>

            {/* Employee Breakdown */}
            {employeeBreakdown.length > 0 && viewMode !== "dsp" && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Employee Breakdown</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        {viewMode === "client" ? (
                          <TableHead className="text-right">Total Hours</TableHead>
                        ) : (
                          <>
                            <TableHead className="text-right">Work Hours</TableHead>
                            <TableHead className="text-right">Travel Hours</TableHead>
                          </>
                        )}
                        {viewMode === "internal" && (
                          <>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Billable</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeeBreakdown.map((emp, idx) => (
                        <TableRow key={`emp-${idx}-${emp.name}`}>
                          <TableCell className="font-medium">{emp.name}</TableCell>
                          {viewMode === "client" ? (
                            <TableCell className="text-right">
                              {safeNumber(emp.hours + emp.travelHours).toFixed(2)}h
                              {emp.travelHours > 0 && (
                                <div className="text-xs text-gray-500">
                                  ({safeNumber(emp.hours).toFixed(2)}h + {safeNumber(emp.travelHours).toFixed(2)}h trv)
                                </div>
                              )}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                {safeNumber(emp.hours).toFixed(2)}h
                              </TableCell>
                              <TableCell className="text-right">
                                {safeNumber(emp.travelHours).toFixed(2)}h
                              </TableCell>
                            </>
                          )}
                          {viewMode === "internal" && (
                            <>
                              <TableCell className="text-right">
                                ${safeNumber(emp.cost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ${safeNumber(emp.billable).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-gray-100">
                        <TableCell>Total</TableCell>
                        {isClientView ? (
                          <TableCell className="text-right">
                            {safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.hours + e.travelHours, 0)).toFixed(2)}h
                            {employeeBreakdown.reduce((sum, e) => sum + e.travelHours, 0) > 0 && (
                              <div className="text-xs text-gray-500">
                                ({safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.hours, 0)).toFixed(2)}h + {safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.travelHours, 0)).toFixed(2)}h trv)
                              </div>
                            )}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right">
                              {safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.hours, 0)).toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.travelHours, 0)).toFixed(2)}h
                            </TableCell>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableCell className="text-right">
                              ${safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.cost, 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${safeNumber(employeeBreakdown.reduce((sum, e) => sum + e.billable, 0)).toFixed(2)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Title Breakdown */}
            {titleBreakdown.length > 0 && viewMode !== "dsp" && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Title Breakdown</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        {isClientView ? (
                          <TableHead className="text-right">Total Hours</TableHead>
                        ) : (
                          <>
                            <TableHead className="text-right">Work Hours</TableHead>
                            <TableHead className="text-right">Travel Hours</TableHead>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Billable</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {titleBreakdown.map((title, idx) => (
                        <TableRow key={`title-${idx}-${title.title}`}>
                          <TableCell className="font-medium">{title.title}</TableCell>
                          {isClientView ? (
                            <TableCell className="text-right">
                              {safeNumber(title.hours + title.travelHours).toFixed(2)}h
                              {title.travelHours > 0 && (
                                <div className="text-xs text-gray-500">
                                  ({safeNumber(title.hours).toFixed(2)}h + {safeNumber(title.travelHours).toFixed(2)}h trv)
                                </div>
                              )}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                {safeNumber(title.hours).toFixed(2)}h
                              </TableCell>
                              <TableCell className="text-right">
                                {safeNumber(title.travelHours).toFixed(2)}h
                              </TableCell>
                            </>
                          )}
                          {!isClientView && (
                            <>
                              <TableCell className="text-right">
                                ${safeNumber(title.cost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ${safeNumber(title.billable).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-gray-100">
                        <TableCell>Total</TableCell>
                        {isClientView ? (
                          <TableCell className="text-right">
                            {safeNumber(titleBreakdown.reduce((sum, t) => sum + t.hours + t.travelHours, 0)).toFixed(2)}h
                            {titleBreakdown.reduce((sum, t) => sum + t.travelHours, 0) > 0 && (
                              <div className="text-xs text-gray-500">
                                ({safeNumber(titleBreakdown.reduce((sum, t) => sum + t.hours, 0)).toFixed(2)}h + {safeNumber(titleBreakdown.reduce((sum, t) => sum + t.travelHours, 0)).toFixed(2)}h trv)
                              </div>
                            )}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right">
                              {safeNumber(titleBreakdown.reduce((sum, t) => sum + t.hours, 0)).toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {safeNumber(titleBreakdown.reduce((sum, t) => sum + t.travelHours, 0)).toFixed(2)}h
                            </TableCell>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableCell className="text-right">
                              ${safeNumber(titleBreakdown.reduce((sum, t) => sum + t.cost, 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${safeNumber(titleBreakdown.reduce((sum, t) => sum + t.billable, 0)).toFixed(2)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Monthly Breakdown */}
            {monthlyBreakdown.length > 0 && viewMode !== "dsp" && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Monthly Breakdown</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        {isClientView ? (
                          <TableHead className="text-right">Total Hours</TableHead>
                        ) : (
                          <>
                            <TableHead className="text-right">Work Hours</TableHead>
                            <TableHead className="text-right">Travel Hours</TableHead>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Billable</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyBreakdown.map((month, idx) => (
                        <TableRow key={`month-${idx}-${month.key}`}>
                          <TableCell className="font-medium">{month.label}</TableCell>
                          {isClientView ? (
                            <TableCell className="text-right">
                              {safeNumber(month.hours + month.travelHours).toFixed(2)}h
                              {month.travelHours > 0 && (
                                <div className="text-xs text-gray-500">
                                  ({safeNumber(month.hours).toFixed(2)}h + {safeNumber(month.travelHours).toFixed(2)}h trv)
                                </div>
                              )}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                {safeNumber(month.hours).toFixed(2)}h
                              </TableCell>
                              <TableCell className="text-right">
                                {safeNumber(month.travelHours).toFixed(2)}h
                              </TableCell>
                            </>
                          )}
                          {!isClientView && (
                            <>
                              <TableCell className="text-right">
                                ${safeNumber(month.cost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ${safeNumber(month.billable).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-gray-100">
                        <TableCell>Total</TableCell>
                        {isClientView ? (
                          <TableCell className="text-right">
                            {safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.hours + m.travelHours, 0)).toFixed(2)}h
                            {monthlyBreakdown.reduce((sum, m) => sum + m.travelHours, 0) > 0 && (
                              <div className="text-xs text-gray-500">
                                ({safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.hours, 0)).toFixed(2)}h + {safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.travelHours, 0)).toFixed(2)}h trv)
                              </div>
                            )}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right">
                              {safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.hours, 0)).toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.travelHours, 0)).toFixed(2)}h
                            </TableCell>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableCell className="text-right">
                              ${safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.cost, 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${safeNumber(monthlyBreakdown.reduce((sum, m) => sum + m.billable, 0)).toFixed(2)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Weekly Breakdown */}
            {weeklyBreakdown.length > 0 && viewMode !== "dsp" && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Weekly Breakdown</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Week</TableHead>
                        {isClientView ? (
                          <TableHead className="text-right">Total Hours</TableHead>
                        ) : (
                          <>
                            <TableHead className="text-right">Work Hours</TableHead>
                            <TableHead className="text-right">Travel Hours</TableHead>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Billable</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyBreakdown.map((week, idx) => (
                        <TableRow key={`week-${idx}-${week.key}`}>
                          <TableCell className="font-medium">{week.label}</TableCell>
                          {isClientView ? (
                            <TableCell className="text-right">
                              {safeNumber(week.hours + week.travelHours).toFixed(2)}h
                              {week.travelHours > 0 && (
                                <div className="text-xs text-gray-500">
                                  ({safeNumber(week.hours).toFixed(2)}h + {safeNumber(week.travelHours).toFixed(2)}h trv)
                                </div>
                              )}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right">
                                {safeNumber(week.hours).toFixed(2)}h
                              </TableCell>
                              <TableCell className="text-right">
                                {safeNumber(week.travelHours).toFixed(2)}h
                              </TableCell>
                            </>
                          )}
                          {!isClientView && (
                            <>
                              <TableCell className="text-right">
                                ${safeNumber(week.cost).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ${safeNumber(week.billable).toFixed(2)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-gray-100">
                        <TableCell>Total</TableCell>
                        {isClientView ? (
                          <TableCell className="text-right">
                            {safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.hours + w.travelHours, 0)).toFixed(2)}h
                            {weeklyBreakdown.reduce((sum, w) => sum + w.travelHours, 0) > 0 && (
                              <div className="text-xs text-gray-500">
                                ({safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.hours, 0)).toFixed(2)}h + {safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.travelHours, 0)).toFixed(2)}h trv)
                              </div>
                            )}
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-right">
                              {safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.hours, 0)).toFixed(2)}h
                            </TableCell>
                            <TableCell className="text-right">
                              {safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.travelHours, 0)).toFixed(2)}h
                            </TableCell>
                          </>
                        )}
                        {!isClientView && (
                          <>
                            <TableCell className="text-right">
                              ${safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.cost, 0)).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              ${safeNumber(weeklyBreakdown.reduce((sum, w) => sum + w.billable, 0)).toFixed(2)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Time Entry Details */}
            {dateBasedBreakdown.length > 0 && viewMode !== "dsp" && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Time Entry Details</h3>
                <div className="space-y-3">
                  {dateBasedBreakdown.map((dayData, dateIdx) => {
                    // Parse date string as local date, not UTC
                    const [year, month, day] = dayData.date.split('-');
                    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const formattedDate = dateObj.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                    const dayTotalHours = dayData.entries.reduce((sum, e) => sum + safeNumber(e.hours), 0);
                    const employeesByDate = Array.from(
                      dayData.entries.reduce((map, entry) => {
                        const key = entry.employeeName;
                        if (!map.has(key)) {
                          map.set(key, { name: entry.employeeName, workHours: 0, travelHours: 0, loaCount: 0 });
                        }
                        const data = map.get(key)!;
                        const isTravelHours = entry.hourTypeName === 'Travel Hours';
                        if (isTravelHours) {
                          data.travelHours += safeNumber(entry.hours);
                        } else {
                          data.workHours += safeNumber(entry.hours);
                        }
                        data.loaCount += safeNumber(entry.loaCount) || 0;
                        return map;
                      }, new Map<string, { name: string; workHours: number; travelHours: number; loaCount: number }>()).values()
                    );

                    return (
                      <div key={`date-${dateIdx}-${dayData.date}`} className="border rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-bold text-blue-700">{formattedDate}</p>
                          <p className="text-sm font-semibold text-blue-600">{dayTotalHours.toFixed(2)}h</p>
                        </div>
                        <div className="space-y-1 text-sm">
                          {employeesByDate.map((emp, empIdx) => {
                            const loaText = emp.loaCount > 0 ? ` • ${emp.loaCount} LoA` : '';
                            const totalEmpHours = emp.workHours + emp.travelHours;
                            const hoursDisplay = emp.travelHours > 0
                              ? `${emp.workHours.toFixed(2)}HR - ${emp.travelHours.toFixed(2)}TRV`
                              : `${totalEmpHours.toFixed(2)}HR`;
                            return (
                              <div key={`emp-${dateIdx}-${empIdx}`} className="flex items-center justify-between pl-3">
                                <span className="font-semibold text-pink-500">{emp.name}</span>
                                <span className="font-semibold text-blue-600">{hoursDisplay}{loaText}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {jobEntries.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <p className="text-gray-700 font-medium">No Time Entries Found</p>
                <p className="text-sm text-gray-600 mt-2">
                  There are no time entries assigned to this job yet.
                </p>
              </div>
            )}

            {/* Export Button */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export as PDF
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                variant="default"
                className="ml-auto"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
