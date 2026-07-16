"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenseByVendor } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { ExpenseByVendorData, ExpenseByVendorRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}
function fmtAxis(v: number, sym: string) { return v >= 1_000_000 ? `${sym}${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${sym}${(v / 1_000).toFixed(0)}K` : `${sym}${v}`; }
const tooltipStyle = { contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" } };

export default function ExpenseByVendor() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useExpenseByVendor({ startDate, endDate });
  const data: ExpenseByVendorData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];
  const top10 = rows.slice(0, 10).map(r => ({ name: r.vendorName.length > 20 ? r.vendorName.slice(0, 20) + "…" : r.vendorName, Expenses: r.totalBilled }));

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Expense by Vendor</h1>
          <p className="text-sm text-slate-500 mt-0.5">Expenditure breakdown by individual vendor</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-2xl w-56" />
          <Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 w-fit">
            <p className="text-sm text-slate-500">Total Expenses</p>
            <p className="text-2xl font-bold text-red-600">{fmtShort(data?.totalExpenses ?? 0, sym)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{rows.length} vendors</p>
          </div>

          {top10.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Top 10 Vendors by Expense</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart layout="vertical" data={top10} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Expenses"]} />
                  <Bar dataKey="Expenses" fill="#ef4444" radius={[0, 6, 6, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Expense Detail by Vendor</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Bills</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400 text-sm">No expense data found.</td></tr>
                    : <>
                        {rows.map((row: ExpenseByVendorRow) => (
                          <tr key={row.vendorId} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3 text-sm text-slate-800">{row.vendorName}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-600">{row.billCount}</td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-slate-700">{fmtShort(row.totalBilled, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-500">{row.percentOfTotal.toFixed(1)}%</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{rows.reduce((s, r) => s + r.billCount, 0)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-red-600">{fmtShort(data?.totalExpenses ?? 0, sym)}</td>
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
