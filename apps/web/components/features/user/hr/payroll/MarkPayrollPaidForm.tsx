"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useMarkPayrollPaid } from "@/lib/api/hooks/useHR";
import { fmtAmount, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface Props {
  batchId: string;
  batchName: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export default function MarkPayrollPaidForm({ batchId, batchName, totalAmount, onSuccess }: Props) {
  const sym = useEntityCurrencySymbol();
  const [accountId, setAccountId] = useState("");
  const { data, isLoading } = useAccounts({ subCategory: "Cash and Cash Equivalents" });
  const markPaid = useMarkPayrollPaid();

  const accounts = ((data as any)?.data ?? []) as any[];
  const options = accounts.map((a) => ({
    value: a.id,
    label: `${a.name} (${a.code})`,
  }));

  const handleConfirm = () => {
    if (!accountId) return;
    markPaid.mutate({ id: batchId, cashAccountId: accountId }, { onSuccess });
  };

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-gray-600">
        Recording payment of <strong>{fmtAmount(totalAmount, sym)}</strong> for{" "}
        <strong>{batchName}</strong>. This posts <code>Dr Wages Payable / Cr</code> the account
        selected below and cannot be undone.
      </p>

      <div>
        <label className="text-sm font-medium mb-1 block">Paid From</label>
        <SearchableCombobox
          value={accountId}
          onChange={setAccountId}
          placeholder="Select cash or bank account"
          searchPlaceholder="Search accounts..."
          emptyMessage={isLoading ? "Loading..." : "No cash accounts found."}
          options={options}
        />
      </div>

      <Button
        className="w-full"
        disabled={!accountId || markPaid.isPending}
        onClick={handleConfirm}
      >
        {markPaid.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording payment...
          </>
        ) : (
          "Confirm Payment"
        )}
      </Button>
    </div>
  );
}
