"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBankReconciliationSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BankReconciliationSummaryData, BankReconciliationSummaryRow } from "@/lib/api/services/reportService";
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

function KPICard({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-1.5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={cn("text-lg font-semibold", cls ?? "text-gray-900")}>{value}</p>
    </div>
  );
}

const STATUS_CLS: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Draft: "bg-yellow-100 text-yellow-800",
};

export default function BankReconciliationSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useBankReconciliationSummary({ startDate, endDate });
  const data: BankReconciliationSummaryData | null = (rawData as any)?.data ?? null;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Bank Reconciliation Summary</h1>
          <p className="text-sm text-primary">Overview of bank reconciliation status across accounts</p>
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
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard label="Completed Reconciliations" value={String(data?.totalCompleted ?? 0)} cls="text-green-700" />
            <KPICard label="Draft Reconciliations" value={String(data?.totalDraft ?? 0)} cls="text-yellow-700" />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Bank Account</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Statement End</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Ending Balance</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Completed At</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Completed By</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: BankReconciliationSummaryRow) => (
                    <tr key={row.reconciliationId} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-800">{row.bankAccountName}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.statementEndDate}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{fmt(row.statementEndingBalance, sym)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_CLS[row.status] ?? "bg-gray-100 text-gray-600")}>{row.status}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.completedAt ?? "—"}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.completedBy ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{row.matchedCount}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-4 py-16 text-center text-gray-400 text-sm">No reconciliation data found.</td></tr>
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
