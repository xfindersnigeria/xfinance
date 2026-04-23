"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { ChevronRight, FileText } from "lucide-react";

export const groupReportsData = [
  {
    id: "consolidated-pl",
    name: "Consolidated Profit and Loss",
    lastVisited: "A few seconds ago",
    createdBy: "System Generated",
  },
  {
    id: "consolidated-bs",
    name: "Consolidated Balance Sheet",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "consolidated-cf",
    name: "Consolidated Cash Flow Statement",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "consolidated-soe",
    name: "Consolidated Statement of Changes in Equity",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "consolidated-fp",
    name: "Consolidated Financial Position",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "ic-transactions",
    name: "Intercompany Transactions Report",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "ic-reconciliation",
    name: "Intercompany Balance Reconciliation",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "elimination-log",
    name: "Elimination Entries Log",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "entity-revenue",
    name: "Entity Revenue Comparison",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "entity-profitability",
    name: "Entity Profitability Analysis",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "cross-entity-metrics",
    name: "Cross-Entity Performance Metrics",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "entity-expense",
    name: "Entity Expense Comparison",
    lastVisited: "-",
    createdBy: "System Generated",
  },
];

export const groupReportsColumns: Column<any>[] = [
  {
    key: "name",
    title: "REPORT NAME",
    className: "text-xs min-w-[280px]",
    render: (value, row) => (
      <button className="text-indigo-700 font-medium flex items-center gap-2 hover:underline cursor-pointer text-left">
        <FileText className="w-4 h-4 shrink-0" />
        <span>{value}</span>
      </button>
    ),
  },
  {
    key: "lastVisited",
    title: "LAST VISITED",
    className: "text-xs min-w-[150px]",
  },
  {
    key: "createdBy",
    title: "CREATED BY",
    className: "text-xs min-w-[150px]",
  },
  {
    key: "action",
    title: "",
    className: "text-xs w-8",
    render: () => <ChevronRight className="w-4 h-4 text-gray-400" />,
  },
];
