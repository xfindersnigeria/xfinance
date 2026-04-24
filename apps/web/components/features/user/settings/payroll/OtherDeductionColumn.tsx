"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import OtherDeductionActions from "./OtherDeductionActions";

export interface OtherDeduction {
  id: string;
  name: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  rate: number;
  description?: string | null;
  status: string;
}

const typeLabels: Record<string, string> = {
  PERCENTAGE: "Percentage",
  FIXED_AMOUNT: "Fixed Amount",
};

function formatRate(type: string, rate: number, sym: string): string {
  if (type === "FIXED_AMOUNT") return `${sym}${rate.toLocaleString()}`;
  return `${rate}%`;
}

export function createOtherDeductionColumns(sym: string): Column<OtherDeduction>[] {
  return [
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
    render: (value, row) => (
      <span className="text-gray-700">{formatRate(row.type, value, sym)}</span>
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
    render: (_, row) => <OtherDeductionActions row={row} />,
    searchable: false,
  },
  ];
}
