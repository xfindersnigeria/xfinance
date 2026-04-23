"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";

// Data for the orders table (from screenshot)
export const ordersData = [
  {
    orderId: "ORD-2024-1145",
    customer: "Acme Corp",
    dateTime: "2024-11-08 14:32",
    items: 5,
    total: 1245.5,
    payment: "Credit Card",
    status: "Completed",
    source: "POS",
  },
  {
    orderId: "ORD-2024-1144",
    customer: "TechStart Inc",
    dateTime: "2024-11-08 13:15",
    items: 3,
    total: 875.0,
    payment: "Cash",
    status: "Completed",
    source: "POS",
  },
  {
    orderId: "WEB-2024-0089",
    customer: "Sarah Johnson",
    dateTime: "2024-11-08 12:45",
    items: 2,
    total: 250.0,
    payment: "Credit Card",
    status: "Pending",
    source: "Online Store",
  },
  {
    orderId: "ORD-2024-1142",
    customer: "Global Ventures Ltd",
    dateTime: "2024-11-08 11:20",
    items: 8,
    total: 2100.0,
    payment: "Credit Card",
    status: "Completed",
    source: "POS",
  },
  {
    orderId: "WEB-2024-0088",
    customer: "Michael Brown",
    dateTime: "2024-11-07 19:30",
    items: 1,
    total: 499.0,
    payment: "PayPal",
    status: "Completed",
    source: "Online Store",
  },
  {
    orderId: "WEB-2024-0087",
    customer: "Emma Wilson",
    dateTime: "2024-11-07 16:22",
    items: 4,
    total: 680.0,
    payment: "Credit Card",
    status: "Completed",
    source: "Online Store",
  },
];

// Table columns for orders
export const ordersColumns: Column<any>[] = [
  {
    key: "orderId",
    title: "Order ID",
    className: "text-xs",
    render: (value) => (
      <span className="text-blue-700 underline cursor-pointer">{value}</span>
    ),
  },
  {
    key: "customer",
    title: "Customer",
    className: "text-xs",
    render: (value) => <span className="text-gray-900">{value}</span>,
  },
  {
    key: "dateTime",
    title: "Date & Time",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "items",
    title: "Items",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "total",
    title: "Total",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">${value.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>,
  },
  {
    key: "payment",
    title: "Payment",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Completed")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Completed
          </Badge>
        );
      if (value === "Pending")
        return (
          <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
            Pending
          </Badge>
        );
      return null;
    },
  },
  {
    key: "source",
    title: "Source",
    className: "text-xs",
    render: (value) => {
      if (value === "POS")
        return (
          <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-medium">
            POS
          </Badge>
        );
      if (value === "Online Store")
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Online Store
          </Badge>
        );
      return null;
    },
  },
];
