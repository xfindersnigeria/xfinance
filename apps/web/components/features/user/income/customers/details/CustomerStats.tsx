"use client";

import React from "react";
import { CreditCard, FileText, DollarSign, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerStats } from "./types";

interface CustomerStatsProps {
    stats: CustomerStats;
}

export default function CustomerStatsCards({ stats }: CustomerStatsProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const statItems = [
        {
            label: "Current Balance",
            value: formatCurrency(stats.currentBalance),
            subLabel: "Outstanding",
            icon: Wallet,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            label: "Total Invoiced",
            value: formatCurrency(stats.totalInvoiced),
            subLabel: "Lifetime value",
            icon: FileText,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
        },
        {
            label: "Total Paid",
            value: formatCurrency(stats.totalPaid),
            subLabel: "Payments received",
            icon: DollarSign,
            color: "text-green-600",
            bg: "bg-green-100",
        },
        {
            label: "Transactions",
            value: stats.transactionsCount,
            subLabel: "Total count", // Added a sublabel for consistency
            icon: CreditCard,
            color: "text-orange-600",
            bg: "bg-orange-100",
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
                                <span className="text-2xl font-bold text-gray-900">
                                    {item.value}
                                </span>
                                <span className="text-xs text-gray-400 mt-1">
                                    {item.subLabel}
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
