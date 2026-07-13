"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgedReceivables } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { AgedReceivablesData, AgedReceivablesRow } from "@/lib/api/services/reportService";
import {
  MONTHS, QUARTERS, REPORT_PERIOD_TYPES, ReportPeriodType,
  getFiscalYears, periodToDates, defaultPeriodValue,
} from "@/lib/period-utils";

const FISCAL_YEARS = getFiscalYears();

function fmt(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = `${sym}${abs.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

const AGE_BUCKETS = [
  { key: "current", label: "Current" },
  { key: "days1_30", label: "1–30" },
  { key: "days31_60", label: "31–60" },
  { key: "days61_90", label: "61–90" },
  { key: "days91_120", label: "91–120" },
  { key: "days120Plus", label: "120+" },
];

export default function AgedReceivables() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useAgedReceivables({ asOfDate: endDate });
  const data: AgedReceivablesData | null = (rawData as any)?.data ?? null;

  const totals = data?.totals;
  const grandTotal = totals?.total ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Aged Receivables</h1>
          <p className="text-sm text-primary">Customer balances by aging bucket</p>
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

      {/* Aging summary bar */}
      {totals && grandTotal > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-4">
          <p className="text-sm font-semibold mb-3">Aging Distribution</p>
          <div className="flex h-6 rounded-lg overflow-hidden gap-0.5">
            {AGE_BUCKETS.map((b, i) => {
              const val = (totals as any)[b.key] as number;
              const pct = (val / grandTotal) * 100;
              const COLORS = ["#2d3a7b", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
              return pct > 0 ? (
                <div key={b.key} style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} title={`${b.label}: ${fmt(val, sym)}`} />
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {AGE_BUCKETS.map((b, i) => {
              const COLORS = ["#2d3a7b", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
              return (
                <div key={b.key} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600">{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Customer</th>
                  {AGE_BUCKETS.map((b) => (
                    <th key={b.key} className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{b.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows?.length ? data.rows.map((row: AgedReceivablesRow) => (
                  <tr key={row.customerName} className="hover:bg-gray-50 border-t border-gray-50">
                    <td className="px-4 py-2.5 text-sm text-gray-800">{row.customerName}</td>
                    {AGE_BUCKETS.map((b) => (
                      <td key={b.key} className="px-4 py-2.5 text-right text-sm">{fmt((row as any)[b.key], sym)}</td>
                    ))}
                    <td className="px-4 py-2.5 text-right text-sm font-bold">{fmt(row.total, sym)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-gray-400 text-sm">No aged receivables data found.</td></tr>
                )}
                {totals && (
                  <tr className="bg-[#0d1b2a]">
                    <td className="px-4 py-3 text-sm font-bold text-white">Totals</td>
                    {AGE_BUCKETS.map((b) => (
                      <td key={b.key} className="px-4 py-3 text-right text-sm font-bold text-gray-300">{fmt((totals as any)[b.key], sym)}</td>
                    ))}
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-400">{fmt(totals.total, sym)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
