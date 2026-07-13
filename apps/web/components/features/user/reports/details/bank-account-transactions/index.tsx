"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBankAccountTransactions } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BankAccountTransactionsData, BankAccountTransactionRow } from "@/lib/api/services/reportService";
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
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Bank Account Transactions</h1>
          <p className="text-sm text-primary">Transaction ledger for bank accounts with running balance</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Opening Balance" value={fmt(data?.openingBalance ?? 0, sym)} />
            <KPICard label="Closing Balance" value={fmt(data?.closingBalance ?? 0, sym)} />
            <KPICard label="Total Debits" value={fmt(data?.totalDebits ?? 0, sym)} cls="text-red-600" />
            <KPICard label="Total Credits" value={fmt(data?.totalCredits ?? 0, sym)} cls="text-green-700" />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Description</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: BankAccountTransactionRow) => (
                    <tr key={row.id} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-800">{row.description}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-500">{row.reference ?? "—"}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-red-600">{row.debit > 0 ? fmt(row.debit, sym) : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-green-700">{row.credit > 0 ? fmt(row.credit, sym) : "—"}</td>
                      <td className={cn("px-4 py-2.5 text-right text-sm font-medium", row.runningBalance < 0 ? "text-red-600" : "text-gray-900")}>
                        {fmt(row.runningBalance, sym)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-400 text-sm">No transactions found.</td></tr>
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
