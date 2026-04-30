"use client";

import {
  Banknote,
  Landmark,
  TrendingDown,
  ReceiptText,
} from "lucide-react";
import React from "react";
import StatCard from "./StatCard";
import { KPIs } from "@/lib/api/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface StatsGridProps {
  data?: KPIs;
  loading?: boolean;
}

export default function StatsGrid({ data, loading }: StatsGridProps) {
  const sym = useEntityCurrencySymbol();

  const stats = [
    {
      title: "Revenue (MTD)",
      icon: <Banknote className="h-5 w-5" />,
      value: data?.revenue?.mtd ? `${sym}${(data.revenue.mtd).toLocaleString()}` : `${sym}0`,
      percentage: data?.revenue?.changePercent ?? 0,
      isPositive: (data?.revenue?.changePercent ?? 0) >= 0,
    },
    {
      title: "Bank Balance",
      icon: <Landmark className="h-5 w-5" />,
      value: data?.bankBalance?.total ? `${sym}${(data.bankBalance.total).toLocaleString()}` : `${sym}0`,
      percentage: data?.bankBalance?.changePercent ?? 0,
      isPositive: (data?.bankBalance?.changePercent ?? 0) >= 0,
    },
    {
      title: "Current Liabilities",
      icon: <TrendingDown className="h-5 w-5" />,
      value: data?.liabilities?.total ? `${sym}${(data.liabilities.total).toLocaleString()}` : `${sym}0`,
      percentage: Math.abs(Number((data?.liabilities?.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.liabilities?.changePercent ?? 0) <= 0,
    },
    {
      title: "Outstanding Receivables",
      icon: <ReceiptText className="h-5 w-5" />,
      value: data?.outstandingReceivables?.total
        ? `${sym}${(data.outstandingReceivables.total).toLocaleString()}`
        : `${sym}0`,
      percentage: Math.abs(Number((data?.outstandingReceivables?.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.outstandingReceivables?.changePercent ?? 0) <= 0,
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          icon={stat.icon}
          value={stat.value}
          percentage={stat.percentage}
          isPositive={stat.isPositive}
        />
      ))}
    </div>
  );
}
         