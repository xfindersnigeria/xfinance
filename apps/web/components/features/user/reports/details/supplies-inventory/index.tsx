"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSuppliesInventory } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { SuppliesInventoryData, SupplyInventoryRow } from "@/lib/api/services/reportService";

function fmt(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = `${sym}${abs.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function KPICard({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-1.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("text-lg font-semibold", cls ?? "text-gray-900")}>{value}</p>
    </div>
  );
}

const STATUS_CLS: Record<string, string> = {
  OK: "bg-green-100 text-green-700",
  "Low Stock": "bg-yellow-100 text-yellow-800",
  "Out of Stock": "bg-red-100 text-red-700",
};

const STATUS_OPTIONS = ["All", "OK", "Low Stock", "Out of Stock"];

export default function SuppliesInventory() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: rawData, isLoading } = useSuppliesInventory();
  const data: SuppliesInventoryData | null = (rawData as any)?.data ?? null;

  const rows = (data?.rows ?? []).filter((r) => statusFilter === "All" || r.status === statusFilter);

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Supplies Inventory</h1>
          <p className="text-sm text-primary">Current stock levels, valuations, and status of all supply items</p>
        </div>
        <div className="flex items-center gap-2 mt-6 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {}}><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {}}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Items" value={String(data?.summary.totalItems ?? 0)} />
            <KPICard label="Total Value" value={fmt(data?.summary.totalValue ?? 0, sym)} />
            <KPICard label="Low Stock" value={String(data?.summary.lowStockCount ?? 0)} cls="text-yellow-700" />
            <KPICard label="Out of Stock" value={String(data?.summary.outOfStockCount ?? 0)} cls="text-red-600" />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Qty</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Min Qty</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Unit Price</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">Last Restock</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row: SupplyInventoryRow) => (
                    <tr key={row.supplyId} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-800 font-medium">{row.name}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.category}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{row.sku ?? "—"}</td>
                      <td className={cn("px-4 py-2.5 text-right text-sm font-medium", row.quantity === 0 ? "text-red-600" : row.quantity <= row.minQuantity ? "text-yellow-700" : "text-gray-900")}>
                        {row.quantity.toLocaleString("en")}
                      </td>
                      <td className="px-4 py-2.5 text-right text-sm text-gray-500">{row.minQuantity}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{fmt(row.unitPrice, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium">{fmt(row.totalValue, sym)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_CLS[row.status] ?? "bg-gray-100 text-gray-600")}>{row.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{row.lastRestockDate ?? "—"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-400 text-sm">No inventory data found.</td></tr>
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
