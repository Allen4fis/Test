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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  FileText,
  DollarSign,
  Check,
  X,
  Plus,
  Minus,
  Eye,
  ArrowUpDown,
  Filter,
  EyeOff,
  Clock,
  CreditCard,
} from "lucide-react";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { toast } from "@/hooks/use-toast";
import { Job } from "@/types";

import { parseLocalDate, formatLocalDate } from "@/utils/dateUtils";

interface JobDateInfo {
  date: string;
  isInvoiced: boolean;
  isPaid: boolean;
  timeEntries: any[];
  rentalEntries: any[];
  totalHours: number;
  totalLoaCount: number;
  laborCost: number;
  laborBillable: number;
  rentalBillable: number;
  loaCost: number;
  totalCost: number;
  totalBillable: number;
}

// Streamlined Job Card Component
const JobCard = ({
  jobStat,
  onToggleInvoiced,
  onTogglePaid,
  onViewDetails,
}) => {
  const getInvoiceStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getPaidStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage > 0) return "bg-blue-500";
    return "bg-purple-500";
  };

  return (
    <div className="p-4 bg-gray-800/50 border border-gray-600 rounded-lg hover:border-orange-500/50 transition-all">
      {/* Job Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold text-gray-100">
            {jobStat.job.jobNumber}
          </div>
          <div className="text-sm text-gray-300 truncate max-w-[200px]">
            {jobStat.job.name}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">{jobStat.totalDates} days</div>
          <div className="text-xs text-gray-500">
            {jobStat.totalHours.toFixed(1)}h
          </div>
        </div>
      </div>

      {/* Status Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">
            {jobStat.invoicePercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400 mb-1">Invoiced</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${getInvoiceStatusColor(jobStat.invoicePercentage)}`}
              style={{ width: `${jobStat.invoicePercentage}%` }}
            />
          </div>
          <div className="text-xs space-y-1">
            <div className="text-green-400">✓ {jobStat.invoicedDates} days</div>
            <div className="text-red-400">✗ {jobStat.uninvoicedDates} days</div>
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-bold text-purple-400">
            {jobStat.paidPercentage.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400 mb-1">Paid</div>
          <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${getPaidStatusColor(jobStat.paidPercentage)}`}
              style={{ width: `${jobStat.paidPercentage}%` }}
            />
          </div>
          <div className="text-xs space-y-1">
            <div className="text-green-400">✓ {jobStat.paidDates} days</div>
            <div className="text-purple-400">◯ {jobStat.unpaidDates} days</div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-700 pt-3">
        <div>
          <div className="text-sm font-bold text-green-400">
            ${jobStat.totalBillable.toFixed(0)}
          </div>
          <div className="text-xs text-gray-400">Total Billable</div>
        </div>
        <div>
          <div className="text-sm font-bold text-red-400">
            ${jobStat.uninvoicedBillable.toFixed(0)}
          </div>
          <div className="text-xs text-gray-400">Uninvoiced</div>
        </div>
        <div>
          <div className="text-sm font-bold text-purple-400">
            ${jobStat.unpaidBillable.toFixed(0)}
          </div>
          <div className="text-xs text-gray-400">Unpaid</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onToggleInvoiced(jobStat.job)}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-1" />
          Invoice
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onTogglePaid(jobStat.job)}
          className="flex-1"
        >
          <CreditCard className="h-4 w-4 mr-1" />
          Payment
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails(jobStat.job)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export { JobCard };
