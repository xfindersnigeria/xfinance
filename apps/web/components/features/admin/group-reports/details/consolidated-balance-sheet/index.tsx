"use client";
import React, { useState } from "react";
import { CheckCircle2, Eye, EyeOff, TriangleAlert } from "lucide-react";
import { useGroupBalanceSheet } from "@/lib/api/hooks/useGroupReports";
import type { GroupBalanceSheetData } from "@/lib/api/services/groupReportService";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import { ReportPeriodFilter } from "@/components/features/user/reports/ReportPeriodFilter";
import {
  ReportPeriodType,
  defaultPeriodValue,
  periodToDates,
  stepPeriodBack,
} from "@/lib/period-utils";
import {
  GroupReportShell,
  GroupStatementTable,
  KPICard,
  StatementBlock,
  ToggleChip,
  exportMeta,
  fmtCompact,
  fmtStatement,
  pctChange,
  statementExportColumns,
  statementExportRows,
} from "../shared";

export function balanceSheetBlocks(d: GroupBalanceSheetData): StatementBlock[] {
  return [
    { section: d.assets.current },
    { section: d.assets.nonCurrent },
    { row: { label: "Total Assets", amount: d.assets.total, kind: "total" } },
    { section: d.liabilities.current },
    { section: d.liabilities.longTerm },
    { row: { label: "Total Liabilities", amount: d.liabilities.total, kind: "subtotal" } },
    ...d.equity.sections.map((section) => ({ section })),
    { row: { label: "Retained Earnings", amount: d.equity.retainedEarnings, kind: "subtotal" } },
    { row: { label: "Total Equity", amount: d.equity.total, kind: "subtotal" } },
    { row: { label: "Total Liabilities & Equity", amount: d.totalLiabilitiesAndEquity, kind: "total" } },
  ];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** The as-of date and its comparison, from the shared report period filter */
export function useAsOfPeriod() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { endDate: asOfDate } = periodToDates(periodType, period, year);
  const prev = stepPeriodBack(periodType, period, year, 1);
  const { endDate: compareAsOfDate } = periodToDates(periodType, prev.period, prev.year);
  return {
    asOfDate,
    compareAsOfDate,
    filter: (
      <ReportPeriodFilter
        periodType={periodType}
        period={period}
        year={year}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodChange={setPeriod}
        onYearChange={setYear}
      />
    ),
  };
}

export default function ConsolidatedBalanceSheet() {
  const { asOfDate, compareAsOfDate, filter } = useAsOfPeriod();
  const [showEntities, setShowEntities] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const comparisonLabel = compareAsOfDate ? fmtDate(compareAsOfDate) : "Previous";

  const { data: raw, isLoading, error } = useGroupBalanceSheet({
    asOfDate,
    compareAsOfDate: showComparison ? compareAsOfDate : undefined,
  });
  const data = raw?.data ?? null;
  const sym = data?.currency.symbol ?? "";
  const currentLabel = `As of ${fmtDate(asOfDate)}`;

  const kpiSub = (current: number, previous: number) => {
    if (!showComparison) return {};
    const change = pctChange(current, previous);
    if (change === null) return { sub: `Nothing recorded at ${comparisonLabel}` };
    return {
      sub: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs ${comparisonLabel}`,
      subTone: change >= 0 ? ("up" as const) : ("down" as const),
    };
  };

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const columns = statementExportColumns(data, showEntities, showComparison, comparisonLabel, currentLabel);
    return {
      title: "Consolidated Balance Sheet",
      scope: "group",
      period: currentLabel,
      ...exportMeta(data),
      warnings: [
        ...data.warnings,
        ...(data.isBalanced ? [] : ["Total assets do not equal total liabilities and equity — one or more entity ledgers contain an unbalanced posting."]),
      ],
      summary: [
        { label: "Total Assets", value: data.assets.total.total, format: "amount" },
        { label: "Total Liabilities", value: data.liabilities.total.total, format: "amount" },
        { label: "Total Equity", value: data.equity.total.total, format: "amount" },
      ],
      columns,
      sections: [{ rows: statementExportRows(balanceSheetBlocks(data), showComparison) }],
      landscape: columns.length > 5,
    };
  };

  return (
    <GroupReportShell
      title="Consolidated Balance Sheet"
      description="Statement of financial position across all entities in the group"
      getPayload={buildExport}
      loading={isLoading || !data}
      error={error}
      meta={data}
      controls={
        <div className="flex flex-wrap items-center gap-3">
          {filter}
          <ToggleChip active={showEntities} onClick={() => setShowEntities((v) => !v)}>
            {showEntities ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />} Entity Breakdown
          </ToggleChip>
          <ToggleChip active={showComparison} onClick={() => setShowComparison((v) => !v)}>
            Compare with {comparisonLabel}
          </ToggleChip>
        </div>
      }
    >
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Assets" value={fmtCompact(data.assets.total.total, sym)} {...kpiSub(data.assets.total.total, data.assets.total.comparison)} />
            <KPICard label="Total Liabilities" value={fmtCompact(data.liabilities.total.total, sym)} {...kpiSub(data.liabilities.total.total, data.liabilities.total.comparison)} />
            <KPICard label="Total Equity" value={fmtCompact(data.equity.total.total, sym)} {...kpiSub(data.equity.total.total, data.equity.total.comparison)} />
          </div>

          {data.isBalanced ? (
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4" /> Assets equal liabilities plus equity
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-gray-700">
              <TriangleAlert className="w-5 h-5 text-red-500 shrink-0" />
              <span>
                <span className="font-semibold text-red-700">Out of balance by {fmtStatement(data.assets.total.total - data.totalLiabilitiesAndEquity.total, sym)}. </span>
                One or more entity ledgers contain an unbalanced posting — check each entity&apos;s Trial Balance.
              </span>
            </div>
          )}

          <GroupStatementTable
            title="Consolidated Statement of Financial Position"
            blocks={balanceSheetBlocks(data)}
            meta={data}
            sym={sym}
            showEntities={showEntities}
            showComparison={showComparison}
            comparisonLabel={comparisonLabel}
            currentLabel={currentLabel}
          />
        </>
      )}
    </GroupReportShell>
  );
}
