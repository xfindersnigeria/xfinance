"use client";

import React, { useMemo } from "react";
import AccountProfileHeader from "./AccountProfileHeader";
import AccountStatsCard from "./AccountStats";
import AccountTransactions from "./AccountTransactions";
import { AccountProfile, AccountStats, AccountApiResponse } from "./types";
import { useAccount, useAccountTransactionsByAccountId } from "@/lib/api/hooks/useAccounts";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

// Mock Data (Fallback)
const mockProfile: AccountProfile = {
  id: "mock-id",
  code: "1000",
  name: "Cash and Cash Equivalents",
  typeName: "Asset",
  categoryName: "Current Assets",
  description: "Primary cash account for business operations",
  balance: 487250,
  currency: "NGN",
};

const mockStats: AccountStats = {
  currentBalance: 487250,
  totalDebits: 1145000,
  totalCredits: 657750,
  currency: "NGN",
};

export default function AccountDetails() {
  const params = useParams();
  const router = useRouter();
  const accountId = params?.id ? params.id.toString() : "";

  const { data: fetchedAccount, isLoading: accountLoading } =
    useAccount(accountId);

  const { data: transactionsResponse, isLoading: transactionsLoading } =
    useAccountTransactionsByAccountId(accountId, {
      pageSize: 50,
    });

  const accountData = fetchedAccount as AccountApiResponse | undefined;
  const transactions = (transactionsResponse as any)?.data || [];

  // Derive Profile Data
  const profile: AccountProfile = useMemo(() => {
    if (!accountData) {
      return mockProfile;
    }

    return {
      id: accountData.id,
      code: accountData.code,
      name: accountData.name,
      typeName: accountData.typeName,
      categoryName: accountData.categoryName,
      description: accountData.description,
      balance: accountData.balance || 0,
      currency: accountData.currency || "NGN",
    };
  }, [accountData]);

  // Derive Stats Data
  const stats: AccountStats = useMemo(() => {
    if (!accountData) return mockStats;

    // Calculate debits and credits based on account type balance
    // For Asset accounts: debits increase the balance
    // For Liability/Equity/Revenue/Expense accounts: credits increase the balance
    const totalDebits = Math.max(accountData.balance, 0);
    const totalCredits = Math.abs(Math.min(accountData.balance, 0));

    return {
      currentBalance: accountData.balance || 0,
      totalDebits: totalDebits,
      totalCredits: totalCredits,
      currency: accountData.currency || "NGN",
    };
  }, [accountData]);

  if (accountLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  console.log(transactions, transactionsResponse, "Transactions for account"); // Debug log to check transactions data

  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <AccountProfileHeader profile={profile} onBack={() => router.back()} />
      {/* Stats Cards */}
      <AccountStatsCard stats={stats} />
      {/* Transactions */}
      <AccountTransactions
        transactions={transactions}
        isLoading={transactionsLoading}
      />
    </div>
  );
}
