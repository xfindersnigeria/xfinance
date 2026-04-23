"use client";

import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CustomTable, Column } from "@/components/local/custom/custom-table";
import { CustomTabs, Tab } from "@/components/local/custom/tabs";
import { BillTransaction } from "./types";
import { useDebounce } from "use-debounce";

interface VendorTransactionsProps {
  transactions: BillTransaction[];
  loading?: boolean;
}

export default function VendorTransactions({
  transactions,
  loading,
}: VendorTransactionsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return "—";
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Filter transactions based on active tab
  const allTransactions = transactions.filter(
    (t) =>
      t.reference.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  const pendingTransactions = allTransactions.filter(
    (t) => t.status === "Pending"
  );

  const columns: Column<BillTransaction>[] = [
    {
      key: "date",
      title: "Date",
      className: "text-xs",
      render: (value) => (
        <span className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {format(new Date(value), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      key: "type",
      title: "Type",
      className: "text-xs",
      render: (value) => {
        let colorClass = "bg-gray-100 text-gray-700";
        if (value === "Bill") colorClass = "bg-red-50 text-red-700";
        if (value === "Payment") colorClass = "bg-green-50 text-green-700";
        if (value === "Credit") colorClass = "bg-purple-50 text-purple-700";

        return (
          <Badge className={`${colorClass} hover:${colorClass} font-normal border-0`}>
            {value}
          </Badge>
        );
      },
    },
    {
      key: "description",
      title: "Description",
      className: "text-xs text-gray-600 max-w-[200px] truncate",
    },
    {
      key: "reference",
      title: "Reference",
      className: "text-xs font-medium text-gray-900",
      render: (value) => (
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          {value}
        </div>
      ),
    },
    {
      key: "dueDate",
      title: "Due Date",
      className: "text-xs",
      render: (value) =>
        value ? (
          <span className="text-gray-600">
            {format(new Date(value), "dd MMM yyyy")}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "amount",
      title: "Amount",
      className: "text-xs",
      render: (value, row) => {
        const isExpense = row.type === "Bill";
        return (
          <div className="flex items-center gap-1 font-medium text-gray-900">
            {formatCurrency(value)}
            {isExpense ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
            )}
          </div>
        );
      },
    },
    {
      key: "balance",
      title: "Balance",
      className: "text-xs font-semibold text-gray-900",
      render: (value) => formatCurrency(value),
    },
    {
      key: "status",
      title: "Status",
      className: "text-xs",
      render: (value) => {
        let colorClass = "bg-gray-100 text-gray-700";
        if (value === "Pending") colorClass = "bg-yellow-50 text-yellow-700";
        if (value === "Paid") colorClass = "bg-green-50 text-green-700";
        if (value === "Overdue") colorClass = "bg-red-50 text-red-700";

        return (
          <Badge className={`${colorClass} hover:${colorClass} font-normal border-0`}>
            {value}
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <CustomTabs
        tabs={[
          {
            title: "All Transactions",
            value: "all",
            content: (
              <CustomTable
                searchPlaceholder="Search transactions..."
                tableTitle="All Transactions"
                columns={columns}
                data={allTransactions}
                pageSize={10}
                loading={loading}
                onSearchChange={setSearchTerm}
                display={{
                  searchComponent: true,
                }}
              />
            ),
          },
          {
            title: `Pending (${pendingTransactions.length})`,
            value: "pending",
            content: (
              <CustomTable
                searchPlaceholder="Search transactions..."
                tableTitle="Pending Transactions"
                columns={columns}
                data={pendingTransactions}
                pageSize={10}
                loading={loading}
                onSearchChange={setSearchTerm}
                display={{
                  searchComponent: true,
                }}
              />
            ),
          },
        ]}
        storageKey="vendor-transactions-tab"
      />

      <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700 flex items-start gap-2">
        <CreditCard className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Note:</strong> This ledger shows all transactions with this
          vendor. Red arrows indicate bills (money you owe), green arrows
          indicate payments (money you paid). The balance column shows your
          running balance with this vendor after each transaction.
        </span>
      </div>
    </div>
  );
}
