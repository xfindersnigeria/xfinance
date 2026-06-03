"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createId } from "@paralleldrive/cuid2";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomTabs, Tab } from "@/components/local/custom/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Eye,
  CheckCircle2,
  Clock,
  RotateCcw,
} from "lucide-react";
import { useDebounce } from "use-debounce";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useListReconciliations } from "@/lib/api/hooks/useBanking";
import type { ReconciliationListItem } from "@/lib/api/services/bankingService";

interface BankTransactionsProps {
  bankAccountId: string;
  transactions: any[];
  isLoading: boolean;
}

const PAGE_SIZE = 20;

export default function BankTransactions({
  bankAccountId,
  transactions,
  isLoading,
}: BankTransactionsProps) {
  const sym = useEntityCurrencySymbol();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [reconPage, setReconPage] = useState(1);

  const { data: reconciliationData, isLoading: reconcLoading } =
    useListReconciliations(bankAccountId, reconPage, PAGE_SIZE);

  const reconciliations: ReconciliationListItem[] = useMemo(
    () => reconciliationData?.data ?? [],
    [reconciliationData],
  );

  const handleNewReconciliation = () => {
    const newId = createId();
    router.push(`/banking/${bankAccountId}/reconcile/${newId}`);
  };

  const handleViewReconciliation = (reconcileId: string) => {
    router.push(`/banking/${bankAccountId}/reconcile/${reconcileId}`);
  };

  // ── Transaction columns ──────────────────────────────────────────────────

  const txColumns = [
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
      render: (_value: unknown, row?: any) => {
        const debitAmount = row?.debitAmount || 0;
        const isDeposit = debitAmount > 0;
        const Icon = isDeposit ? ArrowDownRight : ArrowUpRight;
        return (
          <div className="flex items-center gap-2">
            <Icon
              className={`w-4 h-4 ${isDeposit ? "text-green-600" : "text-red-600"}`}
            />
            <Badge
              className={`${
                isDeposit
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              } text-xs font-medium px-2 py-1`}
            >
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
        <span className="text-xs text-gray-600">
          {(value as string) || "-"}
        </span>
      ),
    },
    {
      key: "method",
      title: "Method",
      render: (value: unknown) => (
        <span className="text-xs text-gray-500">
          {(value as string) || "-"}
        </span>
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
      render: (_value: unknown, row?: any) => {
        const debitAmount = row?.debitAmount || 0;
        const creditAmount = row?.creditAmount || 0;
        const amount = debitAmount > 0 ? debitAmount : creditAmount;
        const isDeposit = debitAmount > 0;
        return (
          <span
            className={`text-xs font-semibold ${isDeposit ? "text-green-700" : "text-red-700"}`}
          >
            {isDeposit ? "+" : "-"}
            {sym}
            {amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      key: "runningBalance",
      title: "Balance",
      render: (value: unknown) => (
        <span className="text-xs font-semibold text-gray-900">
          {sym}
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
        const cls: Record<string, string> = {
          Success: "bg-green-100 text-green-700",
          Processing: "bg-blue-100 text-blue-700",
          Pending: "bg-orange-100 text-orange-700",
          Failed: "bg-red-100 text-red-700",
        };
        return (
          <Badge
            className={`${cls[status] ?? "bg-gray-100 text-gray-700"} text-xs font-medium px-2 py-1`}
          >
            {status}
          </Badge>
        );
      },
    },
  ];

  // ── Reconciliation columns ───────────────────────────────────────────────

  const reconcColumns = [
    {
      key: "statementStartDate",
      title: "Period",
      render: (value: unknown, row?: any) => {
        const endDate = (row as ReconciliationListItem)?.statementEndDate;
        const startDate = value as string | null;
        return (
          <span className="text-sm font-medium">
            {startDate
              ? `${format(new Date(startDate), "dd MMM")} – ${format(new Date(endDate), "dd MMM yyyy")}`
              : format(new Date(endDate), "dd MMM yyyy")}
          </span>
        );
      },
    },
    {
      key: "statementEndingBalance",
      title: "Ending Balance",
      render: (value: unknown) => (
        <span className="text-sm font-semibold text-gray-800">
          {sym}
          {(value as number).toLocaleString(undefined, {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: "matchedCount",
      title: "Matched",
      render: (value: unknown, row?: any) => {
        const total =
          (row as ReconciliationListItem)?.statementTransactionCount ?? 0;
        const matched = (value as number) ?? 0;
        const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {matched}/{total}
            </span>
            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{pct}%</span>
          </div>
        );
      },
    },
    {
      key: "status",
      title: "Status",
      render: (value: unknown) => {
        const status = value as string;
        return status === "COMPLETED" ? (
          <Badge className="bg-green-100 text-green-700 gap-1 text-xs">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </Badge>
        ) : (
          <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs">
            <Clock className="w-3 h-3" />
            Draft
          </Badge>
        );
      },
    },
    {
      key: "completedBy",
      title: "Completed By",
      render: (value: unknown, row: any) => {
        console.log("Completed By:", row);
        return (
          <span className="text-xs text-gray-500">
            {(value as string) || "—-"}
          </span>
        );
      },
    },
    {
      key: "id",
      title: "Actions",
      render: (value: unknown) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-gray-600 hover:text-primary"
          onClick={() => handleViewReconciliation(value as string)}
        >
          <Eye className="w-3.5 h-3.5" />
          View
        </Button>
      ),
    },
  ];

  const reconcHeaderActions = (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={handleNewReconciliation}
    >
      <RotateCcw className="w-3.5 h-3.5" />
      New Reconciliation
    </Button>
  );

  const totalRecon = reconciliationData?.pagination?.total ?? 0;
  const totalPages = reconciliationData?.pagination?.totalPages ?? 1;

  const tabs: Tab[] = [
    {
      value: "all",
      title: "All Transactions",
      content: (
        <CustomTable
          data={transactions}
          columns={txColumns as any}
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
      value: "reconciliations",
      title: `Reconciliations (${totalRecon})`,
      content: (
        <div className="space-y-3">
          <CustomTable
            data={reconciliations}
            columns={reconcColumns as any}
            tableTitle="Bank Reconciliations"
            searchPlaceholder="Search reconciliations..."
            loading={reconcLoading}
            headerActions={reconcHeaderActions}
            display={{
              searchComponent: false,
              statusComponent: false,
              filterComponent: false,
              methodsComponent: false,
            }}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-end gap-2 px-1">
              <Button
                variant="outline"
                size="sm"
                disabled={reconPage <= 1}
                onClick={() => setReconPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-gray-500">
                Page {reconPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={reconPage >= totalPages}
                onClick={() => setReconPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <CustomTabs tabs={tabs} storageKey="bank-account-transactions-tab" />
    </div>
  );
}
