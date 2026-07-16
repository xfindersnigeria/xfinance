"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethodSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PaymentMethodSummaryData, PaymentMethodRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const PIE_COLORS = ["#4152b6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}
function fmtAxis(v: number, sym: string) {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}K`;
  return `${sym}${v}`;
}

const tooltipStyle = { contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" } };

const PieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const r = outerRadius + 22; const RADIAN = Math.PI / 180;
  const x = cx + r * Math.cos(-midAngle * RADIAN); const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return <text x={x} y={y} fill="#374151" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>{name} {(percent * 100).toFixed(0)}%</text>;
};

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

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
  const rows = data?.rows ?? [];
  const pieData = rows.map(r => ({ name: r.paymentMethod, value: r.totalAmount }));
  const barData = rows.slice(0, 8).map(r => ({ name: r.paymentMethod.length > 14 ? r.paymentMethod.slice(0, 14) + "…" : r.paymentMethod, Amount: r.totalAmount }));

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Payment Method Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Payments received grouped by payment method</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard label="Total Received" value={fmtShort(data?.totalReceived ?? 0, sym)} sub={`${data?.transactionCount ?? 0} transactions`} />
            <KPICard label="Payment Methods" value={String(rows.length)} sub="active methods" />
          </div>

          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-2">Distribution</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} labelLine={false} label={PieLabel}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Amount"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">By Method</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart layout="vertical" data={barData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Amount"]} />
                    <Bar dataKey="Amount" fill="#4152b6" radius={[0, 6, 6, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Breakdown by Method</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Method</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Count</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400 text-sm">No payment data found.</td></tr>
                    : <>
                        {rows.map((row: PaymentMethodRow, i) => (
                          <tr key={row.paymentMethod} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                <span className="text-sm text-slate-800">{row.paymentMethod}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-slate-700">{fmtShort(row.totalAmount, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-600">{row.transactionCount}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-500">{row.percentOfTotal.toFixed(1)}%</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtShort(data?.totalReceived ?? 0, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{data?.transactionCount ?? 0}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">100%</td>
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
