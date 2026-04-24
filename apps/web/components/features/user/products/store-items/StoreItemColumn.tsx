"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import StoreItemActions from "./StoreItemActions";

// Table columns for items
export function createStoreItemColumns(sym: string): Column<any>[] {
  return [
  {
    key: "name",
    title: "Item",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-normal text-gray-900 line-clamp-1">{row.name}</div>
        <div className="text-xs text-gray-400 line-clamp-1">{row.code}</div>
      </div>
    ),
  },
  {
    key: "sku",
    title: "SKU",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "category",
    title: "Category",
    className: "text-xs",
    render: (value, row) => (
      <span className="text-gray-700">{row?.category?.name || "--"}</span>
    ),
  },
  {
    key: "quantity",
    title: "Quantity",
    className: "text-xs",
    render: (value, row) => (
      <span className="text-gray-700">{row?.currentStock || 0}</span>
    ),
  },
  {
    key: "unitPrice",
    title: "Unit Price",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">
        {value ? `${sym}${value.toLocaleString()}` : "-"}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "in_stock")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            In Stock
          </Badge>
        );
      if (value === "low_stock")
        return (
          <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
            Low Stock
          </Badge>
        );
      if (value === "out_of_stock")
        return (
          <Badge className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            Out of Stock
          </Badge>
        );
      return null;
    },
  },
  {
    key: "actions",
    title: "",
    className: "w-8 text-xs",
    render: (_, row) => <StoreItemActions row={row} />, // parent should provide onEdit/onDelete
    searchable: false,
  },
  ];
}
