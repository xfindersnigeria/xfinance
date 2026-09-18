"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { paymentMethodLabel, type Order } from "@/lib/api/services/ordersService";

export function OrderStatusBadge({ status }: { status: Order["status"] }) {
  if (status === "Completed")
    return <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Completed</Badge>;
  if (status === "Pending")
    return <Badge className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">Pending</Badge>;
  return <Badge className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">Cancelled</Badge>;
}

export function OrderSourceBadge({ source }: { source: Order["source"] }) {
  return source === "POS" ? (
    <Badge className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">POS</Badge>
  ) : (
    <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Online Store</Badge>
  );
}

export const formatOrderDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// Table columns for orders
export function createOrderColumns(sym: string): Column<Order>[] {
  return [
    {
      key: "orderNumber",
      title: "Order ID",
      className: "text-xs",
      render: (value) => <span className="text-primary underline whitespace-nowrap">{value}</span>,
    },
    {
      key: "customerName",
      title: "Customer",
      className: "text-xs",
      render: (value, row) => (
        <span className="text-gray-900">{value || row.customer?.name || "Walk-in customer"}</span>
      ),
    },
    {
      key: "createdAt",
      title: "Date & Time",
      className: "text-xs",
      render: (value) => <span className="text-gray-700 whitespace-nowrap">{formatOrderDate(value)}</span>,
    },
    {
      key: "itemCount",
      title: "Items",
      className: "text-xs",
      render: (value) => <span className="text-gray-700">{value}</span>,
    },
    {
      key: "total",
      title: "Total",
      className: "text-xs",
      render: (value) => <span className="text-gray-700 whitespace-nowrap">{fmtAmount(Number(value) || 0, sym)}</span>,
    },
    {
      key: "paymentMethod",
      title: "Payment",
      className: "text-xs",
      render: (value, row) => (
        <span className="text-gray-700">{row.status === "Pending" ? "Awaiting payment" : paymentMethodLabel(value)}</span>
      ),
    },
    {
      key: "status",
      title: "Status",
      className: "text-xs",
      render: (value) => <OrderStatusBadge status={value} />,
    },
    {
      key: "source",
      title: "Source",
      className: "text-xs",
      render: (value) => <OrderSourceBadge source={value} />,
    },
  ];
}
