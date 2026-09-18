import { useState } from "react";
import type { EntityComparisonData } from "@/lib/api/services/groupReportService";
import {
  ReportPeriodType,
  defaultPeriodValue,
  getPeriodDisplayLabel,
  periodToDates,
  stepPeriodBack,
} from "@/lib/period-utils";
import { useEntityComparison } from "@/lib/api/hooks/useGroupReports";

/**
 * Period state + data for the three entity-comparison reports (revenue,
 * profitability, expenses), which all read the same endpoint.
 */
export function useEntityComparisonReport() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());
  const [showComparison, setShowComparison] = useState(true);

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const prev = stepPeriodBack(periodType, period, year, 1);
  const { startDate: compareStartDate, endDate: compareEndDate } = periodToDates(periodType, prev.period, prev.year);
  const comparisonLabel = getPeriodDisplayLabel(periodType, prev.period, prev.year);

  const query = useEntityComparison({
    startDate,
    endDate,
    compareStartDate: showComparison ? compareStartDate : undefined,
    compareEndDate: showComparison ? compareEndDate : undefined,
  });

  return {
    periodType, period, year, setPeriod, setYear, handlePeriodTypeChange,
    showComparison, setShowComparison, comparisonLabel,
    data: query.data?.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}

type Metric = "revenue" | "expenses" | "netProfit";

/** Aggregate the monthly trend into calendar quarters: [{ label, byEntity: {id: value} }] */
export function quarterlyTrend(data: EntityComparisonData, metric: Metric) {
  const quarters: Array<{ label: string; byEntity: Record<string, number>; revenue: Record<string, number> }> = [];
  for (const m of data.trend) {
    const [y, mm] = m.month.split("-").map(Number);
    const label = `Q${Math.ceil(mm / 3)} ${y}`;
    let q = quarters.find((x) => x.label === label);
    if (!q) {
      q = { label, byEntity: {}, revenue: {} };
      quarters.push(q);
    }
    for (const [id, p] of Object.entries(m.byEntity)) {
      q.byEntity[id] = (q.byEntity[id] ?? 0) + p[metric];
      q.revenue[id] = (q.revenue[id] ?? 0) + p.revenue;
    }
  }
  return quarters;
}

/** Monthly trend as chart rows: [{ month: "Jan 26", [entityName]: value }] */
export function monthlyChartRows(data: EntityComparisonData, metric: Metric) {
  const names = new Map(data.rows.map((r) => [r.id, r.name]));
  return data.trend.map((m) => {
    const [y, mm] = m.month.split("-").map(Number);
    const row: Record<string, string | number> = {
      month: new Date(y, mm - 1, 1).toLocaleString("en", { month: "short", year: "2-digit" }),
    };
    for (const r of data.rows) row[names.get(r.id)!] = m.byEntity[r.id]?.[metric] ?? 0;
    return row;
  });
}

export function growthText(g: number | null): string {
  if (g == null) return "—";
  return `${g >= 0 ? "+" : ""}${g.toFixed(1)}%`;
}
