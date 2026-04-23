"use client";
import { Mail, Phone, MapPin } from "lucide-react";
// ...existing code...
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Customer } from "./utils/types";
import { getInitials } from "@/lib/utils";
import CustomersActions from "./CustomersActions";

export const customerColumns: Column<Customer>[] = [
  {
    key: "name",
    title: "Customer",

    className: "text-xs",

    render: (value, row) => (
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-indigo-200 flex items-center justify-center text-gray-500 font-semibold text-xs">
          {getInitials(row.name)}
        </div>
        <div>
          <div className="font-normal text-gray-900 line-clamp-1">
            {row.name}
          </div>
          <div className="text-xs text-gray-400 line-clamp-1">
            {row.companyName}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    title: "Contact",
    className: "text-xs",

    render: (value, row) => (
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 text-gray-700">
          <Mail className="w-3 h-3" />
          {value}
        </span>
        <span className="flex items-center gap-1 text-gray-400">
          <Phone className="w-3 h-3" />
          {row.phoneNumber}
        </span>
      </div>
    ),
  },
  {
    key: "state",
    title: "Location",
    className: "text-xs",

    render: (value, row) => (
      <span className="flex items-center gap-1 text-gray-700 line-clamp-1">
        <MapPin className="w-3 h-3" />
        {value}, {row.country}
      </span>
    ),
  },
  {
    key: "invoices",
    title: "Invoices",
    className: "text-xs",
    render: (value, row) => (
      <span className="font-normal text-gray-700">{row.invoiceCount}</span>
    ),
  },
  {
    key: "outstandingBalance",
    title: "Outstanding",
    className: "text-xs",

    render: (value) => (
      <span className="font-normal text-gray-700">
        {new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
        }).format(value || 0)}
      </span>
    ),
  },
  {
    key: "isActive",
    title: "Status",
    className: "text-xs",

    render: (value) => (
      <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
        {value ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    key: "actions",
    title: "",
    className: "w-8 text-xs",
    render: (_, row) => <CustomersActions row={row} />, // parent should provide onDelete
    searchable: false,
  },
];
