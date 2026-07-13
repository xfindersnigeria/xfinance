"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, Download, Printer, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useReceivableSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { ReceivableSummaryData, ReceivableSummaryRow } from "@/lib/api/services/reportService";
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

function resolveAsOfDate(preset: DatePreset): string {
  const now = new Date();
  if (preset === "today") return now.toISOString();
  if (preset === "end-last-month") {
    return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  }
  if (preset === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const endMonth = q === 0 ? 9 : (q - 1) * 3 + 2;
    const endYear  = q === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return new Date(endYear, endMonth + 1, 0, 23, 59, 59).toISOString();
  }
  // end-last-year
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { badge: string; text: string }> = {
  Good:     { badge: "bg-green-100 text-green-700",  text: "text-green-600" },
  Warning:  { badge: "bg-yellow-100 text-yellow-700", text: "text-yellow-600" },
  Critical: { badge: "bg-red-100 text-red-600",      text: "text-red-600" },
};

const PIE_COLORS = { Good: "#10b981", Warning: "#f59e0b", Critical: "#ef4444" };

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  let str: string;
  if (abs >= 1_000_000)  str = `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) str = `${sym}${(abs / 1_000).toFixed(0)}K`;
  else                   str = `${sym}${abs.toLocaleString("en")}`;
  return amount < 0 ? `(${str})` : str;
}

function fmtAxis(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sym}${(abs / 1_000).toFixed(0)}K`;
  return `${sym}${abs}`;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, valueClassName, sub, subClassName, icon,
}: {
  label: string; value: string; valueClassName?: string;
  sub?: React.ReactNode; subClassName?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subClassName ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReceivableSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const [preset, setPreset] = useState<DatePreset>("today");
  const asOfDate = resolveAsOfDate(preset);

  const { data: rawData, isLoading } = useReceivableSummary({ asOfDate });
  const data: ReceivableSummaryData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];

  // Charts data
  const top10Bar = rows.slice(0, 10).map(r => ({
    name: r.customerName.length > 18 ? r.customerName.slice(0, 18) + "…" : r.customerName,
    Current: r.current,
    Overdue: r.overdue,
  }));

  const pieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Good Standing", value: data.goodCount,     key: "Good" },
      { name: "Warning",       value: data.warningCount,  key: "Warning" },
      { name: "Critical",      value: data.criticalCount, key: "Critical" },
    ].filter(d => d.value > 0);
  }, [data]);

  const top5 = rows.slice(0, 5);
  const overdueCustomers = rows.filter(r => r.overdue > 0).length;
  const overdueTotal = rows.reduce((s, r) => s + r.overdue, 0);

  const currentPct  = data && data.totalReceivables > 0 ? Math.round((data.totalCurrent  / data.totalReceivables) * 100) : 0;
  const overduePct  = data && data.totalReceivables > 0 ? Math.round((data.totalOverdue  / data.totalReceivables) * 100) : 0;

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
          <h1 className="text-xl font-semibold text-slate-900">Receivable Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of outstanding customer receivables</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9 w-fit">
        <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
        <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-40 focus:ring-0 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Receivables"
              value={data ? fmtShort(data.totalReceivables, sym) : "—"}
              icon={<Users className="w-4 h-4 text-blue-400" />}
              sub={data ? `${data.customerCount} customers` : undefined}
            />
            <KPICard
              label="Current"
              value={data ? fmtShort(data.totalCurrent, sym) : "—"}
              valueClassName="text-green-600 font-bold text-2xl"
              icon={<TrendingUp className="w-4 h-4 text-green-500" />}
              sub={`${currentPct}% of total`}
            />
            <KPICard
              label="Overdue"
              value={data ? fmtShort(data.totalOverdue, sym) : "—"}
              valueClassName="text-red-600 font-bold text-2xl"
              icon={<TrendingDown className="w-4 h-4 text-red-500" />}
              sub={<span className="text-red-500">{overduePct}% of total</span>}
            />
            <KPICard
              label="Average Receivable"
              value={data ? fmtShort(data.avgReceivable, sym) : "—"}
              sub={data && data.overdueCustomerCount > 0
                ? <span className="text-amber-500">{data.overdueCustomerCount} with overdue</span>
                : undefined}
            />
          </div>

          {/* Charts */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top customers by receivable — grouped horizontal bar */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Top Customers by Receivable</p>
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
                      width={140}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [fmtShort(v, sym), name]}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Current" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={14} />
                    <Bar dataKey="Overdue" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Customer Status pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-2">Customer Status</p>
                <ResponsiveContainer width="100%" height={240}>
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
                <div className="flex flex-wrap justify-center gap-3 mt-2">
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

          {/* Top 5 customers ranked */}
          {top5.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top 5 Customers by Receivable Amount</p>
              <div className="flex flex-col divide-y divide-slate-100">
                {top5.map((row, idx) => {
                  const style = STATUS_STYLE[row.status];
                  return (
                    <div key={row.customerId} className="flex items-center gap-4 py-3">
                      <div className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{row.customerName}</p>
                        <p className="text-xs text-slate-400">
                          {row.invoiceCount} invoice{row.invoiceCount !== 1 ? "s" : ""} • {row.paymentTerms}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-slate-900">{fmtShort(row.totalReceivable, sym)}</p>
                        {row.overdue > 0
                          ? <p className="text-xs text-red-500">{sym}{fmtShort(row.overdue, sym)} overdue</p>
                          : <p className="text-xs text-green-600">All current</p>
                        }
                      </div>
                      <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full shrink-0", style.badge)}>
                        {row.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Customer Receivables table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">All Customer Receivables</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Receivable</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Current</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Overdue</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoices</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Payment</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit Limit</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No outstanding receivables found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((row: ReceivableSummaryRow) => {
                        const style = STATUS_STYLE[row.status];
                        return (
                          <tr key={row.customerId} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3">
                              <p className="text-sm text-slate-800">{row.customerName}</p>
                              <p className="text-xs text-slate-400">{row.paymentTerms}</p>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{fmtShort(row.totalReceivable, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-green-600">{fmtShort(row.current, sym)}</td>
                            <td className={cn("px-5 py-3 text-right text-sm font-medium", row.overdue > 0 ? "text-red-500" : "text-slate-400")}>
                              {fmtShort(row.overdue, sym)}
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-slate-600">{row.invoiceCount}</td>
                            <td className="px-5 py-3 text-sm text-slate-600">
                              {row.lastPaymentDate ? fmtDate(row.lastPaymentDate) : "—"}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <p className="text-sm text-slate-800">{row.creditLimit ? fmtShort(row.creditLimit, sym) : "—"}</p>
                              {row.creditUtilization != null && (
                                <p className={cn("text-xs", row.creditUtilization >= 80 ? "text-red-500" : row.creditUtilization >= 60 ? "text-amber-500" : "text-slate-400")}>
                                  {row.creditUtilization}% utilized
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", style.badge)}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total row */}
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900">
                          Total ({data?.customerCount ?? rows.length} customers)
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{data ? fmtShort(data.totalReceivables, sym) : "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-green-600">{data ? fmtShort(data.totalCurrent, sym) : "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-red-500">{data ? fmtShort(data.totalOverdue, sym) : "—"}</td>
                        <td colSpan={4} />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Receivables Alert */}
          {data && data.totalOverdue > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="font-semibold text-amber-800">Receivables Alert</p>
              </div>
              <p className="text-sm text-amber-700 ml-7">
                {data.overduePercentage.toFixed(1)}% of your receivables ({fmtShort(data.totalOverdue, sym)}) are overdue.{" "}
                {overdueCustomers} customer{overdueCustomers !== 1 ? "s" : ""} have outstanding overdue amounts.{" "}
                Consider following up to improve collection rates.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
