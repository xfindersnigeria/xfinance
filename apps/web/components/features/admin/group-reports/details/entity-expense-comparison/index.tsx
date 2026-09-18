"use client";
import React, { useMemo } from "react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { EntityComparisonData } from "@/lib/api/services/groupReportService";
import type { ReportExportPayload, ReportExportRow } from "@/lib/reports/export-types";
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
import { growthText, monthlyChartRows, useEntityComparisonReport } from "../entity-revenue-comparison/comparison-utils";
import { ComparisonControls } from "../entity-revenue-comparison/ComparisonControls";

const th = "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";
const pct = (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`);
const SECTION_ORDER = ["Cost of Goods Sold", "Operating Expenses", "Other Expenses"];

interface MergedLine {
  key: string;
  code: string;
  name: string;
  byEntity: Record<string, number>;
  total: number;
  comparison: number;
}

/**
 * Per-account expense lines across entities. Account codes are allocated per
 * entity, so lines merge only when both code and name match (same rule as the
 * consolidated statements on the server).
 */
function mergeExpenseLines(data: EntityComparisonData) {
  const sections = new Map<string, Map<string, MergedLine>>();
  for (const row of data.rows) {
    for (const l of row.expenseLines) {
      const lines = sections.get(l.section) ?? new Map<string, MergedLine>();
      sections.set(l.section, lines);
      const key = `${l.code}|${l.name.trim().toLowerCase()}`;
      const line = lines.get(key) ?? { key, code: l.code, name: l.name, byEntity: {}, total: 0, comparison: 0 };
      line.byEntity[row.id] = (line.byEntity[row.id] ?? 0) + l.amount;
      line.total += l.amount;
      line.comparison += l.comparison;
      lines.set(key, line);
    }
  }
  return SECTION_ORDER.filter((s) => sections.has(s)).map((label) => {
    const lines = [...sections.get(label)!.values()]
      .filter((l) => l.total !== 0 || l.comparison !== 0)
      .sort((a, b) => a.code.localeCompare(b.code));
    const byEntity: Record<string, number> = {};
    for (const l of lines) for (const [id, v] of Object.entries(l.byEntity)) byEntity[id] = (byEntity[id] ?? 0) + v;
    return {
      label,
      lines,
      byEntity,
      total: lines.reduce((s, l) => s + l.total, 0),
      comparison: lines.reduce((s, l) => s + l.comparison, 0),
    };
  });
}

export default function EntityExpenseComparison() {
  const r = useEntityComparisonReport();
  const { data, showComparison, comparisonLabel } = r;
  const sym = data?.currency.symbol ?? "";

  const rows = [...(data?.rows ?? [])].sort((a, b) => b.current.totalExpenses - a.current.totalExpenses);
  const totals = data?.totals;
  const totalExpenses = totals?.totalExpenses ?? 0;
  const expenseGrowth = totals && showComparison ? pctChange(totalExpenses, totals.previousTotalExpenses ?? 0) : null;
  const groupExpenseRatio = totals && totals.revenue ? (totalExpenses / totals.revenue) * 100 : null;
  const highest = rows[0];
  const share = (v: number) => (totalExpenses ? (v / totalExpenses) * 100 : 0);

  const sections = useMemo(() => (data ? mergeExpenseLines(data) : []), [data]);

  const splitChart = rows.map((e) => ({
    entity: e.name,
    "Cost of Goods Sold": e.current.cogs,
    "Operating Expenses": e.current.operatingExpenses,
    "Other Expenses": e.current.otherExpenses,
  }));
  const trendChart = data ? monthlyChartRows(data, "expenses") : [];

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !totals) return null;
    const summaryColumns = [
      { key: "entity", label: "Entity" },
      { key: "cogs", label: "Cost of Goods Sold", format: "amount" as const },
      { key: "opex", label: "Operating Expenses", format: "amount" as const },
      { key: "other", label: "Other Expenses", format: "amount" as const },
      { key: "total", label: "Total Expenses", format: "amount" as const },
      ...(showComparison
        ? [
            { key: "previous", label: `Total ${comparisonLabel}`, format: "amount" as const },
            { key: "growth", label: "Change", format: "percent" as const },
          ]
        : []),
      { key: "ratio", label: "Expense Ratio", format: "percent" as const },
      { key: "share", label: "Share of Group", format: "percent" as const },
    ];
    const accountColumns = [
      { key: "name", label: "Account" },
      ...rows.map((e) => ({ key: `e_${e.id}`, label: e.name, format: "amount" as const })),
      { key: "total", label: "Group Total", format: "amount" as const },
      ...(showComparison ? [{ key: "comparison", label: comparisonLabel, format: "amount" as const }] : []),
    ];
    const accountRows: ReportExportRow[] = [];
    for (const s of sections) {
      accountRows.push({
        kind: "header",
        cells: { name: s.label, total: s.total, comparison: s.comparison, ...Object.fromEntries(rows.map((e) => [`e_${e.id}`, s.byEntity[e.id] ?? 0])) },
      });
      for (const l of s.lines) {
        accountRows.push({
          indent: 1,
          cells: { name: l.name, total: l.total, comparison: l.comparison, ...Object.fromEntries(rows.map((e) => [`e_${e.id}`, l.byEntity[e.id] ?? 0])) },
        });
      }
    }
    return {
      title: "Entity Expense Comparison",
      scope: "group",
      period: getPeriodEndLabel(r.periodType, r.period, r.year),
      ...exportMeta(data),
      summary: [
        { label: "Total Group Expenses", value: totalExpenses, format: "amount" },
        ...(expenseGrowth != null ? [{ label: `Change vs ${comparisonLabel}`, value: Math.round(expenseGrowth * 10) / 10, format: "percent" as const }] : []),
        ...(groupExpenseRatio != null ? [{ label: "Group Expense Ratio", value: Math.round(groupExpenseRatio * 10) / 10, format: "percent" as const }] : []),
        ...(highest ? [{ label: "Highest Spender", value: highest.name }] : []),
      ],
      columns: summaryColumns,
      sections: [
        {
          title: "Expenses by Entity",
          rows: [
            ...rows.map((e) => ({
              cells: {
                entity: e.name,
                cogs: e.current.cogs,
                opex: e.current.operatingExpenses,
                other: e.current.otherExpenses,
                total: e.current.totalExpenses,
                previous: e.previous?.totalExpenses ?? null,
                growth: e.growth.totalExpenses,
                ratio: e.current.expenseRatio,
                share: Math.round(share(e.current.totalExpenses) * 10) / 10,
              },
            })),
            {
              kind: "total" as const,
              cells: {
                entity: "Total",
                cogs: rows.reduce((s, e) => s + e.current.cogs, 0),
                opex: rows.reduce((s, e) => s + e.current.operatingExpenses, 0),
                other: rows.reduce((s, e) => s + e.current.otherExpenses, 0),
                total: totalExpenses,
                previous: totals.previousTotalExpenses,
                growth: expenseGrowth != null ? Math.round(expenseGrowth * 10) / 10 : null,
                ratio: groupExpenseRatio != null ? Math.round(groupExpenseRatio * 10) / 10 : null,
                share: totalExpenses ? 100 : null,
              },
            },
          ],
        },
        { title: "Expenses by Account", columns: accountColumns, rows: accountRows },
      ],
      landscape: true,
    };
  };

  return (
    <GroupReportShell
      title="Entity Expense Comparison"
      description="Compare spending across all group entities"
      getPayload={buildExport}
      loading={r.isLoading || !data}
      error={r.error}
      meta={data}
      controls={<ComparisonControls r={r} />}
    >
      {data && totals && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard
              label="Total Group Expenses"
              value={fmtCompact(totalExpenses, sym)}
              {...(expenseGrowth != null
                ? {
                    sub: `${growthText(expenseGrowth)} vs ${comparisonLabel}`,
                    // Rising costs are the unfavourable direction
                    subTone: expenseGrowth <= 0 ? ("up" as const) : ("down" as const),
                  }
                : showComparison ? { sub: `No expenses in ${comparisonLabel}` } : {})}
            />
            <KPICard
              label="Highest Spender"
              value={highest && highest.current.totalExpenses ? highest.name : "—"}
              sub={highest && highest.current.totalExpenses ? `${fmtCompact(highest.current.totalExpenses, sym)} · ${share(highest.current.totalExpenses).toFixed(1)}% of group` : undefined}
            />
            <KPICard label="Group Expense Ratio" value={pct(groupExpenseRatio)} sub="Total expenses ÷ group revenue" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Expense Mix by Entity</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={splitChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="entity" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtStatement(v, sym), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Cost of Goods Sold" stackId="exp" fill="#4152b6" />
                  <Bar dataKey="Operating Expenses" stackId="exp" fill="#10b981" />
                  <Bar dataKey="Other Expenses" stackId="exp" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800">Monthly Expense Trend</p>
              <p className="text-xs text-slate-500 mb-4">Last 12 months</p>
              <ResponsiveContainer width="100%" height={284}>
                <LineChart data={trendChart} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtStatement(v, sym), name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {rows.map((e, i) => (
                    <Line key={e.id} type="monotone" dataKey={e.name} stroke={ENTITY_COLORS[i % ENTITY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expenses by entity */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Expenses by Entity</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={cn(th, "text-left")}>Entity</th>
                    <th className={cn(th, "text-right")}>Cost of Goods Sold</th>
                    <th className={cn(th, "text-right")}>Operating Expenses</th>
                    <th className={cn(th, "text-right")}>Other Expenses</th>
                    <th className={cn(th, "text-right")}>Total Expenses</th>
                    {showComparison && <th className={cn(th, "text-right")}>{comparisonLabel}</th>}
                    {showComparison && <th className={cn(th, "text-right")}>Change</th>}
                    <th className={cn(th, "text-right")}>Expense Ratio</th>
                    <th className={cn(th, "text-right")}>Share of Group</th>
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
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.cogs, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.operatingExpenses, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-700">{fmtStatement(e.current.otherExpenses, sym)}</td>
                          <td className="px-4 py-3 text-right text-sm font-medium text-slate-800">{fmtStatement(e.current.totalExpenses, sym)}</td>
                          {showComparison && <td className="px-4 py-3 text-right text-sm text-slate-600">{fmtStatement(e.previous?.totalExpenses ?? 0, sym)}</td>}
                          {showComparison && (
                            <td className={cn("px-4 py-3 text-right text-sm", (e.growth.totalExpenses ?? 0) <= 0 ? "text-green-600" : "text-red-500", e.growth.totalExpenses == null && "text-slate-400")}>
                              {growthText(e.growth.totalExpenses)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-sm text-slate-600">{pct(e.current.expenseRatio)}</td>
                          <td className="px-4 py-3 text-right text-sm text-slate-500">{share(e.current.totalExpenses).toFixed(1)}%</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(rows.reduce((s, e) => s + e.current.cogs, 0), sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(rows.reduce((s, e) => s + e.current.operatingExpenses, 0), sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(rows.reduce((s, e) => s + e.current.otherExpenses, 0), sym)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totalExpenses, sym)}</td>
                        {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(totals.previousTotalExpenses ?? 0, sym)}</td>}
                        {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{growthText(expenseGrowth)}</td>}
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{pct(groupExpenseRatio)}</td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{totalExpenses ? "100.0%" : "—"}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expenses by account */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Expenses by Account</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className={cn(th, "text-left")}>Account</th>
                    {rows.map((e) => <th key={e.id} className={cn(th, "text-right")}>{e.name}</th>)}
                    <th className={cn(th, "text-right bg-slate-50/60")}>Group Total</th>
                    {showComparison && <th className={cn(th, "text-right")}>{comparisonLabel}</th>}
                  </tr>
                </thead>
                <tbody>
                  {sections.length === 0 ? (
                    <tr>
                      <td colSpan={rows.length + 3} className="px-5 py-16 text-center text-slate-400 text-sm">
                        No expenses recorded for this period.
                      </td>
                    </tr>
                  ) : (
                    sections.map((s) => (
                      <React.Fragment key={s.label}>
                        <tr className="border-t border-slate-100 bg-slate-50/40">
                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">{s.label}</td>
                          {rows.map((e) => (
                            <td key={e.id} className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(s.byEntity[e.id] ?? 0, sym)}</td>
                          ))}
                          <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 bg-slate-50/60">{fmtStatement(s.total, sym)}</td>
                          {showComparison && <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(s.comparison, sym)}</td>}
                        </tr>
                        {s.lines.map((l) => (
                          <tr key={l.key} className="border-t border-slate-50 hover:bg-slate-50/60">
                            <td className="px-4 py-2.5 pl-10 text-sm text-slate-700">{l.name}</td>
                            {rows.map((e) => (
                              <td key={e.id} className="px-4 py-2.5 text-right text-sm text-slate-700">{fmtStatement(l.byEntity[e.id] ?? 0, sym)}</td>
                            ))}
                            <td className="px-4 py-2.5 text-right text-sm text-slate-700 bg-slate-50/60">{fmtStatement(l.total, sym)}</td>
                            {showComparison && <td className="px-4 py-2.5 text-right text-sm text-slate-600">{fmtStatement(l.comparison, sym)}</td>}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
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
