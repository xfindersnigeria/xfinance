"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCustomerBalances } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { CustomerBalancesData, CustomerBalanceRow } from "@/lib/api/services/reportService";
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

export default function CustomerBalances() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useCustomerBalances({ asOfDate: endDate });
  const data: CustomerBalancesData | null = (rawData as any)?.data ?? null;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Customer Balances</h1>
          <p className="text-sm text-primary">Outstanding balances grouped by customer</p>
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
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Invoiced" value={fmt(data?.totalInvoiced ?? 0, sym)} />
            <KPICard label="Total Received" value={fmt(data?.totalReceived ?? 0, sym)} cls="text-green-700" />
            <KPICard label="Total Balance" value={fmt(data?.totalBalance ?? 0, sym)} cls="text-red-600" />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Total Invoiced</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Total Received</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: CustomerBalanceRow) => (
                    <tr key={row.customerId} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-2.5 text-sm text-gray-800">{row.customerName}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{fmt(row.totalInvoiced, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-green-700">{fmt(row.totalReceived, sym)}</td>
                      <td className={cn("px-4 py-2.5 text-right text-sm font-medium", row.balance > 0 ? "text-red-600" : "text-gray-800")}>
                        {fmt(row.balance, sym)}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-4 py-16 text-center text-gray-400 text-sm">No customer balance data found.</td></tr>
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
