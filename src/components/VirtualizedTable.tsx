import React, { useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: number;
  minWidth?: number;
  render?: (value: any, item: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  height?: number;
  itemHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  isLoading?: boolean;
  emptyMessage?: string;
}

interface RowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: {
    items: T[];
    columns: Column<T>[];
    onRowClick?: (item: T, index: number) => void;
  };
}

function TableRow<T>({ index, style, data }: RowProps<T>) {
  const { items, columns, onRowClick } = data;
  const item = items[index];

  if (!item) {
    return <div style={style} />;
  }

  const handleClick = () => {
    onRowClick?.(item, index);
  };

  return (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        borderBottom: "1px solid rgb(229 231 235)",
        cursor: onRowClick ? "pointer" : "default",
      }}
      onClick={handleClick}
      className="hover:bg-gray-50"
    >
      {columns.map((column, colIndex) => {
        const value =
          typeof column.key === "string" && column.key.includes(".")
            ? column.key.split(".").reduce((obj, key) => obj?.[key], item)
            : (item as any)[column.key];

        const cellContent = column.render
          ? column.render(value, item, index)
          : value?.toString() || "";

        return (
          <div
            key={`${index}-${colIndex}`}
            style={{
              width: column.width || "auto",
              minWidth: column.minWidth || 100,
              padding: "12px 16px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: column.width ? "none" : "1",
            }}
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
}

export function VirtualizedTable<T>({
  data,
  columns,
  height = 400,
  itemHeight = 48,
  onRowClick,
  pagination,
  isLoading = false,
  emptyMessage = "No data available",
}: VirtualizedTableProps<T>) {
  const listData = useMemo(
    () => ({
      items: data,
      columns,
      onRowClick,
    }),
    [data, columns, onRowClick],
  );

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.pageSize)
    : 1;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-2"></div>
              <p className="text-gray-500">Loading data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-500">{emptyMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        {/* Table Header */}
        <div
          style={{
            display: "flex",
            borderBottom: "2px solid rgb(229 231 235)",
            backgroundColor: "rgb(249 250 251)",
            fontWeight: "600",
          }}
        >
          {columns.map((column, index) => (
            <div
              key={index}
              style={{
                width: column.width || "auto",
                minWidth: column.minWidth || 100,
                padding: "12px 16px",
                flex: column.width ? "none" : "1",
              }}
            >
              {column.header}
            </div>
          ))}
        </div>

        {/* Virtualized Table Body */}
        <List
          height={height}
          itemCount={data.length}
          itemSize={itemHeight}
          itemData={listData}
          width="100%"
        >
          {TableRow}
        </List>

        {/* Pagination */}
        {pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
              {Math.min(
                pagination.page * pagination.pageSize,
                pagination.total,
              )}{" "}
              of {pagination.total} results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => pagination.onPageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Optimized search input with debouncing
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = React.useState(value);

  // Debounce the onChange callback
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [localValue, onChange, value, debounceMs]);

  // Sync with external value changes
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
    />
  );
}
