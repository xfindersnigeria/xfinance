"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RotateCcw, Upload } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { BankAccountLedger } from "@/components/features/user/banking/details";
import BulkExpenseModal from "@/components/features/user/banking/details/BulkExpenseModal";
import { useBankAccount } from "@/lib/api/hooks/useBanking";

export default function BankAccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id?.toString() ?? "";
  const [bulkExpenseOpen, setBulkExpenseOpen] = useState(false);

  const { data: accountData } = useBankAccount(id);
  const linkedAccountId = (accountData as any)?.linkedAccountId ?? "";
  const accountName = (accountData as any)?.accountName ?? "";
  const bankName = (accountData as any)?.bankName ?? "";
  const accountNumber = (accountData as any)?.accountNumber ?? "";
  const accountLabel = `${accountName} · ${bankName} · ****${accountNumber.slice(-4)}`;

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <Button
          variant={"ghost"}
          className="cursor-pointer gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          {linkedAccountId && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setBulkExpenseOpen(true)}
            >
              <Upload className="w-4 h-4" /> Bulk Expense
            </Button>
          )}
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export Ledger
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/banking/${id}/reconcile`)}
          >
            <RotateCcw className="w-4 h-4" /> Reconcile Account
          </Button>
        </div>
      </div>
      <BankAccountLedger />

      {linkedAccountId && (
        <BulkExpenseModal
          open={bulkExpenseOpen}
          onOpenChange={setBulkExpenseOpen}
          paymentAccountId={linkedAccountId}
          accountLabel={accountLabel}
        />
      )}
    </div>
  );
}
