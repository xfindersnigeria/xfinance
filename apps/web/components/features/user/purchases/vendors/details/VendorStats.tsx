"use client";

import React from "react";
import { FileText, DollarSign, Wallet, AlertCircle, CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VendorStats } from "./types";

interface VendorStatsProps {
  stats: VendorStats;
}

export default function VendorStatsCards({ stats }: VendorStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statItems = [
    {
      label: "Outstanding Balance",
      value: formatCurrency(stats.outstandingBalance),
      subLabel: "Amount owed",
      icon: Wallet,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    {
      label: "Total Bills",
      value: formatCurrency(stats.totalBills),
      subLabel: "All-time",
      icon: FileText,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    {
      label: "Total Payments",
      value: formatCurrency(stats.totalPayments),
      subLabel: "All-time",
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    {
      label: "Pending Bills",
      value: stats.pendingBills,
      subLabel: "Not yet paid",
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      label: "Transactions",
      value: stats.transactionsCount,
      subLabel: "Total shown",
      icon: CreditCard,
      color: "text-gray-600",
      bg: "bg-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {statItems.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card key={idx} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-lg font-bold mt-2 ${stat.color}`}>
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{stat.subLabel}</p>
                </div>
                {/* <div className={`${stat.bg} p-2 rounded-lg`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div> */}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
