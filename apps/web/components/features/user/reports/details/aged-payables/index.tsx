"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarDays, Download, Printer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAgedPayables } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { AgedPayablesData, AgedPayablesRow } from "@/lib/api/services/reportService";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell,
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
  if (preset === "today") {
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }
  if (preset === "end-last-month") return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  if (preset === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const endMonth = q === 0 ? 9 : (q - 1) * 3 + 2;
    const endYear  = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(endYear, endMonth + 1, 0, 23, 59, 59).toISOString();
  }
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

// ─── Bucket definitions ───────────────────────────────────────────────────────

const BUCKETS = [
  {
    key: "current",   label: "Current",    color: "#10b981",
    bg: "bg-green-50",  text: "text-green-700",  cellBg: "bg-green-50/60",  cellText: "text-green-700",
  },
  {
    key: "days1_30",  label: "1-30 Days",  color: "#6366f1",
    bg: "bg-indigo-50", text: "text-indigo-700", cellBg: "bg-indigo-50/60", cellText: "text-indigo-700",
  },
  {
    key: "days31_60", label: "31-60 Days", color: "#f59e0b",
    bg: "bg-amber-50",  text: "text-amber-700",  cellBg: "bg-amber-50/60",  cellText: "text-amber-700",
  },
  {
    key: "days61_90", label: "61-90 Days", color: "#f97316",
    bg: "bg-orange-50", text: "text-orange-700", cellBg: "bg-orange-50/60", cellText: "text-orange-700",
  },
  {
    key: "days90Plus", label: "90+ Days",  color: "#ef4444",
    bg: "bg-red-50",    text: "text-red-700",    cellBg: "bg-red-50/60",    cellText: "text-red-700 font-semibold",
  },
] as const;

type BucketKey = typeof BUCKETS[number]["key"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function row90Plus(r: AgedPayablesRow) { return r.days91_120 + r.days120Plus; }

function rowByKey(r: AgedPayablesRow, key: BucketKey): number {
  if (key === "days90Plus") return row90Plus(r);
  return (r as any)[key] as number;
}

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sym}${(abs / 1_000).toFixed(0)}k`;
  return `${sym}${abs.toLocaleString("en")}`;
}

function fmtAxis(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v}`;
}

