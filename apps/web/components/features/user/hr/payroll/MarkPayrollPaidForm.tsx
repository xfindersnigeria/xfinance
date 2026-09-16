"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import { useBankAccounts } from "@/lib/api/hooks/useBanking";
import { useMarkPayrollPaid } from "@/lib/api/hooks/useHR";
import { useGroupCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface Props {
  batchId: string;
  batchName: string;
  totalAmount: number;
  onSuccess?: () => void;
}

export default function MarkPayrollPaidForm({ batchId, batchName, totalAmount, onSuccess }: Props) {
  const sym = useGroupCurrencySymbol();
  const [accountId, setAccountId] = useState("");
  const { data, isLoading } = useBankAccounts();
  const markPaid = useMarkPayrollPaid();

  const accounts = ((data as any)?.data ?? []) as any[];
  const options = accounts.map((a) => ({
    value: a.linkedAccountId,
    label: `${a.accountName} — ${a.bankName}`,
  }));

  const handleConfirm = () => {
    if (!accountId) return;
    markPaid.mutate({ id: batchId, cashAccountId: accountId }, { onSuccess });
  };

  return (
    <div className="space-y-4 py-4">
      <p className="text-sm text-gray-600">
        Recording payment of <strong>{sym}{totalAmount.toLocaleString()}</strong> for{" "}
        <strong>{batchName}</strong>. This posts <code>Dr Wages Payable / Cr</code> the account
        selected below and cannot be undone.
      </p>

      <div>
        <label className="text-sm font-medium mb-1 block">Paid From</label>
        <SearchableCombobox
          value={accountId}
          onChange={setAccountId}
          placeholder="Select bank/cash account"
          searchPlaceholder="Search accounts..."
          emptyMessage={isLoading ? "Loading..." : "No bank accounts found."}
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
