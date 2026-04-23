"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import Link from "next/link";
import { ChevronRight, File, FileText } from "lucide-react";

export const reportsData = [
  {
    id: "profit-and-loss",
    name: "Profit and Loss",
    lastVisited: "A few seconds ago",
    createdBy: "System Generated",
  },
  {
    id: "cash-flow-statement",
    name: "Cash Flow Statement",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "balance-sheet",
    name: "Balance Sheet",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "business-performance-ratios",
    name: "Business Performance Ratios",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "cash-flow-forecasting",
    name: "Cash Flow Forecasting",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "movement-of-equity",
    name: "Movement of Equity",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "sales-by-customer",
    name: "Sales by Customer",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "sales-by-item",
    name: "Sales by Item",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "sales-by-salesperson",
    name: "Sales by Salesperson",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "invoice-details",
    name: "Invoice Details",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "receivable-summary",
    name: "Receivable Summary",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "aged-receivables",
    name: "Aged Receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    id: "customer-balances",
    name: "Customer Balances",
    lastVisited: "-",
    createdBy: "System Generated",
  },
];

export const reportsColumns: Column<any>[] = [
  {
    key: "name",
    title: "REPORT NAME",
    className: "text-xs min-w-[220px]",
    render: (value, row) => (
      <Link
        prefetch
        href={`/reports/${row.id}`}
        className="text-indigo-700 font-medium flex items-center gap-2 hover:underline cursor-pointer"
      >
        <FileText className="w-3 h-3" />
        {value}
      </Link>
    ),
  },
  {
    key: "lastVisited",
    title: "LAST VISITED",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "createdBy",
    title: "CREATED BY",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "chevron",
    title: "",
    className: "text-xs w-8",
    render: (value, row) => (
      <Link
        prefetch
        href={`/reports/${row.id}`}
        className="block text-right group cursor-pointer"
      >
        <ChevronRight className="w-3 h-3" />
      </Link>
    ),
  },
];
