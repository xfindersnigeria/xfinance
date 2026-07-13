"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, Filter, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useInvoiceDetails } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { InvoiceDetailsData, InvoiceDetailRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
} from "@/lib/period-utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = ["All Statuses", "Paid", "Unpaid", "Pending", "Partial", "Overdue", "Draft"];

const STATUS_STYLE: Record<string, { badge: string; dot?: string }> = {
  Paid:    { badge: "bg-green-100 text-green-700" },
  Unpaid:  { badge: "bg-yellow-100 text-yellow-700" },
  Pending: { badge: "bg-yellow-100 text-yellow-700" },
  Partial: { badge: "bg-blue-100 text-blue-700" },
  Overdue: { badge: "bg-red-100 text-red-600" },
  Draft:   { badge: "bg-gray-100 text-gray-500" },
};

const PIE_COLORS = {
  Paid:    "#10b981",
  Unpaid:  "#f59e0b",
  Pending: "#f59e0b",
  Partial: "#6366f1",
  Overdue: "#ef4444",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtShort(amount: number, sym: string): string {
  if (amount === 0) return `${sym}0`;
  const abs = Math.abs(amount);
  let str: string;
  if (abs >= 1_000_000)  str = `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) str = `${sym}${(abs / 1_000).toFixed(0)}K`;
  else                   str = `${sym}${abs.toLocaleString("en")}`;
  return amount < 0 ? `(${str})` : str;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
  label, value, valueClassName, sub, subClassName,
}: {
  label: string; value: string; valueClassName?: string; sub?: React.ReactNode; subClassName?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${valueClassName ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subClassName ?? "text-slate-400"}`}>{sub}</p>}
    </div>
  );
}

// ─── Pie label ────────────────────────────────────────────────────────────────

const PieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x} y={y}
      fill={PIE_COLORS[name as keyof typeof PIE_COLORS] ?? "#64748b"}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {name} {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ─── Status breakdown card ────────────────────────────────────────────────────

function StatusCard({
  label, count, amount, sym, colorClass,
}: { label: string; count: number; amount: number; sym: string; colorClass: string }) {
  return (
    <div className={`rounded-xl p-4 flex items-center justify-between ${colorClass}`}>
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{count} invoice{count !== 1 ? "s" : ""}</p>
      </div>
      <p className="text-base font-bold text-slate-800">{fmtShort(amount, sym)}</p>
    </div>
  );
}

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function InvoiceDetails() {
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
  const { data: rawData, isLoading } = useInvoiceDetails({ startDate, endDate, status: apiStatus });
  const data: InvoiceDetailsData | null = (rawData as any)?.data ?? null;
  const summary = data?.summary;

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(r =>
      r.invoiceNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q)
    );
  }, [data?.rows, search]);

  // Pie data — exclude zero categories
  const pieData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Paid",    value: summary.paidCount,    amount: summary.paidAmount },
      { name: "Unpaid",  value: summary.unpaidCount,  amount: summary.unpaidAmount },
      { name: "Partial", value: summary.partialCount, amount: summary.partialAmount },
      { name: "Overdue", value: summary.overdueCount, amount: summary.overdueAmount },
    ].filter(d => d.value > 0);
  }, [summary]);

  const overdueRows = rows.filter(r => r.daysOverdue > 0);
  const overdueTotal = overdueRows.reduce((s, r) => s + r.balance, 0);

  const collectionPercent = summary && summary.totalAmount > 0
    ? Math.round((summary.totalPaid / summary.totalAmount) * 100)
    : 0;

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
          <h1 className="text-xl font-semibold text-slate-900">Invoice Details Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">Comprehensive invoice listing and status tracking</p>
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
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl px-3 h-9">
          <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-0 bg-transparent h-auto p-0 text-sm w-28 focus:ring-0 shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-9 flex-1 min-w-[200px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              label="Total Invoices"
              value={String(summary?.totalInvoices ?? 0)}
              sub={summary ? `${summary.paidCount} paid, ${summary.unpaidCount + summary.partialCount} pending` : undefined}
            />
            <KPICard
              label="Total Amount"
              value={summary ? fmtShort(summary.totalAmount, sym) : "—"}
              sub="Invoiced amount"
            />
            <KPICard
              label="Amount Paid"
              value={summary ? fmtShort(summary.totalPaid, sym) : "—"}
              valueClassName="text-green-600 font-bold text-2xl"
              sub={`${collectionPercent}% collected`}
            />
            <KPICard
              label="Outstanding"
              value={summary ? fmtShort(summary.totalOutstanding, sym) : "—"}
              valueClassName="text-amber-600 font-bold text-2xl"
              sub={
                summary && summary.overdueCount > 0
                  ? <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" />{summary.overdueCount} overdue</span>
                  : undefined
              }
            />
          </div>

          {/* Charts section */}
          {summary && (summary.totalInvoices > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Status Distribution pie */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-2">Status Distribution</p>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      labelLine={false}
                      label={PieLabel}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(v: number, name: string) => [v, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Status Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Status Breakdown</p>
                <div className="grid grid-cols-2 gap-3 h-[calc(100%-2rem)]">
                  <StatusCard label="Paid"          count={summary.paidCount}    amount={summary.paidAmount}    sym={sym} colorClass="bg-green-50" />
                  <StatusCard label="Unpaid"         count={summary.unpaidCount}  amount={summary.unpaidAmount}  sym={sym} colorClass="bg-yellow-50" />
                  <StatusCard label="Partially Paid" count={summary.partialCount} amount={summary.partialAmount} sym={sym} colorClass="bg-indigo-50" />
                  <StatusCard label="Overdue"        count={summary.overdueCount} amount={summary.overdueAmount} sym={sym} colorClass="bg-red-50" />
                </div>
              </div>
            </div>
          )}

          {/* Invoice Details table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Invoice Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice #</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No invoices found for this period.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((row: InvoiceDetailRow) => {
                        const statusStyle = STATUS_STYLE[row.status] ?? STATUS_STYLE.Draft;
                        return (
                          <tr key={row.invoiceId} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-5 py-3">
                              <p className="text-sm font-medium text-primary">{row.invoiceNumber}</p>
                              <p className="text-xs text-slate-400">{row.itemCount} item{row.itemCount !== 1 ? "s" : ""}</p>
                            </td>
                            <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(row.invoiceDate)}</td>
                            <td className="px-5 py-3">
                              <p className="text-sm text-slate-800">{row.customerName}</p>
                              <p className="text-xs text-slate-400">{row.paymentTerms}</p>
                            </td>
                            <td className="px-5 py-3 text-right text-sm text-slate-700 font-medium">{fmtShort(row.total, sym)}</td>
                            <td className="px-5 py-3 text-right text-sm text-green-600 font-medium">{fmtShort(row.paid, sym)}</td>
                            <td className={cn("px-5 py-3 text-right text-sm font-medium", row.balance > 0 ? "text-amber-600" : "text-slate-500")}>
                              {fmtShort(row.balance, sym)}
                            </td>
                            <td className="px-5 py-3">
                              <p className="text-sm text-slate-600">{fmtDate(row.dueDate)}</p>
                              {row.daysOverdue > 0 && (
                                <p className="text-xs text-red-500">{row.daysOverdue}d overdue</p>
                              )}
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", statusStyle.badge)}>
                                {row.status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <Link href={`/income/invoices/${row.invoiceId}`} className="text-slate-400 hover:text-slate-700 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Total row */}
                      <tr className="border-t-2 border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900" colSpan={3}>
                          Total ({summary?.totalInvoices ?? rows.length} invoices)
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{summary ? fmtShort(summary.totalAmount, sym) : "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-green-600">{summary ? fmtShort(summary.totalPaid, sym) : "—"}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-amber-600">{summary ? fmtShort(summary.totalOutstanding, sym) : "—"}</td>
                        <td colSpan={3} />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Collection Alert */}
          {overdueRows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <p className="font-semibold text-slate-800">Collection Alert</p>
              </div>
              <p className="text-sm text-slate-600 ml-7">
                You have{" "}
                <span className="font-semibold text-red-600">{overdueRows.length} overdue invoice{overdueRows.length !== 1 ? "s" : ""}</span>{" "}
                totaling{" "}
                <span className="font-semibold text-slate-800">{fmtShort(overdueTotal, sym)}</span>.{" "}
                Consider sending payment reminders to improve cash flow.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
