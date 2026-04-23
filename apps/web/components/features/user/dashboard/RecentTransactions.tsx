"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RecentTransaction } from "@/lib/api/services/analyticsService";

interface RecentTransactionsProps {
  data?: RecentTransaction[];
  loading?: boolean;
}

const formatCurrency = (amount: number) => {
  return `₦${(amount).toLocaleString()}`;
};

export function RecentTransactions({ data, loading }: RecentTransactionsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest activity</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {data?.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
          >
            <div>
              <p className="font-normal text-sm">{transaction.description}</p>
              <p className="text-xs text-gray-500">
                {new Date(transaction.date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 text-right">
                {transaction.reference}
              </p>
              <p
                className={cn(
                  "font-semibold",
                  transaction.type === "credit"
                    ? "text-green-500"
                    : "text-red-500"
                )}
              >
                {transaction.type === "credit" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
