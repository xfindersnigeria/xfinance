"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Info, Printer, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useVendorBalances } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { VendorBalancesData, VendorBalanceRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "@/components/features/user/reports/ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  const abs = Math.abs(amount);
  const s = abs >= 1_000_000 ? `${sym}${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000 ? `${sym}${(abs / 1_000).toFixed(0)}k`
    : abs === 0 ? `${sym}0`
    : `${sym}${abs.toLocaleString("en")}`;
  return amount < 0 ? `${sym}-${s.slice(sym.length)}` : s;
}

function fmtAxis(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function statusBadge(status: "Debit" | "Credit" | "Zero") {
  if (status === "Debit") return "bg-red-100 text-red-700 border border-red-200";
  if (status === "Credit") return "bg-green-100 text-green-700 border border-green-200";
  return "bg-gray-100 text-gray-500 border border-gray-200";
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

const PIE_COLORS = { Debit: "#ef4444", Credit: "#10b981", Zero: "#94a3b8" };

// ─── Main component ───────────────────────────────────────────────────────────

export default function VendorBalances() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(new Date().getFullYear());
  const [balanceFilter, setBalanceFilter] = useState<"all" | "Debit" | "Credit" | "Zero">("all");
  const [search, setSearch] = useState("");

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };

  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useVendorBalances({ startDate, endDate });
  const data: VendorBalancesData | null = (rawData as any)?.data ?? null;

  const allRows = data?.rows ?? [];

  const filtered = useMemo(() => {
    let r = allRows;
    if (balanceFilter !== "all") r = r.filter(v => v.status === balanceFilter);
    if (search.trim()) r = r.filter(v => v.vendorName.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [allRows, balanceFilter, search]);

  // Top 10 by closing balance for bar chart
  const top10 = useMemo(() =>
    [...allRows]
      .filter(r => r.closingBalance > 0)
      .sort((a, b) => b.closingBalance - a.closingBalance)
      .slice(0, 10)
      .map(r => ({
        name: r.vendorName.length > 20 ? r.vendorName.slice(0, 20) + "…" : r.vendorName,
        Balance: r.closingBalance,
      })),
  [allRows]);

  // Balance distribution pie
  const debitCount  = allRows.filter(r => r.status === "Debit").length;
  const creditCount = allRows.filter(r => r.status === "Credit").length;
  const zeroCount   = allRows.filter(r => r.status === "Zero").length;
  const total       = allRows.length;

  const pieData = [
    { name: "Debit Balance",  value: debitCount,  pct: total > 0 ? Math.round((debitCount / total) * 100) : 0 },
    { name: "Credit Balance", value: creditCount, pct: total > 0 ? Math.round((creditCount / total) * 100) : 0 },
    { name: "Zero Balance",   value: zeroCount,   pct: total > 0 ? Math.round((zeroCount / total) * 100) : 0 },
  ].filter(d => d.value > 0);

  const creditVendors = allRows.filter(r => r.status === "Credit");
  const totalCredit   = data?.totalCredit ?? 0;

  // Totals for table footer
  const totals = useMemo(() => ({
    openingBalance: filtered.reduce((s, r) => s + r.openingBalance, 0),
    totalBilled:    filtered.reduce((s, r) => s + r.totalBilled, 0),
    totalPaid:      filtered.reduce((s, r) => s + r.totalPaid, 0),
    debitNotes:     filtered.reduce((s, r) => s + r.debitNotes, 0),
    closingBalance: filtered.reduce((s, r) => s + r.closingBalance, 0),
  }), [filtered]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Vendor Balances</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detailed vendor account balances and transaction summary</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />
        <Select value={balanceFilter} onValueChange={v => setBalanceFilter(v as typeof balanceFilter)}>
          <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Balances</SelectItem>
            <SelectItem value="Debit">Debit</SelectItem>
            <SelectItem value="Credit">Credit</SelectItem>
            <SelectItem value="Zero">Zero</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-48 max-w-80">
          <Input
            placeholder="Search vendors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 rounded-xl border-slate-200 pl-3 text-sm"
          />
        </div>
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Total Vendors */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Vendors</p>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{data?.vendorCount ?? 0}</p>
              <p className="text-xs text-slate-400">{data?.debitCount ?? 0} with debit balance</p>
            </div>
            {/* Total Debit */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Debit</p>
                <TrendingUp className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-600">{fmtShort(data?.totalDebit ?? 0, sym)}</p>
              <p className="text-xs text-slate-400">Amount payable</p>
            </div>
            {/* Total Credit */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Total Credit</p>
                <TrendingDown className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">{fmtShort(data?.totalCredit ?? 0, sym)}</p>
              <p className="text-xs text-slate-400">Advance payments</p>
            </div>
            {/* Net Balance */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Net Balance</p>
                <span className="w-2 h-2 rounded-full bg-red-400" />
              </div>
              <p className="text-2xl font-bold text-red-600">{fmtShort(data?.netBalance ?? 0, sym)}</p>
              <p className="text-xs text-slate-400">Net payable</p>
            </div>
          </div>

          {/* Charts row */}
          {allRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top 10 Vendors horizontal bar */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Top 10 Vendors by Outstanding Balance</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart layout="vertical" data={top10} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={v => fmtAxis(v, sym)} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Balance"]} />
                    <Bar dataKey="Balance" fill="#ef4444" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Balance Distribution pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-2">Balance Distribution</p>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ pct }) => `${pct}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={PIE_COLORS[entry.name.split(" ")[0] as keyof typeof PIE_COLORS]} />
                      ))}
                    </Pie>
                    <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v} vendors`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Summary rows */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between bg-red-50 rounded-xl px-4 py-2">
                    <span className="text-sm text-red-700">Debit</span>
                    <span className="text-sm font-semibold text-red-700">{fmtShort(data?.totalDebit ?? 0, sym)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-green-50 rounded-xl px-4 py-2">
                    <span className="text-sm text-green-700">Credit</span>
                    <span className="text-sm font-semibold text-green-700">{fmtShort(data?.totalCredit ?? 0, sym)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendor Balance Details Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Vendor Balance Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Vendor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Opening Balance</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-red-500 uppercase tracking-wide">Billed</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-green-600 uppercase tracking-wide">Payments</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-amber-600 uppercase tracking-wide">Debit Notes</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Closing Balance</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No vendor balance data found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filtered.map((row: VendorBalanceRow) => (
                        <tr key={row.vendorId} className="border-t border-slate-50 hover:bg-slate-50/40">
                          <td className="px-5 py-3">
                            <p className="text-sm text-slate-800">{row.vendorName}</p>
                            <p className="text-xs text-slate-400">{row.email}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">
                            {fmtShort(row.openingBalance, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-red-600 font-medium">
                            {fmtShort(row.totalBilled, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-green-600 font-medium">
                            {fmtShort(row.totalPaid, sym)}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-amber-600">
                            {fmtShort(row.debitNotes, sym)}
                          </td>
                          <td className={cn("px-5 py-3 text-right text-sm font-semibold",
                            row.status === "Debit" ? "text-red-600" : row.status === "Credit" ? "text-green-600" : "text-slate-400"
                          )}>
                            {fmtShort(row.closingBalance, sym)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusBadge(row.status))}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-500">
                            {fmtDate(row.lastTransactionDate)}
                          </td>
                        </tr>
                      ))}

                      {/* Total row */}
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="px-5 py-3 text-sm font-bold text-slate-900">
                          Total ({filtered.length} vendor{filtered.length !== 1 ? "s" : ""})
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">
                          {fmtShort(totals.openingBalance, sym)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-red-600">
                          {fmtShort(totals.totalBilled, sym)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-green-600">
                          {fmtShort(totals.totalPaid, sym)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-amber-600">
                          {fmtShort(totals.debitNotes, sym)}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-red-600">
                          {fmtShort(totals.closingBalance, sym)}
                        </td>
                        <td />
                        <td />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit Balances Detected alert */}
          {creditVendors.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex items-start gap-3">
              <Info className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-teal-800">Credit Balances Detected</p>
                <p className="text-sm text-teal-700 mt-0.5">
                  {creditVendors.length} vendor{creditVendors.length !== 1 ? "s" : ""} have credit balances totaling{" "}
                  <strong>{fmtShort(totalCredit, sym)}</strong>. These represent advance payments or overpayments that can be applied to future bills.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
