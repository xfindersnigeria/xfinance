"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAgedReceivables } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { AgedReceivablesData, AgedReceivablesRow } from "@/lib/api/services/reportService";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

// ─── Date presets ─────────────────────────────────────────────────────────────

type DatePreset = "today" | "end-last-month" | "end-last-quarter" | "end-last-year";
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",            label: "As of Today" },
  { value: "end-last-month",   label: "End of Last Month" },
  { value: "end-last-quarter", label: "End of Last Quarter" },
  { value: "end-last-year",    label: "End of Last Year" },
];
function resolveAsOfDate(preset: DatePreset): string {
  const now = new Date();
  if (preset === "today") return now.toISOString();
  if (preset === "end-last-month") return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  if (preset === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const endMonth = q === 0 ? 9 : (q - 1) * 3 + 2;
    const endYear  = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(endYear, endMonth + 1, 0, 23, 59, 59).toISOString();
  }
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BUCKETS = [
  { key: "current",    label: "Current",   color: "#10b981" },
  { key: "days1_30",   label: "1–30 days", color: "#f59e0b" },
  { key: "days31_60",  label: "31–60 days",color: "#f97316" },
  { key: "days61_90",  label: "61–90 days",color: "#ef4444" },
  { key: "days91_120", label: "91–120 days",color: "#dc2626" },
  { key: "days120Plus",label: "120+ days", color: "#7f1d1d" },
] as const;

const BUCKET_CELL_CLS: Record<string, string> = {
  current:    "text-slate-700",
  days1_30:   "text-amber-600",
  days31_60:  "text-orange-600",
  days61_90:  "text-red-600",
  days91_120: "text-red-700",
  days120Plus:"text-red-800 font-semibold",
};

// ─── Formatter ────────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sym}${(abs / 1_000).toFixed(0)}K`;
  return `${sym}${abs.toLocaleString("en")}`;
}
function fmtAxis(v: number, sym: string) {
  if (v === 0) return `${sym}0`;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${sym}${(v / 1_000).toFixed(0)}K`;
  return `${sym}${v}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, valueClassName, sub }: { label: string; value: string; valueClassName?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgedReceivables() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const [preset, setPreset] = useState<DatePreset>("today");
  const asOfDate = resolveAsOfDate(preset);

  const { data: rawData, isLoading } = useAgedReceivables({ asOfDate });
  const data: AgedReceivablesData | null = (rawData as any)?.data ?? null;

  const totals = data?.totals;
  const grandTotal = totals?.total ?? 0;
  const rows = data?.rows ?? [];

  // Top 10 stacked horizontal bar chart
  const chartData = useMemo(() =>
    rows.slice(0, 10).map(r => ({
      name: r.customerName.length > 20 ? r.customerName.slice(0, 20) + "…" : r.customerName,
      Current:   r.current,
      "1–30":    r.days1_30,
      "31–60":   r.days31_60,
      "61–90":   r.days61_90,
      "91–120":  r.days91_120,
      "120+":    r.days120Plus,
    })), [rows]);

  const overdue90Plus = (totals?.days91_120 ?? 0) + (totals?.days120Plus ?? 0);
  const overduePct = grandTotal > 0
    ? Math.round(((grandTotal - (totals?.current ?? 0)) / grandTotal) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Aged Receivables</h1>
          <p className="text-sm text-slate-500 mt-0.5">Customer balances by aging bucket</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9 w-fit">
        <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
        <Select value={preset} onValueChange={v => setPreset(v as DatePreset)}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-40 focus:ring-0 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Total Outstanding" value={fmtShort(grandTotal, sym)} sub={`${rows.length} customers`} />
            <KPICard label="Current (Not Due)" value={fmtShort(totals?.current ?? 0, sym)} valueClassName="text-green-600 font-bold text-2xl" />
            <KPICard label="Overdue" value={fmtShort(grandTotal - (totals?.current ?? 0), sym)} valueClassName="text-red-500 font-bold text-2xl" sub={`${overduePct}% of total`} />
            <KPICard label="Critical (90+ days)" value={fmtShort(overdue90Plus, sym)} valueClassName="text-red-700 font-bold text-2xl" />
          </div>

          {/* Aging distribution bar */}
          {grandTotal > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Aging Distribution</p>
              <div className="flex h-5 rounded-lg overflow-hidden gap-px">
                {BUCKETS.map((b) => {
                  const val = (totals as any)?.[b.key] as number ?? 0;
                  const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
                  return pct > 0 ? (
                    <div key={b.key} style={{ width: `${pct}%`, backgroundColor: b.color }} title={`${b.label}: ${fmtShort(val, sym)}`} />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {BUCKETS.map((b) => {
                  const val = (totals as any)?.[b.key] as number ?? 0;
                  const pct = grandTotal > 0 ? ((val / grandTotal) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={b.key} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                      {b.label} — {pct}%
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stacked bar chart — top 10 customers */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top Customers by Aging</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={chartData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtShort(v, sym), name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                  {BUCKETS.map(b => (
                    <Bar key={b.key} dataKey={b.label} stackId="a" fill={b.color} maxBarSize={14} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Aged Receivables Detail</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                    {BUCKETS.map(b => (
                      <th key={b.key} className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{b.label}</th>
                    ))}
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">No aged receivables found.</td></tr>
                  ) : (
                    <>
                      {rows.map((row: AgedReceivablesRow) => (
                        <tr key={row.customerName} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-800">{row.customerName}</td>
                          {BUCKETS.map(b => (
                            <td key={b.key} className={cn("px-4 py-3 text-right text-sm", (row as any)[b.key] > 0 ? BUCKET_CELL_CLS[b.key] : "text-slate-300")}>
                              {(row as any)[b.key] > 0 ? fmtShort((row as any)[b.key], sym) : "—"}
                            </td>
                          ))}
                          <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtShort(row.total, sym)}</td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      {totals && (
                        <tr className="border-t-2 border-slate-200 bg-slate-800">
                          <td className="px-5 py-3 text-sm font-bold text-white">Totals</td>
                          {BUCKETS.map(b => (
                            <td key={b.key} className="px-4 py-3 text-right text-sm font-bold text-slate-200">
                              {(totals as any)[b.key] > 0 ? fmtShort((totals as any)[b.key], sym) : "—"}
                            </td>
                          ))}
                          <td className="px-5 py-3 text-right text-sm font-bold text-green-400">{fmtShort(totals.total, sym)}</td>
                        </tr>
                      )}
                    </>
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
