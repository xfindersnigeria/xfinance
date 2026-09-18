"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useSuppliesInventory } from "@/lib/api/hooks/useReports";
import { useEntityBaseCurrency, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { ReportExportButtons } from "../../ReportExportButtons";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import { SuppliesInventoryData, SupplyInventoryRow } from "@/lib/api/services/reportService";

const STATUS_STYLE: Record<string, string> = {
  OK:            "bg-green-100 text-green-700",
  "Low Stock":   "bg-yellow-100 text-yellow-800",
  "Out of Stock":"bg-red-100 text-red-700",
};
const STATUS_OPTIONS = ["All", "OK", "Low Stock", "Out of Stock"];

function fmt(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = `${sym}${a.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return v < 0 ? `(${s})` : s;
}
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function KPICard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function SuppliesInventory() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const currency = useEntityBaseCurrency();
  const [statusFilter, setStatusFilter] = useState("All");
  const { data: rawData, isLoading } = useSuppliesInventory();
  const data: SuppliesInventoryData | null = (rawData as any)?.data ?? null;
  const rows = (data?.rows ?? []).filter(r => statusFilter === "All" || r.status === statusFilter);

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    return {
      title: "Supplies Inventory",
      scope: "entity",
      period: `As of ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      currency,
      landscape: true,
      summary: [
        { label: "Total Items", value: data.summary.totalItems, format: "number" },
        { label: "Total Value", value: data.summary.totalValue, format: "amount" },
        { label: "Low Stock", value: data.summary.lowStockCount, format: "number" },
        { label: "Out of Stock", value: data.summary.outOfStockCount, format: "number" },
      ],
      notes: statusFilter !== "All" ? [`Filtered by status: ${statusFilter}`] : [],
      columns: [
        { key: "name", label: "Name" },
        { key: "category", label: "Category" },
        { key: "sku", label: "SKU" },
        { key: "qty", label: "Qty", format: "number" },
        { key: "minQty", label: "Min Qty", format: "number" },
        { key: "unitPrice", label: "Unit Price", format: "amount" },
        { key: "value", label: "Total Value", format: "amount" },
        { key: "status", label: "Status" },
        { key: "restock", label: "Last Restock" },
      ],
      sections: [
        {
          rows: [
            ...rows.map((r) => ({
              cells: {
                name: r.name,
                category: r.category,
                sku: r.sku ?? "—",
                qty: r.quantity,
                minQty: r.minQuantity,
                unitPrice: r.unitPrice,
                value: r.totalValue,
                status: r.status,
                restock: fmtDate(r.lastRestockDate),
              },
            })),
            { kind: "total" as const, cells: { name: "Total", qty: rows.reduce((s, r) => s + r.quantity, 0), value: rows.reduce((s, r) => s + r.totalValue, 0) } },
          ],
        },
      ],
    };
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Supplies Inventory</h1>
          <p className="text-sm text-slate-500 mt-0.5">Current stock levels, valuations, and status of all supply items</p>
        </div>
        <div className="mt-7">
          <ReportExportButtons getPayload={buildExport} disabled={isLoading || !data} />
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 h-9 w-fit">
        <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-32 focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s === "All" ? "All Statuses" : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Items" value={String(data?.summary.totalItems ?? 0)} />
            <KPICard label="Total Value" value={fmt(data?.summary.totalValue ?? 0, sym)} />
            <KPICard label="Low Stock" value={String(data?.summary.lowStockCount ?? 0)} valueClassName="text-yellow-700 font-bold text-2xl" />
            <KPICard label="Out of Stock" value={String(data?.summary.outOfStockCount ?? 0)} valueClassName="text-red-600 font-bold text-2xl" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Inventory ({rows.length} items)</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">SKU</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Min Qty</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Price</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Value</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Last Restock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row: SupplyInventoryRow) => (
                    <tr key={row.supplyId} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">{row.name}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{row.category}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{row.sku ?? "—"}</td>
                      <td className={cn("px-5 py-3 text-right text-sm font-medium",
                        row.quantity === 0 ? "text-red-600" : row.quantity <= row.minQuantity ? "text-yellow-700" : "text-slate-900")}>
                        {row.quantity.toLocaleString("en")}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-slate-500">{row.minQuantity}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{fmt(row.unitPrice, sym)}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{fmt(row.totalValue, sym)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[row.status] ?? "bg-gray-100 text-gray-600")}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{fmtDate(row.lastRestockDate)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} className="px-5 py-16 text-center text-slate-400 text-sm">No inventory data found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
