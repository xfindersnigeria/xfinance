"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Download,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  plLineItems,
  kpiItems,
  PERIODS,
  PLItem,
  KPIItem,
  getAllSectionIds,
} from "./mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUARTER_END: Record<string, string> = {
  Q1: "March 31",
  Q2: "June 30",
  Q3: "September 30",
  Q4: "December 31",
};

function formatCurrency(value: number): string {
  return `₦${value.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getQuarterEndLabel(period: string): string {
  const [q, year] = period.split(" ");
  return `For the Quarter Ended ${QUARTER_END[q] ?? ""}, ${year}`;
}

// ─── Variance Cell ────────────────────────────────────────────────────────────

function VarianceCell({
  actual,
  comparison,
  percentOnly = false,
  light = false,
}: {
  actual: number;
  comparison: number;
  percentOnly?: boolean;
  light?: boolean;
}) {
  const variance = actual - comparison;
  const pct =
    comparison !== 0 ? (variance / Math.abs(comparison)) * 100 : 0;
  const isZero = variance === 0;
  const isPositive = variance > 0;

  if (isZero) {
    return (
      <div className={cn("text-right text-xs", light ? "text-gray-400" : "text-gray-400")}>
        {!percentOnly && <div>₦0.00</div>}
        <div>0.0%</div>
      </div>
    );
  }

  const colorCls = isPositive ? "text-green-500" : "text-red-500";
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? "+" : "";

  if (percentOnly) {
    return (
      <div className={cn("flex items-center justify-end gap-1 text-xs", colorCls)}>
        <Icon className="w-3 h-3" />
        <span>
          {sign}
          {pct.toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("text-right", colorCls)}>
      <div className="flex items-center justify-end gap-1 font-medium text-sm">
        <Icon className="w-3 h-3" />
        <span>
          {sign}
          {formatCurrency(Math.abs(variance))}
        </span>
      </div>
      <div className="text-[10px]">
        {sign}
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

// ─── Build Table Rows ─────────────────────────────────────────────────────────

function buildRows(
  items: PLItem[],
  depth: number,
  collapsed: Set<string>,
  toggleSection: (id: string) => void,
  showComparison: boolean
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];

  for (const item of items) {
    const indentPx = depth * 24 + 16;

    switch (item.type) {
      case "section": {
        const isCollapsed = collapsed.has(item.id);
        rows.push(
          <tr
            key={item.id}
            className="hover:bg-gray-50 cursor-pointer select-none"
            onClick={() => toggleSection(item.id)}
          >
            <td
              className="py-3 pr-4 text-sm font-semibold"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              <span className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-500" />
                )}
                {item.label}
              </span>
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium whitespace-nowrap">
              {formatCurrency(item.actual)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison)}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <VarianceCell actual={item.actual} comparison={item.comparison} />
                </td>
              </>
            )}
          </tr>
        );
        if (!isCollapsed && item.children?.length) {
          rows.push(
            ...buildRows(
              item.children,
              depth + 1,
              collapsed,
              toggleSection,
              showComparison
            )
          );
        }
        break;
      }

      case "item": {
        rows.push(
          <tr key={item.id} className="hover:bg-gray-50">
            <td
              className="py-2.5 pr-4 text-sm text-gray-700"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {item.label}
            </td>
            <td className="px-4 py-2.5 text-right text-sm whitespace-nowrap">
              {formatCurrency(item.actual)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-2.5 text-right text-sm text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison)}
                </td>
                <td className="px-4 py-2.5 min-w-[120px]">
                  <VarianceCell actual={item.actual} comparison={item.comparison} />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "subtotal": {
        const dActual = item.negativeDisplay
          ? `(${formatCurrency(item.actual)})`
          : formatCurrency(item.actual);
        const dComp = item.negativeDisplay
          ? `(${formatCurrency(item.comparison)})`
          : formatCurrency(item.comparison);
        rows.push(
          <tr key={item.id} className="border-t border-gray-300 bg-white">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap">
              {dActual}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-600 whitespace-nowrap">
                  {dComp}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <VarianceCell
                    actual={item.actual}
                    comparison={item.comparison}
                    percentOnly
                  />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "calculated": {
        rows.push(
          <tr key={item.id} className="border-y border-gray-300 bg-white">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap">
              {formatCurrency(item.actual)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison)}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <VarianceCell
                    actual={item.actual}
                    comparison={item.comparison}
                    percentOnly
                  />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "net": {
        const variance = item.actual - item.comparison;
        const pct =
          item.comparison !== 0
            ? (variance / Math.abs(item.comparison)) * 100
            : 0;
        const isPositive = variance >= 0;
        rows.push(
          <tr key={item.id} className="bg-[#0d1b2a]">
            <td className="px-4 py-4 text-sm font-bold text-white">
              {item.label}
            </td>
            <td className="px-4 py-4 text-right text-sm font-bold text-green-400 whitespace-nowrap">
              {formatCurrency(item.actual)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-4 text-right text-sm text-gray-300 whitespace-nowrap">
                  {formatCurrency(item.comparison)}
                </td>
                <td className="px-4 py-4 min-w-[120px]">
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-semibold",
                        isPositive
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      )}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </>
            )}
          </tr>
        );
        break;
      }
    }
  }

  return rows;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const BADGE_CLASSES: Record<KPIItem["badgeVariant"], string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  purple: "bg-purple-100 text-purple-700",
};

function KPICard({ item }: { item: KPIItem }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">{item.label}</span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
            BADGE_CLASSES[item.badgeVariant]
          )}
        >
          {item.showTrendIcon && <TrendingUp className="w-3 h-3" />}
          {item.badgeText}
        </span>
      </div>
      <p className={cn("text-xl font-semibold", item.valueColor ?? "text-gray-900")}>
        {formatCurrency(item.value)}
      </p>
      <p className="text-xs text-gray-500">
        Previous: {formatCurrency(item.previous)}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfitAndLoss() {
  const router = useRouter();
  const [period, setPeriod] = useState("Q3 2025");
  const [compareType, setCompareType] = useState<"period" | "budget">("period");
  const [comparePeriod, setComparePeriod] = useState("Q2 2025");
  const [showComparison, setShowComparison] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(getAllSectionIds(plLineItems))
  );

  const toggleSection = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const compareLabel = compareType === "period" ? comparePeriod : "Budget";
  const rows = buildRows(plLineItems, 0, collapsed, toggleSection, showComparison);

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Profit &amp; Loss Statement</h1>
          <p className="text-sm text-primary">
            Income statement showing revenue, expenses, and profitability
          </p>
        </div>
        <div className="flex items-center gap-2 mt-6 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Compare with:</span>
          <div className="flex rounded-xl border bg-gray-100 p-0.5">
            <button
              className={cn(
                "px-3 py-1 text-sm rounded-lg transition-all",
                compareType === "period"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setCompareType("period")}
            >
              Period
            </button>
            <button
              className={cn(
                "px-3 py-1 text-sm rounded-lg transition-all",
                compareType === "budget"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900"
              )}
              onClick={() => setCompareType("budget")}
            >
              Budget
            </button>
          </div>
        </div>

        {compareType === "period" && (
          <Select value={comparePeriod} onValueChange={setComparePeriod}>
            <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="default"
          size="sm"
          className="rounded-xl"
          onClick={() => setShowComparison((v) => !v)}
        >
          {showComparison ? "Hide Comparison" : "Show Comparison"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((kpi) => (
          <KPICard key={kpi.label} item={kpi} />
        ))}
      </div>

      {/* Report Document */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        {/* Company header */}
        <div className="text-center py-6 border-b">
          <p className="font-semibold text-base">Hunslow Accounting System</p>
          <p className="text-primary text-sm mt-0.5">Profit &amp; Loss Statement</p>
          <p className="text-gray-500 text-sm mt-0.5">{getQuarterEndLabel(period)}</p>
        </div>

        {/* Scrollable table with sticky header */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Account
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  Actual
                </th>
                {showComparison && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {compareLabel}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[120px]">
                      Variance
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>

        {/* Report Notes */}
        <div className="m-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-sm font-medium mb-2">Report Notes</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • This report is prepared on an accrual basis in accordance with
              generally accepted accounting principles.
            </li>
            <li>• All amounts are presented in NGN unless otherwise stated.</li>
            <li>
              • Comparative figures are shown for the previous quarter for
              analysis purposes.
            </li>
            <li>
              • Operating Profit (EBIT) represents earnings before interest and
              taxes.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
