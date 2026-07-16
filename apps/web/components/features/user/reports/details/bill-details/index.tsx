"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Filter, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBillDetails } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BillDetailsData, BillDetailRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";

const STATUSES = ["All Statuses", "Draft", "Pending", "Paid", "Overdue", "Partial"];

const STATUS_STYLE: Record<string, string> = {
  Paid:    "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Partial: "bg-blue-100 text-blue-700",
  Overdue: "bg-red-100 text-red-600",
  Draft:   "bg-gray-100 text-gray-500",
};

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function KPICard({ label, value, valueClassName, sub }: { label: string; value: string; valueClassName?: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function BillDetails() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [search, setSearch] = useState("");

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const apiStatus = statusFilter === "All Statuses" ? undefined : statusFilter;
  const { data: rawData, isLoading } = useBillDetails({ startDate, endDate, status: apiStatus });
  const data: BillDetailsData | null = (rawData as any)?.data ?? null;

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(r => r.billNumber.toLowerCase().includes(q) || r.vendorName.toLowerCase().includes(q));
  }, [data?.rows, search]);

  const totalAmount = rows.reduce((s, r) => s + r.total, 0);
  const totalTax = rows.reduce((s, r) => s + r.tax, 0);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Bill Details Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive bill listing and status tracking</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 h-9">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-28 focus:ring-0 shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-9 flex-1 min-w-[180px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input type="text" placeholder="Search by bill # or vendor..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400" />
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Bills" value={String(rows.length)} sub="in selected period" />
            <KPICard label="Total Amount" value={fmtShort(totalAmount, sym)} sub="before tax" />
            <KPICard label="Total Tax" value={fmtShort(totalTax, sym)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Bill Details</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Bill Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Subtotal</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0
                    ? <tr><td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">No bills found for this period.</td></tr>
                    : <>
                        {rows.map((row: BillDetailRow) => (
                          <tr key={row.billId} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3 text-sm font-medium text-primary">{row.billNumber}</td>
                            <td className="px-5 py-3 text-sm text-slate-800">{row.vendorName}</td>
                            <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(row.billDate)}</td>
                            <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(row.dueDate)}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtShort(row.subtotal, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm text-slate-500">{fmtShort(row.tax, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{fmtShort(row.total, sym)}</td>
                            <td className="px-5 py-3">
                              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_STYLE[row.status] ?? STATUS_STYLE.Draft)}>{row.status}</span>
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-semibold text-slate-900" colSpan={4}>Total ({rows.length} bills)</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtShort(rows.reduce((s, r) => s + r.subtotal, 0), sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtShort(totalTax, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtShort(totalAmount, sym)}</td>
                          <td />
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
