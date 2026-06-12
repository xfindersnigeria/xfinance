"use client";
import {
 
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { getInitials } from "@/lib/utils";





export const bankingColumns = (sym: string): Column<any>[] => [
  {
    key: "reference",
    title: "Ref",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "date",
    title: "Date",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>,
  },
  {
    key: "description",
    title: "Description",
    className: "text-xs",
    render: (value) => <span className="text-gray-900">{value}</span>,
  },
  {
    key: "account",
    title: "Account",
    className: "text-xs",
    render: (value, row) => <span className="text-gray-700">{row?.account?.name}</span>,
  },
  {
    key: "category",
    title: "Category",
    className: "text-xs",
    render: (value, row) => (
      <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{row?.account?.subCategory?.category?.type?.name}</Badge>
    ),
  },
  {
    key: "amount",
    title: "Amount",
    className: "text-xs",
    render: (value, row) => {
      // Convention (Xero / QuickBooks): money IN to the bank = debitAmount > 0 = shown as green (+)
      // Money OUT of the bank = creditAmount > 0 = shown as red (-)
      const isDeposit = typeof row.debitAmount === 'number' && row.debitAmount > 0;
      const amount = isDeposit ? row.debitAmount : row.creditAmount || 0;
      const color = isDeposit ? "text-green-600" : "text-red-600";
      const sign = isDeposit ? "+" : "-";
      return (
        <span className={`font-semibold ${color}`}>
          {sign}{sym}{Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Success")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Cleared</Badge>
        );
      if (value === "Pending")
        return (
          <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Pending</Badge>
        );
      return null;
    },
  },
];
