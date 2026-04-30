"use client";
import React, { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProfitAndLoss } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import {
  PLAccountLine,
  PLKPIEntry,
  PLSection,
  ProfitAndLossData,
} from "@/lib/api/services/reportService";
import { PLItem, PLItemType, KPIItem } from "./mock-data";

// ─── Period helpers ────────────────────────────────────────────────────────────

const PERIODS = [
  "Q1 2024",
  "Q2 2024",
  "Q3 2024",
  "Q4 2024",
  "Q1 2025",
  "Q2 2025",
  "Q3 2025",
  "Q4 2025",
  "Q1 2026",
  "Q2 2026",
  "Q3 2026",
  "Q4 2026",
];

const QUARTER_END: Record<string, string> = {
  Q1: "March 31",
  Q2: "June 30",
  Q3: "September 30",
  Q4: "December 31",
};

const QUARTER_DATES: Record<string, { start: string; end: string }> = {
  Q1: { start: "-01-01", end: "-03-31" },
  Q2: { start: "-04-01", end: "-06-30" },
  Q3: { start: "-07-01", end: "-09-30" },
  Q4: { start: "-10-01", end: "-12-31" },
};

function quarterToDates(period: string) {
  const [q, year] = period.split(" ");
  return {
    startDate: `${year}${QUARTER_DATES[q].start}`,
    endDate: `${year}${QUARTER_DATES[q].end}`,
  };
}

