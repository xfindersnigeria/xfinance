"use client";

import { useState } from "react";
import { Upload, Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatementTransaction, AddStatementTransactionForm } from "./types";
import AddTransactionModal from "./AddTransactionModal";
import ImportStatementModal from "./ImportStatementModal";
import { createId } from "@paralleldrive/cuid2";
import { useImportStatement } from "@/lib/api/hooks/useBanking";
import { toast } from "sonner";

interface StatementTransactionsPanelProps {
  bankAccountId: string;
  transactions: StatementTransaction[];
  onChange: (transactions: StatementTransaction[]) => void;
}

function formatAmount(amount: number) {
  const abs = Math.abs(amount);
  const prefix = amount >= 0 ? "+" : "-";
  if (abs >= 1_000_000) return `${prefix}₦${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}₦${(abs / 1_000).toFixed(0)}k`;
  return `${prefix}₦${abs.toLocaleString()}`;
}

export default function StatementTransactionsPanel({
  bankAccountId,
  transactions,
  onChange,
}: StatementTransactionsPanelProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const importMutation = useImportStatement(bankAccountId);

  const unmatchedCount = transactions.filter((t) => !t.matched).length;

  const toggleMatched = (id: string) => {
    onChange(transactions.map((t) => (t.id === id ? { ...t, matched: !t.matched } : t)));
  };

  const handleAdd = (data: AddStatementTransactionForm) => {
    const amount = data.transactionType === "credit" ? data.amount : -data.amount;
    const newTx: StatementTransaction = {
      id: createId(),
      date: data.date,
      description: data.description,
      reference: data.reference || "",
      amount,
      category: data.category,
      matched: false,
    };
    onChange([...transactions, newTx]);
  };

  const handleImport = (file: File) => {
    importMutation.mutate(file, {
      onSuccess: (result) => {
        if (result.count === 0) {
          toast.warning("No transactions found in file. Check the format and try again.");
          return;
        }
        const imported: StatementTransaction[] = result.data.map((row) => ({
          id: createId(),
          date: row.date,
          description: row.description,
          reference: row.reference || "",
          amount: row.amount,
          category: row.category || undefined,
          matched: false,
        }));
        onChange([...transactions, ...imported]);
        toast.success(`Imported ${result.count} transaction${result.count !== 1 ? "s" : ""}`);
        setImportOpen(false);
      },
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Bank Statement Transactions</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {unmatchedCount} unmatched item{unmatchedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <Badge variant="outline" className="text-xs">{transactions.length} items</Badge>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-gray-100">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => setImportOpen(true)}
            disabled={importMutation.isPending}
          >
            <Upload className="w-3.5 h-3.5" />
            {importMutation.isPending ? "Parsing..." : "Import Statement"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Transaction
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
                  {formatAmount(tx.amount)}
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
              <p className="text-sm">No statement transactions yet</p>
              <p className="text-xs mt-1">Import a CSV or add transactions manually</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <span className="text-xs font-semibold text-gray-600">Total</span>
          <span className="text-sm font-bold text-gray-900">
            {formatAmount(transactions.reduce((sum, t) => sum + t.amount, 0))}
          </span>
        </div>
      </div>

      <AddTransactionModal open={addOpen} onOpenChange={setAddOpen} onAdd={handleAdd} />
      <ImportStatementModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImport={handleImport}
      />
    </>
  );
}
