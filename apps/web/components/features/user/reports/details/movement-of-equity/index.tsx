"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMovementOfEquity } from "@/lib/api/hooks/useReports";
import { fmtAmount, useEntityBaseCurrency, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { EquityMovementRow, MovementOfEquityData } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportExportButtons } from "../../ReportExportButtons";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
  getPeriodEndLabel,
} from "@/lib/period-utils";

// Movement rows that are always shown; the others only when non-zero
const ALWAYS_SHOWN = new Set(["opening", "profit", "closing"]);

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

/** Negative amounts in brackets, zero as a dash — statement convention */
function StatementAmount({ value, sym, strong }: { value: number; sym: string; strong?: boolean }) {
  if (Math.abs(value) < 0.005) return <span className="text-slate-400">—</span>;
  return (
    <span className={cn(value < 0 ? "text-red-500" : strong ? "text-slate-900" : "text-slate-700", strong && "font-semibold")}>
      {value < 0 ? `(${fmtAmount(Math.abs(value), sym)})` : fmtAmount(value, sym)}
    </span>
  );
}

export default function MovementOfEquity() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const currency = useEntityBaseCurrency();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Annual");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Annual"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useMovementOfEquity({ startDate, endDate });
  const data: MovementOfEquityData | null = (rawData as any)?.data ?? null;

  const components = data?.components ?? [];
  const rows = (data?.rows ?? []).filter(
    (r) => ALWAYS_SHOWN.has(r.key) || Math.abs(r.amounts.total ?? 0) > 0.005 || components.some((c) => Math.abs(r.amounts[c.key] ?? 0) > 0.005),
  );
  const summary = data?.summary;

  const rowKind = (r: EquityMovementRow) => (r.key === "opening" ? "subtotal" : r.key === "closing" ? "total" : "row");

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !summary) return null;
    return {
      title: "Statement of Changes in Equity",
      scope: "entity",
      period: getPeriodEndLabel(periodType, period, year),
      currency,
      summary: [
        { label: "Total Equity - Beginning", value: summary.openingTotal, format: "amount" },
        { label: "Net Change in Equity", value: summary.netChange, format: "amount" },
        { label: "Total Equity - Ending", value: summary.closingTotal, format: "amount" },
      ],
      columns: [
        { key: "label", label: "Particulars" },
        ...components.map((c) => ({ key: c.key, label: c.label, format: "amount" as const })),
        { key: "total", label: "Total Equity", format: "amount" },
      ],
      sections: [
        {
          rows: rows.map((r) => ({
            kind: rowKind(r),
            indent: r.key === "opening" || r.key === "closing" ? 0 : 1,
            cells: { label: r.label, ...r.amounts },
          })),
        },
      ],
      warnings: data.isReconciled
        ? []
        : [`Closing equity does not match the Balance Sheet (${fmtAmount(data.balanceSheetEquity, sym)}).`],
      notes: [
        "Retained earnings include the cumulative profit or loss from the income statement; dividends are movements on the Dividends account.",
      ],
      landscape: components.length > 3,
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
          <h1 className="text-xl font-semibold text-slate-900">Statement of Changes in Equity</h1>
          <p className="text-sm text-slate-500 mt-0.5">How each component of equity moved over the period</p>
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
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        </div>
      )}

      {!isLoading && data && summary && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{getPeriodEndLabel(periodType, period, year)}</p>
              {data.isReconciled ? (
                <span className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle2 className="w-4 h-4" /> Agrees to Balance Sheet
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertTriangle className="w-4 h-4" /> Balance Sheet equity is {fmtAmount(data.balanceSheetEquity, sym)}
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Particulars</th>
                    {components.map((c) => (
                      <th key={c.key} className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.label}</th>
                    ))}
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Equity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const isEdge = r.key === "opening" || r.key === "closing";
                    return (
                      <React.Fragment key={r.key}>
                        <tr
                          className={cn(
                            "border-t",
                            r.key === "closing" ? "border-slate-200 bg-slate-50/80" : "border-slate-50 hover:bg-slate-50/60",
                          )}
                        >
                          <td className={cn("px-5 py-3 text-sm", isEdge ? "font-semibold text-slate-900" : "pl-10 text-slate-700")}>{r.label}</td>
                          {components.map((c) => (
                            <td key={c.key} className="px-5 py-3 text-right text-sm">
                              <StatementAmount value={r.amounts[c.key] ?? 0} sym={sym} strong={isEdge} />
                            </td>
                          ))}
                          <td className="px-5 py-3 text-right text-sm">
                            <StatementAmount value={r.amounts.total ?? 0} sym={sym} strong />
                          </td>
                        </tr>
                        {r.key === "opening" && (
                          <tr>
                            <td colSpan={components.length + 2} className="px-5 pt-3 pb-1 text-sm font-semibold text-slate-900">
                              Changes during the period
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Equity - Beginning" value={fmtAmount(summary.openingTotal, sym)} />
            <KPICard
              label="Net Change in Equity"
              value={fmtAmount(summary.netChange, sym)}
              tone={summary.netChange >= 0 ? "green" : "red"}
            />
            <KPICard label="Total Equity - Ending" value={fmtAmount(summary.closingTotal, sym)} tone="primary" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 flex flex-col gap-1">
            <span className="font-medium text-slate-800">Notes</span>
            <span>Retained earnings include the cumulative profit or loss from the income statement.</span>
            <span>Dividends are movements on the Dividends account; share capital movements are postings to Capital Stock.</span>
            <span>Closing equity is checked against the Balance Sheet for the same date.</span>
          </div>
        </>
      )}
    </div>
  );
}
