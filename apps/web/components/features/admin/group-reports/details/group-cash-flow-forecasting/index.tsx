"use client";
import React, { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useGroupCashFlowForecast } from "@/lib/api/hooks/useGroupReports";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import {
  ENTITY_COLORS,
  GroupReportShell,
  KPICard,
  exportMeta,
  fmtCompact,
  fmtStatement,
  tooltipStyle,
} from "../shared";

const HORIZONS = [3, 6, 12, 24];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="font-semibold text-slate-800 mb-4">{title}</p>
      {children}
    </div>
  );
}

function BreakdownList({ items, total, sym }: { items: { label: string; value: number }[]; total: number; sym: string }) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => {
        const share = total ? (i.value / total) * 100 : 0;
        return (
          <div key={i.label} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-slate-700">{i.label}</span>
              <span className="font-medium text-slate-900">{fmtStatement(i.value, sym)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Math.max(share, 0), 100)}%` }} />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between text-sm border-t border-slate-100 pt-3">
        <span className="font-semibold text-slate-900">Total</span>
        <span className="font-semibold text-slate-900">{fmtStatement(total, sym)}</span>
      </div>
    </div>
  );
}

export default function GroupCashFlowForecasting() {
  const [months, setMonths] = useState(12);
  const { data: raw, isLoading, error } = useGroupCashFlowForecast(months);
  const data = raw?.data ?? null;
  const sym = data?.currency.symbol ?? "";

  const buildExport = (): ReportExportPayload | null => {
    if (!data) return null;
    const m = data.method;
    return {
      title: "Group Cash Flow Forecasting",
      scope: "group",
      period: `${months}-month forecast from ${fmtDate(data.asOfDate)}`,
      ...exportMeta(data),
      notes: [
        ...data.notes,
        m
          ? `Method: open invoices and bills in the month they fall due (overdue items in the first month), plus recurring flows at the ${m.lookbackMonths}-month average of each entity's receipts, expenses and payroll (${fmtDate(m.lookbackStart)} – ${fmtDate(m.lookbackEnd)}).`
          : "",
      ].filter(Boolean),
      summary: [
        { label: "Current Cash", value: data.summary.currentCash, format: "amount" },
        { label: "Forecast Inflows", value: data.summary.totalInflows, format: "amount" },
        { label: "Forecast Outflows", value: data.summary.totalOutflows, format: "amount" },
        { label: `Cash in ${months} Months`, value: data.summary.endingCash, format: "amount" },
      ],
      columns: [
        { key: "month", label: "Month" },
        { key: "opening", label: "Opening Cash", format: "amount" },
        { key: "receivables", label: "Receivables", format: "amount" },
        { key: "recurringIn", label: "Recurring In", format: "amount" },
        { key: "payables", label: "Payables", format: "amount" },
        { key: "recurringOut", label: "Recurring Out", format: "amount" },
        { key: "net", label: "Net", format: "amount" },
        { key: "closing", label: "Closing Cash", format: "amount" },
      ],
      sections: [
        {
          title: "Monthly Forecast",
          rows: data.buckets.map((b) => ({
            cells: {
              month: b.label,
              opening: b.openingCash,
              receivables: b.inflows.receivables,
              recurringIn: b.inflows.recurring,
              payables: b.outflows.payables,
              recurringOut: b.outflows.recurring,
              net: b.net,
              closing: b.closingCash,
            },
          })),
        },
        {
          title: "Entity Cash Position",
          columns: [
            { key: "entity", label: "Entity" },
            { key: "current", label: "Current Cash", format: "amount" },
            { key: "inflows", label: "Inflows", format: "amount" },
            { key: "outflows", label: "Outflows", format: "amount" },
            { key: "ending", label: "Ending Cash", format: "amount" },
            { key: "lowest", label: "Lowest Point", format: "amount" },
            { key: "status", label: "Status" },
          ],
          rows: data.entityForecasts.map((e) => ({
            cells: {
              entity: e.name,
              current: e.currentCash,
              inflows: e.totalInflows,
              outflows: e.totalOutflows,
              ending: e.endingCash,
              lowest: e.lowestCash,
              status: e.atRisk ? "At risk" : "Healthy",
            },
          })),
        },
      ],
      landscape: true,
    };
  };

  return (
    <GroupReportShell
      title="Group Cash Flow Forecasting"
      description="Projected cash position across all entities"
      getPayload={buildExport}
      loading={isLoading || !data}
      error={error}
      meta={data}
      controls={
        <div className="flex flex-wrap items-center gap-3">
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-40 h-9 text-sm bg-gray-100 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HORIZONS.map((h) => (
                <SelectItem key={h} value={String(h)}>Next {h} months</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {data && (() => {
        const entities = data.entityForecasts;
        const positionData = [
          { label: "Now", cash: data.summary.currentCash },
          ...data.buckets.map((b) => ({ label: b.label, cash: b.closingCash })),
        ];
        const flowsData = data.buckets.map((b) => ({ label: b.label, Inflows: b.inflows.total, Outflows: b.outflows.total }));
        const entityLines = [
          { label: "Now", ...Object.fromEntries(entities.map((e) => [e.id, e.currentCash])) },
          ...data.buckets.map((b) => ({ label: b.label, ...b.closingByEntity })),
        ];
        const m = data.method;
        const atRisk = entities.filter((e) => e.atRisk);

        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard label="Current Cash" value={fmtCompact(data.summary.currentCash, sym)} />
              <KPICard label="Forecast Inflows" value={fmtCompact(data.summary.totalInflows, sym)} sub={`Overdue receivables ${fmtCompact(data.summary.overdueReceivables, sym)}`} />
              <KPICard label="Forecast Outflows" value={fmtCompact(data.summary.totalOutflows, sym)} sub={`Overdue payables ${fmtCompact(data.summary.overduePayables, sym)}`} />
              <KPICard
                label={`Cash in ${months} Months`}
                value={fmtCompact(data.summary.endingCash, sym)}
                sub={`${data.summary.netChange >= 0 ? "+" : ""}${fmtCompact(data.summary.netChange, sym)} net change`}
                subTone={data.summary.netChange >= 0 ? "up" : "down"}
              />
            </div>

            {m && (
              <p className="text-xs text-slate-500">
                Forecast method: each entity&apos;s open invoices and bills fall in the month they are due (overdue items in the first month),
                plus recurring flows at the {m.lookbackMonths}-month average of its receipts, expenses and payroll
                ({fmtDate(m.lookbackStart)} – {fmtDate(m.lookbackEnd)}).
              </p>
            )}

            <ChartCard title={`${months}-Month Cash Position Forecast`}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={positionData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4152b6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4152b6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => [fmtStatement(v, sym), "Cash"]} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="cash" stroke="#4152b6" strokeWidth={2} fill="url(#cashFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Monthly Cash Flows">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={flowsData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => fmtStatement(v, sym)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Inflows" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Outflows" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
              <ChartCard title="Entity Cash Position Forecast">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={entityLines} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                    <Tooltip {...tooltipStyle} formatter={(v: number, id: string) => [fmtStatement(v, sym), entities.find((e) => e.id === id)?.name ?? id]} />
                    <Legend wrapperStyle={{ fontSize: 12 }} formatter={(id: string) => entities.find((e) => e.id === id)?.name ?? id} />
                    <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                    {entities.map((e, i) => (
                      <Line key={e.id} type="monotone" dataKey={e.id} stroke={ENTITY_COLORS[i % ENTITY_COLORS.length]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ChartCard title="Forecasted Cash Inflows Breakdown">
                <BreakdownList
                  sym={sym}
                  total={data.summary.totalInflows}
                  items={[
                    { label: "Open invoices (receivables)", value: data.inflowBreakdown.receivables },
                    { label: "Recurring income (run-rate)", value: data.inflowBreakdown.recurring },
                  ]}
                />
              </ChartCard>
              <ChartCard title="Forecasted Cash Outflows Breakdown">
                <BreakdownList
                  sym={sym}
                  total={data.summary.totalOutflows}
                  items={[
                    { label: "Open bills (payables)", value: data.outflowBreakdown.payables },
                    { label: "Recurring expenses (run-rate)", value: data.outflowBreakdown.recurringExpenses },
                    { label: "Payroll (run-rate)", value: data.outflowBreakdown.recurringPayroll },
                  ]}
                />
              </ChartCard>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">Cash Flow Risk Analysis</p>
                {atRisk.length > 0 ? (
                  <span className="flex items-center gap-1.5 text-sm text-red-600">
                    <AlertTriangle className="w-4 h-4" /> {atRisk.length} {atRisk.length === 1 ? "entity" : "entities"} at risk of a cash shortfall
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> No entity is projected to run out of cash
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Entity", "Current Cash", "Inflows", "Outflows", "Ending Cash", "Lowest Point", "Status"].map((h, i) => (
                        <th key={h} className={cn("px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide", i ? "text-right" : "text-left")}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entities.map((e) => (
                      <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-sm text-slate-800">{e.name}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(e.currentCash, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(e.totalInflows, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{fmtStatement(e.totalOutflows, sym)}</td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{fmtStatement(e.endingCash, sym)}</td>
                        <td className={cn("px-5 py-3 text-right text-sm", e.lowestCash < 0 ? "text-red-600" : "text-slate-700")}>
                          {fmtStatement(e.lowestCash, sym)}
                          {e.lowestCashMonth && <span className="block text-xs text-slate-400">{e.lowestCashMonth}</span>}
                        </td>
                        <td className="px-5 py-3 text-right text-sm">
                          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", e.atRisk ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700")}>
                            {e.atRisk ? "At risk" : "Healthy"}
                          </span>
                        </td>
                      </tr>
                    ))}
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
