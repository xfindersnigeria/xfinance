"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Printer, TrendingDown, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCustomerBalances } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { CustomerBalancesData, CustomerBalanceRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const neg = v < 0;
  let s: string;
  if (a >= 1_000_000) s = `${sym}${(a / 1_000_000).toFixed(1)}M`;
  else if (a >= 1_000) s = `${sym}${(a / 1_000).toFixed(0)}k`;
  else s = `${sym}${a.toLocaleString("en")}`;
  return neg ? `-${s}` : s;
}

function fmtAxis(v: number, sym: string): string {
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${sym}${(v / 1_000).toFixed(0)}k`;
  return `${sym}${v}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, valueClassName, icon,
}: {
  label: string; value: string; sub?: string; valueClassName?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        {icon}
      </div>
      <p className={cn("text-2xl font-bold", valueClassName ?? "text-slate-900")}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CLS: Record<string, string> = {
  Debit:  "bg-indigo-100 text-indigo-700",
  Credit: "bg-green-100 text-green-700",
  Zero:   "bg-slate-100 text-slate-500",
};

type BalanceFilter = "all" | "Debit" | "Credit" | "Zero";

// ─── Main component ───────────────────────────────────────────────────────────

export default function CustomerBalances() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [search, setSearch] = useState("");

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);

  const { data: rawData, isLoading } = useCustomerBalances({ startDate, endDate });
  const data: CustomerBalancesData | null = (rawData as any)?.data ?? null;
  const rows = data?.rows ?? [];

  // Client-side filters
  const filteredRows = useMemo(() => {
    let r = rows;
    if (balanceFilter !== "all") r = r.filter(x => x.status === balanceFilter);
    if (search.trim()) r = r.filter(x => x.customerName.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [rows, balanceFilter, search]);

  // Top 10 horizontal bar chart (by closing balance desc, positive)
  const top10Bar = useMemo(() =>
    rows
      .filter(r => r.closingBalance > 0)
      .slice(0, 10)
      .map(r => ({
        name: r.customerName.length > 18 ? r.customerName.slice(0, 18) + "…" : r.customerName,
        Balance: r.closingBalance,
      })),
  [rows]);

  // Pie chart: count by status
  const pieData = useMemo(() => [
    { name: "Debit Balance",  value: data?.debitCount  ?? 0, color: "#4152b6" },
    { name: "Credit Balance", value: data?.creditCount ?? 0, color: "#10b981" },
    { name: "Zero Balance",   value: data?.zeroCount   ?? 0, color: "#cbd5e1" },
  ].filter(d => d.value > 0), [data]);

  const creditRows = rows.filter(r => r.status === "Credit");

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
          <h1 className="text-xl font-semibold text-slate-900">Customer Balances</h1>
          <p className="text-sm text-slate-500 mt-0.5">Detailed customer account balances and transaction summary</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <ReportPeriodFilter
          periodType={periodType}
          period={period}
          year={year}
          onPeriodTypeChange={handlePeriodTypeChange}
          onPeriodChange={setPeriod}
          onYearChange={setYear}
        />
        <Select value={balanceFilter} onValueChange={v => setBalanceFilter(v as BalanceFilter)}>
          <SelectTrigger className="h-9 w-36 rounded-xl text-sm bg-gray-100 border-0 shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Balances</SelectItem>
            <SelectItem value="Debit">Debit Only</SelectItem>
            <SelectItem value="Credit">Credit Only</SelectItem>
            <SelectItem value="Zero">Zero Only</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 w-56 rounded-xl bg-gray-100 border-0 shadow-none text-sm focus-visible:ring-0"
        />
      </div>

      {/* Skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Customers"
              value={String(data?.totalCustomers ?? 0)}
              sub={data ? `${data.debitCount} with debit balance` : undefined}
              icon={<Users className="w-4 h-4 text-slate-400" />}
            />
            <KPICard
              label="Total Debit"
              value={fmtShort(data?.totalDebit ?? 0, sym)}
              sub="Amount receivable"
              valueClassName="text-indigo-600 font-bold text-2xl"
              icon={<TrendingUp className="w-4 h-4 text-indigo-400" />}
            />
            <KPICard
              label="Total Credit"
              value={fmtShort(data?.totalCredit ?? 0, sym)}
              sub="Advance payments"
              valueClassName="text-green-600 font-bold text-2xl"
              icon={<TrendingDown className="w-4 h-4 text-green-400" />}
            />
            <KPICard
              label="Net Balance"
              value={fmtShort(data?.netBalance ?? 0, sym)}
              sub="Net receivable"
              valueClassName="text-indigo-700 font-bold text-2xl"
            />
          </div>

          {/* Charts */}
          {rows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top 10 horizontal bar */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Top 10 Customers by Outstanding Balance</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    layout="vertical"
                    data={top10Bar}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickFormatter={v => fmtAxis(v, sym)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={145}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtShort(v, sym), "Balance"]} />
                    <Bar dataKey="Balance" fill="#4152b6" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie + summary */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                <p className="font-semibold text-slate-800">Balance Distribution</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v} customers`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-3">
                  {pieData.map(d => (
                    <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                  ))}
                </div>
                {/* Debit / Credit summary */}
                <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-3 py-2">
                    <span className="text-sm text-slate-600">Debit</span>
                    <span className="text-sm font-bold text-indigo-700">{fmtShort(data?.totalDebit ?? 0, sym)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                    <span className="text-sm text-slate-600">Credit</span>
                    <span className="text-sm font-bold text-green-700">{fmtShort(data?.totalCredit ?? 0, sym)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Balance Details Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Customer Balance Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-right">Opening Balance</th>
                    <th className="px-4 py-3 text-right text-indigo-600">Invoiced</th>
                    <th className="px-4 py-3 text-right text-green-600">Payments</th>
                    <th className="px-4 py-3 text-right">Closing Balance</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-left">Last Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No customer balance data found.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {filteredRows.map((row: CustomerBalanceRow) => (
                        <tr key={row.customerId} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3">
                            <p className="text-sm text-slate-800">{row.customerName}</p>
                            <p className="text-xs text-slate-400">{row.email}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">
                            {fmtShort(row.openingBalance, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-indigo-600 font-medium">
                            {fmtShort(row.invoiced, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-green-600 font-medium">
                            {fmtShort(row.payments, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(row.closingBalance, sym)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", STATUS_CLS[row.status])}>
                              {row.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {fmtDate(row.lastTransactionDate)}
                          </td>
                        </tr>
                      ))}

                      {/* Totals row */}
                      {data && (
                        <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                          <td className="px-5 py-3 text-sm font-bold text-slate-900">
                            Total ({data.totalCustomers} customers)
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(data.totalOpeningBalance, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-indigo-600">
                            {fmtShort(data.totalInvoiced, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-green-600">
                            {fmtShort(data.totalPayments, sym)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                            {fmtShort(data.totalClosingBalance, sym)}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Credit Balances Detected */}
          {creditRows.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="font-semibold text-teal-800">Credit Balances Detected</p>
              </div>
              <p className="text-sm text-teal-700 ml-7">
                {creditRows.length} customer{creditRows.length !== 1 ? "s" : ""} have credit balances totaling{" "}
                <strong>{fmtShort(data?.totalCredit ?? 0, sym)}</strong>.{" "}
                These represent advance payments or overpayments that can be applied to future invoices.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
