"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useGroupCashFlow } from "@/lib/api/hooks/useGroupReports";
import type { GroupCashFlowData, GroupCashFlowLine, GroupSection } from "@/lib/api/services/groupReportService";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import { ReportPeriodFilter } from "@/components/features/user/reports/ReportPeriodFilter";
import {
  ReportPeriodType,
  defaultPeriodValue,
  getPeriodDisplayLabel,
  getPeriodEndLabel,
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
  pctChange,
  statementExportColumns,
  statementExportRows,
} from "../shared";

function asSection(label: string, lines: GroupCashFlowLine[], total: GroupCashFlowLine): GroupSection {
  return {
    label,
    lines: lines.map((l) => ({ key: l.key, code: "", name: l.label, byEntity: l.byEntity, total: l.total, comparison: l.comparison })),
    byEntity: total.byEntity,
    total: total.total,
    comparison: total.comparison,
  };
}

function blocksFor(d: GroupCashFlowData): StatementBlock[] {
  return [
    { section: asSection("Operating Activities", d.operating, d.operatingTotal) },
    { section: asSection("Investing Activities", d.investing, d.investingTotal) },
    { section: asSection("Financing Activities", d.financing, d.financingTotal) },
    { row: { label: "Net Change in Cash", amount: d.netCashChange, kind: "subtotal" } },
    { row: { label: "Cash at Beginning of Period", amount: d.cashAtStart, kind: "subtotal" } },
    { row: { label: "Cash at End of Period", amount: d.cashAtEnd, kind: "total" } },
  ];
}

export default function ConsolidatedCashFlowStatement() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const [showEntities, setShowEntities] = useState(true);
  const [showComparison, setShowComparison] = useState(true);

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const prev = stepPeriodBack(periodType, period, year, 1);
  const { startDate: compareStartDate, endDate: compareEndDate } = periodToDates(periodType, prev.period, prev.year);
  const comparisonLabel = getPeriodDisplayLabel(periodType, prev.period, prev.year);

  const { data: raw, isLoading, error } = useGroupCashFlow({
    startDate,
    endDate,
    compareStartDate: showComparison ? compareStartDate : undefined,
    compareEndDate: showComparison ? compareEndDate : undefined,
  });
  const data = raw?.data ?? null;
  const sym = data?.currency.symbol ?? "";

  const kpiSub = (line: GroupCashFlowLine) => {
    if (!showComparison) return {};
    const change = pctChange(line.total, line.comparison);
    if (change === null) return { sub: `No figure for ${comparisonLabel}` };
    return {
      sub: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs ${comparisonLabel}`,
      subTone: change >= 0 ? ("up" as const) : ("down" as const),
    };
  };

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const columns = statementExportColumns(data, showEntities, showComparison, comparisonLabel);
    return {
      title: "Consolidated Cash Flow Statement",
      scope: "group",
      period: getPeriodEndLabel(periodType, period, year),
      ...exportMeta(data),
      summary: [
        { label: "Operating Cash Flow", value: data.operatingTotal.total, format: "amount" },
        { label: "Investing Cash Flow", value: data.investingTotal.total, format: "amount" },
        { label: "Financing Cash Flow", value: data.financingTotal.total, format: "amount" },
        { label: "Net Change in Cash", value: data.netCashChange.total, format: "amount" },
      ],
      columns,
      sections: [{ rows: statementExportRows(blocksFor(data), showComparison) }],
      landscape: columns.length > 5,
    };
  };

  return (
    <GroupReportShell
      title="Consolidated Cash Flow Statement"
      description="Cash movements across all entities in the group (indirect method)"
      getPayload={buildExport}
      loading={isLoading || !data}
      error={error}
      meta={data}
      controls={
        <div className="flex flex-wrap items-center gap-3">
          <ReportPeriodFilter
            periodType={periodType}
            period={period}
            year={year}
            onPeriodTypeChange={handlePeriodTypeChange}
            onPeriodChange={setPeriod}
            onYearChange={setYear}
          />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Operating Cash Flow" value={fmtCompact(data.operatingTotal.total, sym)} {...kpiSub(data.operatingTotal)} />
            <KPICard label="Investing Cash Flow" value={fmtCompact(data.investingTotal.total, sym)} {...kpiSub(data.investingTotal)} />
            <KPICard label="Financing Cash Flow" value={fmtCompact(data.financingTotal.total, sym)} {...kpiSub(data.financingTotal)} />
            <KPICard label="Cash at End of Period" value={fmtCompact(data.cashAtEnd.total, sym)} {...kpiSub(data.cashAtEnd)} />
          </div>

          <GroupStatementTable
            title="Consolidated Statement of Cash Flows"
            blocks={blocksFor(data)}
            meta={data}
            sym={sym}
            showEntities={showEntities}
            showComparison={showComparison}
            comparisonLabel={comparisonLabel}
          />
        </>
      )}
    </GroupReportShell>
  );
}
