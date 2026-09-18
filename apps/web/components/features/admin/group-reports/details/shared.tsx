"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { ReportExportButtons } from "@/components/features/user/reports/ReportExportButtons";
import type { ReportExportPayload, ReportExportRow } from "@/lib/reports/export-types";
import type { GroupAmount, GroupReportMeta, GroupSection } from "@/lib/api/services/groupReportService";

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Statement-style amount: negatives in brackets, zero as a dash */
export function fmtStatement(amount: number, sym: string): string {
  if (!amount) return "—";
  const s = fmtAmount(Math.abs(amount), sym);
  return amount < 0 ? `(${s})` : s;
}

export function fmtCompact(amount: number, sym: string): string {
  const abs = Math.abs(amount);
  let str: string;
  if (abs >= 1_000_000_000) str = `${sym}${(abs / 1_000_000_000).toFixed(1)}B`;
  else if (abs >= 1_000_000) str = `${sym}${(abs / 1_000_000).toFixed(1)}M`;
  else if (abs >= 1_000) str = `${sym}${(abs / 1_000).toFixed(0)}K`;
  else str = `${sym}${abs.toLocaleString("en")}`;
  return amount < 0 ? `-${str}` : str;
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export const ENTITY_COLORS = [
  "#4152b6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#64748b",
];

export const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

// ─── Page shell ───────────────────────────────────────────────────────────────

export function GroupReportShell({
  title,
  description,
  getPayload,
  loading,
  error,
  controls,
  meta,
  children,
}: {
  title: string;
  description: string;
  getPayload: () => ReportExportPayload | null;
  loading: boolean;
  error?: unknown;
  controls?: React.ReactNode;
  meta?: GroupReportMeta | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Group Reports
          </button>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {description}
            {meta?.currency?.code ? ` · Amounts in ${meta.currency.code}` : ""}
          </p>
        </div>
        <div className="sm:mt-7">
          <ReportExportButtons getPayload={getPayload} disabled={loading} />
        </div>
      </div>

      {controls}

      {meta && <GroupCurrencyBanner meta={meta} />}

      {error ? (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-100 bg-red-50 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error instanceof Error ? error.message : "Failed to load this report."}</span>
        </div>
      ) : loading ? (
        <ReportSkeleton />
      ) : (
        children
      )}
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

/**
 * Missing exchange rates (entity left out of the figures) and which rates were
 * used. Group reports are always in the group base currency.
 */
export function GroupCurrencyBanner({ meta }: { meta: GroupReportMeta }) {
  const excluded = meta.entities.filter((e) => !e.included);
  return (
    <>
      {meta.warnings.length > 0 && (
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 text-amber-600 shrink-0" />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold text-amber-800">
                {excluded.length > 0
                  ? `${excluded.length} ${excluded.length === 1 ? "entity is" : "entities are"} not included in these figures`
                  : "Currency setup needs attention"}
              </p>
              {meta.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href="/admin/settings">Add conversion rate</Link>
          </Button>
        </div>
      )}
      {meta.notes.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 shrink-0" />
          <span>{meta.notes.join(" ")}</span>
        </div>
      )}
    </>
  );
}

export function KPICard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && (
        <p
          className={cn(
            "text-xs",
            subTone === "up" && "text-green-600",
            subTone === "down" && "text-red-500",
            (!subTone || subTone === "neutral") && "text-slate-500",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

export function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn("rounded-xl", active && "bg-primary/10 border-primary/30 text-primary")}
    >
      {children}
    </Button>
  );
}

// ─── Statement table (sections × entities) ────────────────────────────────────

export interface StatementBlock {
  /** Expandable section with account lines */
  section?: GroupSection;
  /** Or a single computed row (subtotal / total) */
  row?: { label: string; amount: GroupAmount; kind: "subtotal" | "total" };
  /** Costs: a decrease is favourable, so variance colours are inverted */
  lowerIsBetter?: boolean;
}

const th = "px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap";

/**
 * Consolidated statement with optional per-entity columns and comparison +
 * variance. Every amount is already in the group base currency.
 */
export function GroupStatementTable({
  title,
  blocks,
  meta,
  sym,
  showEntities,
  showComparison,
  comparisonLabel,
  currentLabel = "Consolidated",
}: {
  title: string;
  blocks: StatementBlock[];
  meta: GroupReportMeta;
  sym: string;
  showEntities: boolean;
  showComparison: boolean;
  comparisonLabel: string;
  currentLabel?: string;
}) {
  const entities = meta.entities.filter((e) => e.included);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (label: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const amountCells = (a: GroupAmount, bold = false, lowerIsBetter = false) => {
    const variance = a.total - a.comparison;
    const favourable = lowerIsBetter ? variance < 0 : variance > 0;
    const adverse = lowerIsBetter ? variance > 0 : variance < 0;
    const cls = cn("px-4 py-3 text-right text-sm whitespace-nowrap", bold ? "font-semibold text-slate-900" : "text-slate-700");
    return (
      <>
        {showEntities &&
          entities.map((e) => (
            <td key={e.id} className={cls}>{fmtStatement(a.byEntity[e.id] ?? 0, sym)}</td>
          ))}
        <td className={cn(cls, "bg-slate-50/60")}>{fmtStatement(a.total, sym)}</td>
        {showComparison && (
          <>
            <td className={cls}>{fmtStatement(a.comparison, sym)}</td>
            <td className={cn(cls, favourable && "text-green-600", adverse && "text-red-500")}>
              {fmtStatement(variance, sym)}
            </td>
          </>
        )}
      </>
    );
  };

  const colCount = 1 + (showEntities ? entities.length : 0) + 1 + (showComparison ? 2 : 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="font-semibold text-slate-900">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={cn(th, "text-left")}>Account</th>
              {showEntities && entities.map((e) => <th key={e.id} className={cn(th, "text-right")}>{e.name}</th>)}
              <th className={cn(th, "text-right bg-slate-50/60")}>{currentLabel}</th>
              {showComparison && (
                <>
                  <th className={cn(th, "text-right")}>{comparisonLabel}</th>
                  <th className={cn(th, "text-right")}>Variance</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {blocks.map((block, i) => {
              if (block.row) {
                const isTotal = block.row.kind === "total";
                return (
                  <tr key={`row-${i}`} className={cn("border-t", isTotal ? "border-slate-300 bg-slate-50/80" : "border-slate-200")}>
                    <td className={cn("px-4 py-3 text-sm", isTotal ? "font-bold text-slate-900" : "font-semibold text-slate-900")}>
                      {block.row.label}
                    </td>
                    {amountCells(block.row.amount, true, block.lowerIsBetter)}
                  </tr>
                );
              }
              const section = block.section!;
              const open = !collapsed.has(section.label);
              return (
                <React.Fragment key={section.label}>
                  <tr className="border-t border-slate-100 bg-slate-50/40 cursor-pointer" onClick={() => toggle(section.label)}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {section.label}
                      </span>
                    </td>
                    {amountCells(section, true, block.lowerIsBetter)}
                  </tr>
                  {open && section.lines.length === 0 && (
                    <tr>
                      <td colSpan={colCount} className="px-10 py-2 text-xs text-slate-400">No activity</td>
                    </tr>
                  )}
                  {open &&
                    section.lines.map((line) => (
                      <tr key={line.key} className="border-t border-slate-50 hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 pl-10 text-sm text-slate-700">{line.name}</td>
                        {amountCells(line, false, block.lowerIsBetter)}
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

/** Columns for a statement export mirroring GroupStatementTable */
export function statementExportColumns(
  meta: GroupReportMeta,
  showEntities: boolean,
  showComparison: boolean,
  comparisonLabel: string,
  currentLabel = "Consolidated",
) {
  const entities = meta.entities.filter((e) => e.included);
  return [
    { key: "name", label: "Account" },
    ...(showEntities ? entities.map((e) => ({ key: `e_${e.id}`, label: e.name, format: "amount" as const })) : []),
    { key: "total", label: currentLabel, format: "amount" as const },
    ...(showComparison
      ? [
          { key: "comparison", label: comparisonLabel, format: "amount" as const },
          { key: "variance", label: "Variance", format: "amount" as const },
        ]
      : []),
  ];
}

function amountExportCells(a: GroupAmount, showComparison: boolean) {
  const cells: ReportExportRow["cells"] = { total: a.total };
  for (const [id, v] of Object.entries(a.byEntity)) cells[`e_${id}`] = v;
  if (showComparison) {
    cells.comparison = a.comparison;
    cells.variance = a.total - a.comparison;
  }
  return cells;
}

export function statementExportRows(blocks: StatementBlock[], showComparison: boolean): ReportExportRow[] {
  const rows: ReportExportRow[] = [];
  for (const block of blocks) {
    if (block.row) {
      rows.push({ kind: block.row.kind, cells: { name: block.row.label, ...amountExportCells(block.row.amount, showComparison) } });
      continue;
    }
    const s = block.section!;
    rows.push({ kind: "header", cells: { name: s.label, ...amountExportCells(s, showComparison) } });
    for (const line of s.lines) {
      rows.push({ indent: 1, cells: { name: line.name, ...amountExportCells(line, showComparison) } });
    }
  }
  return rows;
}

/** Warnings / notes carried into every export so a PDF never hides an exclusion */
export function exportMeta(meta: GroupReportMeta) {
  return { currency: meta.currency.code, warnings: meta.warnings, notes: meta.notes };
}
