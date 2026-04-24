"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Item } from "./utils/types";
import ItemsActions from "./ItemsActions";

/**
 * Table columns configuration for Items
 * Defines columns for displaying item data in CustomTable component
 */
export function createItemsColumns(sym: string): Column<Item>[] {
  return [
  {
    key: "code",
    title: "Item Code",
    className: "text-xs",
    render: (value, row) => (
      <span className="font-medium text-gray-900">{row.code}</span>
    ),
  },
  {
    key: "name",
    title: "Item Name",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-semibold text-gray-900 line-clamp-1">
          {row.name}
        </div>
        <div className="text-xs text-gray-500 line-clamp-1">
          {row.description}
        </div>
      </div>
    ),
  },
  {
    key: "type",
    title: "Type",
    className: "text-xs",
    render: (value) => (
      <Badge
        className={`px-3 py-1 rounded-full font-semibold text-white ${
          value === "Service" ? "bg-black" : "bg-gray-200 text-gray-900"
        }`}
      >
        {value}
      </Badge>
    ),
  },
  {
    key: "category",
    title: "Category",
    className: "text-xs",
    render: (value) => <span className="text-gray-900">{value}</span>,
  },
  {
    key: "unitPrice",
    title: "Unit Price",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-900 font-medium">
        {value ? `${sym}${value.toLocaleString()}` : "-"}
      </span>
    ),
  },
  {
    key: "incomeAccountName",
    title: "Income Account",
    className: "text-xs",
    render: (value, row) => (
      <span className="text-gray-900">
        {(row as any)?.incomeAccount
          ? `${(row as any)?.incomeAccount?.name} - `
          : ""}
        {(row as any)?.incomeAccount?.code}
      </span>
    ),
  },
  {
    key: "actions",
    title: "",
    className: "w-8 text-xs",
    render: (_, row) => <ItemsActions row={row} />,
    searchable: false,
  },
  ];
}
