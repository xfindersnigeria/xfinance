import React, { useEffect, useMemo } from "react";
import BankProfileHeader from "./BankProfileHeader";
import BankStatsCard from "./BankStatsCard";
import BankTransactions from "./BankTransactions";
import { BankAccountProfile, BankStats, BankApiResponse } from "./types";
import { useBankAccount } from "@/lib/api/hooks/useBanking";
import {
  useAccountTransactionsByAccountId,
} from "@/lib/api/hooks/useAccounts";
import { AccountTransaction } from "@/lib/api/hooks/types/accountsTypes";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

export default function BankAccountLedger() {
  const params = useParams();
  const accountId = params?.id ? params.id.toString() : "";

  const { data: fetchedAccount, isLoading: accountLoading } =
    useBankAccount(accountId);

  const accountData = fetchedAccount as BankApiResponse | undefined;
  // console.log("Fetched bank account data:", accountData); // Debug log to check the structure of the fetched account data
  const { data: transactionsResponse, isLoading: transactionsLoading } =
    useAccountTransactionsByAccountId(
      (fetchedAccount as any)?.linkedAccountId || "",
      {
        pageSize: 50,
      },
    );

  const transactions: AccountTransaction[] =
    (transactionsResponse as any)?.data || [];
  // Derive Profile Data
  const profile: BankAccountProfile = useMemo(() => {
    if (!accountData) {
      return {
        id: "",
        accountName: "",
        bankName: "",
        accountNumber: "",
        currency: "USD",
        accountType: "",
        currentBalance: 0,
        openingBalance: 0,
      };
    }

    return {
      id: accountData.id,
      accountName: accountData.accountName,
      bankName: accountData.bankName,
      accountNumber: accountData.accountNumber,
      currency: accountData.currency,
      accountType: accountData.accountType,
      currentBalance: accountData.linkedAccount?.balance || 0,
      openingBalance: 0,
    };
  }, [accountData]);

  // Calculate Statistics
  const stats: BankStats = useMemo(() => {
    if (!accountData?.stats) {
      return {
        currentBalance: profile.currentBalance,
        totalDeposits: 0,
        totalWithdrawals: 0,
        pendingCount: 0,
        totalTransactions: 0,
      };
    }

    return {
      currentBalance: profile.currentBalance,
      totalDeposits: accountData.stats.totalDeposits,
      totalWithdrawals: accountData.stats.totalWithdrawals,
      pendingCount: accountData.stats.pendingCount,
      totalTransactions: accountData.stats.transactionsCount,
    };
  }, [accountData?.stats, profile.currentBalance]);

  if (accountLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Profile Header */}
      <BankProfileHeader profile={profile} />

      {/* Stats Cards */}
      <BankStatsCard stats={stats} currency={profile.currency} />

      {/* Transactions */}
      <BankTransactions
        transactions={transactions}
        isLoading={transactionsLoading}
      />
    </div>
  );
}
