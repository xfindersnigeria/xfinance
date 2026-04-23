"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import StatutoryDeductionActions from "./StatutoryDeductionActions";

export interface StatutoryDeduction {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT" | "TIERED";
  rate?: number | null;
  fixedAmount?: number | null;
  minAmount?: number | null;
  tiers?: { id: string; from: number; to?: number | null; rate: number }[];
  description?: string | null;
  accountId?: string | null;
  account?: { id: string; name: string } | null;
  status: string;
}

const typeLabels: Record<string, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
  TIERED: "Tiered",
};

function formatRate(row: StatutoryDeduction): string {
  if (row.type === "TIERED") return "Variable (Tiered)";
  if (row.type === "FIXED_AMOUNT") {
    if (row.fixedAmount == null) return "—";
    return `₦${row.fixedAmount.toLocaleString()}`;
  }
  if (row.rate == null) return "—";
  return `${row.rate}%`;
}

export const statutoryDeductionColumns: Column<StatutoryDeduction>[] = [
  {
    key: "name",
    title: "Name",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "type",
    title: "Type",
    className: "text-xs",
    render: (value) => (
      <Badge variant="outline" className="text-xs font-normal">
        {typeLabels[value] ?? value}
      </Badge>
    ),
  },
  {
    key: "rate",
    title: "Rate/Amount",
    className: "text-xs",
    render: (_, row) => (
      <span className="text-gray-700">{formatRate(row)}</span>
    ),
  },
  {
    key: "account",
    title: "Account",
    className: "text-xs",
    render: (value) =>
      value?.name ? (
        <span className="text-gray-700">{value.name}</span>
      ) : (
        <span className="text-gray-400 italic">Not set</span>
      ),
  },
  {
    key: "description",
    title: "Description",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-500 line-clamp-1">{value || "—"}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) =>
      value === "active" ? (
        <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
          Active
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
          Inactive
        </Badge>
      ),
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs text-right",
    render: (_, row) => <StatutoryDeductionActions row={row} />,
    searchable: false,
  },
];
