"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePayableSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PayableSummaryData, PayableSummaryRow } from "@/lib/api/services/reportService";
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
  Current: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Paid: "bg-blue-100 text-blue-700",
};

export default function PayableSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = usePayableSummary({ asOfDate: endDate });
  const data: PayableSummaryData | null = (rawData as any)?.data ?? null;

  return (
    <div className="flex flex-col gap-4 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Payable Summary</h1>
          <p className="text-sm text-primary">Outstanding bill balances owed to vendors</p>
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
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Total Outstanding" value={fmt(data?.totalOutstanding ?? 0, sym)} cls="text-red-600" />
            <KPICard label="Current (Not Overdue)" value={fmt(data?.totalCurrent ?? 0, sym)} cls="text-green-700" />
            <KPICard label="Overdue" value={fmt(data?.totalOverdue ?? 0, sym)} cls="text-red-600" />
            <KPICard label="Total Billed" value={fmt(data?.totalBilled ?? 0, sym)} />
            <KPICard label="Overdue %" value={`${(data?.overduePercentage ?? 0).toFixed(1)}%`} cls="text-yellow-700" />
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Bill #</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Bill Date</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Due Date</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase">Days Overdue</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: PayableSummaryRow) => (
                    <tr key={row.billId} className="hover:bg-gray-50 border-t border-gray-50">
                      <td className="px-4 py-2.5 text-sm font-medium text-primary">{row.billNumber}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-800">{row.vendorName}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.billDate}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{row.dueDate}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{fmt(row.total, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-sm text-green-700">{fmt(row.paid, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-medium text-red-600">{fmt(row.outstanding, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-sm">{row.daysOverdue > 0 ? row.daysOverdue : "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_CLS[row.status] ?? "bg-gray-100 text-gray-600")}>{row.status}</span>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={9} className="px-4 py-16 text-center text-gray-400 text-sm">No payables found.</td></tr>
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
