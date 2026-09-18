"use client";
import React from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useGroupBalanceSheet } from "@/lib/api/hooks/useGroupReports";
import type { GroupBalanceSheetData, GroupSection } from "@/lib/api/services/groupReportService";
import type { ReportExportPayload, ReportExportRow } from "@/lib/reports/export-types";
import { useAsOfPeriod } from "../consolidated-balance-sheet";
import {
  GroupReportShell,
  KPICard,
  exportMeta,
  fmtCompact,
  fmtStatement,
  tooltipStyle,
} from "../shared";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function ratios(d: GroupBalanceSheetData) {
  const currentAssets = d.assets.current.total;
  const currentLiabilities = d.liabilities.current.total;
  const equity = d.equity.total.total;
  return {
    workingCapital: currentAssets - currentLiabilities,
    currentRatio: currentLiabilities ? currentAssets / currentLiabilities : null,
    debtToEquity: equity ? d.liabilities.total.total / equity : null,
    equityRatio: d.assets.total.total ? (equity / d.assets.total.total) * 100 : null,
  };
}

function BreakdownTable({
  title,
  groups,
  total,
  sym,
}: {
  title: string;
  groups: GroupSection[];
  total: { label: string; value: number };
  sym: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="font-semibold text-slate-900">{title}</p>
      </div>
      <table className="w-full">
        <tbody>
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <tr className="border-t border-slate-100 bg-slate-50/40">
                <td className="px-5 py-3 text-sm font-semibold text-slate-800">{g.label}</td>
                <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtStatement(g.total, sym)}</td>
              </tr>
              {g.lines.map((l) => (
                <tr key={l.key} className="border-t border-slate-50">
                  <td className="px-5 py-2.5 pl-9 text-sm text-slate-700">{l.name}</td>
                  <td className="px-5 py-2.5 text-right text-sm text-slate-700">{fmtStatement(l.total, sym)}</td>
                </tr>
              ))}
            </React.Fragment>
          ))}
          <tr className="border-t border-slate-300 bg-slate-50/80">
            <td className="px-5 py-3 text-sm font-bold text-slate-900">{total.label}</td>
            <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">{fmtStatement(total.value, sym)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ConsolidatedFinancialPosition() {
  const { asOfDate, compareAsOfDate, filter } = useAsOfPeriod();
  const { data: raw, isLoading, error } = useGroupBalanceSheet({ asOfDate, compareAsOfDate });
  const data = raw?.data ?? null;
  const sym = data?.currency.symbol ?? "";
  const periodLabel = `As of ${fmtDate(asOfDate)}`;
  const compareLabel = compareAsOfDate ? fmtDate(compareAsOfDate) : "Previous";
  const entities = data?.entities.filter((e) => e.included) ?? [];

  const equityGroup = (d: GroupBalanceSheetData): GroupSection => ({
    label: "Equity",
    lines: [
      ...d.equity.sections.flatMap((s) => s.lines),
      { key: "retained", code: "", name: "Retained Earnings", ...d.equity.retainedEarnings },
    ],
    ...d.equity.total,
  });

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const r = ratios(data);
    const breakdownRows = (groups: GroupSection[]): ReportExportRow[] =>
      groups.flatMap((g) => [
        { kind: "header" as const, cells: { name: g.label, amount: g.total, previous: g.comparison } },
        ...g.lines.map((l) => ({ indent: 1, cells: { name: l.name, amount: l.total, previous: l.comparison } })),
      ]);
    const cols = [
      { key: "name", label: "Line" },
      { key: "amount", label: periodLabel, format: "amount" as const },
      { key: "previous", label: compareLabel, format: "amount" as const },
    ];
    return {
      title: "Consolidated Financial Position",
      scope: "group",
      period: periodLabel,
      ...exportMeta(data),
      summary: [
        { label: "Total Assets", value: data.assets.total.total, format: "amount" },
        { label: "Total Liabilities", value: data.liabilities.total.total, format: "amount" },
        { label: "Total Equity", value: data.equity.total.total, format: "amount" },
        { label: "Working Capital", value: r.workingCapital, format: "amount" },
        { label: "Current Ratio", value: r.currentRatio === null ? "—" : `${r.currentRatio.toFixed(2)}:1` },
        { label: "Debt to Equity", value: r.debtToEquity === null ? "—" : `${r.debtToEquity.toFixed(2)}x` },
      ],
      columns: cols,
      sections: [
        {
          title: "Assets",
          rows: [
            ...breakdownRows([data.assets.current, data.assets.nonCurrent]),
            { kind: "total", cells: { name: "Total Assets", amount: data.assets.total.total, previous: data.assets.total.comparison } },
          ],
        },
        {
          title: "Liabilities & Equity",
          rows: [
            ...breakdownRows([data.liabilities.current, data.liabilities.longTerm, equityGroup(data)]),
            { kind: "total", cells: { name: "Total Liabilities & Equity", amount: data.totalLiabilitiesAndEquity.total, previous: data.totalLiabilitiesAndEquity.comparison } },
          ],
        },
        {
          title: "Position by Entity",
          columns: [
            { key: "entity", label: "Entity" },
            { key: "assets", label: "Assets", format: "amount" },
            { key: "liabilities", label: "Liabilities", format: "amount" },
            { key: "equity", label: "Equity", format: "amount" },
          ],
          rows: entities.map((e) => ({
            cells: {
              entity: e.name,
              assets: data.assets.total.byEntity[e.id] ?? 0,
              liabilities: data.liabilities.total.byEntity[e.id] ?? 0,
              equity: data.equity.total.byEntity[e.id] ?? 0,
            },
          })),
        },
      ],
    };
  };

  return (
    <GroupReportShell
      title="Consolidated Financial Position"
      description="Overview of group assets, liabilities and equity"
      getPayload={buildExport}
      loading={isLoading || !data}
      error={error}
      meta={data}
      controls={<div className="flex flex-wrap items-center gap-3">{filter}</div>}
    >
      {data && (() => {
        const r = ratios(data);
        const assetComposition = [
          { name: "Current Assets", value: Math.max(data.assets.current.total, 0), color: "#4152b6" },
          { name: "Non-Current Assets", value: Math.max(data.assets.nonCurrent.total, 0), color: "#8b93dd" },
        ];
        const structure = [
          { name: "Current Liabilities", value: Math.max(data.liabilities.current.total, 0), color: "#ef4444" },
          { name: "Long-Term Liabilities", value: Math.max(data.liabilities.longTerm.total, 0), color: "#fca5a5" },
          { name: "Equity", value: Math.max(data.equity.total.total, 0), color: "#10b981" },
        ];
        const comparison = [
          { category: "Assets", current: data.assets.total.total, previous: data.assets.total.comparison },
          { category: "Liabilities", current: data.liabilities.total.total, previous: data.liabilities.total.comparison },
          { category: "Equity", current: data.equity.total.total, previous: data.equity.total.comparison },
        ];
        const pie = (items: typeof structure) =>
          items.some((i) => i.value > 0) ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95}>
                  {items.map((i) => <Cell key={i.name} fill={i.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [fmtCompact(v, sym), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Nothing recorded yet.</p>
          );

        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Total Assets" value={fmtCompact(data.assets.total.total, sym)} />
              <KPICard label="Total Equity" value={fmtCompact(data.equity.total.total, sym)} sub={r.equityRatio === null ? undefined : `${r.equityRatio.toFixed(1)}% of assets`} />
              <KPICard
                label="Working Capital"
                value={fmtCompact(r.workingCapital, sym)}
                sub={r.currentRatio === null ? "No current liabilities" : `Current ratio ${r.currentRatio.toFixed(2)}:1`}
                subTone={r.currentRatio === null ? "neutral" : r.currentRatio >= 1 ? "up" : "down"}
              />
              <KPICard
                label="Debt to Equity"
                value={r.debtToEquity === null ? "—" : `${r.debtToEquity.toFixed(2)}x`}
                sub={`Liabilities ${fmtCompact(data.liabilities.total.total, sym)}`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Asset Composition</p>
                {pie(assetComposition)}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Financial Structure</p>
                {pie(structure)}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <p className="font-semibold text-slate-800 mb-4">Period Comparison</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparison} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => fmtCompact(v, sym)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="previous" name={compareLabel} fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="current" name={fmtDate(asOfDate)} fill="#4152b6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BreakdownTable
                title="Assets Breakdown"
                groups={[data.assets.current, data.assets.nonCurrent]}
                total={{ label: "Total Assets", value: data.assets.total.total }}
                sym={sym}
              />
              <BreakdownTable
                title="Liabilities & Equity Breakdown"
                groups={[data.liabilities.current, data.liabilities.longTerm, equityGroup(data)]}
                total={{ label: "Total Liabilities & Equity", value: data.totalLiabilitiesAndEquity.total }}
                sym={sym}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="font-semibold text-slate-900">Position by Entity</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Entity", "Assets", "Liabilities", "Equity", "Share of Group Assets"].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${i ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((e) => {
                      const assets = data.assets.total.byEntity[e.id] ?? 0;
                      return (
                        <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-800">{e.name}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(assets, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(data.liabilities.total.byEntity[e.id] ?? 0, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(data.equity.total.byEntity[e.id] ?? 0, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-500">
                            {data.assets.total.total ? `${((assets / data.assets.total.total) * 100).toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      })()}
    </GroupReportShell>
  );
}
