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
  cfLineItems,
  kpiItems,
  PERIODS,
  CFItem,
  CFKPIItem,
  getAllSectionIds,
} from "./mock-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const QUARTER_END: Record<string, string> = {
  Q1: "March 31",
  Q2: "June 30",
  Q3: "September 30",
  Q4: "December 31",
};

function fmt(value: number | null): string {
  if (value === null) return "-";
  const abs = Math.abs(value);
  const s = `$${abs.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return value < 0 ? `(${s})` : s;
}

function getQuarterEndLabel(period: string): string {
  const [q, year] = period.split(" ");
  return `For the Quarter Ended ${QUARTER_END[q] ?? ""}, ${year}`;
}

function amountColor(
  value: number | null,
  variant: "default" | "colored" | "purple" = "default"
): string {
  if (value === null) return "text-gray-400";
  if (variant === "purple") return "text-purple-600";
  if (variant === "colored") return value < 0 ? "text-red-500" : "text-green-600";
  return value < 0 ? "text-red-500" : "text-gray-800";
}

// ─── Change Cell ──────────────────────────────────────────────────────────────

function ChangeCell({
  actual,
  comparison,
  asBadge = false,
  blueBadge = false,
}: {
  actual: number | null;
  comparison: number | null;
  asBadge?: boolean;
  blueBadge?: boolean;
}) {
  if (actual === null || comparison === null) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const change = actual - comparison;
  const pct = comparison !== 0 ? (change / Math.abs(comparison)) * 100 : 0;
  const isPositive = change >= 0;
  const sign = isPositive ? "+" : "";
  const colorCls = isPositive ? "text-green-500" : "text-red-500";
  const Icon = isPositive ? TrendingUp : TrendingDown;

  if (asBadge) {
    const badgeClass = blueBadge
      ? "bg-blue-600 text-white"
      : isPositive
      ? "bg-green-500 text-white"
      : "bg-red-500 text-white";
    return (
      <div className="flex justify-end">
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", badgeClass)}>
          {sign}{Math.abs(pct).toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-end gap-1 text-xs font-medium", colorCls)}>
      <Icon className="w-3 h-3" />
      <span>
        {sign}{Math.abs(pct).toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Build Table Rows ─────────────────────────────────────────────────────────

function buildRows(
  items: CFItem[],
  collapsed: Set<string>,
  toggleSection: (id: string) => void,
  showComparison: boolean,
  isChild = false
): React.ReactNode[] {
  const rows: React.ReactNode[] = [];
  const indentPx = isChild ? 40 : 16;

  for (const item of items) {
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
            <td className="px-4 py-3 text-right text-sm text-gray-400">-</td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm text-gray-400">-</td>
              </>
            )}
          </tr>
        );
        if (!isCollapsed && item.children?.length) {
          rows.push(...buildRows(item.children, collapsed, toggleSection, showComparison, true));
        }
        break;
      }

      case "item": {
        rows.push(
          <tr key={item.id} className="hover:bg-gray-50">
            <td
              className="py-2.5 pr-4 text-sm"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {item.label}
            </td>
            <td
              className={cn(
                "px-4 py-2.5 text-right text-sm whitespace-nowrap",
                amountColor(item.actual)
              )}
            >
              {fmt(item.actual)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right text-sm whitespace-nowrap",
                    amountColor(item.comparison)
                  )}
                >
                  {fmt(item.comparison)}
                </td>
                <td className="px-4 py-2.5 min-w-[100px]">
                  <ChangeCell actual={item.actual} comparison={item.comparison} />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "label": {
        rows.push(
          <tr key={item.id}>
            <td
              className="py-2 pr-4 text-xs italic text-gray-500"
              style={{ paddingLeft: `${indentPx}px` }}
            >
              {item.label}
            </td>
            <td />
            {showComparison && (
              <>
                <td />
                <td />
              </>
            )}
          </tr>
        );
        break;
      }

      case "subtotal": {
        rows.push(
          <tr key={item.id} className="border-t-2 border-gray-200">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td
              className={cn(
                "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                amountColor(item.actual, "colored")
              )}
            >
              {fmt(item.actual)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                    amountColor(item.comparison, "colored")
                  )}
                >
                  {fmt(item.comparison)}
                </td>
                <td className="px-4 py-3 min-w-[100px]">
                  <ChangeCell actual={item.actual} comparison={item.comparison} />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "net": {
        rows.push(
          <tr key={item.id} className="border-t-2 border-gray-300">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td
              className={cn(
                "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                amountColor(item.actual, "purple")
              )}
            >
              {fmt(item.actual)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                    amountColor(item.comparison, "purple")
                  )}
                >
                  {fmt(item.comparison)}
                </td>
                <td className="px-4 py-3 min-w-[100px]">
                  <ChangeCell actual={item.actual} comparison={item.comparison} asBadge />
                </td>
              </>
            )}
          </tr>
        );
        break;
      }

      case "cashline": {
        const isEnd = item.showBadge;
        rows.push(
          <tr
            key={item.id}
            className={cn(isEnd ? "border-t border-gray-300" : "border-t-4 border-gray-200")}
          >
            <td className="px-4 py-3 text-sm">{item.label}</td>
            <td
              className={cn(
                "px-4 py-3 text-right text-sm whitespace-nowrap",
                isEnd ? amountColor(item.actual, "purple") : "text-gray-800"
              )}
            >
              {fmt(item.actual)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm whitespace-nowrap",
                    isEnd ? amountColor(item.comparison, "purple") : "text-gray-800"
                  )}
                >
                  {fmt(item.comparison)}
                </td>
                <td className="px-4 py-3 min-w-[100px]">
                  {isEnd ? (
                    <ChangeCell
                      actual={item.actual}
                      comparison={item.comparison}
                      asBadge
                      blueBadge
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
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

const BADGE_CLASSES: Record<CFKPIItem["badgeVariant"], string> = {
  green: "bg-green-100 text-green-700",
  orange: "bg-orange-100 text-orange-600",
  purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700",
};

function KPICard({ item }: { item: CFKPIItem }) {
  const isNegative = item.value < 0;
  const prevIsNegative = item.previous < 0;
  const Icon = item.trendUp ? TrendingUp : TrendingDown;

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
          <Icon className="w-3 h-3" />
          {item.badgeText}
        </span>
      </div>
      <p
        className={cn(
          "text-xl font-semibold",
          isNegative ? "text-red-500" : "text-green-600"
        )}
      >
        {fmt(item.value)}
      </p>
      <p className="text-xs text-gray-500">
        Previous:{" "}
        <span className={prevIsNegative ? "text-red-400" : ""}>
          {fmt(item.previous)}
        </span>
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CashFlowStatement() {
  const router = useRouter();
  const [period, setPeriod] = useState("Q3 2025");
  const [compareType, setCompareType] = useState<"period" | "budget">("period");
  const [comparePeriod, setComparePeriod] = useState("Q2 2025");
  const [showComparison, setShowComparison] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(getAllSectionIds(cfLineItems))
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
  const rows = buildRows(cfLineItems, collapsed, toggleSection, showComparison);

  return (
    <div className="flex flex-col gap-6 pb-10">
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
          <h1 className="text-xl font-semibold">Cash Flow Statement</h1>
          <p className="text-sm text-primary">
            Statement of cash flows from operating, investing, and financing activities
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
                <SelectItem key={p} value={p}>{p}</SelectItem>
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
                <SelectItem key={p} value={p}>{p}</SelectItem>
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
          <p className="text-primary text-sm mt-0.5">Cash Flow Statement</p>
          <p className="text-gray-500 text-sm mt-0.5">{getQuarterEndLabel(period)}</p>
        </div>

        {/* Scrollable table with sticky header */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Activity
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                  {period}
                </th>
                {showComparison && (
                  <>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {compareLabel}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[100px]">
                      Change
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
            <li>• This cash flow statement is prepared using the indirect method.</li>
            <li>
              • Cash and cash equivalents include cash on hand, demand deposits, and
              short-term investments with maturities of three months or less.
            </li>
            <li>
              • Non-cash transactions are excluded from this statement and disclosed
              separately when material.
            </li>
            <li>• All amounts are presented in USD unless otherwise stated.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
