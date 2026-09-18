"use client";
import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import { getPeriodEndLabel } from "@/lib/period-utils";
import {
  ENTITY_COLORS,
  GroupReportShell,
  KPICard,
  exportMeta,
  fmtCompact,
  fmtStatement,
  pctChange,
  tooltipStyle,
} from "../shared";
import { growthText, quarterlyTrend, useEntityComparisonReport } from "../entity-revenue-comparison/comparison-utils";
import { ComparisonControls } from "../entity-revenue-comparison/ComparisonControls";

const th = "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";
const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);

export default function EntityProfitabilityAnalysis() {
  const r = useEntityComparisonReport();
  const { data, showComparison, comparisonLabel } = r;
  const sym = data?.currency.symbol ?? "";

  const rows = [...(data?.rows ?? [])].sort((a, b) => b.current.netProfit - a.current.netProfit);
  const totals = data?.totals;
  const groupNetMargin = totals && totals.revenue ? (totals.netProfit / totals.revenue) * 100 : null;
  const netGrowth = totals && showComparison ? pctChange(totals.netProfit, totals.previousNetProfit ?? 0) : null;
  const top = [...rows].filter((e) => e.current.netMargin != null).sort((a, b) => (b.current.netMargin ?? 0) - (a.current.netMargin ?? 0))[0];

  const marginChart = rows.map((e) => ({
    entity: e.name,
    "Gross Margin": e.current.grossMargin ?? 0,
    "Operating Margin": e.current.operatingMargin ?? 0,
    "Net Margin": e.current.netMargin ?? 0,
  }));

  // Quarterly net margin per entity (net profit ÷ income, incl. other income)
  const quarters = data ? quarterlyTrend(data, "netProfit") : [];
  const trendChart = quarters.map((q) => {
    const row: Record<string, string | number | null> = { quarter: q.label };
    for (const e of rows) {
      const income = q.revenue[e.id] ?? 0;
      row[e.name] = income ? Math.round(((q.byEntity[e.id] ?? 0) / income) * 1000) / 10 : null;
    }
    return row;
  });

  const profitChart = rows.map((e) => ({ entity: e.name, Current: e.current.netProfit, Previous: e.previous?.netProfit ?? 0 }));

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !totals) return null;
    const columns = [
      { key: "entity", label: "Entity" },
      { key: "revenue", label: "Revenue", format: "amount" as const },
      { key: "gross", label: "Gross Profit", format: "amount" as const },
      { key: "operating", label: "Operating Profit", format: "amount" as const },
      { key: "net", label: "Net Profit", format: "amount" as const },
      { key: "gm", label: "Gross Margin", format: "percent" as const },
      { key: "om", label: "Operating Margin", format: "percent" as const },
      { key: "nm", label: "Net Margin", format: "percent" as const },
      ...(showComparison ? [{ key: "growth", label: `Net Profit Growth vs ${comparisonLabel}`, format: "percent" as const }] : []),
    ];
    return {
      title: "Entity Profitability Analysis",
      scope: "group",
      period: getPeriodEndLabel(r.periodType, r.period, r.year),
      ...exportMeta(data),
      summary: [
        { label: "Total Revenue", value: totals.revenue, format: "amount" },
        { label: "Total Net Profit", value: totals.netProfit, format: "amount" },
        ...(groupNetMargin != null ? [{ label: "Group Net Margin", value: Math.round(groupNetMargin * 10) / 10, format: "percent" as const }] : []),
        ...(top ? [{ label: "Top Performer (net margin)", value: top.name }] : []),
      ],
      columns,
      sections: [
        {
          rows: [
            ...rows.map((e) => ({
              cells: {
                entity: e.name,
                revenue: e.current.revenue,
                gross: e.current.grossProfit,
                operating: e.current.operatingProfit,
                net: e.current.netProfit,
                gm: e.current.grossMargin,
                om: e.current.operatingMargin,
                nm: e.current.netMargin,
                growth: e.growth.netProfit,
              },
            })),
            {
              kind: "total" as const,
              cells: {
                entity: "Group",
                revenue: totals.revenue,
                gross: totals.grossProfit,
                operating: totals.operatingProfit,
                net: totals.netProfit,
                gm: totals.revenue ? Math.round((totals.grossProfit / totals.revenue) * 1000) / 10 : null,
                om: totals.revenue ? Math.round((totals.operatingProfit / totals.revenue) * 1000) / 10 : null,
                nm: groupNetMargin != null ? Math.round(groupNetMargin * 10) / 10 : null,
                growth: netGrowth != null ? Math.round(netGrowth * 10) / 10 : null,
              },
            },
          ],
        },
      ],
      landscape: true,
    };
  };

  return (
    <GroupReportShell
      title="Entity Profitability Analysis"
      description="Margins and profit performance of each entity in the group"
      getPayload={buildExport}
      loading={r.isLoading || !data}
      error={r.error}
      meta={data}
      controls={<ComparisonControls r={r} />}
    >
      {data && totals && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Total Revenue" value={fmtCompact(totals.revenue, sym)} sub="Across all entities" />
            <KPICard
              label="Total Net Profit"
              value={fmtCompact(totals.netProfit, sym)}
              {...(netGrowth != null
                ? { sub: `${growthText(netGrowth)} vs ${comparisonLabel}`, subTone: netGrowth >= 0 ? ("up" as const) : ("down" as const) }
                : { sub: "Combined profit" })}
            />
            <KPICard label="Group Net Margin" value={pct(groupNetMargin)} sub="Net profit ÷ group revenue" />
            <KPICard
              label="Top Performer"
              value={top ? top.name : "—"}
              sub={top ? `${pct(top.current.netMargin)} net margin` : "No revenue this period"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Margin Comparison</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={marginChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="entity" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Gross Margin" fill="#4152b6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Operating Margin" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Net Margin" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800">Net Margin Trend</p>
              <p className="text-xs text-slate-500 mb-4">Quarterly, last 12 months (net profit ÷ income incl. other income)</p>
              <ResponsiveContainer width="100%" height={284}>
                <LineChart data={trendChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [v == null ? "—" : `${v}%`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rows.map((e, i) => (
                    <Line key={e.id} type="monotone" dataKey={e.name} stroke={ENTITY_COLORS[i % ENTITY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <p className="font-semibold text-slate-800 mb-4">
              {showComparison ? `Net Profit: Current vs ${comparisonLabel}` : "Net Profit by Entity"}
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={profitChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="entity" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtStatement(v, sym), name]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {showComparison && <Bar dataKey="Previous" name={comparisonLabel} fill="#cbd5e1" radius={[6, 6, 0, 0]} />}
                <Bar dataKey="Current" name="Current period" fill="#4152b6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Detailed Profitability Analysis</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={cn(th, "text-left")}>Entity</th>
                    <th className={cn(th, "text-right")}>Revenue</th>
                    <th className={cn(th, "text-right")}>Gross Profit</th>
                    <th className={cn(th, "text-right")}>Operating Profit</th>
                    <th className={cn(th, "text-right")}>Net Profit</th>
                    <th className={cn(th, "text-right")}>Gross Margin</th>
                    <th className={cn(th, "text-right")}>Operating Margin</th>
                    <th className={cn(th, "text-right")}>Net Margin</th>
                    {showComparison && <th className={cn(th, "text-right")}>Net Profit Growth</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center text-slate-400 text-sm">No entities to compare.</td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((e) => (
                        <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-sm text-slate-800">{e.name}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.revenue, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.grossProfit, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.operatingProfit, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">{fmtStatement(e.current.netProfit, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{pct(e.current.grossMargin)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{pct(e.current.operatingMargin)}</td>
                          <td className={cn("px-4 py-3 text-right text-sm", (e.current.netMargin ?? 0) >= 0 ? "text-green-600" : "text-red-500", e.current.netMargin == null && "text-slate-400")}>
                            {pct(e.current.netMargin)}
                          </td>
                          {showComparison && (
                            <td className={cn("px-4 py-3 text-right text-sm", (e.growth.netProfit ?? 0) >= 0 ? "text-green-600" : "text-red-500", e.growth.netProfit == null && "text-slate-400")}>
                              {growthText(e.growth.netProfit)}
                            </td>
                          )}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">Group</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totals.revenue, sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totals.grossProfit, sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totals.operatingProfit, sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totals.netProfit, sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{pct(totals.revenue ? (totals.grossProfit / totals.revenue) * 100 : null)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{pct(totals.revenue ? (totals.operatingProfit / totals.revenue) * 100 : null)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{pct(groupNetMargin)}</td>
                        {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{growthText(netGrowth)}</td>}
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </GroupReportShell>
  );
}
