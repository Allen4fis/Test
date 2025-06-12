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

// Streamlined Employee Card Component
const EmployeeCard = ({ employee, index, dspCalc, isSubordinate = false }) => {
  const totalGst =
    (employee.gstAmount || 0) + (employee.subordinateGstTotal || 0);

  return (
    <div
      className={`relative p-4 rounded-lg border transition-all hover:shadow-lg ${
        isSubordinate
          ? "bg-blue-900/10 border-blue-500/30 ml-8"
          : "bg-gray-800/50 border-gray-600"
      }`}
    >
      {/* Employee Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {isSubordinate ? (
            <>
              <div className="w-3 h-3 border-l-2 border-b-2 border-blue-400 absolute -left-4 top-6"></div>
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                ↳
              </span>
              <div>
                <div className="font-semibold text-blue-300">
                  {employee.employeeName}
                </div>
                <div className="text-xs text-blue-200">
                  {employee.employeeTitle}
                </div>
              </div>
            </>
          ) : (
            <>
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
              <div>
                <div className="font-semibold text-gray-100">
                  {employee.employeeName}
                </div>
                <div className="text-sm text-gray-300">
                  {employee.employeeTitle}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {employee.entries.length} entries
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-4 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">
            {employee.totalHours.toFixed(1)}h
          </div>
          <div className="text-xs text-gray-400">Total Hours</div>
          {employee.totalEffectiveHours !== employee.totalHours && (
            <div className="text-xs text-gray-500">
              ({employee.totalEffectiveHours.toFixed(1)}h eff)
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-green-400">
            ${employee.totalCost.toFixed(0)}
          </div>
          <div className="text-xs text-gray-400">Total Cost</div>
        </div>

        <div className="text-center">
          {totalGst > 0 ? (
            <>
              <div className="text-lg font-bold text-orange-400">
                ${totalGst.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">GST (5%)</div>
              {employee.subordinateGstTotal > 0 && (
                <div className="text-xs text-blue-300">
                  +${employee.subordinateGstTotal.toFixed(0)} subs
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-lg text-gray-500">-</div>
              <div className="text-xs text-gray-400">GST (5%)</div>
            </>
          )}
        </div>

        <div className="text-center">
          {dspCalc && dspCalc.dspEarnings > 0 ? (
            <>
              <div className="text-lg font-bold text-purple-400">
                ${dspCalc.dspEarnings.toFixed(0)}
              </div>
              <div className="text-xs text-gray-400">DSP Earnings</div>
            </>
          ) : (
            <>
              <div className="text-lg text-gray-500">-</div>
              <div className="text-xs text-gray-400">DSP Earnings</div>
            </>
          )}
        </div>
      </div>

      {/* Hour Types Compact View */}
      {employee.hourTypeBreakdown &&
        Object.keys(employee.hourTypeBreakdown).length > 0 && (
          <div className="border-t border-gray-700 pt-3">
            <div className="text-xs font-semibold text-gray-300 mb-2">
              Hour Types:
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(employee.hourTypeBreakdown)
                .sort(([, a], [, b]) => b.hours - a.hours)
                .slice(0, 3)
                .map(([hourType, data]) => (
                  <div
                    key={hourType}
                    className="bg-orange-600/20 border border-orange-500/30 rounded px-2 py-1"
                  >
                    <div className="text-xs font-medium text-orange-200">
                      {hourType}
                    </div>
                    <div className="text-xs text-orange-300">
                      {data.hours.toFixed(1)}h • ${data.cost.toFixed(0)}
                      {data.rateEntries && data.rateEntries.length > 0 && (
                        <span className="ml-1 text-orange-400">
                          @$
                          {(
                            data.rateEntries.reduce(
                              (sum, entry) =>
                                sum + entry.hourlyRate * entry.hours,
                              0,
                            ) /
                            data.rateEntries.reduce(
                              (sum, entry) => sum + entry.hours,
                              0,
                            )
                          ).toFixed(0)}
                          /hr
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              {Object.keys(employee.hourTypeBreakdown).length > 3 && (
                <div className="text-xs text-gray-400 self-center">
                  +{Object.keys(employee.hourTypeBreakdown).length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

      {/* Additional Info */}
      <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
        <div>
          {employee.totalLoaCount > 0 && (
            <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded">
              LOA: {employee.totalLoaCount}
            </span>
          )}
        </div>
        <div>
          {employee.entries.length > 0 && (
            <span>
              {formatLocalDate(employee.entries[0].date)}
              {employee.entries.length > 1 &&
                ` to ${formatLocalDate(employee.entries[employee.entries.length - 1].date)}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export { EmployeeCard };
