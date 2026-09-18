"use client";

import { useState } from "react";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { CustomTable } from "@/components/local/custom/custom-table";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useOrders } from "@/lib/api/hooks/useOrders";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import {
  getOrders,
  paymentMethodLabel,
  type Order,
  type OrderSource,
  type OrderStatus,
} from "@/lib/api/services/ordersService";
import { createOrderColumns } from "./OrderColumn";
import OrdersHeader from "./OrdersHeader";
import OnlineStoreCard from "./OnlineStoreCard";
import OrderDetailSheet from "./OrderDetailSheet";

const STATUS_OPTIONS = ["All Statuses", "Pending", "Completed", "Cancelled"];
const SOURCE_OPTIONS = ["All Sources", "POS", "Online Store"];

/** CSV cell — quoted, and text that Excel would run as a formula is neutralised */
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadOrdersCsv(orders: Order[]) {
  const header = [
    "Order",
    "Date",
    "Source",
    "Status",
    "Customer",
    "Email",
    "Phone",
    "Delivery address",
    "Items",
    "Subtotal",
    "Tax",
    "Total",
    "Payment method",
    "Receipt",
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    new Date(o.createdAt).toLocaleString(),
    o.source === "POS" ? "POS" : "Online Store",
    o.status,
    o.customerName || o.customer?.name || "Walk-in customer",
    o.customerEmail ?? "",
    o.customerPhone ?? "",
    o.deliveryAddress ?? "",
    o.itemCount,
    o.subtotal,
    o.tax,
    o.total,
    o.status === "Completed" ? paymentMethodLabel(o.paymentMethod) : "",
    o.receipt?.receiptNumber ?? "",
  ]);
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Orders() {
  const sym = useEntityCurrencySymbol();
  const { openModal } = useModal();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<OrderStatus | undefined>();
  const [source, setSource] = useState<OrderSource | undefined>();
  const [selected, setSelected] = useState<Order | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = { search: debouncedSearch.trim() || undefined, status, source };
  const { data, isLoading, isFetching } = useOrders({ ...filters, page });
  const orders = data?.orders ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      // Every page of the current filter, not just the one on screen
      const all: Order[] = [];
      let p = 1;
      let totalPages = 1;
      do {
        const res = await getOrders({ ...filters, page: p });
        all.push(...res.orders);
        totalPages = res.pagination.totalPages;
        p += 1;
      } while (p <= totalPages);
      if (all.length === 0) {
        toast.info("No orders to export");
        return;
      }
      downloadOrdersCsv(all);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <OrdersHeader
        stats={data?.stats}
        loading={isLoading}
        onExport={exportCsv}
        exporting={exporting}
        onNewSale={() => openModal(MODAL.POS)}
      />
      <OnlineStoreCard />
      <CustomTable
        searchPlaceholder="Search orders..."
        tableTitle="Recent Orders"
        tableSubtitle="Tap an order to see its details"
        columns={createOrderColumns(sym)}
        data={orders}
        pageSize={10}
        loading={isLoading || (isFetching && orders.length === 0)}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        statusOptions={STATUS_OPTIONS}
        onStatusChange={(v) => {
          setStatus(v === "All Statuses" ? undefined : (v as OrderStatus));
          setPage(1);
        }}
        methodsOptions={SOURCE_OPTIONS}
        onMethodsChange={(v) => {
          setSource(v === "POS" ? "POS" : v === "Online Store" ? "ONLINE" : undefined);
          setPage(1);
        }}
        onRowClick={(row) => setSelected(row)}
        pagination={{
          page,
          totalPages: data?.pagination.totalPages ?? 1,
          total: data?.pagination.total,
          onPageChange: setPage,
        }}
        display={{ searchComponent: true, statusComponent: true, methodsComponent: true }}
      />
      <OrderDetailSheet order={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
