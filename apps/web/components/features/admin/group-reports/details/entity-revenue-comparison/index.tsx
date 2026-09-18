"use client";
import React from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
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
import { growthText, quarterlyTrend, useEntityComparisonReport } from "./comparison-utils";
import { ComparisonControls } from "./ComparisonControls";

const th = "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";

export default function EntityRevenueComparison() {
  const r = useEntityComparisonReport();
  const { data, showComparison, comparisonLabel } = r;
  const sym = data?.currency.symbol ?? "";

  const rows = [...(data?.rows ?? [])].sort((a, b) => b.current.revenue - a.current.revenue);
  const totalRevenue = data?.totals.revenue ?? 0;
  const share = (v: number) => (totalRevenue ? (v / totalRevenue) * 100 : 0);
  const quarters = data ? quarterlyTrend(data, "revenue") : [];
  const top = rows[0];
  const fastest = showComparison
    ? [...rows].filter((x) => x.growth.revenue != null).sort((a, b) => (b.growth.revenue ?? 0) - (a.growth.revenue ?? 0))[0]
    : undefined;
  const overallGrowth = data && showComparison ? pctChange(totalRevenue, data.totals.previousRevenue ?? 0) : null;

  const quarterChart = quarters.map((q) => {
    const row: Record<string, string | number> = { quarter: q.label };
    for (const e of rows) row[e.name] = q.byEntity[e.id] ?? 0;
    return row;
  });
  const yoyChart = rows.map((e) => ({ entity: e.name, Current: e.current.revenue, Previous: e.previous?.revenue ?? 0 }));

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const quarterCols = quarters.map((q, i) => ({ key: `q${i}`, label: q.label, format: "amount" as const }));
    const columns = [
      { key: "entity", label: "Entity" },
      { key: "revenue", label: "Current Revenue", format: "amount" as const },
      ...(showComparison
        ? [
            { key: "previous", label: `Revenue ${comparisonLabel}`, format: "amount" as const },
            { key: "growth", label: "Growth", format: "percent" as const },
          ]
        : []),
      { key: "share", label: "Share of Group", format: "percent" as const },
      ...quarterCols,
    ];
    return {
      title: "Entity Revenue Comparison",
      scope: "group",
      period: getPeriodEndLabel(r.periodType, r.period, r.year),
      ...exportMeta(data),
      notes: [...data.notes, ...(quarters.length ? ["Quarter columns cover the last 12 months and include other income."] : [])],
      summary: [
        { label: "Total Group Revenue", value: totalRevenue, format: "amount" },
        ...(overallGrowth != null ? [{ label: `Growth vs ${comparisonLabel}`, value: Math.round(overallGrowth * 10) / 10, format: "percent" as const }] : []),
        ...(top ? [{ label: "Top Performer", value: top.name }] : []),
      ],
      columns,
      sections: [
        {
          rows: [
            ...rows.map((e) => {
              const cells: Record<string, string | number | null> = {
                entity: e.name,
                revenue: e.current.revenue,
                previous: e.previous?.revenue ?? null,
                growth: e.growth.revenue,
                share: Math.round(share(e.current.revenue) * 10) / 10,
              };
              quarters.forEach((q, i) => { cells[`q${i}`] = q.byEntity[e.id] ?? 0; });
              return { cells };
            }),
            {
              kind: "total" as const,
              cells: {
                entity: "Total",
                revenue: totalRevenue,
                previous: data.totals.previousRevenue,
                growth: overallGrowth != null ? Math.round(overallGrowth * 10) / 10 : null,
                share: totalRevenue ? 100 : null,
                ...Object.fromEntries(quarters.map((q, i) => [`q${i}`, Object.values(q.byEntity).reduce((s, v) => s + v, 0)])),
              },
            },
          ],
        },
      ],
      landscape: columns.length > 6,
    };
  };

  return (
    <GroupReportShell
      title="Entity Revenue Comparison"
      description="Compare revenue performance across all group entities"
      getPayload={buildExport}
      loading={r.isLoading || !data}
      error={r.error}
      meta={data}
      controls={<ComparisonControls r={r} />}
    >
      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard
              label="Total Group Revenue"
              value={fmtCompact(totalRevenue, sym)}
              {...(overallGrowth != null
                ? { sub: `${growthText(overallGrowth)} vs ${comparisonLabel}`, subTone: overallGrowth >= 0 ? ("up" as const) : ("down" as const) }
                : showComparison ? { sub: `No revenue in ${comparisonLabel}` } : {})}
            />
            <KPICard
              label="Top Performer"
              value={top && top.current.revenue ? top.name : "—"}
              sub={top && top.current.revenue ? `${fmtCompact(top.current.revenue, sym)} · ${share(top.current.revenue).toFixed(1)}% of group` : undefined}
            />
            <KPICard
              label="Fastest Growing"
              value={fastest ? fastest.name : "—"}
              {...(fastest
                ? { sub: `${growthText(fastest.growth.revenue)} vs ${comparisonLabel}`, subTone: (fastest.growth.revenue ?? 0) >= 0 ? ("up" as const) : ("down" as const) }
                : { sub: showComparison ? "No prior-period revenue to compare" : "Turn on comparison to see growth" })}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800">Quarterly Revenue Trend</p>
              <p className="text-xs text-slate-500 mb-4">Last 12 months, including other income</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quarterChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtStatement(v, sym), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rows.map((e, i) => (
                    <Bar key={e.id} dataKey={e.name} stackId="rev" fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">
                {showComparison ? `Current vs ${comparisonLabel}` : "Revenue by Entity"}
              </p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yoyChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
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
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Detailed Entity Breakdown</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={cn(th, "text-left")}>Entity</th>
                    <th className={cn(th, "text-right")}>Current Revenue</th>
                    {showComparison && <th className={cn(th, "text-right")}>{comparisonLabel}</th>}
                    {showComparison && <th className={cn(th, "text-right")}>Growth</th>}
                    <th className={cn(th, "text-right")}>Share of Group</th>
                    {quarters.map((q) => <th key={q.label} className={cn(th, "text-right")}>{q.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={5 + quarters.length} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No entities to compare.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {rows.map((e, i) => (
                        <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3 text-sm text-slate-800">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ENTITY_COLORS[i % ENTITY_COLORS.length] }} />
                              {e.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-700">{fmtStatement(e.current.revenue, sym)}</td>
                          {showComparison && <td className="px-4 py-3 text-right text-sm text-slate-600">{fmtStatement(e.previous?.revenue ?? 0, sym)}</td>}
                          {showComparison && (
                            <td className={cn("px-4 py-3 text-right text-sm", (e.growth.revenue ?? 0) >= 0 ? "text-green-600" : "text-red-500", e.growth.revenue == null && "text-slate-400")}>
                              {growthText(e.growth.revenue)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-sm text-slate-500">{share(e.current.revenue).toFixed(1)}%</td>
                          {quarters.map((q) => (
                            <td key={q.label} className="px-4 py-3 text-right text-sm text-slate-600">{fmtStatement(q.byEntity[e.id] ?? 0, sym)}</td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totalRevenue, sym)}</td>
                        {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(data.totals.previousRevenue ?? 0, sym)}</td>}
                        {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{growthText(overallGrowth)}</td>}
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{totalRevenue ? "100.0%" : "—"}</td>
                        {quarters.map((q) => (
                          <td key={q.label} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                            {fmtStatement(Object.values(q.byEntity).reduce((s, v) => s + v, 0), sym)}
                          </td>
                        ))}
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
