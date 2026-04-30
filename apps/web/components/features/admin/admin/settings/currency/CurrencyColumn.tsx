"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import CurrencyActions from "./CurrencyActions";

export interface GroupCurrencyRow {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isPrimary: boolean;
  isActive: boolean;
  updatedAt: string;
}

export const currencyColumns: Column<GroupCurrencyRow>[] = [
  {
    key: "code",
    title: "Code",
    className: "text-xs",
    render: (value) => (
      <span className="font-mono font-semibold text-gray-900">{value}</span>
    ),
  },
  {
    key: "name",
    title: "Currency",
    className: "text-xs",
    render: (value, row) => (
      <span className="text-gray-800">
        {row.symbol} — {value}
      </span>
    ),
  },
  {
    key: "exchangeRate",
    title: "Exchange Rate",
    className: "text-xs",
    render: (value, row) =>
      row.isPrimary ? (
        <span className="text-gray-400 italic text-xs">Base (1.00)</span>
      ) : (
        <span className="text-gray-700">1 Base = {Number(value).toFixed(4)}</span>
      ),
  },
  {
    key: "isPrimary",
    title: "Type",
    className: "text-xs",
    render: (value) =>
      value ? (
        <Badge className="bg-indigo-100 text-primary px-3 py-1 rounded-full font-medium">
          Primary
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
          Secondary
        </Badge>
      ),
  },
  {
    key: "isActive",
    title: "Status",
    className: "text-xs",
    render: (value) =>
      value ? (
        <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
          Active
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-500 px-3 py-1 rounded-full font-medium">
          Inactive
        </Badge>
      ),
  },
  {
    key: "updatedAt",
    title: "Rate Updated",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-400 text-xs">
        {new Date(value).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: "actions",
    title: "",
    className: "w-24 text-xs",
    render: (_, row) => <CurrencyActions row={row} />,
    searchable: false,
  },
];
