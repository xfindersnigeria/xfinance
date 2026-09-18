"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useGroupProfitAndLoss } from "@/lib/api/hooks/useGroupReports";
import type { GroupProfitAndLossData } from "@/lib/api/services/groupReportService";
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

function blocksFor(d: GroupProfitAndLossData): StatementBlock[] {
  return [
    { section: d.sections.revenue },
    { section: d.sections.cogs, lowerIsBetter: true },
    { row: { label: "Gross Profit", amount: d.grossProfit, kind: "subtotal" } },
    { section: d.sections.operatingExpenses, lowerIsBetter: true },
    { row: { label: "Operating Profit", amount: d.operatingProfit, kind: "subtotal" } },
    { section: d.sections.otherIncome },
    { section: d.sections.otherExpenses, lowerIsBetter: true },
    { row: { label: "Net Profit", amount: d.netProfit, kind: "total" } },
  ];
}

export default function ConsolidatedProfitAndLoss() {
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

  const { data: raw, isLoading, error } = useGroupProfitAndLoss({
    startDate,
    endDate,
    compareStartDate: showComparison ? compareStartDate : undefined,
    compareEndDate: showComparison ? compareEndDate : undefined,
  });
  const data = raw?.data ?? null;
  const sym = data?.currency.symbol ?? "";

  const kpiSub = (current: number, previous: number) => {
    if (!showComparison) return {};
    const change = pctChange(current, previous);
    if (change === null) return { sub: `No figure for ${comparisonLabel}` };
    return {
      sub: `${change >= 0 ? "+" : ""}${change.toFixed(1)}% vs ${comparisonLabel}`,
      subTone: change >= 0 ? ("up" as const) : ("down" as const),
    };
  };

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const blocks = blocksFor(data);
    const columns = statementExportColumns(data, showEntities, showComparison, comparisonLabel);
    return {
      title: "Consolidated Profit and Loss",
      scope: "group",
      period: getPeriodEndLabel(periodType, period, year),
      ...exportMeta(data),
      summary: [
        { label: "Total Revenue", value: data.totalRevenue.total, format: "amount" },
        { label: "Gross Profit", value: data.grossProfit.total, format: "amount" },
        { label: "Net Profit", value: data.netProfit.total, format: "amount" },
      ],
      columns,
      sections: [{ rows: statementExportRows(blocks, showComparison) }],
      landscape: columns.length > 5,
    };
  };

  return (
    <GroupReportShell
      title="Consolidated Profit and Loss"
      description="Income statement across all entities in the group"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Revenue" value={fmtCompact(data.totalRevenue.total, sym)} {...kpiSub(data.totalRevenue.total, data.totalRevenue.comparison)} />
            <KPICard label="Gross Profit" value={fmtCompact(data.grossProfit.total, sym)} {...kpiSub(data.grossProfit.total, data.grossProfit.comparison)} />
            <KPICard label="Net Profit" value={fmtCompact(data.netProfit.total, sym)} {...kpiSub(data.netProfit.total, data.netProfit.comparison)} />
          </div>

          <GroupStatementTable
            title="Consolidated Statement"
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