function priorityBadge(row: AgedPayablesRow): { label: string; cls: string } {
  const overdue90 = row90Plus(row);
  if (overdue90 > 0) return { label: "Urgent", cls: "bg-red-100 text-red-700" };
  if (row.days61_90 > 0) return { label: "High", cls: "bg-orange-100 text-orange-700" };
  if (row.days1_30 > 0 || row.days31_60 > 0) return { label: "Medium", cls: "bg-amber-100 text-amber-700" };
  return { label: "Normal", cls: "bg-green-100 text-green-700" };
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AgedPayables() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const [preset, setPreset] = useState<DatePreset>("today");
  const asOfDate = resolveAsOfDate(preset);

  const { data: rawData, isLoading } = useAgedPayables({ asOfDate });
  const data: AgedPayablesData | null = (rawData as any)?.data ?? null;

  const totals = data?.totals;
  const rows   = data?.rows ?? [];

  const total90Plus = (totals?.days91_120 ?? 0) + (totals?.days120Plus ?? 0);
  const grandTotal  = totals?.total ?? 0;

  const bucketTotals: Record<BucketKey, number> = useMemo(() => ({
    current:    totals?.current  ?? 0,
    days1_30:   totals?.days1_30 ?? 0,
    days31_60:  totals?.days31_60 ?? 0,
    days61_90:  totals?.days61_90 ?? 0,
    days90Plus: total90Plus,
  }), [totals, total90Plus]);

  const agingBarData = useMemo(() => BUCKETS.map(b => ({
    name: b.label,
    Amount: bucketTotals[b.key],
    fill: b.color,
  })), [bucketTotals]);

  const overdueVendors = useMemo(() =>
    rows
      .filter(r => r.days61_90 + row90Plus(r) > 0)
      .slice(0, 8)
      .map(r => ({
        name: r.vendorName.length > 16 ? r.vendorName.slice(0, 16) + "…" : r.vendorName,
        "1-30 Days":  r.days1_30,
        "31-60 Days": r.days31_60,
        "61-90 Days": r.days61_90,
        "90+ Days":   row90Plus(r),
      })),
  [rows]);

  const urgent90Vendors = useMemo(() =>
    rows
      .filter(r => row90Plus(r) > 0)
      .sort((a, b) => row90Plus(b) - row90Plus(a))
      .slice(0, 5),
  [rows]);

  const currentPct    = grandTotal > 0 ? ((bucketTotals.current / grandTotal) * 100).toFixed(1) : "0";
  const overdue60Plus = bucketTotals.days61_90 + total90Plus;
  const urgentCount   = rows.filter(r => priorityBadge(r).label === "Urgent").length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Aged Payables Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track outstanding payables by aging period</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9">
          <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
          <Select value={preset} onValueChange={v => setPreset(v as DatePreset)}>
            <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-44 focus:ring-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Bucket Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-1">
              <p className="text-xs text-slate-500 font-medium">Total</p>
              <p className="text-xl font-bold text-slate-900">{fmtShort(grandTotal, sym)}</p>
              <p className="text-xs text-slate-400">All payables</p>
            </div>
            {BUCKETS.map(b => {
              const val = bucketTotals[b.key];
              const pct = grandTotal > 0 ? Math.round((val / grandTotal) * 100) : 0;
              return (
                <div key={b.key} className={cn("rounded-2xl border shadow-sm p-4 flex flex-col gap-1", b.bg, "border-transparent")}>
                  <p className={cn("text-xs font-medium", b.text)}>{b.label}</p>
                  <p className={cn("text-xl font-bold", b.text)}>{fmtShort(val, sym)}</p>
                  <p className={cn("text-xs", b.text, "opacity-70")}>{pct}%</p>
                </div>
              );
            })}
          </div>

          {/* Charts row */}
          {grandTotal > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Aging Distribution */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Aging Distribution</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={agingBarData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} width={60} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Amount"]} />
                    <Bar dataKey="Amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
                      {agingBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Percentage by Aging Period */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-5">Percentage by Aging Period</p>
                <div className="flex flex-col gap-5">
                  {BUCKETS.map(b => {
                    const val = bucketTotals[b.key];
                    const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0;
                    return (
                      <div key={b.key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-slate-700">{b.label}</span>
                          <span className="text-sm font-medium text-slate-600">
                            {fmtShort(val, sym)} ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: b.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Vendors with Aged Balances (61+ Days) */}
          {overdueVendors.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">
                Vendors with Aged Balances (61+ Days)
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={overdueVendors} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} width={60} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtShort(v, sym), name]} />
                  <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Bar dataKey="1-30 Days"  stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} maxBarSize={56} />
                  <Bar dataKey="31-60 Days" stackId="a" fill="#f59e0b" maxBarSize={56} />
                  <Bar dataKey="61-90 Days" stackId="a" fill="#f97316" maxBarSize={56} />
                  <Bar dataKey="90+ Days"   stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Vendor Aging Details Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Vendor Aging Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    {BUCKETS.map(b => (
                      <th
                        key={b.key}
                        className={cn("px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide whitespace-nowrap", b.text, b.bg)}
                      >
                        {b.label}
                      </th>
                    ))}
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No aged payables found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((row: AgedPayablesRow) => {
                        const overdue = row.days1_30 + row.days31_60 + row.days61_90 + row90Plus(row);
                        const priority = priorityBadge(row);
                        return (
                          <tr key={row.vendorName} className="border-t border-slate-50 hover:bg-slate-50/40">
                            <td className="px-5 py-3">
                              <p className="text-sm text-slate-800">{row.vendorName}</p>
                              {overdue > 0 && (
                                <p className="text-xs text-red-500">{fmtShort(overdue, sym)} overdue</p>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                              {fmtShort(row.total, sym)}
                            </td>
                            {BUCKETS.map(b => {
                              const val = rowByKey(row, b.key);
                              return (
                                <td key={b.key} className={cn("px-4 py-3 text-right text-sm", b.cellBg)}>
                                  <span className={val > 0 ? b.cellText : "text-slate-300"}>
                                    {fmtShort(val, sym)}
                                  </span>
                                </td>
                              );
                            })}
                            <td className="px-5 py-3 text-center">
                              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", priority.cls)}>
                                {priority.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Total row */}
                      {totals && (
                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                          <td className="px-5 py-3 text-sm font-bold text-slate-900">Total</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(grandTotal, sym)}
                          </td>
                          {BUCKETS.map(b => {
                            const val = b.key === "days90Plus" ? total90Plus : (totals as any)[b.key] as number;
                            return (
                              <td key={b.key} className={cn("px-4 py-3 text-right text-sm font-bold", b.cellBg, b.cellText)}>
                                {fmtShort(val, sym)}
                              </td>
                            );
                          })}
                          <td />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Urgent Payment Alert */}
          {total90Plus > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="font-semibold text-red-800">Urgent Payment Alert</p>
              </div>
              <p className="text-sm text-red-700 ml-7 mb-3">
                You have <strong>{fmtShort(total90Plus, sym)}</strong> in payables aged over 90 days.
                These vendors require immediate payment to avoid supply disruption and late payment penalties.
              </p>
              <ul className="ml-7 flex flex-col gap-1">
                {urgent90Vendors.map(r => (
                  <li key={r.vendorName} className="text-sm text-red-700">
                    · <strong>{r.vendorName}</strong>: {fmtShort(row90Plus(r), sym)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Payment Insights */}
          {grandTotal > 0 && (
            <div className="bg-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-teal-400 shrink-0" />
                <p className="font-semibold text-white">Payment Insights</p>
              </div>
              <ul className="flex flex-col gap-2 ml-7">
                <li className="text-sm text-slate-300">
                  <strong className="text-teal-400">{currentPct}%</strong>{" "}
                  of payables are current
                  {parseFloat(currentPct) >= 70
                    ? ", which indicates good payment management."
                    : " — consider reviewing your payment schedule."}
                </li>
                {overdue60Plus > 0 && (
                  <li className="text-sm text-slate-300">
                    Prioritize paying the{" "}
                    <strong className="text-amber-400">{fmtShort(overdue60Plus, sym)}</strong>{" "}
                    in payables aged over 60 days to maintain vendor relationships and avoid penalties.
                  </li>
                )}
                {urgentCount > 0 && (
                  <li className="text-sm text-slate-300">
                    <strong className="text-amber-400">{urgentCount}</strong>{" "}
                    vendor{urgentCount !== 1 ? "s" : ""} with urgent (90+ day) overdue balances.
                    Consider negotiating extended payment terms where possible.
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
