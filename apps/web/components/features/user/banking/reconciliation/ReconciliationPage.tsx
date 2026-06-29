"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useDebounce } from "use-debounce";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ReconciliationHeader from "./ReconciliationHeader";
import ReconciliationSetup from "./ReconciliationSetup";
import ReconciliationSummaryCards from "./ReconciliationSummaryCards";
import ReconciliationStatusBanner from "./ReconciliationStatusBanner";
import StatementTransactionsPanel from "./StatementTransactionsPanel";
import BookTransactionsPanel from "./BookTransactionsPanel";
import CreateBookEntryModal, { CreateBookEntryData } from "./CreateBookEntryModal";
import {
  ReconciliationSetupValues,
  StatementTransaction,
  BookTransaction,
} from "./types";
import {
  useReconciliationById,
  useBookTransactions,
  useSaveReconciliationDraft,
  useCompleteReconciliation,
  useBankAccount,
} from "@/lib/api/hooks/useBanking";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { apiClient } from "@/lib/api/client";

interface ReconciliationPageProps {
  bankAccountId: string;
  reconcileId: string;
}

export default function ReconciliationPage({ bankAccountId, reconcileId }: ReconciliationPageProps) {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const { data: bankAccount } = useBankAccount(bankAccountId);
  const { data: reconData, isLoading: reconLoading } = useReconciliationById(bankAccountId, reconcileId);
  const saveDraft = useSaveReconciliationDraft(bankAccountId, reconcileId);
  const complete = useCompleteReconciliation(bankAccountId, reconcileId);

  const today = new Date().toISOString().split("T")[0];

  const [setup, setSetup] = useState<ReconciliationSetupValues>({
    statementStartDate: "",
    statementEndingDate: "",
    statementEndingBalance: 0,
    accountName: "",
  });
  const [statementTxs, setStatementTxs] = useState<StatementTransaction[]>([]);
  const [bookTxs, setBookTxs] = useState<BookTransaction[]>([]);
  const [reconInitialized, setReconInitialized] = useState(false);

  // ── Create Book Entry from statement tx ──────────────────────────────────
  const [bookEntryTx, setBookEntryTx] = useState<StatementTransaction | null>(null);

  const addBookEntryMutation = useMutation({
    mutationFn: (payload: {
      date: Date;
      description: string;
      reference?: string;
      amount: number;
      type: "credit" | "debit";
      offsetAccountId: string;
    }) =>
      apiClient<any>(`banking/accounts/${bankAccountId}/transactions`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (created, _variables) => {
      if (!bookEntryTx) return;
      const stmtTxId = bookEntryTx.id;

      const newBookTx: BookTransaction = {
        id: created.id,
        date: (created.date as string).split("T")[0],
        description: created.description,
        reference: created.reference ?? "",
        // Mirror buildBookTxs: debitAmount - creditAmount
        // credit tx (withdrawal): 0 - amount = negative; debit tx (deposit): amount - 0 = positive
        amount: (created.debitAmount ?? 0) - (created.creditAmount ?? 0),
        matched: true,
        matchedStatementId: stmtTxId,
      };

      const updatedStatementTxs = statementTxs.map((t) =>
        t.id === stmtTxId ? { ...t, matched: true, matchedBookId: created.id } : t,
      );
      const updatedBookTxs = [...bookTxs, newBookTx];

      setBookTxs(updatedBookTxs);
      setStatementTxs(updatedStatementTxs);

      // Auto-save draft so the match survives a page reload
      if (setup.statementEndingDate) {
        saveDraft.mutate({
          statementStartDate: setup.statementStartDate || undefined,
          statementEndDate: setup.statementEndingDate,
          statementEndingBalance: setup.statementEndingBalance,
          statementTransactions: updatedStatementTxs.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            reference: t.reference || undefined,
            amount: t.amount,
            category: t.category || undefined,
          })),
          matches: updatedStatementTxs
            .filter((t) => t.matched && t.matchedBookId)
            .map((t) => ({ statementTransactionId: t.id, bookTransactionId: t.matchedBookId! })),
        });
      }

      toast.success("Book entry created and matched");
      setBookEntryTx(null);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create book entry");
    },
  });

  const handleCreateBookEntry = (data: CreateBookEntryData) => {
    if (!bookEntryTx) return;
    addBookEntryMutation.mutate({
      date: new Date(data.date),
      description: data.description,
      reference: data.reference || undefined,
      amount: data.amount,
      type: data.type,
      offsetAccountId: data.offsetAccountId,
    });
  };

  // Debounce dates by 500ms so typing doesn't hammer the API
  const [debouncedStartDate] = useDebounce(setup.statementStartDate, 500);
  const [debouncedEndDate] = useDebounce(setup.statementEndingDate, 500);

  const isCompleted = reconData?.reconciliation?.status === "COMPLETED";

  // ─── Load reconciliation metadata + statement transactions once ─────────────
  useEffect(() => {
    if (!reconData || reconInitialized) return;
    setReconInitialized(true);

    if (reconData.reconciliation) {
      // Existing record — restore saved dates (overrides the today default)
      setSetup((prev) => ({
        ...prev,
        statementStartDate: reconData.reconciliation!.statementStartDate ?? "",
        statementEndingDate: reconData.reconciliation!.statementEndDate,
        statementEndingBalance: reconData.reconciliation!.statementEndingBalance,
      }));
    }
    // New reconciliation: today default already set in useState — no override needed

    if (reconData.statementTransactions.length > 0) {
      setStatementTxs(
        reconData.statementTransactions.map((t) => ({
          ...t,
          category: t.category ?? undefined,
          matchedBookId: t.matchedBookId ?? undefined,
        })),
      );
    }
  }, [reconData, reconInitialized]);

  useEffect(() => {
    if (bankAccount) {
      setSetup((prev) => ({ ...prev, accountName: (bankAccount as any).accountName ?? "" }));
    }
  }, [bankAccount]);

  // ─── Book transactions — fetched independently, refreshed on date change ────
  const { data: bookTxData, isFetching: bookTxsFetching } = useBookTransactions(
    bankAccountId,
    {
      startDate: debouncedStartDate || undefined,
      endDate: debouncedEndDate || undefined,
      reconcileId,
    },
  );

  // Merge fresh book transactions with current match state from statement side
  useEffect(() => {
    if (!bookTxData) return;

    // Build a map of currently matched book IDs from local statement state
    const matchedByStatementTx = new Map<string, string>();
    statementTxs.forEach((s) => {
      if (s.matched && s.matchedBookId) matchedByStatementTx.set(s.matchedBookId, s.id);
    });

    setBookTxs(
      bookTxData.data.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        reference: t.reference,
        amount: t.amount,
        category: t.category ?? undefined,
        // Preserve match state: either from server (existing draft) or from current session
        matched: t.matched || matchedByStatementTx.has(t.id),
        matchedStatementId:
          t.matchedStatementId ?? matchedByStatementTx.get(t.id) ?? undefined,
      })),
    );
  }, [bookTxData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Summary ───────────────────────────────────────────────────────────────
  const glBalance = bookTxData?.glBalance ?? reconData?.glBalance ?? 0;

  const summary = useMemo(() => {
    const statementBalance = setup.statementEndingBalance;
    const clearedBalance = bookTxs
      .filter((t) => t.matched)
      .reduce((sum, t) => sum + t.amount, 0);
    const difference = statementBalance - clearedBalance;
    const matchedCount =
      statementTxs.filter((t) => t.matched).length +
      bookTxs.filter((t) => t.matched).length;
    const totalItems = statementTxs.length + bookTxs.length;
    return { statementBalance, bookBalance: clearedBalance, difference, matchedCount, totalItems, glBalance };
  }, [setup.statementEndingBalance, statementTxs, bookTxs, glBalance]);

  // ─── Build payload ─────────────────────────────────────────────────────────
  const buildPayload = () => ({
    statementStartDate: setup.statementStartDate || undefined,
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

  // ─── Auto-match: amount + reference ───────────────────────────────────────
  const runAutoMatch = useCallback(() => {
    if (!statementTxs.length || !bookTxs.length) return;

    const normalizeRef = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "");
    const usedBookIds = new Set(
      statementTxs.filter((t) => t.matchedBookId).map((t) => t.matchedBookId!),
    );

    let matchCount = 0;
    const nextStmt = statementTxs.map((stmt) => {
      if (stmt.matched && stmt.matchedBookId) return stmt;
      const stmtRef = normalizeRef(stmt.reference);
      const candidate = bookTxs.find((book) => {
        if (usedBookIds.has(book.id)) return false;
        const amountMatch = Math.abs(Math.abs(stmt.amount) - Math.abs(book.amount)) < 0.01;
        if (!amountMatch) return false;
        const bookRef = normalizeRef(book.reference);
        if (stmtRef && bookRef) return stmtRef === bookRef;
        return true;
      });
      if (!candidate) return stmt;
      usedBookIds.add(candidate.id);
      matchCount++;
      return { ...stmt, matched: true, matchedBookId: candidate.id };
    });

    const matchedBookIds = new Set(
      nextStmt.filter((t) => t.matchedBookId).map((t) => t.matchedBookId!),
    );
    const nextBook = bookTxs.map((book) =>
      matchedBookIds.has(book.id)
        ? { ...book, matched: true, matchedStatementId: nextStmt.find((s) => s.matchedBookId === book.id)?.id }
        : book,
    );

    setStatementTxs(nextStmt);
    setBookTxs(nextBook);

    if (matchCount > 0) {
      toast.success(`Auto-matched ${matchCount} transaction${matchCount !== 1 ? "s" : ""}`);
    } else {
      toast.info("No new matches found — ensure amounts and references match");
    }
  }, [statementTxs, bookTxs]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProgress = () => {
    if (!setup.statementEndingDate) {
      toast.error("Please set the statement ending date first");
      return;
    }
    saveDraft.mutate(buildPayload());
  };

  const handleComplete = () => {
    if (!setup.statementEndingDate || setup.statementEndingBalance === undefined) {
      toast.error("Please fill in the statement date and ending balance first");
      return;
    }
    if (Math.abs(summary.difference) > 0.01) {
      toast.error("Cannot complete reconciliation", {
        description: `There is still a difference of ${sym}${Math.abs(summary.difference).toLocaleString()} to resolve.`,
      });
      return;
    }
    complete.mutate(buildPayload(), {
      onSuccess: () => router.back(),
    });
  };

  if (reconLoading) {
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
        status={reconData?.reconciliation?.status ?? null}
        onSaveProgress={handleSaveProgress}
        onExport={() => toast.info("Export coming soon")}
      />

      <ReconciliationSetup
        values={setup}
        onChange={setSetup}
        accountName={setup.accountName}
        readOnly={isCompleted}
      />

      <ReconciliationSummaryCards summary={summary} sym={sym} />

      <ReconciliationStatusBanner difference={summary.difference} />

      {!isCompleted && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs border-primary/30 text-primary hover:bg-primary/5"
            onClick={runAutoMatch}
            disabled={!statementTxs.length || !bookTxs.length}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto Match Transactions
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[500px]">
        <StatementTransactionsPanel
          bankAccountId={bankAccountId}
          transactions={statementTxs}
          onChange={setStatementTxs}
          readOnly={isCompleted}
          onCreateBookEntry={isCompleted ? undefined : (tx) => setBookEntryTx(tx)}
        />
        <BookTransactionsPanel
          bankAccountId={bankAccountId}
          transactions={bookTxs}
          onChange={setBookTxs}
          readOnly={isCompleted}
          isLoading={bookTxsFetching}
        />
      </div>

      <div className="flex items-center justify-between pt-2 pb-4">
        <Button variant="outline" onClick={() => router.back()}>
          Back
        </Button>
        {!isCompleted && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSaveProgress}
              disabled={saveDraft.isPending}
            >
              {saveDraft.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Save as Draft
            </Button>
            <Button
              className="bg-primary text-white gap-2"
              onClick={handleComplete}
              disabled={complete.isPending}
            >
              {complete.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Complete Reconciliation
            </Button>
          </div>
        )}
      </div>

      <CreateBookEntryModal
        open={!!bookEntryTx}
        onOpenChange={(v) => { if (!v) setBookEntryTx(null); }}
        statementTx={bookEntryTx}
        onAdd={handleCreateBookEntry}
        loading={addBookEntryMutation.isPending}
      />
    </div>
  );
}
