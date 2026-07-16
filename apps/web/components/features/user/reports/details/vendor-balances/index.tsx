"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useVendorBalances } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { VendorBalancesData, VendorBalanceRow } from "@/lib/api/services/reportService";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type DatePreset = "today" | "end-last-month" | "end-last-quarter" | "end-last-year";
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "As of Today" }, { value: "end-last-month", label: "End of Last Month" },
  { value: "end-last-quarter", label: "End of Last Quarter" }, { value: "end-last-year", label: "End of Last Year" },
];
function resolveAsOfDate(p: DatePreset): string {
  const now = new Date();
  if (p === "today") return now.toISOString();
  if (p === "end-last-month") return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  if (p === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(q === 0 ? now.getFullYear() - 1 : now.getFullYear(), q === 0 ? 9 : (q - 1) * 3 + 2 + 1, 0, 23, 59, 59).toISOString();
  }
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}
function fmtAxis(v: number, sym: string) { return v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${sym}${(v / 1_000).toFixed(0)}K` : `${sym}${v}`; }
const tooltipStyle = { contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" } };

function KPICard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function VendorBalances() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const [preset, setPreset] = useState<DatePreset>("today");
  const asOfDate = resolveAsOfDate(preset);
  const { data: rawData, isLoading } = useVendorBalances({ asOfDate });
  const data: VendorBalancesData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];
  const top10 = rows.slice(0, 10).map(r => ({ name: r.vendorName.length > 18 ? r.vendorName.slice(0, 18) + "…" : r.vendorName, Billed: r.totalBilled, Paid: r.totalPaid }));

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Vendor Balances</h1>
          <p className="text-sm text-slate-500 mt-0.5">Outstanding balances grouped by vendor</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9 w-fit">
        <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
        <Select value={preset} onValueChange={v => setPreset(v as DatePreset)}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-40 focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Billed" value={fmtShort(data?.totalBilled ?? 0, sym)} />
            <KPICard label="Total Paid" value={fmtShort(data?.totalPaid ?? 0, sym)} valueClassName="text-green-600 font-bold text-2xl" />
            <KPICard label="Total Balance" value={fmtShort(data?.totalBalance ?? 0, sym)} valueClassName="text-amber-600 font-bold text-2xl" />
          </div>

          {top10.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top Vendors</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart layout="vertical" data={top10} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtShort(v, sym), name]} />
                  <Bar dataKey="Billed" fill="#6366f1" radius={[0, 4, 4, 0]} maxBarSize={12} />
                  <Bar dataKey="Paid" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Vendor Balances</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Billed</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400 text-sm">No vendor balance data found.</td></tr>
                    : <>
                        {rows.map((row: VendorBalanceRow) => (
                          <tr key={row.vendorId} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3 text-sm text-slate-800">{row.vendorName}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtShort(row.totalBilled, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm text-green-600">{fmtShort(row.totalPaid, sym)}</td>
                            <td className={cn("px-5 py-3 text-right text-sm font-medium", row.balance > 0 ? "text-amber-600" : "text-slate-400")}>{fmtShort(row.balance, sym)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtShort(data?.totalBilled ?? 0, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-green-600">{fmtShort(data?.totalPaid ?? 0, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-amber-600">{fmtShort(data?.totalBalance ?? 0, sym)}</td>
                        </tr>
                      </>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
