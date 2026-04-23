"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
    FileText,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft, // Changed to ArrowDownLeft for better representation of credit/debit if needed, or stick to trend arrows
    Calendar,
    MoreHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CustomTable, Column } from "@/components/local/custom/custom-table";
import { Transaction } from "./types";
import { useDebounce } from "use-debounce";

interface CustomerTransactionsProps {
    transactions: Transaction[];
    loading?: boolean;
}

export default function CustomerTransactions({
    transactions,
    loading,
}: CustomerTransactionsProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

    const formatCurrency = (amount?: number) => {
        if (amount === undefined || amount === null) return "—";
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const columns: Column<Transaction>[] = [
        {
            key: "date",
            title: "Date",
            className: "text-xs",
            render: (value) => (
                <span className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {format(new Date(value), "dd MMM yyyy")}
                </span>
            ),
        },
        {
            key: "type",
            title: "Type",
            className: "text-xs",
            render: (value) => {
                let colorClass = "bg-gray-100 text-gray-700";
                if (value === "Invoice") colorClass = "bg-blue-50 text-blue-700";
                if (value === "Payment") colorClass = "bg-green-50 text-green-700";
                if (value === "Credit Note") colorClass = "bg-purple-50 text-purple-700";

                return (
                    <Badge className={`${colorClass} hover:${colorClass} font-normal border-0`}>
                        {value}
                    </Badge>
                );
            },
        },
        {
            key: "reference",
            title: "Reference",
            className: "text-xs font-medium text-gray-900",
            render: (value) => (
                <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    {value}
                </div>
            )
        },
        {
            key: "description",
            title: "Description",
            className: "text-xs text-gray-600 max-w-[200px] truncate",
        },
        {
            key: "debit",
            title: "Debit",
            className: "text-xs",
            render: (value) => {
                if (!value) return <span className="text-gray-400">—</span>;
                return (
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                        {formatCurrency(value)}
                        <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                    </div>
                );
            },
        },
        {
            key: "credit",
            title: "Credit",
            className: "text-xs",
            render: (value) => {
                if (!value) return <span className="text-gray-400">—</span>;
                return (
                    <div className="flex items-center gap-1 font-medium text-gray-900">
                        {formatCurrency(value)}
                        <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                    </div>
                );
            },
        },
        {
            key: "balance",
            title: "Balance",
            className: "text-xs font-semibold text-gray-900",
            render: (value) => formatCurrency(value),
        },
        {
            key: "status",
            title: "Status",
            className: "text-xs",
            render: (value) => {
                let colorClass = "bg-gray-100 text-gray-700";
                if (value === "Pending") colorClass = "bg-yellow-50 text-yellow-700";
                if (value === "Paid") colorClass = "bg-green-50 text-green-700";

                return (
                    <Badge className={`${colorClass} hover:${colorClass} font-normal border-0`}>
                        {value}
                    </Badge>
                )
            },
        },
    ];

    return (
        <div className="space-y-4">
            <CustomTable
                searchPlaceholder="Search transactions..."
                tableTitle="Transactions"
                columns={columns}
                data={transactions}
                pageSize={10}
                loading={loading}
                display={{
                    searchComponent: false,
                }}
            />
            <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700 flex items-start gap-2">
                <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                    <span className="font-semibold">Note:</span> Debit increases the
                    customer&apos;s outstanding balance (what they owe), while Credit reduces
                    it (payments made).
                </p>
            </div>
        </div>
    );
}
