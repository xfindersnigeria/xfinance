"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODAL } from "@/lib/data/modal-data";
import { useModal } from "@/components/providers/ModalProvider";
import BankingStatCardSmall from "./BankingStatCardSmall";
import { Skeleton } from "@/components/ui/skeleton";

interface BankingStats {
  totalBankCash: number;
  numberOfBankAccounts: number;
  accounts: Array<{
    id: string;
    accountName: string;
    bankName: string;
    accountType: string;
    currency: string;
    currentBalance: number;
    status: string;
  }>;
}

export default function BankingHeader({
  data,
  loading,
}: {
  data?: BankingStats;
  loading: boolean;
}) {
  const { openModal } = useModal();

  const formatCurrency = (amount: number) => {
    return `₦${(amount).toLocaleString()}`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Banking</h2>
          <p className="text-muted-foreground">
            Bank accounts, transactions, and reconciliation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => openModal(MODAL.BANK_CONNECT)} className="rounded-xl">
            <Plus /> Connect Bank
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : (
          <BankingStatCardSmall
            title="Total Cash"
            value={
              <span className="text-3xl font-bold text-blue-800">
                {formatCurrency(data?.totalBankCash ?? 0)}
              </span>
            }
            subtitle={
              <span>
                Across {data?.numberOfBankAccounts ?? 0}{" "}
                {data?.numberOfBankAccounts === 1 ? "account" : "accounts"}
              </span>
            }
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
