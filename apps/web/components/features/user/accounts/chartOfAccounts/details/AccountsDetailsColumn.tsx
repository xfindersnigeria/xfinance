"use client";
import { format } from "date-fns";

export const columns = [
  {
    key: "date",
    title: "Date",
    render: (value: unknown) => (
      <span className="text-xs">
        {format(new Date(value as string), "dd MMM yyyy")}
      </span>
    ),
  },
  // {
  //   key: "id",
  //   title: "Transaction ID",
  //   render: (value: unknown) => (
  //     <span className="text-xs font-mono text-gray-700">{value as string}</span>
  //   ),
  // },
  {
    key: "description",
    title: "Description",
    render: (value: unknown) => (
      <span className="text-xs text-gray-700">{value as string}</span>
    ),
  },
  {
    key: "reference",
    title: "Reference",
    render: (value: unknown) => (
      <span className="text-xs font-mono text-gray-600">{value as string}</span>
    ),
  },
  {
    key: "debitAmount",
    title: "Debit",
    render: (value: unknown) => {
      const amount = value as number;
      if (!amount) return <span className="text-xs text-gray-400">—</span>;
      return (
        <span className="text-xs font-semibold text-green-700">
          ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
        </span>
      );
    },
  },
  {
    key: "creditAmount",
    title: "Credit",
    render: (value: unknown) => {
      const amount = value as number;
      if (!amount) return <span className="text-xs text-gray-400">—</span>;
      return (
        <span className="text-xs font-semibold text-red-700">
          ₦{amount.toLocaleString(undefined, { minimumFractionDigits: 0 })}
        </span>
      );
    },
  },
  {
    key: "runningBalance",
    title: "Balance",
    render: (value: unknown) => {
      const balance = value as number | null | undefined;
      if (!balance && balance !== 0) return <span className="text-xs text-gray-400">—</span>;
      return (
        <span className="text-xs font-semibold text-gray-900">
          ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 0 })}
        </span>
      );
    },
  },
];
