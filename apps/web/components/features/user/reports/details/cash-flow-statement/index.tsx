"use client";
import React, { useEffect, useState } from "react";
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
  CFItem,
  CFItemType,
  CFKPIItem,
  PERIODS,
  getAllSectionIds,
} from "./mock-data";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useCashFlowStatement } from "@/lib/api/hooks/useReports";
import { CashFlowStatementData } from "@/lib/api/services/reportService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function quarterToDates(period: string): {
  startDate: string;
  endDate: string;
} {
  const [q, yearStr] = period.split(" ");
  const year = parseInt(yearStr, 10);
  const ranges: Record<string, [string, string]> = {
    Q1: [`${year}-01-01`, `${year}-03-31`],
    Q2: [`${year}-04-01`, `${year}-06-30`],
    Q3: [`${year}-07-01`, `${year}-09-30`],
    Q4: [`${year}-10-01`, `${year}-12-31`],
  };
  const [startDate, endDate] = ranges[q] ?? [`${year}-01-01`, `${year}-03-31`];
  return { startDate, endDate };
}

const QUARTER_END: Record<string, string> = {
  Q1: "March 31",
  Q2: "June 30",
  Q3: "September 30",
  Q4: "December 31",
};

function fmt(value: number | null, sym: string): string {
  if (value === null) return "-";
  const abs = Math.abs(value);
  const s = `${sym}${abs.toLocaleString("en", {
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
  variant: "default" | "colored" | "purple" = "default",
): string {
  if (value === null) return "text-gray-400";
  if (variant === "purple") return "text-purple-600";
  if (variant === "colored")
    return value < 0 ? "text-red-500" : "text-green-600";
  return value < 0 ? "text-red-500" : "text-gray-800";
}

function calcChangePct(actual: number, comparison: number): number {
  if (comparison === 0) return 0;
  return ((actual - comparison) / Math.abs(comparison)) * 100;
}

// ─── Build CFItem[] from API response ────────────────────────────────────────

function buildCFItems(data: CashFlowStatementData): CFItem[] {
  const e = (
    id: string,
    label: string,
    entry: { actual: number; comparison: number },
    type: CFItemType = "item",
  ): CFItem => ({
    id,
    label,
    type,
    actual: entry.actual,
    comparison: data.comparePeriod ? entry.comparison : null,
  });

  return [
    {
      id: "operating-activities",
      label: "Operating Activities",
      type: "section",
      actual: null,
      comparison: null,
      children: [
        e("net-profit", "Net Profit", data.operating.netProfit),
        {
          id: "adj-label",
          label: "Adjustments for:",
          type: "label",
          actual: null,
          comparison: null,
        },
        e(
          "depreciation",
          "Depreciation & Amortization",
          data.operating.depreciation,
        ),
        {
          id: "wc-label",
          label: "Changes in Working Capital:",
          type: "label",
          actual: null,
          comparison: null,
        },
        e(
          "accounts-receivable",
          "Accounts Receivable",
          data.operating.arChange,
        ),
        e("inventory", "Inventory", data.operating.inventoryChange),
        e("prepaid-expenses", "Prepaid Expenses", data.operating.prepaidChange),
        e("accounts-payable", "Accounts Payable", data.operating.apChange),
        e("wages-payable", "Wages Payable", data.operating.wagesPayableChange),
        e(
          "deferred-revenue",
          "Deferred Revenue",
          data.operating.deferredRevenueChange,
        ),
      ],
    },
    {
      id: "net-cash-operating",
      label: "Net Cash from Operating Activities",
      type: "subtotal",
      actual: data.operating.netCash.actual,
      comparison: data.comparePeriod ? data.operating.netCash.comparison : null,
    },
    {
      id: "investing-activities",
      label: "Investing Activities",
      type: "section",
      actual: null,
      comparison: null,
      children: [
        e(
          "fixed-assets-change",
          "Purchase of Property, Plant & Equipment",
          data.investing.fixedAssetsChange,
        ),
        e(
          "intangible-assets-change",
          "Purchase of Intangible Assets",
          data.investing.intangibleAssetsChange,
        ),
      ],
    },
    {
      id: "net-cash-investing",
      label: "Net Cash from Investing Activities",
      type: "subtotal",
      actual: data.investing.netCash.actual,
      comparison: data.comparePeriod ? data.investing.netCash.comparison : null,
    },
    {
      id: "financing-activities",
      label: "Financing Activities",
      type: "section",
      actual: null,
      comparison: null,
      children: [
        e(
          "long-term-debt-change",
          "Long-term Debt Change",
          data.financing.longTermDebtChange,
        ),
        e(
          "capital-stock-change",
          "Capital Stock / Equity Raised",
          data.financing.capitalStockChange,
        ),
      ],
    },
    {
      id: "net-cash-financing",
      label: "Net Cash from Financing Activities",
      type: "subtotal",
      actual: data.financing.netCash.actual,
      comparison: data.comparePeriod ? data.financing.netCash.comparison : null,
    },
    {
      id: "net-increase",
      label: "Net Increase (Decrease) in Cash",
      type: "net",
      actual: data.netCashChange.actual,
      comparison: data.comparePeriod ? data.netCashChange.comparison : null,
    },
    {
      id: "cash-beginning",
      label: "Cash and Cash Equivalents, Beginning of Period",
      type: "cashline",
      actual: data.cashAtStart.actual,
      comparison: data.comparePeriod ? data.cashAtStart.comparison : null,
      showBadge: false,
    },
    {
      id: "cash-end",
      label: "Cash and Cash Equivalents, End of Period",
      type: "cashline",
      actual: data.cashAtEnd.actual,
      comparison: data.comparePeriod ? data.cashAtEnd.comparison : null,
      showBadge: true,
    },
  ];
}

function buildKPIItems(data: CashFlowStatementData): CFKPIItem[] {
  const { kpis } = data;
  const hasCompare = !!data.comparePeriod;

  const toKPI = (
    label: string,
    entry: { actual: number; comparison: number },
    badgeVariant: CFKPIItem["badgeVariant"],
  ): CFKPIItem => {
    const pct = hasCompare ? calcChangePct(entry.actual, entry.comparison) : 0;
    return {
      label,
      value: entry.actual,
      previous: hasCompare ? entry.comparison : 0,
      badgeText: `${Math.abs(pct).toFixed(1)}%`,
      badgeVariant,
      trendUp: pct >= 0,
    };
  };

  return [
    toKPI("Operating Cash Flow", kpis.operatingCashFlow, "green"),
    toKPI("Investing Cash Flow", kpis.investingCashFlow, "orange"),
    toKPI("Financing Cash Flow", kpis.financingCashFlow, "purple"),
    toKPI("Net Cash Increase", kpis.netCashIncrease, "blue"),
  ];
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
        <span
          className={cn(
            "text-xs px-2.5 py-1 rounded-full font-semibold",
            badgeClass,
          )}
        >
          {sign}
          {Math.abs(pct).toFixed(1)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-end gap-1 text-xs font-medium",
        colorCls,
      )}
    >
      <Icon className="w-3 h-3" />
      <span>
        {sign}
        {Math.abs(pct).toFixed(1)}%
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
  sym: string,
  isChild = false,
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
                <td className="px-4 py-3 text-right text-sm text-gray-400">
                  -
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-400">
                  -
                </td>
              </>
            )}
          </tr>,
        );
        if (!isCollapsed && item.children?.length) {
          rows.push(
            ...buildRows(
              item.children,
              collapsed,
              toggleSection,
              showComparison,
              sym,
              true,
            ),
          );
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
                amountColor(item.actual),
              )}
            >
              {fmt(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right text-sm whitespace-nowrap",
                    amountColor(item.comparison),
                  )}
                >
                  {fmt(item.comparison, sym)}
                </td>
                <td className="px-4 py-2.5 min-w-[100px]">
                  <ChangeCell
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
          </tr>,
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
                amountColor(item.actual, "colored"),
              )}
            >
              {fmt(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                    amountColor(item.comparison, "colored"),
                  )}
                >
                  {fmt(item.comparison, sym)}
                </td>
                <td className="px-4 py-3 min-w-[100px]">
                  <ChangeCell
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

      case "net": {
        rows.push(
          <tr key={item.id} className="border-t-2 border-gray-300">
            <td className="px-4 py-3 text-sm font-bold">{item.label}</td>
            <td
              className={cn(
                "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                amountColor(item.actual, "purple"),
              )}
            >
              {fmt(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm font-bold whitespace-nowrap",
                    amountColor(item.comparison, "purple"),
                  )}
                >
                  {fmt(item.comparison, sym)}
                </td>
                <td className="px-4 py-3 min-w-[100px]">
                  <ChangeCell
                    actual={item.actual}
                    comparison={item.comparison}
                    asBadge
                  />
                </td>
              </>
            )}
          </tr>,
        );
        break;
      }

      case "cashline": {
        const isEnd = item.showBadge;
        rows.push(
          <tr
            key={item.id}
            className={cn(
              isEnd ? "border-t border-gray-300" : "border-t-4 border-gray-200",
            )}
          >
            <td className="px-4 py-3 text-sm">{item.label}</td>
            <td
              className={cn(
                "px-4 py-3 text-right text-sm whitespace-nowrap",
                isEnd ? amountColor(item.actual, "purple") : "text-gray-800",
              )}
            >
              {fmt(item.actual, sym)}
            </td>
            {showComparison && (
              <>
                <td
                  className={cn(
                    "px-4 py-3 text-right text-sm whitespace-nowrap",
                    isEnd
                      ? amountColor(item.comparison, "purple")
                      : "text-gray-800",
                  )}
                >
                  {fmt(item.comparison, sym)}
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
          </tr>,
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

function KPICard({ item, sym }: { item: CFKPIItem; sym: string }) {
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
            BADGE_CLASSES[item.badgeVariant],
          )}
        >
          <Icon className="w-3 h-3" />
          {item.badgeText}
        </span>
      </div>
      <p
        className={cn(
          "text-xl font-semibold",
          isNegative ? "text-red-500" : "text-green-600",
        )}
      >
        {fmt(item.value, sym)}
      </p>
      <p className="text-xs text-gray-500">
        Previous:{" "}
        <span className={prevIsNegative ? "text-red-400" : ""}>
          {fmt(item.previous, sym)}
        </span>
      </p>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-gray-200 rounded", className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-3"
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i % 4 === 0 ? "w-1/3" : "w-full")}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STATIC_SECTION_IDS = [
  "operating-activities",
  "investing-activities",
  "financing-activities",
];

export default function CashFlowStatement() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const [period, setPeriod] = useState("Q2 2026");
  const [compareType, setCompareType] = useState<"period" | "budget">("period");
  const [comparePeriod, setComparePeriod] = useState("Q2 2025");
  const [showComparison, setShowComparison] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(STATIC_SECTION_IDS),
  );

  const periodDates = quarterToDates(period);
  const compareDates =
    compareType === "period" ? quarterToDates(comparePeriod) : null;

  const {
    data: cashFlowData,
    isLoading,
    isError,
  } = useCashFlowStatement({
    startDate: periodDates.startDate,
    endDate: periodDates.endDate,
    compareStartDate: compareDates?.startDate,
    compareEndDate: compareDates?.endDate,
  });

  const data = (cashFlowData as any)?.data || null;

  useEffect(() => {
    setCollapsed(new Set(STATIC_SECTION_IDS));
  }, [period, comparePeriod]);

  const toggleSection = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const cfItems = data ? buildCFItems(data) : [];
  const kpiItems = data ? buildKPIItems(data) : [];
  const compareLabel = compareType === "period" ? comparePeriod : "Budget";
  const hasData = !!data;
  const effectiveShowComparison = showComparison && !!data?.comparePeriod;

  const rows = hasData
    ? buildRows(cfItems, collapsed, toggleSection, effectiveShowComparison, sym)
    : [];

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
            Statement of cash flows from operating, investing, and financing
            activities
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
            <button
              className={cn(
                "px-3 py-1 text-sm rounded-lg transition-all",
                compareType === "period"
                  ? "bg-white shadow-sm font-medium"
                  : "text-gray-600 hover:text-gray-900",
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
                  : "text-gray-600 hover:text-gray-900",
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

      {isLoading && <LoadingSkeleton />}

      {isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          Failed to load cash flow statement. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {/* KPI Cards */}
          {kpiItems.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {kpiItems.map((kpi) => (
                <KPICard key={kpi.label} item={kpi} sym={sym} />
              ))}
            </div>
          )}

          {/* Report Document */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Document header */}
            <div className="text-center py-6 border-b">
              <p className="font-semibold text-base">Cash Flow Statement</p>
              <p className="text-primary text-sm mt-0.5">
                Statement of Cash Flows (Indirect Method)
              </p>
              <p className="text-gray-500 text-sm mt-0.5">
                {getQuarterEndLabel(period)}
              </p>
            </div>

            {cfItems.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-sm">
                No cash flow transactions found for this period.
              </div>
            ) : (
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
                      {effectiveShowComparison && (
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
            )}

            {/* Report Notes */}
            <div className="m-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-medium mb-2">Report Notes</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  • This cash flow statement is prepared using the indirect
                  method.
                </li>
                <li>
                  • Cash and cash equivalents include cash on hand, demand
                  deposits, and short-term investments with maturities of three
                  months or less.
                </li>
                <li>
                  • Non-cash transactions are excluded from this statement and
                  disclosed separately when material.
                </li>
                <li>
                  • All amounts are presented in {sym} unless otherwise stated.
                </li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
