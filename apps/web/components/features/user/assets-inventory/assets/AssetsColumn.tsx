"use client";
import { Mail, Phone, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { getInitials } from "@/lib/utils";
import CustomersActions from "./AssetsActions";
import AssetsActions from "./AssetsActions";

export const assetsData = [
  {
    id: 1,
    name: "Dell Laptop - XPS 15",
    code: "AST-001",
    category: "Computer Equipment",
    purchaseDate: "2024-01-15",
    location: "Office - Floor 3",
    purchaseCost: 2500,
    currentValue: 2000,
    status: "In Use",
  },
  {
    id: 2,
    name: "Conference Room Table",
    code: "AST-002",
    category: "Furniture",
    purchaseDate: "2023-06-20",
    location: "Conference Room A",
    purchasePrice: 1800,
    currentValue: 1500,
    status: "In Use",
  },
  {
    id: 3,
    name: "Backup Server - HP ProLiant",
    code: "AST-003",
    category: "IT Equipment",
    purchaseDate: "2023-03-10",
    location: "Storage Room B",
    purchasePrice: 5500,
    currentValue: 4200,
    status: "In Storage",
  },
  {
    id: 4,
    name: "Old Desktop Computer",
    code: "AST-004",
    category: "Computer Equipment",
    purchaseDate: "2018-05-12",
    location: "Storage Room B",
    purchasePrice: 1200,
    currentValue: 0,
    status: "In Storage",
  },
];

export const assetsColumns: Column<any>[] = [
  {
    key: "name",
    title: "Asset",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-normal text-gray-900 line-clamp-1">{row.name}</div>
        <div className="text-xs text-gray-400 line-clamp-1">
          {row.serialNumber}
        </div>
      </div>
    ),
  },
  // {
  //   key: "category",
  //   title: "Category",
  //   className: "text-xs",
  //   render: (value) => <span className="text-gray-700">{value}</span>,
  // },
  {
    key: "purchaseDate",
    title: "Purchase Date",
    className: "text-xs",
    render: (value) =>
      value
        ? new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
        : "",
  },
  // {
  //   key: "location",
  //   title: "Location",
  //   className: "text-xs",
  //   render: (value) => <span className="text-gray-700">{value}</span>,
  // },
  {
    key: "purchaseCost",
    title: "Purchase Cost",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">₦{value.toLocaleString()}</span>
    ),
  },
  {
    key: "currentValue",
    title: "Current Value",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">₦{value.toLocaleString()}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "in_use")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            In Use
          </Badge>
        );
      if (value === "in_storage")
        return (
          <Badge className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            In Storage
          </Badge>
        );
      return null;
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "w-16 text-xs",
    render: (_, row) => <AssetsActions row={row} />, // parent should provide onDelete
    searchable: false,
  },
];
