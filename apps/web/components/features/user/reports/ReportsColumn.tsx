"use client";
import { Column } from "@/components/local/custom/custom-table";
import Link from "next/link";
import { ChevronRight, File, FileText } from "lucide-react";

export const reportsData = [
  // ─── Core Financial Reports ─────────────────────────────
  {
    key: "profit-and-loss",
    name: "Profit and Loss",
    category: "financial",
    lastVisited: "A few seconds ago",
    createdBy: "System Generated",
  },
  {
    key: "cash-flow-statement",
    name: "Cash Flow Statement",
    category: "financial",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "balance-sheet",
    name: "Balance Sheet",
    category: "financial",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "business-performance-ratios",
    name: "Business Performance Ratios",
    category: "financial",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "cash-flow-forecasting",
    name: "Cash Flow Forecasting",
    category: "financial",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "movement-of-equity",
    name: "Movement of Equity",
    category: "financial",
    lastVisited: "-",
    createdBy: "System Generated",
  },

  // ─── Sales & Receivables ───────────────────────────────
  {
    key: "sales-by-customer",
    name: "Sales by Customer",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "sales-by-item",
    name: "Sales by Item",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "sales-by-salesperson",
    name: "Sales by Salesperson",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "invoice-details",
    name: "Invoice Details",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "receivable-summary",
    name: "Receivable Summary",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "aged-receivables",
    name: "Aged Receivables",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "customer-balances",
    name: "Customer Balances",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "payment-method-summary",
    name: "Payment Method Summary",
    category: "sales_receivables",
    lastVisited: "-",
    createdBy: "System Generated",
  },

  // ─── Payables & Expenses ───────────────────────────────
  {
    key: "payable-summary",
    name: "Payable Summary",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "aged-payables",
    name: "Aged Payables",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "vendor-balances",
    name: "Vendor Balances",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "expense-by-category",
    name: "Expense by Category",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "expense-by-vendor",
    name: "Expense by Vendor",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "bill-details",
    name: "Bill Details",
    category: "payables_expenses",
    lastVisited: "-",
    createdBy: "System Generated",
  },

  // ─── Taxes ─────────────────────────────────────────────
  {
    key: "sales-tax-summary",
    name: "Sales Tax Summary",
    category: "taxes",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "tax-liability-report",
    name: "Tax Liability Report",
    category: "taxes",
    lastVisited: "-",
    createdBy: "System Generated",
  },

  // ─── Banking ───────────────────────────────────────────
  {
    key: "bank-reconciliation-summary",
    name: "Bank Reconciliation Summary",
    category: "banking",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "bank-account-transactions",
    name: "Bank Account Transactions",
    category: "banking",
    lastVisited: "-",
    createdBy: "System Generated",
  },

  // ─── Inventory ─────────────────────────────────────────
  {
    key: "supplies-consumption-by-department",
    name: "Supplies Consumption by Department",
    category: "inventory",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "supplies-consumption-by-project",
    name: "Supplies Consumption by Project",
    category: "inventory",
    lastVisited: "-",
    createdBy: "System Generated",
  },
  {
    key: "supplies-inventory-report",
    name: "Supplies Inventory Report",
    category: "inventory",
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
        href={`/reports/${row.key}`}
        className="text-primary font-medium flex items-center gap-2 hover:underline cursor-pointer"
      >
        <FileText className="w-3 h-3" />
        {value}
      </Link>
    ),
  },
  // {
  //   key: "lastVisited",
  //   title: "LAST VISITED",
  //   className: "text-xs",
  //   render: (value) => <span className="text-gray-700">{value}</span>,
  // },
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
        href={`/reports/${row.key}`}
        className="block text-right group cursor-pointer"
      >
        <ChevronRight className="w-3 h-3" />
      </Link>
    ),
  },
];
