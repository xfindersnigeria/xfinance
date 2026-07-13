"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesByItem } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { SalesByItemData, SalesByItemRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
} from "@/lib/period-utils";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return "—";
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

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

// ─── Tooltip style ────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function SalesByItem() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useSalesByItem({ startDate, endDate });
  const data: SalesByItemData | null = (rawData as any)?.data ?? null;

  const rows = data?.rows ?? [];
  const summary = data?.summary;

  const chartData = rows.slice(0, 10).map(r => ({ name: r.itemName, Sales: r.totalRevenue }));

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
          <h1 className="text-xl font-semibold text-slate-900">Sales by Item</h1>
          <p className="text-sm text-slate-500 mt-0.5">Product and service revenue analysis with profitability</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Sales"
              value={summary ? fmtShort(summary.totalRevenue, sym) : "—"}
            />
            <KPICard
              label="Total Profit"
              value={summary ? fmtShort(summary.totalProfit, sym) : "—"}
              valueClassName="text-green-600 font-bold text-2xl"
            />
            <KPICard
              label="Profit Margin"
              value={summary?.profitMargin != null ? `${summary.profitMargin.toFixed(1)}%` : "—"}
            />
            <KPICard
              label="Items Sold"
              value={summary ? summary.totalQuantity.toLocaleString("en") : "—"}
            />
          </div>

          {/* Sales by Product/Service chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Sales by Product/Service</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    angle={-40}
                    textAnchor="end"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v) => fmtAxis(v, sym)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v: number) => [fmtShort(v, sym), "Sales"]}
                  />
                  <Bar dataKey="Sales" fill="#4152b6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Item Report table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Detailed Item Report</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Item</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Qty Sold</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Sales</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cost</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Profit</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Margin %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No item sales data found for this period.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((row: SalesByItemRow) => (
                        <tr key={row.itemId} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-800">{row.itemName}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{row.totalQuantity.toLocaleString("en")}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700 font-medium">{fmtShort(row.totalRevenue, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtShort(row.totalCost, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-green-600">{fmtShort(row.totalProfit, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">
                            {row.margin != null ? `${row.margin.toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                      {/* Total row */}
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {summary ? summary.totalQuantity.toLocaleString("en") : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {summary ? fmtShort(summary.totalRevenue, sym) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {summary ? fmtShort(summary.totalCost, sym) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-green-600">
                          {summary ? fmtShort(summary.totalProfit, sym) : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {summary?.profitMargin != null ? `${summary.profitMargin.toFixed(1)}%` : "—"}
                        </td>
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
