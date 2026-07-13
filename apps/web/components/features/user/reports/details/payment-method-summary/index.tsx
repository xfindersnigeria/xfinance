"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePaymentMethodSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PaymentMethodSummaryData, PaymentMethodRow } from "@/lib/api/services/reportService";
import {
  MONTHS, QUARTERS, REPORT_PERIOD_TYPES, ReportPeriodType,
  getFiscalYears, periodToDates, defaultPeriodValue,
} from "@/lib/period-utils";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const FISCAL_YEARS = getFiscalYears();
const CHART_COLORS = ["#2d3a7b", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function fmt(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = `${sym}${abs.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-1.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

export default function PaymentMethodSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = usePaymentMethodSummary({ startDate, endDate });
  const data: PaymentMethodSummaryData | null = (rawData as any)?.data ?? null;

  const pieData = (data?.rows ?? []).map((r) => ({ name: r.paymentMethod, value: r.totalAmount }));

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Payment Method Summary</h1>
          <p className="text-sm text-primary">Payments received grouped by payment method</p>
        </div>
        <div className="flex items-center gap-2 mt-6 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {}}><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => {}}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as ReportPeriodType)}>
            <SelectTrigger className="w-32 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_PERIOD_TYPES.map((pt) => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {periodType !== "Annual" && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodType === "Monthly" ? MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>) : QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{FISCAL_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><Skeleton className="h-64 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard label="Total Received" value={fmt(data?.totalReceived ?? 0, sym)} />
            <KPICard label="Transaction Count" value={String(data?.transactionCount ?? 0)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pieData.length > 0 && (
              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <p className="text-sm font-semibold mb-3">By Payment Method</p>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt(v, sym)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Method</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Count</th>
                      <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.rows?.length ? data.rows.map((row: PaymentMethodRow) => (
                      <tr key={row.paymentMethod} className="hover:bg-gray-50 border-t border-gray-50">
                        <td className="px-4 py-2.5 text-sm text-gray-800">{row.paymentMethod}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-medium">{fmt(row.totalAmount, sym)}</td>
                        <td className="px-4 py-2.5 text-right text-sm">{row.transactionCount}</td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-500">{row.percentOfTotal.toFixed(1)}%</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="px-4 py-16 text-center text-gray-400 text-sm">No payment data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
