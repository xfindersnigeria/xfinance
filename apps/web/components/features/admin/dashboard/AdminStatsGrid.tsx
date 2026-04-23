"use client";

import { Banknote, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";
import StatCard from "@/components/features/user/dashboard/StatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { GroupKPIs } from "@/lib/api/services/analyticsService";

interface AdminStatsGridProps {
  data?: GroupKPIs;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₦${(value / 1_000).toFixed(1)}K`;
  return `₦${value.toLocaleString()}`;
}

export default function AdminStatsGrid({ data, loading }: AdminStatsGridProps) {
  const stats = [
    {
      title: "Consolidated Revenue",
      icon: <Banknote className="h-5 w-5" />,
      value: data ? formatCurrency(data.consolidatedRevenue.mtd) : "₦0",
      percentage: Math.abs(Number((data?.consolidatedRevenue.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.consolidatedRevenue.changePercent ?? 0) >= 0,
    },
    {
      title: "Net Profit (MTD)",
      icon: <TrendingUp className="h-5 w-5" />,
      value: data ? formatCurrency(data.netProfit.mtd) : "₦0",
      percentage: Math.abs(Number((data?.netProfit.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.netProfit.changePercent ?? 0) >= 0,
    },
    {
      title: "Total Bank Balance",
      icon: <Landmark className="h-5 w-5" />,
      value: data ? formatCurrency(data.bankBalance.total) : "₦0",
      percentage: Math.abs(Number((data?.bankBalance.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.bankBalance.changePercent ?? 0) >= 0,
    },
    {
      title: "Total Liabilities",
      icon: <TrendingDown className="h-5 w-5" />,
      value: data ? formatCurrency(data.liabilities.total) : "₦0",
      percentage: Math.abs(Number((data?.liabilities.changePercent ?? 0).toFixed(2))),
      isPositive: (data?.liabilities.changePercent ?? 0) <= 0,
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
