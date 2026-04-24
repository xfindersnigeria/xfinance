"use client";

import { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BookTransaction, AddBookTransactionForm } from "./types";
import AddBookTransactionModal from "./AddBookTransactionModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface BookTransactionsPanelProps {
  bankAccountId: string;
  transactions: BookTransaction[];
  onChange: (transactions: BookTransaction[]) => void;
}

function formatAmount(amount: number, sym: string) {
  const abs = Math.abs(amount);
  const prefix = amount >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${prefix}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${sym}${(abs / 1_000).toFixed(0)}k`;
  return `${prefix}${sym}${abs.toLocaleString()}`;
}

export default function BookTransactionsPanel({
  bankAccountId,
  transactions,
  onChange,
}: BookTransactionsPanelProps) {
  const sym = useEntityCurrencySymbol();
  const [addOpen, setAddOpen] = useState(false);

  const addMutation = useMutation({
    mutationFn: (data: { date: Date; description: string; amount: number; type: "credit" | "debit"; reference?: string; payee?: string; method?: string }) =>
      apiClient<any>(`banking/accounts/${bankAccountId}/transactions`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (created) => {
      const amount = (created.creditAmount ?? 0) - (created.debitAmount ?? 0);
      const newTx: BookTransaction = {
        id: created.id,
        date: (created.date as string).split("T")[0],
        description: created.description,
        reference: created.reference ?? "",
        amount,
        matched: false,
      };
      onChange([...transactions, newTx]);
      toast.success("Transaction added to books");
      setAddOpen(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to add transaction");
    },
  });

  const handleAdd = (data: AddBookTransactionForm) => {
    addMutation.mutate({
      date: new Date(data.date),
      description: data.description,
      amount: data.amount,
      type: data.transactionType,
      reference: data.reference || undefined,
      payee: data.payee || undefined,
      method: data.method || undefined,
    });
  };

  const unmatchedCount = transactions.filter((t) => !t.matched).length;

  const toggleMatched = (id: string) => {
    onChange(transactions.map((t) => (t.id === id ? { ...t, matched: !t.matched } : t)));
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Book Transactions</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {unmatchedCount} unmatched item{unmatchedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-purple-700 border-purple-200 bg-purple-50">
            {transactions.length} items
          </Badge>
        </div>

        {/* Add button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Transaction to Books
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className={`flex items-start gap-3 px-4 py-3 transition-colors ${
                tx.matched ? "bg-green-50/50" : "hover:bg-gray-50"
              }`}
            >
              <Checkbox
                checked={tx.matched}
                onCheckedChange={() => toggleMatched(tx.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{tx.description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tx.date} &bull; {tx.reference}
                </p>
                {tx.category && (
                  <Badge variant="secondary" className="mt-1 text-xs px-2 py-0 h-5">
                    {tx.category}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-semibold ${tx.amount >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatAmount(tx.amount, sym)}
                </span>
                {tx.matched ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                )}
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <p className="text-sm">No book transactions found</p>
              <p className="text-xs mt-1">Transactions posted to this account will appear here</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">Cleared total</span>
          <span className="text-sm font-bold text-gray-900">
            {formatAmount(transactions.filter((t) => t.matched).reduce((sum, t) => sum + t.amount, 0), sym)}
          </span>
        </div>
      </div>

      <AddBookTransactionModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={handleAdd}
        loading={addMutation.isPending}
      />
    </>
  );
}
