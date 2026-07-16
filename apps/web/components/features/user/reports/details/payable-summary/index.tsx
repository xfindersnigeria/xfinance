"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarDays, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { usePayableSummary } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { PayableSummaryData, PayableSummaryRow } from "@/lib/api/services/reportService";

type DatePreset = "today" | "end-last-month" | "end-last-quarter" | "end-last-year";
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "As of Today" },
  { value: "end-last-month", label: "End of Last Month" },
  { value: "end-last-quarter", label: "End of Last Quarter" },
  { value: "end-last-year", label: "End of Last Year" },
];
function resolveAsOfDate(p: DatePreset): string {
  const now = new Date();
  if (p === "today") return now.toISOString();
  if (p === "end-last-month") return new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  if (p === "end-last-quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(q === 0 ? now.getFullYear() - 1 : now.getFullYear(), q === 0 ? 9 : (q - 1) * 3 + 2 + 1, 0, 23, 59, 59).toISOString();
  }
  return new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59).toISOString();
}

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLE: Record<string, string> = {
  Paid:    "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Unpaid:  "bg-yellow-100 text-yellow-700",
  Partial: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-600",
  Draft:   "bg-gray-100 text-gray-500",
};

function KPICard({ label, value, valueClassName, sub }: { label: string; value: string; valueClassName?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PayableSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const [preset, setPreset] = useState<DatePreset>("today");
  const asOfDate = resolveAsOfDate(preset);
  const { data: rawData, isLoading } = usePayableSummary({ asOfDate });
  const data: PayableSummaryData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];
  const overdueRows = rows.filter(r => r.daysOverdue > 0);
  const overdueTotal = overdueRows.reduce((s, r) => s + r.outstanding, 0);
  const overduePct = data && data.totalOutstanding > 0 ? ((data.totalOverdue / data.totalOutstanding) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Payable Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">Outstanding bill balances owed to vendors</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 h-9 w-fit">
        <CalendarDays className="w-4 h-4 text-gray-500 shrink-0" />
        <Select value={preset} onValueChange={v => setPreset(v as DatePreset)}>
          <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-40 focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
          <SelectContent>{DATE_PRESETS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard label="Total Outstanding" value={fmtShort(data?.totalOutstanding ?? 0, sym)} sub={`${rows.length} bills`} />
            <KPICard label="Current" value={fmtShort(data?.totalCurrent ?? 0, sym)} valueClassName="text-green-600 font-bold text-2xl" />
            <KPICard label="Overdue" value={fmtShort(data?.totalOverdue ?? 0, sym)} valueClassName="text-red-500 font-bold text-2xl" sub={`${overduePct}% of total`} />
            <KPICard label="Total Billed" value={fmtShort(data?.totalBilled ?? 0, sym)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Bill Details</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Outstanding</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">No payables found.</td></tr>
                    : rows.map((row: PayableSummaryRow) => (
                        <tr key={row.billId} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm font-medium text-primary">{row.billNumber}</td>
                          <td className="px-5 py-3 text-sm text-slate-800">{row.vendorName}</td>
                          <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(row.billDate)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtShort(row.total, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-green-600">{fmtShort(row.paid, sym)}</td>
                          <td className={cn("px-5 py-3 text-right text-sm font-medium", row.outstanding > 0 ? "text-amber-600" : "text-slate-400")}>{fmtShort(row.outstanding, sym)}</td>
                          <td className="px-5 py-3">
                            <p className="text-sm text-slate-600">{fmtDate(row.dueDate)}</p>
                            {row.daysOverdue > 0 && <p className="text-xs text-red-500">{row.daysOverdue}d overdue</p>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[row.status] ?? STATUS_STYLE.Draft)}>{row.status}</span>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {overdueRows.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="font-semibold text-amber-800">Payables Alert</p>
              </div>
              <p className="text-sm text-amber-700 ml-7">
                You have <span className="font-semibold text-red-600">{overdueRows.length} overdue bill{overdueRows.length !== 1 ? "s" : ""}</span> totaling <span className="font-semibold">{fmtShort(overdueTotal, sym)}</span>. Consider paying these to maintain good vendor relationships.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
