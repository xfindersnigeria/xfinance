"use client";
import { Column } from "@/components/local/custom/custom-table";

export function createBudgetColumns(sym: string): Column<any>[] {
  return [
    {
      key: "account",
      title: "Account",
      className: "text-xs font-medium",
      render: (value) => (
        <span className="text-gray-900 font-semibold">{value || "-"}</span>
      ),
    },
    {
      key: "budgeted",
      title: "Budgeted",
      className: "text-xs text-right",
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {value ? `${sym}${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${sym}0.00`}
        </span>
      ),
    },
    {
      key: "actual",
      title: "Actual",
      className: "text-xs text-right",
      render: (value) => (
        <span className="text-gray-900 font-medium">
          {value ? `${sym}${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${sym}0.00`}
        </span>
      ),
    },
    {
      key: "variance",
      title: "Variance",
      className: "text-xs text-right",
      render: (value) => {
        const numValue = parseFloat(value);
        const isPositive = numValue > 0;
        return (
          <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}{sym}{numValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "variancePercentage",
      title: "Variance %",
      className: "text-xs text-right",
      render: (value) => {
        const numValue = parseFloat(value);
        const isPositive = numValue > 0;
        return (
          <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {isPositive ? "+" : ""}{numValue.toFixed(1)}%
          </span>
        );
      },
    },
  ];
}
