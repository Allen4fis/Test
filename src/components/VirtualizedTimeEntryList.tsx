import { useMemo, useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

interface VirtualizedTimeEntryListProps {
  entries: any[];
  onEdit: (entry: any) => void;
  onDelete: (entry: any) => void;
  itemHeight?: number;
  containerHeight?: number;
}

export function VirtualizedTimeEntryList({
  entries,
  onEdit,
  onDelete,
  itemHeight = 60,
  containerHeight = 600,
}: VirtualizedTimeEntryListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight) + 2, // +2 for buffer
      entries.length,
    );

    return {
      start: Math.max(0, visibleStart - 1), // -1 for buffer
      end: visibleEnd,
    };
  }, [scrollTop, itemHeight, containerHeight, entries.length]);

  // Get visible entries
  const visibleEntries = useMemo(() => {
    return entries.slice(visibleRange.start, visibleRange.end);
  }, [entries, visibleRange.start, visibleRange.end]);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate total height and offset
  const totalHeight = entries.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div
      ref={containerRef}
      className="overflow-auto border rounded-lg"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-gray-900 z-10">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Billable</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleEntries.map((entry, index) => {
                const actualIndex = visibleRange.start + index;
                const isTimeEntry = entry.entryType === "time";

                return (
                  <TableRow
                    key={`${entry.entryType}-${entry.id}`}
                    className="hover:bg-gray-800/50"
                    style={{ height: itemHeight }}
                  >
                    <TableCell>
                      {formatDate(isTimeEntry ? entry.date : entry.startDate)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {isTimeEntry
                            ? entry.employeeName
                            : entry.employeeName || "Unassigned"}
                        </span>
                        {isTimeEntry && entry.employeeTitle && (
                          <span className="text-xs text-gray-400">
                            {entry.employeeTitle}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {isTimeEntry ? entry.jobNumber : entry.jobNumber}
                        </span>
                        <span className="text-xs text-gray-400">
                          {isTimeEntry ? entry.jobName : entry.jobName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isTimeEntry ? (
                        <div className="flex flex-col">
                          <span>{entry.hours}h</span>
                          {entry.loaCount > 0 && (
                            <span className="text-xs text-blue-400">
                              +{entry.loaCount} LOA
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {isTimeEntry ? entry.hourTypeName : "Rental"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(entry.totalCost)}
                    </TableCell>
                    <TableCell className="font-mono">
                      {isTimeEntry
                        ? formatCurrency(entry.totalBillableAmount)
                        : formatCurrency(entry.totalBillable || 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(entry)}
                          className="h-7 w-7 p-0 hover:bg-blue-600/20"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(entry)}
                          className="h-7 w-7 p-0 hover:bg-red-600/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
        Showing {visibleRange.start + 1}-{visibleRange.end} of {entries.length}
      </div>
    </div>
  );
}
