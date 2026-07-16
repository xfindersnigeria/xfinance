"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, ArrowLeft, CalendarDays, Download, Printer,
  TrendingDown, TrendingUp, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePayableSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PayableSummaryData, PayableSummaryRow } from "@/lib/api/services/reportService";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Date presets ─────────────────────────────────────────────────────────────

type DatePreset = "today" | "end-last-month" | "end-last-quarter" | "end-last-year";

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today",            label: "As of Today" },
  { value: "end-last-month",   label: "End of Last Month" },
  { value: "end-last-quarter", label: "End of Last Quarter" },
  { value: "end-last-year",    label: "End of Last Year" },
];

function resolveAsOfDate(p: DatePreset): string {
  const now = new Date();
  if (p === "today") {
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }
  if (p === "end-last-month") return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  if (p === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const endMonth = q === 0 ? 9 : (q - 1) * 3 + 2;
    const endYear  = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(endYear, endMonth + 1, 0, 23, 59, 59).toISOString();
  }
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  Good:     "bg-green-100 text-green-700",
  Warning:  "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-600",
};

const PIE_COLORS = { Good: "#10b981", Warning: "#f59e0b", Critical: "#ef4444" };

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  let s: string;
  if (a >= 1_000_000) s = `${sym}${(a / 1_000_000).toFixed(1)}M`;
  else if (a >= 1_000) s = `${sym}${(a / 1_000).toFixed(0)}k`;
  else s = `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}

function fmtAxis(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, valueClassName, icon,
}: {
  label: string; value: string; sub?: React.ReactNode; valueClassName?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={cn("text-2xl font-bold", valueClassName ?? "text-slate-900")}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PayableSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const [preset, setPreset] = useState<DatePreset>("today");
  const [search, setSearch] = useState("");
  const asOfDate = resolveAsOfDate(preset);

  const { data: rawData, isLoading } = usePayableSummary({ asOfDate });
  const data: PayableSummaryData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];

  // Client-side search filter
  const filteredRows = useMemo(() =>
    search.trim()
      ? rows.filter(r => r.vendorName.toLowerCase().includes(search.toLowerCase()))
      : rows,
  [rows, search]);

  // Top 10 horizontal grouped bar (Current + Overdue)
  const top10Bar = useMemo(() =>
    rows.slice(0, 10).map(r => ({
      name: r.vendorName.length > 22 ? r.vendorName.slice(0, 22) + "…" : r.vendorName,
      Current: r.current,
      Overdue: r.overdue,
    })),
  [rows]);

  // Pie data by vendor count
  const pieData = useMemo(() => [
    { name: "Good Standing", value: data?.goodCount     ?? 0, key: "Good" },
    { name: "Warning",       value: data?.warningCount  ?? 0, key: "Warning" },
    { name: "Critical",      value: data?.criticalCount ?? 0, key: "Critical" },
  ].filter(d => d.value > 0), [data]);

  const top5 = rows.slice(0, 5);

  const currentPct = data && data.totalPayable > 0
    ? Math.round((data.totalCurrent / data.totalPayable) * 100)
    : 0;
  const overduePct = data && data.totalPayable > 0
    ? Math.round((data.totalOverdue / data.totalPayable) * 100)
    : 0;

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
          <h1 className="text-xl font-semibold text-slate-900">Payable Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of outstanding vendor payables</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
        <Input
          placeholder="Search vendors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-56 rounded-xl bg-gray-100 border-0 shadow-none text-sm focus-visible:ring-0"
        />
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Payables"
              value={fmtShort(data?.totalPayable ?? 0, sym)}
              sub={`${data?.vendorCount ?? 0} vendors`}
              icon={<Users className="w-4 h-4 text-slate-400" />}
            />
            <KPICard
              label="Current"
              value={fmtShort(data?.totalCurrent ?? 0, sym)}
              valueClassName="text-green-600 font-bold text-2xl"
              sub={`${currentPct}% of total`}
              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
            />
            <KPICard
              label="Overdue"
              value={fmtShort(data?.totalOverdue ?? 0, sym)}
              valueClassName="text-red-600 font-bold text-2xl"
              sub={<span className="text-red-500">{overduePct}% of total</span>}
              icon={<TrendingDown className="w-4 h-4 text-red-500" />}
            />
            <KPICard
              label="Average Payable"
              value={fmtShort(data?.avgPayable ?? 0, sym)}
              sub={data && data.overdueVendorCount > 0
                ? <span className="text-amber-500">{data.overdueVendorCount} with overdue</span>
                : undefined}
            />
          </div>

          {/* Charts row */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Grouped horizontal bar — top vendors */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Top Vendors by Payable</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    layout="vertical"
                    data={top10Bar}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={v => fmtAxis(v, sym)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={160}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [fmtShort(v, sym), name]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Current" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={10} />
                    <Bar dataKey="Overdue" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Vendor Status pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
                <p className="font-semibold text-slate-800">Vendor Status</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={PIE_COLORS[entry.key as keyof typeof PIE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3">
                  {Object.entries(PIE_COLORS).map(([key, color]) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                      {key === "Good" ? "Good Standing" : key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Top 5 Vendors ranked */}
          {top5.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top 5 Vendors by Payable Amount</p>
              <div className="flex flex-col divide-y divide-slate-100">
                {top5.map((row, idx) => (
                  <div key={row.vendorId} className="flex items-center gap-4 py-3">
                    <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500 shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{row.vendorName}</p>
                      <p className="text-xs text-slate-400">{row.billCount} bill{row.billCount !== 1 ? "s" : ""} • {row.paymentTerms}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{fmtShort(row.totalPayable, sym)}</p>
                      {row.overdue > 0
                        ? <p className="text-xs text-red-500">{fmtShort(row.overdue, sym)} overdue</p>
                        : <p className="text-xs text-green-600">All current</p>}
                    </div>
                    <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full shrink-0", STATUS_CLS[row.status])}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Vendor Payables table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">All Vendor Payables</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Vendor</th>
                    <th className="px-5 py-3 text-right">Total Payable</th>
                    <th className="px-5 py-3 text-right">Current</th>
                    <th className="px-5 py-3 text-right">Overdue</th>
                    <th className="px-5 py-3 text-right">Bills</th>
                    <th className="px-5 py-3 text-left">Last Payment</th>
                    <th className="px-5 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No outstanding payables found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredRows.map((row: PayableSummaryRow) => (
                        <tr key={row.vendorId} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <p className="text-sm text-slate-800">{row.vendorName}</p>
                            <p className="text-xs text-slate-400">{row.paymentTerms}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(row.totalPayable, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-green-600">
                            {fmtShort(row.current, sym)}
                          </td>
                          <td className={cn("px-5 py-3 text-right text-sm font-medium", row.overdue > 0 ? "text-red-500" : "text-slate-300")}>
                            {fmtShort(row.overdue, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">
                            {row.billCount}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {fmtDate(row.lastPaymentDate)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_CLS[row.status])}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Total row */}
                      {data && (
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-bold text-slate-900">
                            Total ({data.vendorCount} vendors)
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(data.totalPayable, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                            {fmtShort(data.totalCurrent, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-red-500">
                            {fmtShort(data.totalOverdue, sym)}
                          </td>
                          <td colSpan={3} />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Alert */}
          {data && data.totalOverdue > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="font-semibold text-amber-800">Payment Alert</p>
              </div>
              <p className="text-sm text-amber-700 ml-7">
                {data.overduePercentage.toFixed(1)}% of your payables ({fmtShort(data.totalOverdue, sym)}) are overdue.{" "}
                {data.overdueVendorCount} vendor{data.overdueVendorCount !== 1 ? "s" : ""} have outstanding overdue amounts.{" "}
                Consider making payments to maintain good vendor relationships and avoid penalties.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
