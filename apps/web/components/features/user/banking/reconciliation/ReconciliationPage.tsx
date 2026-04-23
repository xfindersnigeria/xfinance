"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReconciliationHeader from "./ReconciliationHeader";
import ReconciliationSetup from "./ReconciliationSetup";
import ReconciliationSummaryCards from "./ReconciliationSummaryCards";
import ReconciliationStatusBanner from "./ReconciliationStatusBanner";
import StatementTransactionsPanel from "./StatementTransactionsPanel";
import BookTransactionsPanel from "./BookTransactionsPanel";
import {
  ReconciliationSetupValues,
  StatementTransaction,
  BookTransaction,
} from "./types";
import {
  useActiveReconciliation,
  useSaveReconciliationDraft,
  useCompleteReconciliation,
} from "@/lib/api/hooks/useBanking";
import { useBankAccount } from "@/lib/api/hooks/useBanking";

interface ReconciliationPageProps {
  bankAccountId: string;
}

export default function ReconciliationPage({ bankAccountId }: ReconciliationPageProps) {
  const router = useRouter();
  const { data: bankAccount } = useBankAccount(bankAccountId);
  const { data: activeData, isLoading } = useActiveReconciliation(bankAccountId);
  const saveDraft = useSaveReconciliationDraft(bankAccountId);
  const complete = useCompleteReconciliation(bankAccountId);

  const today = new Date().toISOString().split("T")[0];

  const [setup, setSetup] = useState<ReconciliationSetupValues>({
    statementEndingDate: today,
    statementEndingBalance: 0,
    accountName: "",
  });
  const [statementTxs, setStatementTxs] = useState<StatementTransaction[]>([]);
  const [bookTxs, setBookTxs] = useState<BookTransaction[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Populate state once data arrives
  useEffect(() => {
    if (!activeData || initialized) return;
    setInitialized(true);

    if (activeData.reconciliation) {
      setSetup((prev) => ({
        ...prev,
        statementEndingDate: activeData.reconciliation!.statementEndDate,
        statementEndingBalance: activeData.reconciliation!.statementEndingBalance,
      }));
    }
    if (activeData.statementTransactions.length > 0) {
      setStatementTxs(activeData.statementTransactions.map((t) => ({ ...t, category: t.category ?? undefined, matchedBookId: t.matchedBookId ?? undefined })));
    }
    if (activeData.bookTransactions.length > 0) {
      setBookTxs(activeData.bookTransactions.map((t) => ({ ...t, category: t.category ?? undefined, matchedStatementId: t.matchedStatementId ?? undefined })));
    }
  }, [activeData, initialized]);

  // Keep account name in sync with bank account data
  useEffect(() => {
    if (bankAccount) {
      setSetup((prev) => ({ ...prev, accountName: (bankAccount as any).accountName ?? "" }));
    }
  }, [bankAccount]);

  // ─── Summary ─────────────────────────────────────────────────────────────────
  // statementBalance = what the bank says (user-entered, fixed)
  // bookBalance = sum of checked book transactions (changes as user checks)
  // difference = statementBalance - bookBalance → goal: 0
  const summary = useMemo(() => {
    const statementBalance = setup.statementEndingBalance;
    const bookBalance = bookTxs
      .filter((t) => t.matched)
      .reduce((sum, t) => sum + t.amount, 0);
    const difference = statementBalance - bookBalance;
    const matchedCount =
      statementTxs.filter((t) => t.matched).length +
      bookTxs.filter((t) => t.matched).length;
    const totalItems = statementTxs.length + bookTxs.length;
    return { statementBalance, bookBalance, difference, matchedCount, totalItems };
  }, [setup.statementEndingBalance, statementTxs, bookTxs]);

  // ─── Build payload ────────────────────────────────────────────────────────────
  const buildPayload = () => ({
    statementEndDate: setup.statementEndingDate,
    statementEndingBalance: setup.statementEndingBalance,
    statementTransactions: statementTxs.map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      reference: t.reference || undefined,
      amount: t.amount,
      category: t.category || undefined,
    })),
    matches: statementTxs
      .filter((t) => t.matched && t.matchedBookId)
      .map((t) => ({ statementTransactionId: t.id, bookTransactionId: t.matchedBookId! })),
  });

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveProgress = () => {
    if (!setup.statementEndingDate) {
      toast.error("Please set the statement ending date first");
      return;
    }
    saveDraft.mutate(buildPayload());
  };

  const handleExport = () => {
    toast.info("Export coming soon", { description: "PDF/Excel export will be available shortly." });
  };

  const handleComplete = () => {
    if (!setup.statementEndingDate || setup.statementEndingBalance === undefined) {
      toast.error("Please fill in the statement date and ending balance first");
      return;
    }
    if (Math.abs(summary.difference) > 0.01) {
      toast.error("Cannot complete reconciliation", {
        description: `There is still a difference of ₦${Math.abs(summary.difference).toLocaleString()} to resolve.`,
      });
      return;
    }
    complete.mutate(buildPayload(), {
      onSuccess: () => router.back(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading reconciliation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <ReconciliationHeader
        accountName={setup.accountName}
        onSaveProgress={handleSaveProgress}
        onExport={handleExport}
      />

      <ReconciliationSetup
        values={setup}
        onChange={setSetup}
        accountName={setup.accountName}
      />

      <ReconciliationSummaryCards summary={summary} />

      <ReconciliationStatusBanner difference={summary.difference} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <StatementTransactionsPanel
          bankAccountId={bankAccountId}
          transactions={statementTxs}
          onChange={setStatementTxs}
        />
        <BookTransactionsPanel
          bankAccountId={bankAccountId}
          transactions={bookTxs}
          onChange={setBookTxs}
        />
      </div>

      <div className="flex items-center justify-between pt-2 pb-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={saveDraft.isPending}
          >
            {saveDraft.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Save as Draft
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={handleComplete}
            disabled={complete.isPending}
          >
            {complete.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Complete Reconciliation
          </Button>
        </div>
      </div>
    </div>
  );
}
