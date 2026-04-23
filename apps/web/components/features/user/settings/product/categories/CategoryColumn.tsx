"use client";
import { Column } from "@/components/local/custom/custom-table";
import { cn } from "@/lib/utils";
import CategoryActions from "./CategoryActions";

export interface ProductCategory {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  status?: string;
  _count?: { items: number };
}

const colorStyles: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
  orange: "bg-orange-100 text-orange-700",
  indigo: "bg-indigo-100 text-indigo-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  pink: "bg-pink-100 text-pink-700",
  gray: "bg-gray-100 text-gray-700",
  teal: "bg-teal-100 text-teal-700",
};

export const categoryColumns: Column<ProductCategory>[] = [
  {
    key: "name",
    title: "Category Name",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "_count",
    title: "Items",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-600">{value?.items ?? 0} items</span>
    ),
  },
  {
    key: "color",
    title: "Color",
    className: "text-xs",
    render: (value) =>
      value ? (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
            colorStyles[value] ?? "bg-gray-100 text-gray-700"
          )}
        >
          {value}
        </span>
      ) : (
        <span className="text-gray-400 italic text-xs">—</span>
      ),
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs text-right",
    render: (_, row) => <CategoryActions row={row} />,
    searchable: false,
  },
];
