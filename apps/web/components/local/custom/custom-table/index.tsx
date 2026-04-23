"use client";
import * as React from "react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface Column<T> {
  key: string;
  title: string;
  render?: (value: any, row: T, rowIndex: number) => React.ReactNode;
  className?: string;
  searchable?: boolean;
}

interface CustomTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  className?: string;
  tableTitle?: string;
  tableSubtitle?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onMethodsChange?: (value: string) => void;
  onRowClick?: (row: T, rowIndex: number) => void;
  display?: {
    searchComponent?: boolean;
    filterComponent?: boolean;
    statusComponent?: boolean;
    methodsComponent?: boolean;
    exportButton?: boolean;
  };
  statusOptions?: string[];
  methodsOptions?: string[];
  loading?: boolean;
  // Slot for extra elements rendered in the header bar (e.g. action buttons)
  headerActions?: React.ReactNode;
  // Pagination props
  pagination?: {
    page: number;
    totalPages: number;
    total?: number;
    onPageChange: (page: number) => void;
  };
  // Row selection props
  selectableRows?: boolean;
  onSelectedRowsChange?: (selected: T[]) => void;
  selectionActionText?: any;
  onSelectionAction?: (selected: T[]) => void;
  selectionKey?: string; // unique key for row selection, defaults to 'id'
}

export function CustomTable<T extends { [key: string]: any }>({
  columns,
  data,
  pageSize = 10,
  className,
  tableTitle,
  tableSubtitle,
  searchPlaceholder,
  onSearchChange,
  onStatusChange,
  onMethodsChange,
  onRowClick,
  display: {
    searchComponent = true,
    filterComponent = false,
    statusComponent = false,
    methodsComponent = false,
    exportButton = false,
  } = {},
  statusOptions = [],
  methodsOptions = [],
  loading = false,
  headerActions,
  pagination,
  selectableRows = false,
  onSelectedRowsChange,
  selectionActionText = "Action",
  onSelectionAction,
  selectionKey = "id",
}: CustomTableProps<T>) {
  const [search, setSearch] = useState("");
  // Row selection state
  const [selectedRows, setSelectedRows] = useState<T[]>([]);


  // Handle select all
 
  // Use provided pagination or local pagination
  const isServerPaginated = !!pagination && pagination.onPageChange !== undefined;
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || Math.ceil(data.length / pageSize);
  const [localPage, setLocalPage] = useState(1);
  const page = isServerPaginated ? currentPage : localPage;

  // For local pagination: slice data
  // For server pagination: use data as-is (already paginated by API)
  const pagedData = useMemo(() => {
    if (isServerPaginated) {
      return data;
    }
    return data.slice((page - 1) * pageSize, page * pageSize);
  }, [data, page, pageSize, isServerPaginated]);

  const handlePreviousPage = () => {
    if (isServerPaginated) {
      pagination?.onPageChange?.(Math.max(page - 1, 1));
    } else {
      setLocalPage((prev) => Math.max(prev - 1, 1));
    }
  };

  const handleNextPage = () => {
    if (isServerPaginated) {
      pagination?.onPageChange?.(Math.min(page + 1, totalPages));
    } else {
      setLocalPage((prev) => Math.min(prev + 1, totalPages));
    }
  };

    // Helper to get unique row key
  const getRowKey = (row: T) => row[selectionKey] ?? row["id"] ?? row["key"];


   const allSelected = pagedData.length > 0 && selectedRows.length === pagedData.length;
  const isRowSelected = (row: T) => selectedRows.some(r => getRowKey(r) === getRowKey(row));
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedRows([]);
      onSelectedRowsChange?.([]);
    } else {
      setSelectedRows(pagedData);
      onSelectedRowsChange?.(pagedData);
    }
  };
  const handleSelectRow = (row: T) => {
    let updated: T[];
    if (isRowSelected(row)) {
      updated = selectedRows.filter(r => getRowKey(r) !== getRowKey(row));
    } else {
      updated = [...selectedRows, row];
    }
    setSelectedRows(updated);
    onSelectedRowsChange?.(updated);
  };
  

  return (
    <div className={cn("w-full bg-white p-4 rounded-2xl shadow-md", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-normal text-base">{tableTitle}</h2>
          {tableSubtitle && (
            <p className="text-sm text-gray-500">{tableSubtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {headerActions}
          {selectableRows && selectedRows.length > 0 && (
            <Button
              variant="default"
              className="rounded-2xl"
              onClick={() => onSelectionAction?.(selectedRows)}
            >
              <span className="flex items-center gap-1">
                {selectionActionText}
                <span className="ml-1">({selectedRows.length})</span>
              </span>
            </Button>
          )}
          {searchComponent && (
            <div className="relative w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <Input
                placeholder={searchPlaceholder || "Search..."}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  onSearchChange?.(e.target.value);
                }}
                className="pl-8 w-64 bg-gray-100 rounded-2xl"
              />
            </div>
          )}
          {statusComponent && (
            <Select
              onValueChange={(value) => {
                onStatusChange?.(value);
              }}
              defaultValue={statusOptions[0] || ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {methodsComponent && (
            <Select
              onValueChange={(value) => {
                onMethodsChange?.(value);
              }}
              defaultValue={methodsOptions[0] || ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {methodsOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filterComponent && (
            <Button variant="outline" className="rounded-2xl">
              <Filter /> Filter
            </Button>
          )}
          {exportButton && (
            <Button variant="outline" className="rounded-2xl">
              <Download /> Export
            </Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              {selectableRows && (
                <th className="px-4 py-2 text-left font-semibold text-gray-700 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-2 text-left font-semibold text-gray-700",
                    col.className,
                  )}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="">
            {loading ? (
              [...Array(pageSize)].map((_, i) => (
                <tr key={i} className="border-t animate-pulse ">
                  {selectableRows && <td className="px-4 py-2"><div className="h-4 w-4 bg-gray-200 rounded" /></td>}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-2", col.className)}
                    >
                      <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectableRows ? 1 : 0)}
                  className="text-center py-8 text-gray-400"
                >
                  No data found
                </td>
              </tr>
            ) : (
              pagedData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className={cn(
                    "border-t hover:bg-gray-50",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {selectableRows && (
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={isRowSelected(row)}
                        onChange={e => {
                          e.stopPropagation();
                          handleSelectRow(row);
                        }}
                        aria-label="Select row"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-4 py-2", col.className)}
                    >
                      {col.render
                        ? col.render(row[col.key], row, rowIndex)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-0 py-3">
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
            {pagination?.total && (
              <span className="ml-2">
                (Total: <span className="font-semibold">{pagination.total}</span> items)
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1 || loading}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
              className="flex items-center gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
