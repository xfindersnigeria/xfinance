"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import AssetsActions from "./AssetsActions";
import { formatAmount, formatDate } from "./utils/format";

export function createAssetsColumns(sym: string): Column<any>[] {
  return [
    {
      key: "name",
      title: "Asset",
      render: (_, row) => (
        <div>
          <div className="font-medium line-clamp-1">{row.name}</div>
          <div className="font-mono text-xs text-muted-foreground line-clamp-1">
            {row.serialNumber}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      title: "Category",
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
      render: (value) => <span className="whitespace-nowrap">{formatDate(value)}</span>,
    },
    {
      key: "purchaseCost",
      title: "Purchase Cost",
      render: (value) => (
        <span className="font-mono tabular-nums whitespace-nowrap">{formatAmount(sym, value)}</span>
      ),
    },
    {
      key: "currentValue",
      title: "Current Value",
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <div className="font-mono tabular-nums">{formatAmount(sym, value)}</div>
          {row.fullyDepreciated && (
            <div className="text-xs text-muted-foreground">Fully depreciated</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      title: "Status",
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
      className: "w-16",
      render: (_, row) => <AssetsActions row={row} />,
      searchable: false,
    },
  ];
}
