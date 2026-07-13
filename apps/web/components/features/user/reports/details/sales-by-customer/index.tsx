"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSalesByCustomer } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { SalesByCustomerData, SalesByCustomerRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
} from "@/lib/period-utils";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

// ─── Colors ───────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#4152b6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#64748b",
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  let str: string;
  if (abs >= 1_000_000)      str = `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000)     str = `${sym}${(abs / 1_000).toFixed(0)}K`;
  else                       str = `${sym}${abs.toLocaleString("en")}`;
  return amount < 0 ? `(${str})` : str;
}

function fmtAxis(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `${sym}${(abs / 1_000).toFixed(0)}K`;
  return `${sym}${abs}`;
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ─── Growth cell ──────────────────────────────────────────────────────────────

function GrowthCell({ growth }: { growth: number | null }) {
  if (growth == null) return <span className="text-slate-400">—</span>;
  const isPos = growth >= 0;
  return (
    <span className={cn("flex items-center gap-0.5 justify-end", isPos ? "text-green-600" : "text-red-500")}>
      {isPos
        ? <TrendingUp className="w-3.5 h-3.5 shrink-0" />
        : <TrendingDown className="w-3.5 h-3.5 shrink-0" />
      }
      {isPos ? "+" : ""}{growth.toFixed(1)}%
    </span>
  );
}

// ─── Pie label ────────────────────────────────────────────────────────────────

const PieLabel = ({ cx, cy, midAngle, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 22;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.04) return null; // skip tiny slices
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function SalesByCustomer() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useSalesByCustomer({ startDate, endDate });
  const data: SalesByCustomerData | null = (rawData as any)?.data ?? null;

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  // Top 10 for horizontal bar chart
  const top10Bar = rows.slice(0, 10).map(r => ({ name: r.customerName, Sales: r.totalSales }));

  // All rows for pie (limit to 10 for readability)
  const pieData = rows.slice(0, 10).map(r => ({ name: r.customerName, value: r.totalSales }));

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
          <h1 className="text-xl font-semibold text-slate-900">Sales by Customer</h1>
          <p className="text-sm text-slate-500 mt-0.5">Revenue breakdown by customer with growth analysis</p>
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

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Sales"     value={summary ? fmtShort(summary.totalSales, sym) : "—"} />
            <KPICard label="Total Invoices"  value={summary ? String(summary.totalInvoices) : "—"} />
            <KPICard label="Average Invoice" value={summary ? fmtShort(summary.avgInvoice, sym) : "—"} />
          </div>

          {/* Charts — side by side */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sales Distribution pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Sales Distribution</p>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      labelLine={false}
                      label={PieLabel}
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [fmtShort(v, sym), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 10 customers horizontal bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Top 10 Customers</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={top10Bar}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={(v) => fmtAxis(v, sym)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={130}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number) => [fmtShort(v, sym), "Sales"]}
                    />
                    <Bar dataKey="Sales" fill="#4152b6" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Detailed Sales Report table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Detailed Sales Report</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Sales</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoices</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Invoice</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Growth</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No sales data found for this period.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((row: SalesByCustomerRow) => (
                        <tr key={row.customerId} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-800">{row.customerName}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700 font-medium">{fmtShort(row.totalSales, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{row.invoiceCount}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtShort(row.avgInvoice, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm">
                            <GrowthCell growth={row.growth} />
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-500">{row.percentOfTotal.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{summary ? fmtShort(summary.totalSales, sym) : "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{summary?.totalInvoices ?? "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{summary ? fmtShort(summary.avgInvoice, sym) : "—"}</td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3" />
                      </tr>
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
