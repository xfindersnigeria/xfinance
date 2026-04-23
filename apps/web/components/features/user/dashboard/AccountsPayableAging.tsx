"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AgingData } from "@/lib/api/services/analyticsService";

interface AccountsPayableAgingProps {
  data?: AgingData;
  loading?: boolean;
}

const formatCurrency = (amt: number) => `₦${(amt).toLocaleString()}`;

export function AccountsPayableAging({
  data,
  loading,
}: AccountsPayableAgingProps) {
  const rows = [
    { label: "0-30 days", key: "0-30", highlight: false },
    { label: "31-60 days", key: "31-60", highlight: false },
    { label: "61-90 days", key: "61-90", highlight: false },
    { label: "90+ days", key: "90+", highlight: true },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Accounts Payable Aging</CardTitle>
          <CardDescription>Outstanding bills by age</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Calculate total for percentage calculation
  const total =
    (data?.["0-30"] ?? 0) +
    (data?.["31-60"] ?? 0) +
    (data?.["61-90"] ?? 0) +
    (data?.["90+"] ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Payable Aging</CardTitle>
        <CardDescription>Outstanding bills by age</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {rows.map((r) => {
          const amount = data?.[r.key as keyof AgingData] ?? 0;
          const percent = total > 0 ? (amount / total) * 100 : 0;

          return (
            <div
              key={r.label}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">{r.label}</div>
                  <span
                    className={
                      r.highlight
                        ? "text-amber-500 font-medium"
                        : "text-gray-800 font-medium"
                    }
                  >
                    {formatCurrency(amount)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mt-2">
                  <div
                    className="h-full bg-slate-900"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
