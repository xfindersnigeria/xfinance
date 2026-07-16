"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBankReconciliationSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BankReconciliationSummaryData, BankReconciliationSummaryRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";

const STATUS_STYLE: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  Draft:     "bg-yellow-100 text-yellow-800",
};

function fmt(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = `${sym}${a.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return v < 0 ? `(${s})` : s;
}
function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function KPICard({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
    </div>
  );
}

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
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Bank Reconciliation Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Overview of bank reconciliation status across accounts</p>
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
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KPICard label="Completed Reconciliations" value={String(data?.totalCompleted ?? 0)} valueClassName="text-green-700 font-bold text-2xl" />
            <KPICard label="Draft Reconciliations" value={String(data?.totalDraft ?? 0)} valueClassName="text-yellow-700 font-bold text-2xl" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Reconciliation Records</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank Account</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Statement End</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Ending Balance</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed At</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Completed By</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Matched</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: BankReconciliationSummaryRow) => (
                    <tr key={row.reconciliationId} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm font-medium text-slate-800">{row.bankAccountName}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(row.statementEndDate)}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{fmt(row.statementEndingBalance, sym)}</td>
                      <td className="px-5 py-3">
                        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[row.status] ?? "bg-gray-100 text-gray-600")}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-600">{row.completedAt ? fmtDate(row.completedAt) : "—"}</td>
                      <td className="px-5 py-3 text-sm text-slate-600">{row.completedBy ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{row.matchedCount}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">No reconciliation data found.</td></tr>
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
