"use client";
import { Column } from "@/components/local/custom/custom-table";
import BrandActions from "./BrandActions";

export interface ProductBrand {
  id: string;
  name: string;
  description?: string | null;
  status?: string;
  _count?: { items: number };
}

export const brandColumns: Column<ProductBrand>[] = [
  {
    key: "name",
    title: "Brand Name",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "_count",
    title: "Products",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-600">{value?.items ?? 0} products</span>
    ),
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs text-right",
    render: (_, row) => <BrandActions row={row} />,
    searchable: false,
  },
];
