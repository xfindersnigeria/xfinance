"use client";

import { Column } from "@/components/local/custom/custom-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { BudgetHeaderListItem } from "@/lib/api/hooks/types/accountsTypes";

// ── Budget header list columns (for the "Budgets" tab) ─────────────────────

export function createBudgetHeaderColumns(
  sym: string,
  onView: (row: BudgetHeaderListItem) => void,
  onEdit: (row: BudgetHeaderListItem) => void,
  onDelete: (row: BudgetHeaderListItem) => void,
): Column<BudgetHeaderListItem>[] {
  return [
    {
      key: "name",
      title: "Budget Name",
      className: "font-medium",
      render: (value) => (
        <span className="text-gray-900 font-semibold">{value || "—"}</span>
      ),
    },
    {
      key: "periodType",
      title: "Period Type",
      className: "text-xs",
      render: (value) => (
        <Badge variant="outline" className="text-xs">
          {value || "—"}
        </Badge>
      ),
    },
    {
      key: "period",
      title: "Period",
      className: "text-xs",
      render: (value, row: BudgetHeaderListItem) => (
        <span className="text-gray-700">
          {value || row.fiscalYear || "—"}
        </span>
      ),
    },
    {
      key: "fiscalYear",
      title: "Fiscal Year",
      className: "text-xs",
      render: (value) => (
        <span className="text-gray-700">FY {value}</span>
      ),
    },
    {
      key: "totalAmount",
      title: `Total (${sym})`,
      className: "text-xs text-right",
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {sym}
          {Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: "accountCount",
      title: "# Accounts",
      className: "text-xs text-center",
      render: (value) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
          {value ?? 0}
        </span>
      ),
    },
    {
      key: "id",
      title: "Actions",
      className: "text-xs",
      render: (_value, row: BudgetHeaderListItem) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => onView(row)}
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-amber-600 hover:bg-amber-50"
            onClick={() => onEdit(row)}
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(row)}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

// ── Budget vs Actual columns ────────────────────────────────────────────────

export function createBudgetVsActualColumns(sym: string): Column<any>[] {
  return [
    {
      key: "account",
      title: "Account",
      className: "text-xs font-medium",
      render: (value) => (
        <span className="text-gray-900 font-semibold">{value || "—"}</span>
      ),
    },
    {
      key: "budgeted",
      title: "Budgeted",
      className: "text-xs text-right",
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {sym}
          {value
            ? parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "0.00"}
        </span>
      ),
    },
    {
      key: "actual",
      title: "Actual",
      className: "text-xs text-right",
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {sym}
          {value
            ? parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : "0.00"}
        </span>
      ),
    },
    {
      key: "variance",
      title: "Variance",
      className: "text-xs text-right",
      render: (value) => {
        const num = parseFloat(value);
        const pos = num > 0;
        return (
          <span className={`font-medium ${pos ? "text-green-600" : "text-red-600"}`}>
            {pos ? "+" : ""}
            {sym}
            {num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "variancePercentage",
      title: "Variance %",
      className: "text-xs text-right",
      render: (value) => {
        const num = parseFloat(value);
        const pos = num > 0;
        return (
          <span className={`font-medium ${pos ? "text-green-600" : "text-red-600"}`}>
            {pos ? "+" : ""}
            {num.toFixed(1)}%
          </span>
        );
      },
    },
  ];
}

// Legacy export for backward compat
export const createBudgetColumns = createBudgetVsActualColumns;