function getQuarterEndLabel(period: string) {
  const [q, year] = period.split(" ");
  return `For the Quarter Ended ${QUARTER_END[q] ?? ""}, ${year}`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number, sym: string): string {
  return `${sym}${value.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function calcChangePercent(entry: PLKPIEntry): number {
  if (!entry.comparison) return entry.actual !== 0 ? 100 : 0;
  return ((entry.actual - entry.comparison) / Math.abs(entry.comparison)) * 100;
}

// ─── Data mapping: API → PLItem[] ─────────────────────────────────────────────

function sectionToItems(
  sectionId: string,
  label: string,
  section: PLSection,
): PLItem[] {
  return [
    {
      id: sectionId,
      label,
      type: "section" as PLItemType,
      actual: section.actual,
      comparison: section.comparison,
      children: section.accounts.map((a: PLAccountLine) => ({
        id: a.id,
        label: a.name,
        type: "item" as PLItemType,
        actual: a.actual,
        comparison: a.comparison,
      })),
    },
  ];
}

function buildPLItems(data: ProfitAndLossData): PLItem[] {
  return [
    ...sectionToItems("revenue", "Revenue", data.revenue),
    {
      id: "total-revenue",
      label: "Total Revenue",
      type: "subtotal",
      actual: data.revenue.actual,
      comparison: data.revenue.comparison,
    },
    ...sectionToItems("cogs", "Cost of Goods Sold", data.cogs),
    {
      id: "total-cogs",
      label: "Total Cost of Goods Sold",
      type: "subtotal",
      actual: data.cogs.actual,
      comparison: data.cogs.comparison,
      negativeDisplay: true,
    },
    {
      id: "gross-profit",
      label: "Gross Profit",
      type: "calculated",
      actual: data.grossProfit.actual,
      comparison: data.grossProfit.comparison,
    },
    ...sectionToItems(
      "operating-expenses",
      "Operating Expenses",
      data.operatingExpenses,
    ),
    {
      id: "total-opex",
      label: "Total Operating Expenses",
      type: "subtotal",
      actual: data.operatingExpenses.actual,
      comparison: data.operatingExpenses.comparison,
      negativeDisplay: true,
    },
    {
      id: "operating-profit",
      label: "Operating Profit (EBIT)",
      type: "calculated",
      actual: data.operatingProfit.actual,
      comparison: data.operatingProfit.comparison,
    },
    ...sectionToItems("other-income", "Other Income", data.otherIncome),
    ...sectionToItems("other-expenses", "Other Expenses", data.otherExpenses),
    {
      id: "net-profit",
      label: "Net Profit (Loss)",
      type: "net",
      actual: data.netProfit.actual,
      comparison: data.netProfit.comparison,
    },
  ];
}

function buildKPIItems(data: ProfitAndLossData): KPIItem[] {
  const fmt = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  return [
    {
      label: "Total Revenue",
      value: data.kpis.totalRevenue.actual,
      previous: data.kpis.totalRevenue.comparison,
      badgeText: fmt(calcChangePercent(data.kpis.totalRevenue)),
      badgeVariant: "blue",
      showTrendIcon: true,
    },
    {
      label: "Gross Profit",
      value: data.kpis.grossProfit.actual,
      previous: data.kpis.grossProfit.comparison,
      badgeText: fmt(calcChangePercent(data.kpis.grossProfit)),
      badgeVariant: "green",
    },
    {
      label: "Operating Profit",
      value: data.kpis.operatingProfit.actual,
      previous: data.kpis.operatingProfit.comparison,
      badgeText: fmt(calcChangePercent(data.kpis.operatingProfit)),
      badgeVariant: "purple",
    },
    {
      label: "Net Profit",
      value: data.kpis.netProfit.actual,
      previous: data.kpis.netProfit.comparison,
      badgeText: fmt(calcChangePercent(data.kpis.netProfit)),
      badgeVariant: "green",
      valueColor:
        data.kpis.netProfit.actual >= 0 ? "text-green-600" : "text-red-600",
    },
  ];
}

function getAllSectionIds(items: PLItem[]): string[] {
  const ids: string[] = [];
  for (const item of items) {
    if (item.type === "section") {
      ids.push(item.id);
      if (item.children) ids.push(...getAllSectionIds(item.children));
    }
  }
  return ids;
}

// ─── Variance Cell ────────────────────────────────────────────────────────────

function VarianceCell({
  actual,
  comparison,
  percentOnly = false,
}: {
  actual: number;
  comparison: number;
  percentOnly?: boolean;
}) {
  const variance = actual - comparison;
  const pct = comparison !== 0 ? (variance / Math.abs(comparison)) * 100 : 0;
  const isZero = variance === 0;
  const isPositive = variance > 0;

  if (isZero) {
    return (
      <div className="text-right text-xs text-gray-400">
        {!percentOnly && <div>—</div>}
        <div>0.0%</div>
      </div>
    );
  }

  const colorCls = isPositive ? "text-green-500" : "text-red-500";
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const sign = isPositive ? "+" : "";

  if (percentOnly) {
    return (
      <div
        className={cn("flex items-center justify-end gap-1 text-xs", colorCls)}
      >
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
          {Math.abs(variance).toLocaleString("en", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
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
  showComparison: boolean,
  sym: string,
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
              {formatCurrency(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison, sym)}
                </td>
                <td className="px-4 py-3 min-w-[120px]">
                  <VarianceCell
                    actual={item.actual}
                    comparison={item.comparison}
                  />
                </td>
              </>
            )}
          </tr>,
        );
        if (!isCollapsed && item.children?.length) {
          rows.push(
            ...buildRows(
              item.children,
              depth + 1,
              collapsed,
              toggleSection,
              showComparison,
              sym,
            ),
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
              {formatCurrency(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-2.5 text-right text-sm text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison, sym)}
                </td>
                <td className="px-4 py-2.5 min-w-[120px]">
                  <VarianceCell
                    actual={item.actual}
                    comparison={item.comparison}
                  />
                </td>
              </>
            )}
          </tr>,
        );
        break;
      }

      case "subtotal": {
        const dActual = item.negativeDisplay
          ? `(${formatCurrency(item.actual, sym)})`
          : formatCurrency(item.actual, sym);
        const dComp = item.negativeDisplay
          ? `(${formatCurrency(item.comparison, sym)})`
          : formatCurrency(item.comparison, sym);
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
          </tr>,
        );
        break;
      }

      case "calculated": {
        rows.push(
          <tr key={item.id} className="border-y border-gray-300 bg-white">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap">
              {formatCurrency(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-600 whitespace-nowrap">
                  {formatCurrency(item.comparison, sym)}
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
          </tr>,
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
              {formatCurrency(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td className="px-4 py-4 text-right text-sm text-gray-300 whitespace-nowrap">
                  {formatCurrency(item.comparison, sym)}
                </td>
                <td className="px-4 py-4 min-w-[120px]">
                  <div className="flex justify-end">
                    <span
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full font-semibold",
                        isPositive
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white",
                      )}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </>
            )}
          </tr>,
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

function KPICard({ item, sym }: { item: KPIItem; sym: string }) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-600">{item.label}</span>
        <span
          className={cn(
            "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0",
            BADGE_CLASSES[item.badgeVariant],
          )}
        >
          {item.showTrendIcon && <TrendingUp className="w-3 h-3" />}
          {item.badgeText}
        </span>
      </div>
      <p
        className={cn(
          "text-xl font-semibold",
          item.valueColor ?? "text-gray-900",
        )}
      >
        {formatCurrency(item.value, sym)}
      </p>
      <p className="text-xs text-gray-500">
        Previous: {formatCurrency(item.previous, sym)}
      </p>
    </div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function PLSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function PLEmpty({ period }: { period: string }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm flex flex-col items-center justify-center py-20 gap-3 text-center">
      <p className="text-gray-500 text-sm">
        No GL transactions found for {period}.
      </p>
      <p className="text-gray-400 text-xs">
        Post invoices, receipts, or expenses to see P&amp;L data.
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProfitAndLoss() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const [period, setPeriod] = useState("Q2 2026");
  const [compareType, setCompareType] = useState<"period" | "budget">("period");
  const [comparePeriod, setComparePeriod] = useState("Q2 2025");
  const [showComparison, setShowComparison] = useState(true);

  const { startDate, endDate } = quarterToDates(period);
  const { startDate: compareStartDate, endDate: compareEndDate } =
    quarterToDates(comparePeriod);

  const { data: plDataData, isLoading } = useProfitAndLoss({
    startDate,
    endDate,
    compareStartDate:
      showComparison && compareType === "period" ? compareStartDate : undefined,
    compareEndDate:
      showComparison && compareType === "period" ? compareEndDate : undefined,
  });

  const plData = (plDataData as any)?.data || null;

  console.log("PL Data:", plData);

  const plItems = useMemo(() => (plData ? buildPLItems(plData) : []), [plData]);
  const kpiItems = useMemo(
    () => (plData ? buildKPIItems(plData) : []),
    [plData],
  );

  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set<string>(),
  );

  // Re-collapse all sections when data changes (new period)
  const sectionIds = useMemo(() => getAllSectionIds(plItems), [plItems]);
  React.useEffect(() => {
    setCollapsed(new Set(sectionIds));
  }, [startDate, endDate]);

  const toggleSection = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isEmpty =
    plData &&
    plData.revenue.actual === 0 &&
    plData.cogs.actual === 0 &&
    plData.operatingExpenses.actual === 0 &&
    plData.otherIncome.actual === 0 &&
    plData.otherExpenses.actual === 0;

  const rows = buildRows(
    plItems,
    0,
    collapsed,
    toggleSection,
    showComparison,
    sym,
  );
  const compareLabel = compareType === "period" ? comparePeriod : "Budget";

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
            // onClick={() => window.print()}
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
            {(["period", "budget"] as const).map((t) => (
              <button
                key={t}
                className={cn(
                  "px-3 py-1 text-sm rounded-lg transition-all capitalize",
                  compareType === t
                    ? "bg-white shadow-sm font-medium"
                    : "text-gray-600 hover:text-gray-900",
                )}
                onClick={() => setCompareType(t)}
              >
                {t}
              </button>
            ))}
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

      {isLoading ? (
        <PLSkeleton />
      ) : isEmpty ? (
        <PLEmpty period={period} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiItems.map((kpi) => (
              <KPICard key={kpi.label} item={kpi} sym={sym} />
            ))}
          </div>

          {/* Report Document */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="text-center py-6 border-b">
              <p className="font-semibold text-base">
                Profit &amp; Loss Statement
              </p>
              <p className="text-primary text-sm mt-0.5">Income Statement</p>
              <p className="text-gray-500 text-sm mt-0.5">
                {getQuarterEndLabel(period)}
              </p>
            </div>

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

            <div className="m-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-medium mb-2">Report Notes</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • This report is prepared on an accrual basis in accordance
                  with generally accepted accounting principles.
                </li>
                <li>
                  • All amounts are presented in {sym} unless otherwise stated.
                </li>
                <li>
                  • Comparative figures are shown for the previous quarter for
                  analysis purposes.
                </li>
                <li>
                  • Operating Profit (EBIT) represents earnings before interest
                  and taxes.
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
