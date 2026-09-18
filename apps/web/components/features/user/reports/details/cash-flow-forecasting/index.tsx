"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownRight, ArrowLeft, ArrowUpRight, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCashFlowForecast } from "@/lib/api/hooks/useReports";
import {
  fmtAmount,
  fmtAmountCompact,
  useEntityBaseCurrency,
  useEntityCurrencySymbol,
} from "@/lib/api/hooks/useCurrencyFormat";
import { CashFlowForecastData } from "@/lib/api/services/reportService";
import { ReportExportButtons } from "../../ReportExportButtons";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import {
  ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const HORIZONS = [
  { value: "3", label: "Next 3 Months" },
  { value: "6", label: "Next 6 Months" },
  { value: "12", label: "Next 12 Months" },
];

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

function KPICard({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn("text-2xl font-bold", tone === "green" ? "text-green-600" : tone === "red" ? "text-red-500" : "text-slate-900")}>
        {value}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  icon,
  items,
  total,
  sym,
  barClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; amount: number }[];
  total: number;
  sym: string;
  barClass: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="font-semibold text-slate-800 mb-4 flex items-center gap-2">{icon}{title}</p>
      <div className="flex flex-col gap-4">
        {items.map((item) => {
          const pct = total > 0 ? (item.amount / total) * 100 : 0;
          return (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-700">{item.label}</span>
                <span className="text-slate-900 font-medium">{fmtAmount(item.amount, sym)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CashFlowForecasting() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const currency = useEntityBaseCurrency();
  const [horizon, setHorizon] = useState("6");

  const { data: rawData, isLoading } = useCashFlowForecast({ months: Number(horizon) });
  const data: CashFlowForecastData | null = (rawData as any)?.data ?? null;
  const summary = data?.summary;
  const buckets = data?.buckets ?? [];
  const method = data?.method;

  const horizonLabel = HORIZONS.find((h) => h.value === horizon)?.label ?? "";
  const asOfLabel = data ? new Date(data.asOfDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";

  const chartData = buckets.map((b) => ({
    period: b.label,
    "Closing Balance": b.closingCash,
    "Cash In": b.inflows.total,
    "Cash Out": b.outflows.total,
  }));

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !summary) return null;
    return {
      title: "Cash Flow Forecasting",
      scope: "entity",
      period: `${horizonLabel} from ${asOfLabel}`,
      currency,
      summary: [
        { label: "Current Cash", value: summary.currentCash, format: "amount" },
        { label: "Projected Cash In", value: summary.totalInflows, format: "amount" },
        { label: "Projected Cash Out", value: summary.totalOutflows, format: "amount" },
        { label: "Ending Balance", value: summary.endingCash, format: "amount" },
      ],
      columns: [
        { key: "period", label: "Period" },
        { key: "opening", label: "Opening Balance", format: "amount" },
        { key: "receivables", label: "Receivables Due", format: "amount" },
        { key: "recurringIn", label: "Recurring Receipts", format: "amount" },
        { key: "payables", label: "Bills Due", format: "amount" },
        { key: "recurringOut", label: "Recurring Costs", format: "amount" },
        { key: "net", label: "Net Cash Flow", format: "amount" },
        { key: "closing", label: "Closing Balance", format: "amount" },
      ],
      sections: [
        {
          rows: [
            ...buckets.map((b) => ({
              cells: {
                period: b.label,
                opening: b.openingCash,
                receivables: b.inflows.receivables,
                recurringIn: b.inflows.recurring,
                payables: b.outflows.payables,
                recurringOut: b.outflows.recurring,
                net: b.net,
                closing: b.closingCash,
              },
            })),
            {
              kind: "total" as const,
              cells: {
                period: "Total",
                receivables: data.inflowBreakdown.receivables,
                recurringIn: data.inflowBreakdown.recurring,
                payables: data.outflowBreakdown.payables,
                recurringOut: data.outflowBreakdown.recurringExpenses + data.outflowBreakdown.recurringPayroll,
                net: summary.netChange,
                closing: summary.endingCash,
              },
            },
          ],
        },
      ],
      notes: method
        ? [
            "Opening cash is the ledger balance of Cash and Cash Equivalents accounts.",
            "Receivables and bills are outstanding balances placed in the month they fall due; overdue items are assumed settled in the first month.",
            `Recurring flows are monthly averages over the last ${method.lookbackMonths} full months: receipts ${fmtAmount(method.avgMonthlyReceipts, sym)}, expenses ${fmtAmount(method.avgMonthlyExpenses, sym)}, payroll ${fmtAmount(method.avgMonthlyPayroll, sym)}. The first month is pro-rated for the days remaining.`,
          ]
        : [],
      landscape: true,
    };
  };

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
          <h1 className="text-xl font-semibold text-slate-900">Cash Flow Forecasting</h1>
          <p className="text-sm text-slate-500 mt-0.5">Projected cash position from open invoices, bills and recent trends</p>
        </div>
        <div className="mt-7">
          <ReportExportButtons getPayload={buildExport} disabled={isLoading || !data} />
        </div>
      </div>

      {/* Horizon */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={horizon} onValueChange={setHorizon}>
          <SelectTrigger className="w-44 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HORIZONS.map((h) => (
              <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {asOfLabel && <span className="text-sm text-slate-500">As of {asOfLabel}</span>}
      </div>

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      )}

      {!isLoading && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Current Cash" value={fmtAmount(summary.currentCash, sym)} tone={summary.currentCash < 0 ? "red" : undefined} />
            <KPICard label="Projected Cash In" value={fmtAmount(summary.totalInflows, sym)} tone="green" />
            <KPICard label="Projected Cash Out" value={fmtAmount(summary.totalOutflows, sym)} tone="red" />
            <KPICard label="Ending Balance" value={fmtAmount(summary.endingCash, sym)} tone={summary.endingCash < 0 ? "red" : undefined} />
          </div>

          {(summary.overdueReceivables > 0 || summary.overduePayables > 0 || summary.lowestCash < 0) && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                {summary.overdueReceivables > 0 && (
                  <span>{fmtAmount(summary.overdueReceivables, sym)} of receivables are already overdue and assumed collected this month.</span>
                )}
                {summary.overduePayables > 0 && (
                  <span>{fmtAmount(summary.overduePayables, sym)} of bills are already overdue and assumed paid this month.</span>
                )}
                {summary.lowestCash < 0 && (
                  <span>Cash is projected to fall to {fmtAmount(summary.lowestCash, sym)} in {summary.lowestCashMonth}.</span>
                )}
              </div>
            </div>
          )}

          {buckets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Cash Balance Forecast</p>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtAmountCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => fmtAmount(v, sym)} />
                    <Area type="monotone" dataKey="Closing Balance" stroke="#4152b6" fill="#4152b6" fillOpacity={0.12} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Cash In vs Cash Out</p>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtAmountCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => fmtAmount(v, sym)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Cash In" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Cash Out" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownCard
                title="Projected Cash In"
                icon={<ArrowUpRight className="w-4 h-4 text-green-600" />}
                sym={sym}
                total={summary.totalInflows}
                barClass="bg-green-500"
                items={[
                  { label: "Receivables due (open invoices)", amount: data.inflowBreakdown.receivables },
                  { label: "Recurring cash receipts", amount: data.inflowBreakdown.recurring },
                ]}
              />
              <BreakdownCard
                title="Projected Cash Out"
                icon={<ArrowDownRight className="w-4 h-4 text-red-500" />}
                sym={sym}
                total={summary.totalOutflows}
                barClass="bg-red-500"
                items={[
                  { label: "Bills due (open bills)", amount: data.outflowBreakdown.payables },
                  { label: "Recurring expenses", amount: data.outflowBreakdown.recurringExpenses },
                  { label: "Payroll", amount: data.outflowBreakdown.recurringPayroll },
                ]}
              />
            </div>
          )}

          {/* Detailed table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Detailed Cash Flow Forecast</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Opening Balance</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash In</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Cash Out</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Cash Flow</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => (
                    <tr key={b.month} className="border-t border-slate-50 hover:bg-slate-50/60">
                      <td className="px-5 py-3 text-sm text-slate-800">{b.label}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtAmount(b.openingCash, sym)}</td>
                      <td className="px-5 py-3 text-right text-sm text-green-600">{fmtAmount(b.inflows.total, sym)}</td>
                      <td className="px-5 py-3 text-right text-sm text-red-500">{fmtAmount(b.outflows.total, sym)}</td>
                      <td className={cn("px-5 py-3 text-right text-sm font-medium", b.net >= 0 ? "text-green-600" : "text-red-500")}>
                        {fmtAmount(b.net, sym)}
                      </td>
                      <td className={cn("px-5 py-3 text-right text-sm font-semibold", b.closingCash < 0 ? "text-red-500" : "text-slate-900")}>
                        {fmtAmount(b.closingCash, sym)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-200 bg-slate-50/80">
                    <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.totalInflows, sym)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.totalOutflows, sym)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.netChange, sym)}</td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.endingCash, sym)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Method */}
          {method && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div className="flex flex-col gap-1">
                <span className="font-medium text-slate-800">How this forecast is calculated</span>
                <span>Opening cash is the ledger balance of your Cash and Cash Equivalents accounts.</span>
                <span>Open invoices and bills are placed in the month they fall due; anything already overdue is assumed settled this month.</span>
                <span>
                  Recurring flows are monthly averages over the last {method.lookbackMonths} full months: receipts{" "}
                  {fmtAmount(method.avgMonthlyReceipts, sym)}, expenses {fmtAmount(method.avgMonthlyExpenses, sym)}, payroll{" "}
                  {fmtAmount(method.avgMonthlyPayroll, sym)}. The current month only counts the days remaining.
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
