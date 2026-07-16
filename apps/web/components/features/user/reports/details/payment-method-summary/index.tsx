"use client";
import React, { useMemo } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Printer, TrendingUp, TrendingDown,
  Banknote, CreditCard, Smartphone, Wallet, FileText, CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePaymentMethodSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PaymentMethodSummaryData, PaymentMethodRow, PaymentTransaction } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_COLORS: Record<string, string> = {
  "Bank Transfer": "#4152b6",
  "Credit Card":   "#10b981",
  "Mobile Money":  "#f59e0b",
  "Cash":          "#6366f1",
  "Cheque":        "#8b5cf6",
};
const FALLBACK_COLORS = ["#4152b6", "#10b981", "#f59e0b", "#6366f1", "#8b5cf6", "#ec4899", "#06b6d4"];

function methodColor(method: string, idx: number): string {
  return METHOD_COLORS[method] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function MethodIcon({ method, size = 16 }: { method: string; size?: number }) {
  const cls = `w-${size / 4} h-${size / 4}`;
  if (method === "Bank Transfer")  return <Banknote className={cls} />;
  if (method === "Credit Card")    return <CreditCard className={cls} />;
  if (method === "Mobile Money")   return <Smartphone className={cls} />;
  if (method === "Cash")           return <Wallet className={cls} />;
  if (method === "Cheque")         return <FileText className={cls} />;
  return <CircleDollarSign className={cls} />;
}

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Pie label ────────────────────────────────────────────────────────────────

const PieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const r = outerRadius + 28;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.04) return null;
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {name}: {(percent * 100).toFixed(1)}%
    </text>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PaymentMethodSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);

  const { data: rawData, isLoading } = usePaymentMethodSummary({ startDate, endDate });
  const data: PaymentMethodSummaryData | null = (rawData as any)?.data ?? null;

  const rows    = data?.rows ?? [];
  const methods = data?.methods ?? [];
  const trends  = data?.trends ?? [];
  const txns    = data?.recentTransactions ?? [];

  const pieData = useMemo(() => rows.map((r, i) => ({
    name: r.paymentMethod,
    value: r.totalAmount,
    color: methodColor(r.paymentMethod, i),
  })), [rows]);

  const barData = useMemo(() => rows.map(r => ({
    name: r.paymentMethod,
    Amount: r.totalAmount,
  })), [rows]);

  // Insight: highest growth method
  const highestGrowth = useMemo(() =>
    [...rows].filter(r => r.growthPercent !== null).sort((a, b) => (b.growthPercent ?? 0) - (a.growthPercent ?? 0))[0],
  [rows]);

  // Insight: most popular method
  const topMethod = rows[0];

  // Insight: avg by method comparison
  const sortedByAvg = useMemo(() => [...rows].sort((a, b) => b.avgTransaction - a.avgTransaction), [rows]);

  const growth = data?.totalGrowthPercent;
  const isGrowthPositive = growth !== null && growth !== undefined && growth >= 0;

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
          <h1 className="text-xl font-semibold text-slate-900">Payment Method Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Analysis of payment methods used by customers</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Period filter */}
      <ReportPeriodFilter
        periodType={periodType}
        period={period}
        year={year}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodChange={setPeriod}
        onYearChange={setYear}
      />

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 rounded-2xl" />
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
          {/* Hero KPI card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Payments Received</p>
                <p className="text-4xl font-bold text-slate-900">{fmtShort(data?.totalReceived ?? 0, sym)}</p>
                <p className="text-sm text-slate-400 mt-1">{data?.transactionCount ?? 0} transactions</p>
              </div>
              {growth !== null && growth !== undefined && (
                <div className={cn("flex items-center gap-1.5 text-sm font-semibold mt-1", isGrowthPositive ? "text-green-600" : "text-red-500")}>
                  {isGrowthPositive
                    ? <TrendingUp className="w-4 h-4" />
                    : <TrendingDown className="w-4 h-4" />}
                  {isGrowthPositive ? "+" : ""}{growth}% from last period
                </div>
              )}
            </div>

            {/* Per-method mini cards */}
            {rows.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {rows.map((row: PaymentMethodRow, i) => {
                  const color = methodColor(row.paymentMethod, i);
                  const isPos = row.growthPercent !== null && row.growthPercent >= 0;
                  return (
                    <div key={row.paymentMethod} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                          <span style={{ color }}><MethodIcon method={row.paymentMethod} size={16} /></span>
                        </span>
                        <span className="text-xs text-slate-600 font-medium truncate">{row.paymentMethod}</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">{fmtShort(row.totalAmount, sym)}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">{row.transactionCount} txns</span>
                        {row.growthPercent !== null && (
                          <span className={cn("text-xs font-semibold", isPos ? "text-green-600" : "text-red-500")}>
                            {isPos ? "+" : ""}{row.growthPercent}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Charts row */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-2">Payment Method Distribution</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={PieLabel}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Vertical bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Amount by Payment Method</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} width={56} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Amount"]} />
                    <Bar dataKey="Amount" radius={[6, 6, 0, 0]} maxBarSize={56} fill="#4152b6">
                      {barData.map((_, i) => (
                        <Cell key={i} fill={methodColor(rows[i]?.paymentMethod ?? "", i)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Payment Method Trends */}
          {trends.length > 0 && methods.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Payment Method Trends</p>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trends} margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} width={56} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtShort(v, sym), name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  {methods.map((method, i) => (
                    <Line
                      key={method}
                      type="monotone"
                      dataKey={method}
                      stroke={methodColor(method, i)}
                      strokeWidth={2}
                      dot={{ r: 4, fill: methodColor(method, i) }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Payment Transactions */}
          {txns.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold text-slate-900">Recent Payment Transactions</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Customer</th>
                      <th className="px-5 py-3 text-left">Invoice</th>
                      <th className="px-5 py-3 text-left">Payment Method</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-left">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((tx: PaymentTransaction, i) => {
                      const color = methodColor(tx.paymentMethod, methods.indexOf(tx.paymentMethod));
                      return (
                        <tr key={tx.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDate(tx.date)}</td>
                          <td className="px-5 py-3 text-sm text-slate-800">{tx.customerName}</td>
                          <td className="px-5 py-3 text-sm text-indigo-600 font-medium">{tx.invoiceNumber}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                                <span style={{ color }}><MethodIcon method={tx.paymentMethod} size={14} /></span>
                              </span>
                              <span className="text-sm text-slate-700">{tx.paymentMethod}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtShort(tx.amount, sym)}</td>
                          <td className="px-5 py-3 text-sm text-slate-400">{tx.reference}</td>
                        </tr>
                      );
                    })}
                    {/* Total */}
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                      <td colSpan={3} className="px-5 py-3 text-sm font-bold text-slate-900">
                        Total ({data?.transactionCount ?? 0} transactions)
                      </td>
                      <td />
                      <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                        {fmtShort(data?.totalReceived ?? 0, sym)}
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Payment Method Insights */}
          {rows.length > 0 && (
            <div className="bg-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-teal-400 shrink-0" />
                <p className="font-semibold text-white">Payment Method Insights</p>
              </div>
              <ul className="flex flex-col gap-2 ml-7">
                {topMethod && (
                  <li className="text-sm text-slate-300">
                    <strong className="text-indigo-300">{topMethod.paymentMethod}</strong>{" "}
                    is your most popular payment method, accounting for{" "}
                    <strong className="text-teal-400">{topMethod.percentOfTotal.toFixed(1)}%</strong>{" "}
                    of total payments received.
                  </li>
                )}
                {highestGrowth && highestGrowth.growthPercent !== null && (
                  <li className="text-sm text-slate-300">
                    <strong className="text-amber-400">{highestGrowth.paymentMethod}</strong>{" "}
                    shows the highest growth at{" "}
                    <strong className="text-green-400">+{highestGrowth.growthPercent}%</strong>
                    , indicating increasing customer preference.
                  </li>
                )}
                {sortedByAvg.length >= 2 && (
                  <li className="text-sm text-slate-300">
                    Average transaction value varies by method:{" "}
                    <strong className="text-amber-400">{sortedByAvg[0].paymentMethod}</strong>{" "}
                    averages{" "}
                    <strong className="text-teal-400">{fmtShort(sortedByAvg[0].avgTransaction, sym)}</strong>{" "}
                    while{" "}
                    <strong className="text-amber-400">{sortedByAvg[sortedByAvg.length - 1].paymentMethod}</strong>{" "}
                    averages{" "}
                    <strong className="text-teal-400">{fmtShort(sortedByAvg[sortedByAvg.length - 1].avgTransaction, sym)}</strong>.
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
