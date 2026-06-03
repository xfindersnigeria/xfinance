"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentTransaction } from "@/lib/api/services/analyticsService";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface RecentTransactionsProps {
  data?: RecentTransaction[];
  loading?: boolean;
}

export function RecentTransactions({ data, loading }: RecentTransactionsProps) {
  const sym = useEntityCurrencySymbol();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest bank activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest bank activity</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest bank activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((tx) => {
          // Convention (Xero / QuickBooks): debit to bank GL = money IN = green (+)
          // credit to bank GL = money OUT = red (−)
          const isIn = tx.direction === "in";
          const Icon = isIn ? ArrowDownRight : ArrowUpRight;
          const amountColor = isIn ? "text-green-600" : "text-red-500";
          const iconColor = isIn ? "text-green-600" : "text-red-500";
          const sign = isIn ? "+" : "−";
          const formattedAmount = `${sign}${sym}${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3"
            >
              {/* Direction icon */}
              <div className={`shrink-0 ${iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>

              {/* Description + account */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {tx.description}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {tx.accountName && (
                    <span className="mr-2">{tx.accountName}</span>
                  )}
                  {new Date(tx.date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Amount + reference */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-semibold ${amountColor}`}>
                  {formattedAmount}
                </p>
                {tx.reference && (
                  <p className="text-xs text-gray-400">{tx.reference}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
