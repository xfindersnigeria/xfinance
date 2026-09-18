"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";
import { Column } from "@/components/local/custom/custom-table";

export const groupCategoryLabels: Record<string, string> = {
  consolidated: "Consolidated Statements",
  intercompany: "Intercompany Reports",
  comparison: "Entity Comparison",
  analytics: "Group Analytics",
};

/**
 * Group reports temporarily hidden from the list (the pages stay in place).
 * Intercompany is hidden together with the Intercompany menu — see
 * HIDDEN_GROUP_MODULE_KEYS in apps/api/src/menu/menu.service.ts. To bring it
 * back, remove its key here (and restore its detail component in
 * details/GroupReportDetails.tsx once intercompany data exists).
 */
export const HIDDEN_GROUP_REPORTS = ["intercompany-transactions"];

const allGroupReports = [
  { key: "consolidated-profit-and-loss", name: "Consolidated Profit and Loss", category: "consolidated" },
  { key: "consolidated-balance-sheet", name: "Consolidated Balance Sheet", category: "consolidated" },
  { key: "consolidated-cash-flow-statement", name: "Consolidated Cash Flow Statement", category: "consolidated" },
  { key: "consolidated-financial-position", name: "Consolidated Financial Position", category: "consolidated" },
  { key: "intercompany-transactions", name: "Intercompany Transactions Report", category: "intercompany" },
  { key: "entity-revenue-comparison", name: "Entity Revenue Comparison", category: "comparison" },
  { key: "entity-profitability-analysis", name: "Entity Profitability Analysis", category: "comparison" },
  { key: "entity-expense-comparison", name: "Entity Expense Comparison", category: "comparison" },
  { key: "group-cash-flow-forecasting", name: "Group Cash Flow Forecasting Report", category: "analytics" },
].map((r) => ({ ...r, createdBy: "System Generated" }));

export const groupReportsData = allGroupReports.filter((r) => !HIDDEN_GROUP_REPORTS.includes(r.key));

export const groupReportsColumns: Column<any>[] = [
  {
    key: "name",
    title: "REPORT NAME",
    className: "text-xs min-w-[280px]",
    render: (value, row) => (
      <Link
        prefetch
        href={`/reports/${row.key}`}
        className="text-primary font-medium flex items-center gap-2 hover:underline cursor-pointer"
      >
        <FileText className="w-4 h-4 shrink-0" />
        <span>{value}</span>
      </Link>
    ),
  },
  {
    key: "createdBy",
    title: "CREATED BY",
    className: "text-xs min-w-[150px]",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "action",
    title: "",
    className: "text-xs w-8",
    render: (_value, row) => (
      <Link prefetch href={`/reports/${row.key}`} className="block text-right">
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </Link>
    ),
  },
];
