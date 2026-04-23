"use client";

import React, { useMemo } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomTabs, Tab } from "@/components/local/custom/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, CreditCard } from "lucide-react";
import { useDebounce } from "use-debounce";

interface BankTransactionsProps {
  transactions: any[];
  isLoading: boolean;
}

export default function BankTransactions({
  transactions,
  isLoading,
}: BankTransactionsProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  // Filter pending transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter((t) => t.status === "Pending");
  }, [transactions]);

  const columns = [
    {
      key: "date",
      title: "Date",
      render: (value: unknown) => (
        <span className="text-xs">
          {format(new Date(value as string), "MMM dd yyyy")}
        </span>
      ),
    },
    {
      key: "debitAmount",
      title: "Transaction",
      render: (value: unknown, row?: any) => {
        const debitAmount = row?.debitAmount || 0;
        const creditAmount = row?.creditAmount || 0;
        const isDeposit = debitAmount > 0;
        const Icon = isDeposit ? ArrowDownRight : ArrowUpRight;

        return (
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${isDeposit ? "text-green-600" : "text-red-600"}`} />
            <Badge className={`${isDeposit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} text-xs font-medium px-2 py-1`}>
              {isDeposit ? "Deposit" : "Withdrawal"}
            </Badge>
          </div>
        );
      },
    },
    {
      key: "description",
      title: "Description",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="text-xs">{value as string}</span>
        </div>
      ),
    },
    {
      key: "payee",
      title: "Payee",
      render: (value: unknown) => (
        <span className="text-xs text-gray-600">{value as string || "-"}</span>
      ),
    },
    {
      key: "method",
      title: "Method",
      render: (value: unknown) => (
        <span className="text-xs text-gray-500">{value as string || "-"}</span>
      ),
    },
    {
      key: "reference",
      title: "Reference",
      render: (value: unknown) => (
        <span className="text-xs font-mono text-gray-600">
          {value as string}
        </span>
      ),
    },
    {
      key: "debitAmount",
      title: "Amount",
      render: (value: unknown, row?: any) => {
        const debitAmount = row?.debitAmount || 0;
        const creditAmount = row?.creditAmount || 0;
        const amount = debitAmount > 0 ? debitAmount : creditAmount;
        const isDeposit = debitAmount > 0;

        return (
          <span
            className={`text-xs font-semibold ${
              isDeposit ? "text-green-700" : "text-red-700"
            }`}
          >
            {isDeposit ? "+" : "-"}₦
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        );
      },
    },
    {
      key: "runningBalance",
      title: "Balance",
      render: (value: unknown) => (
        <span className="text-xs font-semibold text-gray-900">
          ₦
          {(value as number).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (value: unknown) => {
        const status = value as string;
        let badgeClass = "";
        
        switch (status) {
          case "Success":
            badgeClass = "bg-green-100 text-green-700";
            break;
          case "Processing":
            badgeClass = "bg-blue-100 text-blue-700";
            break;
          case "Pending":
            badgeClass = "bg-orange-100 text-orange-700";
            break;
          case "Failed":
            badgeClass = "bg-red-100 text-red-700";
            break;
          default:
            badgeClass = "bg-gray-100 text-gray-700";
        }

        return (
          <Badge className={`${badgeClass} text-xs font-medium px-2 py-1`}>
            {status}
          </Badge>
        );
      },
    },
  ];

  const tabs: Tab[] = [
    {
      value: "all",
      title: "All Transactions",
      content: (
        <CustomTable
          data={transactions}
          columns={columns as any}
          tableTitle="All Transactions"
          searchPlaceholder="Search transactions..."
          onSearchChange={setSearchTerm}
          display={{
            searchComponent: true,
            statusComponent: false,
            filterComponent: false,
            methodsComponent: false,
          }}
          loading={isLoading}
        />
      ),
    },
    {
      value: "pending",
      title: `Pending (${pendingTransactions.length})`,
      content: (
        <CustomTable
          data={pendingTransactions}
          onSearchChange={setSearchTerm}
          columns={columns as any}
          tableTitle="Pending Transactions"
          searchPlaceholder="Search pending transactions..."
          display={{
            searchComponent: true,
            statusComponent: false,
            filterComponent: false,
            methodsComponent: false,
          }}
          loading={isLoading}
        />
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <CustomTabs tabs={tabs} storageKey="bank-account-transactions-tab" />
    </div>
  );
}
