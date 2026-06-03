"use client";

import React from "react";
import { CreditCard, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AccountStats } from "./types";

interface AccountStatsProps {
  stats: AccountStats & { transactionCount?: number };
  typeName?: string;
}

/**
 * Returns display config for debit and credit stat cards based on account type.
 *
 * Convention that matches the rest of the app (Xero / QuickBooks style):
 *   Assets / Expenses  → debit-normal (debit = value going up for that account)
 *   Liabilities / Revenue / Equity → credit-normal (credit = value going up)
 *
 * Colours:
 *   green  = good / value increasing in the expected direction for the account
 *   amber  = expected but neutral (e.g. expense incurred is normal, not "good")
 *   teal   = reducing a liability / recovering an expense (positive action)
 *   red    = value moving against the expected direction
 *   gray   = neutral / no strong semantic meaning
 */
function getTypeConfig(typeName?: string) {
  const t = typeName?.toLowerCase() ?? "";

  if (t === "assets") {
    return {
      debit:  { label: "Total Inflows",   color: "text-green-600", bg: "bg-green-100",  icon: ArrowDownLeft },
      credit: { label: "Total Outflows",  color: "text-red-600",   bg: "bg-red-100",    icon: ArrowUpRight },
    };
  }

  if (t === "liabilities") {
    return {
      debit:  { label: "Total Paid",      color: "text-teal-600",   bg: "bg-teal-100",   icon: ArrowDownLeft },
      credit: { label: "Total Added",     color: "text-orange-600", bg: "bg-orange-100", icon: ArrowUpRight },
    };
  }

  if (t === "revenue") {
    return {
      // For revenue, credits grow the account (money earned) — show credit first as green
      debit:  { label: "Total Reversed",  color: "text-red-600",   bg: "bg-red-100",    icon: ArrowUpRight },
      credit: { label: "Total Earned",    color: "text-green-600", bg: "bg-green-100",  icon: ArrowDownLeft },
    };
  }

  if (t === "expenses") {
    return {
      debit:  { label: "Total Incurred",  color: "text-amber-600", bg: "bg-amber-100",  icon: ArrowUpRight },
      credit: { label: "Total Recovered", color: "text-teal-600",  bg: "bg-teal-100",   icon: ArrowDownLeft },
    };
  }

  // Equity — default neutral
  return {
    debit:  { label: "Total Debits",    color: "text-gray-600", bg: "bg-gray-100", icon: ArrowDownLeft },
    credit: { label: "Total Credits",   color: "text-gray-600", bg: "bg-gray-100", icon: ArrowUpRight },
  };
}

export default function AccountStatsCard({ stats, typeName }: AccountStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: stats.currency || "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const cfg = getTypeConfig(typeName);

  // Balance is shown in red when it goes negative (abnormal state for any account type)
  const balanceNegative = (stats.currentBalance ?? 0) < 0;

  const DebitIcon  = cfg.debit.icon;
  const CreditIcon = cfg.credit.icon;

  const statItems = [
    {
      label: "Current Balance",
      value: formatCurrency(stats.currentBalance ?? 0),
      icon: Wallet,
      color: balanceNegative ? "text-red-600" : "text-blue-600",
      bg:    balanceNegative ? "bg-red-100"   : "bg-blue-100",
    },
    {
      label: cfg.debit.label,
      value: formatCurrency(stats.totalDebits ?? 0),
      icon:  DebitIcon,
      color: cfg.debit.color,
      bg:    cfg.debit.bg,
    },
    {
      label: cfg.credit.label,
      value: formatCurrency(stats.totalCredits ?? 0),
      icon:  CreditIcon,
      color: cfg.credit.color,
      bg:    cfg.credit.bg,
    },
    {
      label: "Transactions",
      value: (stats.transactionCount ?? 0).toLocaleString(),
      icon:  CreditCard,
      color: "text-purple-600",
      bg:    "bg-purple-100",
      raw:   true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className="shadow-sm border-gray-100 p-2">
          <CardContent className="p-2 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500 mb-1">
                  {item.label}
                </span>
                <span className={`text-2xl font-bold ${balanceNegative && index === 0 ? "text-red-600" : "text-gray-900"}`}>
                  {item.value}
                </span>
              </div>
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
