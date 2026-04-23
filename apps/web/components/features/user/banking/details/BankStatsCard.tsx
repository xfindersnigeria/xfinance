import React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  CreditCard,
} from "lucide-react";
import { BankStats } from "./types";

interface BankStatsProps {
  stats: BankStats;
  currency: string;
}

export default function BankStatsCard({
  stats,
  currency,
}: BankStatsProps) {
  const statItems = [
    {
      label: "Total Deposits",
      value: stats.totalDeposits,
      icon: ArrowDownRight,
      color: "bg-green-100",
      textColor: "text-green-700",
      format: true,
    },
    {
      label: "Total Withdrawals",
      value: stats.totalWithdrawals,
      icon: ArrowUpRight,
      color: "bg-red-100",
      textColor: "text-red-700",
      format: true,
    },
    {
      label: "Pending",
      value: stats.pendingCount,
      icon: Clock,
      color: "bg-orange-100",
      textColor: "text-orange-700",
      format: false,
    },
    {
      label: "Transactions",
      value: stats.totalTransactions,
      icon: CreditCard,
      color: "bg-gray-100",
      textColor: "text-gray-700",
      format: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">
                {stat.label}
              </span>
              <div className={`${stat.color} p-2 rounded-lg`}>
                <Icon className={`${stat.textColor} w-4 h-4`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stat.format
                ? new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currency,
                    minimumFractionDigits: 0,
                  }).format(stat.value)
                : stat.value.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {stat.format ? "Money" : "Count"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
