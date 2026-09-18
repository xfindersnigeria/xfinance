"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTaxLiabilityReport } from "@/lib/api/hooks/useReports";
import {
  fmtAmount,
  fmtAmountCompact,
  useEntityBaseCurrency,
  useEntityCurrencySymbol,
} from "@/lib/api/hooks/useCurrencyFormat";
import { TaxLiabilityReportData, TaxLiabilityRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportExportButtons } from "../../ReportExportButtons";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
  getPeriodEndLabel,
} from "@/lib/period-utils";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const TYPE_COLORS = ["#4152b6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const STATUS_CLASS: Record<TaxLiabilityRow["status"], string> = {
  Outstanding: "bg-amber-100 text-amber-700",
  Settled: "bg-green-100 text-green-700",
  Refundable: "bg-blue-100 text-blue-700",
};

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

function KPICard({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" | "primary" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          tone === "green" ? "text-green-600" : tone === "red" ? "text-red-500" : tone === "primary" ? "text-primary" : "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export default function TaxLiabilityReport() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const currency = useEntityBaseCurrency();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useTaxLiabilityReport({ startDate, endDate });
  const data: TaxLiabilityReportData | null = (rawData as any)?.data ?? null;
  const summary = data?.summary;
  const rows = data?.rows ?? [];

  const overdue = rows.filter((r) => r.status === "Outstanding" && r.nextDueDate && new Date(r.nextDueDate) < now);

  const chartData = (data?.trend ?? []).map((t) => {
    const point: Record<string, string | number> = { period: t.label };
    for (const r of rows) point[r.taxType] = t.byType[r.key] ?? 0;
    return point;
  });

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !summary) return null;
    return {
      title: "Tax Liability Report",
      scope: "entity",
      period: getPeriodEndLabel(periodType, period, year),
      currency,
      summary: [
        { label: "Total Tax Liability", value: summary.totalLiability, format: "amount" },
        { label: "Accrued in Period", value: summary.totalAccrued, format: "amount" },
        { label: "Paid in Period", value: summary.totalPaid, format: "amount" },
        { label: "Outstanding Items", value: summary.outstandingCount, format: "number" },
      ],
      columns: [
        { key: "taxType", label: "Tax Type" },
        { key: "authority", label: "Authority" },
        { key: "opening", label: "Opening", format: "amount" },
        { key: "accrued", label: "Accrued", format: "amount" },
        { key: "input", label: "Input VAT", format: "amount" },
        { key: "paid", label: "Paid", format: "amount" },
        { key: "closing", label: "Closing Balance", format: "amount" },
        { key: "due", label: "Next Due" },
        { key: "status", label: "Status" },
      ],
      sections: [
        {
          rows: [
            ...rows.map((r) => ({
              cells: {
                taxType: r.taxType,
                authority: r.authority,
                opening: r.openingBalance,
                accrued: r.accrued,
                input: r.inputCredit,
                paid: r.paid,
                closing: r.closingBalance,
                due: r.nextDueDate ? fmtDate(r.nextDueDate) : "",
                status: r.status,
              },
            })),
            {
              kind: "total" as const,
              cells: {
                taxType: "Total",
                accrued: summary.totalAccrued,
                input: summary.totalInputCredit,
                paid: summary.totalPaid,
                closing: rows.reduce((s, r) => s + r.closingBalance, 0),
              },
            },
          ],
        },
      ],
      warnings: [
        ...overdue.map((r) => `${r.taxType}: ${fmtAmount(r.closingBalance, sym)} was due on ${fmtDate(r.nextDueDate)}.`),
        ...(data.missingAccounts.length ? [`No ledger account set up for: ${data.missingAccounts.join(", ")}.`] : []),
      ],
      notes: [
        "Balances are from the ledger. Accrued = amounts posted to each tax account in the period; Input VAT = VAT on bills and expenses offset against VAT payable; Paid = remittances and other debits.",
        "Due dates follow Nigerian remittance rules: VAT by the 21st and PAYE by the 10th of the following month.",
      ],
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
          <h1 className="text-xl font-semibold text-slate-900">Tax Liability Report</h1>
          <p className="text-sm text-slate-500 mt-0.5">What you owe to tax and statutory authorities, from the ledger</p>
        </div>
        <div className="mt-7">
          <ReportExportButtons getPayload={buildExport} disabled={isLoading || !data} />
        </div>
      </div>

      <ReportPeriodFilter
        periodType={periodType}
        period={period}
        year={year}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodChange={setPeriod}
        onYearChange={setYear}
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {!isLoading && data && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Tax Liability" value={fmtAmount(summary.totalLiability, sym)} tone="red" />
            <KPICard label="Accrued in Period" value={fmtAmount(summary.totalAccrued, sym)} />
            <KPICard label="Paid in Period" value={fmtAmount(summary.totalPaid, sym)} tone="green" />
            <KPICard label="Outstanding Items" value={String(summary.outstandingCount)} tone="primary" />
          </div>

          {overdue.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="font-medium">Overdue remittances</span>
                {overdue.map((r) => (
                  <span key={r.key}>
                    {r.taxType}: {fmtAmount(r.closingBalance, sym)} was due on {fmtDate(r.nextDueDate)}.
                  </span>
                ))}
              </div>
            </div>
          )}

          {data.missingAccounts.length > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>No ledger account is set up for: {data.missingAccounts.join(", ")}.</span>
            </div>
          )}

          {chartData.length > 0 && rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Liability Trend (month-end balances)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtAmountCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => fmtAmount(v, sym)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rows.map((r, i) => (
                    <Bar key={r.key} dataKey={r.taxType} stackId="liability" fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Tax Liability Details</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax Type</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Opening</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Accrued</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Input VAT</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Closing Balance</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Next Due</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">No tax accounts found for this entity.</td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((r) => (
                        <tr key={r.key} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm">
                            <p className="text-slate-800">{r.taxType}</p>
                            <p className="text-xs text-slate-400">{r.authority}</p>
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtAmount(r.openingBalance, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtAmount(r.accrued, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{r.inputCredit ? fmtAmount(r.inputCredit, sym) : "—"}</td>
                          <td className="px-5 py-3 text-right text-sm text-green-600">{fmtAmount(r.paid, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(r.closingBalance, sym)}</td>
                          <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(r.nextDueDate)}</td>
                          <td className="px-5 py-3 text-sm">
                            <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs", STATUS_CLASS[r.status])}>{r.status}</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-5 py-3" />
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.totalAccrued, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.totalInputCredit, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.totalPaid, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                          {fmtAmount(rows.reduce((s, r) => s + r.closingBalance, 0), sym)}
                        </td>
                        <td className="px-5 py-3" colSpan={2} />
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 flex flex-col gap-1">
            <span className="font-medium text-slate-800">How this is calculated</span>
            <span>Balances come from the ledger accounts for each tax. Accrued is what was posted to the account in the period (sales VAT, payroll deductions).</span>
            <span>Input VAT is VAT on bills and expenses offset against VAT payable. Paid is remittances and other debits to the account.</span>
            <span>Due dates follow Nigerian remittance rules: VAT by the 21st and PAYE by the 10th of the following month.</span>
          </div>
        </>
      )}
    </div>
  );
}
