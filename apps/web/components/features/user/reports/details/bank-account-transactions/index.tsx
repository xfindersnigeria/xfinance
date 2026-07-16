"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBankAccountTransactions } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BankAccountTransactionsData, BankAccountTransactionRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";

function fmt(v: number, sym: string): string {
  if (v === 0) return "—";
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

export default function BankAccountTransactions() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());
  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useBankAccountTransactions({ startDate, endDate });
  const data: BankAccountTransactionsData | null = (rawData as any)?.data ?? null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Bank Account Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Transaction ledger for bank accounts with running balance</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Opening Balance" value={fmt(data?.openingBalance ?? 0, sym) || `${sym}0`} />
            <KPICard label="Closing Balance" value={fmt(data?.closingBalance ?? 0, sym) || `${sym}0`} />
            <KPICard label="Total Debits" value={fmt(data?.totalDebits ?? 0, sym) || `${sym}0`} valueClassName="text-red-600 font-bold text-2xl" />
            <KPICard label="Total Credits" value={fmt(data?.totalCredits ?? 0, sym) || `${sym}0`} valueClassName="text-green-600 font-bold text-2xl" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Transaction Ledger</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Debit</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: BankAccountTransactionRow) => (
                    <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-5 py-3 text-sm text-slate-800">{row.description}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{row.reference ?? "—"}</td>
                      <td className="px-5 py-3 text-right text-sm text-red-600">{row.debit > 0 ? fmt(row.debit, sym) : "—"}</td>
                      <td className="px-5 py-3 text-right text-sm text-green-600">{row.credit > 0 ? fmt(row.credit, sym) : "—"}</td>
                      <td className={cn("px-5 py-3 text-right text-sm font-medium", row.runningBalance < 0 ? "text-red-600" : "text-slate-900")}>
                        {fmt(row.runningBalance, sym)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-5 py-16 text-center text-slate-400 text-sm">No transactions found.</td></tr>
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
