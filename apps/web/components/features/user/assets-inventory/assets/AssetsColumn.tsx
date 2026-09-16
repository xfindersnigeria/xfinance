"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import AssetsActions from "./AssetsActions";
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { formatDate } from "./utils/format";

export function createAssetsColumns(sym: string): Column<any>[] {
  return [
    {
      key: "name",
      title: "Asset",
      className: "text-xs",
      render: (_, row) => (
        <div>
          <div className="font-normal text-gray-900 line-clamp-1">{row.name}</div>
          <div className="text-xs text-gray-400 line-clamp-1">
            {row.serialNumber}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
      className: "text-xs",
      render: (_, row) =>
        row.category ? (
          <Badge variant="outline" className="rounded-full bg-muted px-3 py-1 font-normal whitespace-nowrap">
            {row.category.name}
          </Badge>
        ) : (
          <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 px-3 py-1 font-normal text-amber-700">
            Uncategorised
          </Badge>
        ),
    },
    {
      key: "purchaseDate",
      title: "Purchase Date",
      className: "text-xs",
      render: (value) => <span className="whitespace-nowrap">{formatDate(value)}</span>,
    },
    {
      key: "purchaseCost",
      title: "Purchase Cost",
      className: "text-xs",
      render: (value) => (
        <span className="text-gray-700 whitespace-nowrap">{fmtAmount(value ?? 0, sym)}</span>
      ),
    },
    {
      key: "currentValue",
      title: "Current Value",
      className: "text-xs",
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <div className="text-gray-700">{fmtAmount(value ?? 0, sym)}</div>
          {row.fullyDepreciated && (
            <div className="text-xs text-gray-400">Fully depreciated</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
      className: "text-xs",
      render: (value) =>
        value === "in_storage" ? (
          <Badge className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
            In Storage
          </Badge>
        ) : (
          <Badge className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
            In Use
          </Badge>
        ),
    },
    {
      key: "actions",
      title: "Actions",
      className: "w-16 text-xs",
      render: (_, row) => <AssetsActions row={row} />,
      searchable: false,
    },
  ];
}
