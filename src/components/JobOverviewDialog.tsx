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
import { Printer } from "lucide-react";
import { Job, TimeEntrySummary } from "@/types";

interface JobOverviewDialogProps {
  job: Job | null;
  timeEntrySummaries: TimeEntrySummary[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to safely convert to number
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
  const [isClientView, setIsClientView] = useState(false);

  if (!job) return null;

  // Debug: Comprehensive logging
  console.group("🔍 JobOverviewDialog Debug");
  console.log("Job ID:", job.id);
  console.log("Job Number:", job.jobNumber, `(type: ${typeof job.jobNumber})`);
  console.log("Job Name:", job.name);
  console.log("---");
  console.log("Total timeEntrySummaries available:", timeEntrySummaries?.length || 0);

  // Show all unique job numbers in the summaries
  if (timeEntrySummaries && timeEntrySummaries.length > 0) {
    const uniqueJobNumbers = [...new Set(timeEntrySummaries.map(s => s.jobNumber))];
    console.log("Unique job numbers in summaries:", uniqueJobNumbers);
    console.log("First 5 summaries:");
    timeEntrySummaries.slice(0, 5).forEach((s, i) => {
      console.log(`  [${i}] jobNumber="${s.jobNumber}" (matches: ${s.jobNumber === job.jobNumber}), employee: "${s.employeeName}", hours: ${s.hours}`);
    });
  }

  // Filter time entries for this job
  const jobEntries = (timeEntrySummaries || []).filter((entry) => {
    return entry.jobNumber === job.jobNumber;
  });

  console.log("---");
  console.log("✅ Filtered entries for this job:", jobEntries.length);
  if (jobEntries.length > 0) {
    console.log("Sample filtered entry:", jobEntries[0]);
  }

  // Calculate total hours with safe number conversion
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

  console.log("Totals calculated:");
  console.log("  totalHours:", totalHours);
  console.log("  totalCost:", totalCost);
  console.log("  totalBillable:", totalBillable);

  // Group by employee with safe number handling
  const employeeBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const key = entry.employeeName;
      if (!map.has(key)) {
        map.set(key, {
          name: entry.employeeName,
          hours: 0,
          cost: 0,
          billable: 0,
        });
      }
      const data = map.get(key)!;
      data.hours += safeNumber(entry.hours);
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      return map;
    }, new Map<string, { name: string; hours: number; cost: number; billable: number }>()).values()
  ).sort((a, b) => b.hours - a.hours);

  console.log("Employee breakdown count:", employeeBreakdown.length);
  if (employeeBreakdown.length > 0) {
    console.log("First employee:", employeeBreakdown[0]);
  }

  // Group by title with safe number handling
  const titleBreakdown = Array.from(
    jobEntries.reduce((map, entry) => {
      const key = entry.employeeTitle;
      if (!map.has(key)) {
        map.set(key, {
          title: entry.employeeTitle,
          hours: 0,
          cost: 0,
          billable: 0,
        });
      }
      const data = map.get(key)!;
      data.hours += safeNumber(entry.hours);
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      return map;
    }, new Map<string, { title: string; hours: number; cost: number; billable: number }>()).values()
  ).sort((a, b) => b.hours - a.hours);

  console.log("Title breakdown count:", titleBreakdown.length);
  if (titleBreakdown.length > 0) {
    console.log("First title:", titleBreakdown[0]);
  }
  console.groupEnd();

  // Group by month
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
          cost: 0,
          billable: 0,
          entries: [],
        });
      }
      const data = map.get(monthKey)!;
      data.hours += safeNumber(entry.hours);
      data.cost += safeNumber(entry.totalCost);
      data.billable += safeNumber(entry.totalBillableAmount);
      data.entries.push(entry);
      return map;
    }, new Map<string, { key: string; label: string; hours: number; cost: number; billable: number; entries: TimeEntrySummary[] }>()).values()
  ).sort((a, b) => a.key.localeCompare(b.key));

  // Group entries by date
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

  const handlePrint = () => {
    // Scroll to top of the dialog content
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    if (dialog) {
      dialog.scrollTop = 0;
      // Also try scrolling any parent containers
      if (dialog.parentElement) {
        dialog.parentElement.scrollTop = 0;
      }
    }

    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" style={{ maxHeight: 'unset', overflow: 'visible' }} onPrint={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.maxHeight = 'unset';
        el.style.overflow = 'visible';
      }}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Job Overview</DialogTitle>
          <DialogDescription>
            {job.jobNumber} - {job.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* View Toggle */}
          <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
            <span className="text-sm font-medium text-gray-700">
              {isClientView ? "👥 Client View" : "👨‍💼 Internal View"}
            </span>
            <button
              onClick={() => setIsClientView(!isClientView)}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
            >
              {isClientView ? "Show Internal Data" : "Show Client View"}
            </button>
          </div>

          {/* Summary Cards - Hidden in Client View */}
          {!isClientView && (
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
              <p className="text-sm text-gray-600 font-medium">
                Total Billable
              </p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                ${safeNumber(totalBillable).toFixed(2)}
              </p>
            </div>
          </div>
          )}

          {/* Total Hours - Always Shown */}
          {isClientView && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-gray-600 font-medium">Total Hours</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {safeNumber(totalHours).toFixed(2)}
            </p>
          </div>
          )}

          {/* Job Details - Simplified for Client View */}
          <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <span className="font-medium">Status:</span>{" "}
              <Badge
                variant={job.isActive ? "default" : "secondary"}
              >
                {job.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {job.description && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Description:</span>{" "}
                {job.description}
              </div>
            )}
            {!isClientView && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Billable:</span>{" "}
              {job.isBillable ? "Yes" : "No"}
            </div>
            )}
          </div>

          {/* Employee Breakdown */}
          {employeeBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Employee Breakdown</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      {!isClientView && (
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
                        <TableCell className="text-right">
                          {safeNumber(emp.hours).toFixed(2)}h
                        </TableCell>
                        {!isClientView && (
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
                      <TableCell className="text-right">
                        {safeNumber(
                          employeeBreakdown.reduce((sum, e) => sum + e.hours, 0)
                        ).toFixed(2)}
                        h
                      </TableCell>
                      {!isClientView && (
                        <>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              employeeBreakdown.reduce((sum, e) => sum + e.cost, 0)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              employeeBreakdown.reduce(
                                (sum, e) => sum + e.billable,
                                0
                              )
                            ).toFixed(2)}
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
          {titleBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Title Breakdown</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
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
                        <TableCell className="font-medium">
                          {title.title}
                        </TableCell>
                        <TableCell className="text-right">
                          {safeNumber(title.hours).toFixed(2)}h
                        </TableCell>
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
                      <TableCell className="text-right">
                        {safeNumber(
                          titleBreakdown.reduce((sum, t) => sum + t.hours, 0)
                        ).toFixed(2)}
                        h
                      </TableCell>
                      {!isClientView && (
                        <>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              titleBreakdown.reduce((sum, t) => sum + t.cost, 0)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              titleBreakdown.reduce(
                                (sum, t) => sum + t.billable,
                                0
                              )
                            ).toFixed(2)}
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
          {monthlyBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
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
                        <TableCell className="text-right">
                          {safeNumber(month.hours).toFixed(2)}h
                        </TableCell>
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
                      <TableCell className="text-right">
                        {safeNumber(
                          monthlyBreakdown.reduce((sum, m) => sum + m.hours, 0)
                        ).toFixed(2)}
                        h
                      </TableCell>
                      {!isClientView && (
                        <>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              monthlyBreakdown.reduce((sum, m) => sum + m.cost, 0)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            $
                            {safeNumber(
                              monthlyBreakdown.reduce(
                                (sum, m) => sum + m.billable,
                                0
                              )
                            ).toFixed(2)}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Time Entry Details by Date */}
          {dateBasedBreakdown.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Time Entry Details</h3>
              <div className="space-y-3">
                {dateBasedBreakdown.map((dayData, dateIdx) => {
                  const dateObj = new Date(dayData.date);
                  const formattedDate = dateObj.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const dayTotalHours = dayData.entries.reduce((sum, e) => sum + safeNumber(e.hours), 0);

                  // Group entries by employee name for this date
                  const employeesByDate = Array.from(
                    dayData.entries.reduce((map, entry) => {
                      const key = entry.employeeName;
                      if (!map.has(key)) {
                        map.set(key, {
                          name: entry.employeeName,
                          hours: 0,
                          loaCount: 0,
                        });
                      }
                      const data = map.get(key)!;
                      data.hours += safeNumber(entry.hours);
                      data.loaCount += safeNumber(entry.loaCount) || 0;
                      return map;
                    }, new Map<string, { name: string; hours: number; loaCount: number }>()).values()
                  );

                  return (
                    <div key={`date-${dateIdx}-${dayData.date}`} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-blue-700">{formattedDate}</p>
                        <p className="text-sm font-semibold text-blue-600">
                          {dayTotalHours.toFixed(2)}h
                        </p>
                      </div>

                      <div className="space-y-1 text-sm">
                        {employeesByDate.map((emp, empIdx) => {
                          const loaText = emp.loaCount > 0 ? ` • ${emp.loaCount} LoA` : '';

                          return (
                            <div key={`emp-${dateIdx}-${empIdx}`} className="flex items-center justify-between pl-3">
                              <span className="font-semibold text-pink-500">{emp.name}</span>
                              <span className="font-semibold text-blue-600">{emp.hours.toFixed(2)}h{loaText}</span>
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
              <p className="text-xs text-gray-500 mt-3">
                Create time entries in the "Time Entry" section and assign them to this job to see the overview data.
              </p>
            </div>
          )}

          {/* Print Button */}
          <div className="flex gap-2 pt-4 border-t print:hidden">
            <Button
              onClick={handlePrint}
              variant="outline"
              className="flex items-center gap-2"
              disabled={isPrinting}
            >
              <Printer className="h-4 w-4" />
              Print Overview
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

      {/* Print Styles */}
      <style>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </Dialog>
  );
}
