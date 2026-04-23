"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import InventoryAction from "./InventoryActions";

// Data for the table
export const inventoryData = [
  {
    id: 1,
    name: "Premium Widget A",
    code: "ITEM-001",
    sku: "WDG-A-001",
    currentStock: 250,
    reorderPoint: 50,
    reorderQty: 100,
    lastRestocked: "2024-11-01",
    status: "normal",
  },
  {
    id: 2,
    name: "Professional Widget B",
    code: "ITEM-003",
    sku: "WDG-B-002",
    currentStock: 15,
    reorderPoint: 25,
    reorderQty: 75,
    lastRestocked: "2024-10-20",
    status: "low_stock",
  },
  {
    id: 3,
    name: "Basic Widget C",
    code: "ITEM-005",
    sku: "WDG-C-003",
    currentStock: 5,
    reorderPoint: 20,
    reorderQty: 50,
    lastRestocked: "2024-09-15",
    status: "critical",
  },
];

export const inventoryColumns: Column<any>[] = [
  {
    key: "name",
    title: "Item",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-normal text-gray-900 line-clamp-1">
          {row.name}
        </div>
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
    key: "currentStock",
    title: "Current Stock",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "reorderPoint",
    title: "Reorder Point",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "reorderQty",
    title: "Reorder Qty",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "lastRestocked",
    title: "Last Restocked",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">
        {value ? new Date(value).toLocaleDateString("en-NG") : "—"}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "normal")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Normal
          </Badge>
        );
      if (value === "low_stock")
        return (
          <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
            Low Stock
          </Badge>
        );
      if (value === "critical")
        return (
          <Badge className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            Critical
          </Badge>
        );
      return null;
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs",
    render: (value, row) => <InventoryAction row={row} />,
  },
];
