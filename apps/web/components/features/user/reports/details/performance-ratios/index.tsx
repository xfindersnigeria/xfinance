"use client";
import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Printer,
  TrendingUp, TrendingDown, Activity, Shield, Info, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { usePerformanceRatios } from "@/lib/api/hooks/useReports";
import { RatioData } from "@/lib/api/services/reportService";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
  stepPeriodBack,
  getPeriodShortLabel,
} from "@/lib/period-utils";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ─── Static metadata ──────────────────────────────────────────────────────────

interface RatioMeta {
  category: "Profitability" | "Liquidity" | "Efficiency" | "Leverage";
  formula: string;
  unit: "%" | ":1" | "x" | " days" | "currency";
  benchmarkValue: number;
  benchmarkLabel: string;
}

const RATIO_META: Record<string, RatioMeta> = {
  // Profitability
  grossMargin:         { category: "Profitability", formula: "(Revenue - COGS) / Revenue × 100",           unit: "%",       benchmarkValue: 45,  benchmarkLabel: "45.0%"  },
  netMargin:           { category: "Profitability", formula: "Net Profit / Revenue × 100",                 unit: "%",       benchmarkValue: 15,  benchmarkLabel: "15.0%"  },
  operatingMargin:     { category: "Profitability", formula: "Operating Profit / Revenue × 100",           unit: "%",       benchmarkValue: 15,  benchmarkLabel: "15.0%"  },
  roa:                 { category: "Profitability", formula: "Net Income / Total Assets × 100",            unit: "%",       benchmarkValue: 10,  benchmarkLabel: "10.0%"  },
  roe:                 { category: "Profitability", formula: "Net Income / Shareholder Equity × 100",      unit: "%",       benchmarkValue: 15,  benchmarkLabel: "15.0%"  },
  // Liquidity
  currentRatio:        { category: "Liquidity",     formula: "Current Assets / Current Liabilities",      unit: ":1",      benchmarkValue: 2.0, benchmarkLabel: "2.00:1" },
  quickRatio:          { category: "Liquidity",     formula: "(Current Assets - Inventory) / Current Liabilities", unit: ":1", benchmarkValue: 1.0, benchmarkLabel: "1.00:1" },
  cashRatio:           { category: "Liquidity",     formula: "Cash / Current Liabilities",                unit: ":1",      benchmarkValue: 0.5, benchmarkLabel: "0.50:1" },
  workingCapital:      { category: "Liquidity",     formula: "Current Assets - Current Liabilities",      unit: "currency", benchmarkValue: 0,  benchmarkLabel: "> 0"    },
  // Efficiency
  assetTurnover:       { category: "Efficiency",    formula: "Revenue / Total Assets",                    unit: "x",       benchmarkValue: 1.2, benchmarkLabel: "1.20x"  },
  inventoryTurnover:   { category: "Efficiency",    formula: "COGS / Average Inventory",                  unit: "x",       benchmarkValue: 6.0, benchmarkLabel: "6.00x"  },
  receivablesTurnover: { category: "Efficiency",    formula: "Revenue / Average Accounts Receivable",     unit: "x",       benchmarkValue: 8.0, benchmarkLabel: "8.00x"  },
  daysSalesOutstanding:{ category: "Efficiency",    formula: "365 / Receivables Turnover",                unit: " days",   benchmarkValue: 45,  benchmarkLabel: "45.00 days" },
  // Leverage
  debtToEquity:        { category: "Leverage",      formula: "Total Debt / Shareholder Equity",           unit: ":1",      benchmarkValue: 1.0, benchmarkLabel: "1.00:1" },
  debtRatio:           { category: "Leverage",      formula: "Total Debt / Total Assets × 100",           unit: "%",       benchmarkValue: 50,  benchmarkLabel: "50.0%"  },
  equityMultiplier:    { category: "Leverage",      formula: "Total Assets / Shareholder Equity",         unit: "x",       benchmarkValue: 2.0, benchmarkLabel: "2.00x"  },
};

const CATEGORY_ORDER = ["Profitability", "Liquidity", "Efficiency", "Leverage"] as const;
type Category = typeof CATEGORY_ORDER[number];

const CATEGORY_CFG: Record<Category, {
  icon: React.ReactNode; iconBg: string; subtitle: string;
}> = {
  Profitability: {
    icon: <TrendingUp className="w-5 h-5 text-green-700" />,
    iconBg: "bg-green-100",
    subtitle: "Measuring the company's ability to generate profit",
  },
  Liquidity: {
    icon: <Activity className="w-5 h-5 text-blue-700" />,
    iconBg: "bg-blue-100",
    subtitle: "Measuring the company's ability to meet short-term obligations",
  },
  Efficiency: {
    icon: <Activity className="w-5 h-5 text-purple-700" />,
    iconBg: "bg-purple-100",
    subtitle: "Measuring how effectively the company uses its assets",
  },
  Leverage: {
    icon: <TrendingDown className="w-5 h-5 text-orange-700" />,
    iconBg: "bg-orange-100",
    subtitle: "Measuring the company's debt levels and financial risk",
  },
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { cls: string; label: string }> = {
  excellent: { cls: "bg-green-100 text-green-700",   label: "Excellent" },
  good:      { cls: "bg-blue-100 text-blue-700",     label: "Good"      },
  warning:   { cls: "bg-yellow-100 text-yellow-800", label: "Warning"   },
  poor:      { cls: "bg-red-100 text-red-700",       label: "Poor"      },
  neutral:   { cls: "bg-gray-100 text-gray-600",     label: "Neutral"   },
};

// ─── Value formatting ─────────────────────────────────────────────────────────

function formatRatioValue(key: string, value: number | null, sym: string): string {
  if (value === null) return "N/A";
  const meta = RATIO_META[key];
  if (!meta) return value.toFixed(2);
  if (meta.unit === "currency") {
    const v = value / 100; // cents → display unit
    if (Math.abs(v) >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000)    return `${sym}${(v / 1_000).toFixed(0)}K`;
    return `${sym}${v.toFixed(0)}`;
  }
  if (meta.unit === "%") return `${value.toFixed(1)}%`;
  if (meta.unit === ":1") return `${value.toFixed(2)}:1`;
  if (meta.unit === "x") return `${value.toFixed(2)}x`;
  if (meta.unit === " days") return `${value.toFixed(2)} days`;
  return value.toFixed(2);
}

function formatDiff(key: string, diff: number, sym: string): string {
  const meta = RATIO_META[key];
  if (!meta) return diff >= 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2);
  if (meta.unit === "currency") {
    const v = diff / 100;
    const abs = Math.abs(v);
    const str = abs >= 1_000_000 ? `${sym}${(abs / 1_000_000).toFixed(1)}M`
                : abs >= 1_000    ? `${sym}${(abs / 1_000).toFixed(0)}K`
                : `${sym}${abs.toFixed(0)}`;
    return diff >= 0 ? `+${str}` : `-${str}`;
  }
  const abs = Math.abs(diff);
  const str = meta.unit === "%" ? `${abs.toFixed(1)}%`
            : meta.unit === ":1" ? `${abs.toFixed(2)}:1`
            : meta.unit === "x" ? `${abs.toFixed(2)}x`
            : meta.unit === " days" ? `${abs.toFixed(2)} days`
            : abs.toFixed(2);
  return diff >= 0 ? `+${str}` : `-${str}`;
}

// Progress bar fill: current as % of benchmark (capped at 100%)
function progressFill(key: string, value: number | null): number {
  if (value === null) return 0;
  const meta = RATIO_META[key];
  if (!meta || meta.benchmarkValue === 0) return value > 0 ? 100 : 0;
  const fill = (value / meta.benchmarkValue) * 100;
  return Math.min(Math.max(fill, 0), 100);
}

// ─── Ratio Card ───────────────────────────────────────────────────────────────

interface RatioCardProps {
  ratio: RatioData;
  previousValue: number | null;
  sym: string;
}

function RatioCard({ ratio, previousValue, sym }: RatioCardProps) {
  const meta = RATIO_META[ratio.key];
  const sc = STATUS_CFG[ratio.status] ?? STATUS_CFG.neutral;
  const displayVal = formatRatioValue(ratio.key, ratio.value, sym);

  const changePct = (ratio.value !== null && previousValue !== null && previousValue !== 0)
    ? ((ratio.value - previousValue) / Math.abs(previousValue)) * 100
    : null;

  const bsVal = ratio.value !== null && meta ? ratio.value - meta.benchmarkValue : null;
  const barFill = progressFill(ratio.key, ratio.value);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{ratio.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{ratio.description}</p>
        </div>
        <span className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0", sc.cls)}>
          {sc.label}
        </span>
      </div>

      {/* Value + change */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{displayVal}</span>
          {changePct !== null && (
            <span className={cn("flex items-center gap-0.5 text-sm font-medium", changePct >= 0 ? "text-green-600" : "text-red-500")}>
              {changePct >= 0
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />
              }
              {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}%
            </span>
          )}
        </div>
        {previousValue !== null && (
          <p className="text-xs text-slate-500 mt-0.5">
            Previous: {formatRatioValue(ratio.key, previousValue, sym)}
          </p>
        )}
      </div>

      {/* Benchmark bar */}
      {meta && meta.unit !== "currency" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">vs Industry Benchmark</span>
            {bsVal !== null && (
              <span className={cn("font-medium", bsVal >= 0 ? "text-green-600" : "text-red-500")}>
                {formatDiff(ratio.key, bsVal, sym)}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-all"
              style={{ width: `${barFill}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">Industry: {meta.benchmarkLabel}</p>
        </div>
      )}

      {/* Working capital special benchmark */}
      {meta && meta.unit === "currency" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">vs Industry Benchmark</span>
            {bsVal !== null && (
              <span className={cn("font-medium", bsVal >= 0 ? "text-green-600" : "text-red-500")}>
                {bsVal >= 0 ? "Positive" : "Negative"}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", ratio.value !== null && ratio.value > 0 ? "bg-green-600" : "bg-red-400")}
              style={{ width: ratio.value !== null && ratio.value > 0 ? "100%" : "20%" }}
            />
          </div>
          <p className="text-xs text-slate-500">Industry: Positive working capital</p>
        </div>
      )}

      {/* Formula */}
      {meta && (
        <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
          <span className="font-medium text-slate-500">Formula: </span>{meta.formula}
        </p>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ category }: { category: Category }) {
  const cfg = CATEGORY_CFG[category];
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", cfg.iconBg)}>
        {cfg.icon}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{category} Ratios</h2>
        <p className="text-sm text-slate-500">{cfg.subtitle}</p>
      </div>
    </div>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    fontSize: "12px",
  },
};

// ─── Overall score card ───────────────────────────────────────────────────────

function OverallScoreCard({ ratios }: { ratios: RatioData[] }) {
  const total = ratios.length;
  if (total === 0) return null;

  const goodCount = ratios.filter(r => r.status === "excellent" || r.status === "good").length;
  const score = Math.round((goodCount / total) * 100);

  const byCategory = CATEGORY_ORDER.reduce<Record<string, number>>((acc, cat) => {
    const catRatios = ratios.filter(r => RATIO_META[r.key]?.category === cat);
    const catGood = catRatios.filter(r => r.status === "excellent" || r.status === "good").length;
    acc[cat] = catRatios.length > 0 ? Math.round((catGood / catRatios.length) * 100) : 0;
    return acc;
  }, {});

  const radarData = CATEGORY_ORDER.map(cat => ({
    category: cat,
    Current: byCategory[cat] ?? 0,
    Benchmark: 75,
  }));

  const categoriesWell = Object.values(byCategory).filter(v => v >= 60).length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Overall Performance Score</p>
              <p className="text-sm text-slate-500">Composite rating across all categories</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-5xl font-bold text-blue-600">{score}</span>
            <span className="text-xl text-slate-500">/100</span>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-800"
            )}>
              {score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-5">
            {score >= 80
              ? "Excellent performance, above industry benchmarks"
              : score >= 60
              ? "Good performance, meeting most benchmarks"
              : "Below benchmarks in several areas"}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-green-700">{goodCount}/{total}</p>
              <p className="text-xs text-slate-500">Ratios Above Benchmark</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-blue-700">{categoriesWell}/{CATEGORY_ORDER.length}</p>
              <p className="text-xs text-slate-500">Categories Performing Well</p>
            </div>
          </div>
        </div>

        {/* Right — Radar */}
        <div>
          <p className="text-sm font-medium text-slate-500 mb-2">Performance by Category</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="category" tick={{ fill: "#64748b", fontSize: 12 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Radar name="Current"   dataKey="Current"   stroke="#4152b6" fill="#4152b6" fillOpacity={0.55} />
              <Radar name="Benchmark" dataKey="Benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.25} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Trend charts ─────────────────────────────────────────────────────────────

interface TrendPoint { period: string; [key: string]: number | string | null }

function ProfitabilityTrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="font-medium text-slate-800 mb-4">Profitability Trends</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="grossMargin"  stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Gross Margin %" />
          <Line type="monotone" dataKey="netMargin"    stroke="#4152b6" strokeWidth={2} dot={{ r: 4 }} name="Net Margin %" />
          <Line type="monotone" dataKey="roa"          stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="ROA %" />
          <Line type="monotone" dataKey="roe"          stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="ROE %" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function LiquidityTrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="font-medium text-slate-800 mb-4">Liquidity Trends</p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="currentRatio"  fill="#4152b6" name="Current Ratio"  radius={[6, 6, 0, 0]} />
          <Bar dataKey="quickRatio"    fill="#10b981" name="Quick Ratio"    radius={[6, 6, 0, 0]} />
          <Bar dataKey="cashRatio"     fill="#f59e0b" name="Cash Ratio"     radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EfficiencyTrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <p className="font-medium text-slate-800 mb-4">Efficiency Trends</p>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="period" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="assetTurnover"       stroke="#4152b6" strokeWidth={2} dot={{ r: 4 }} name="Asset Turnover" />
          <Line type="monotone" dataKey="inventoryTurnover"   stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Inventory Turnover" />
          <Line type="monotone" dataKey="receivablesTurnover" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Receivables Turnover" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Key insights ─────────────────────────────────────────────────────────────

function KeyInsights({ ratios }: { ratios: RatioData[] }) {
  const insights: { title: string; body: string; bg: string; iconBg: string; icon: React.ReactNode; textCls: string }[] = [
    {
      title: "Profitability",
      body: (() => {
        const nm = ratios.find(r => r.key === "netMargin");
        if (!nm || nm.value === null) return "Check profitability ratios for performance insights.";
        return nm.status === "excellent" || nm.status === "good"
          ? `All profitability ratios exceed industry benchmarks. Net profit margin of ${nm.value.toFixed(1)}% shows excellent operational efficiency.`
          : `Net profit margin of ${nm.value.toFixed(1)}% — review cost structure to improve profitability.`;
      })(),
      bg: "bg-green-50 border-green-200",
      iconBg: "bg-green-100",
      icon: <TrendingUp className="w-4 h-4 text-green-700" />,
      textCls: "text-green-900",
    },
    {
      title: "Liquidity Position",
      body: (() => {
        const cr = ratios.find(r => r.key === "currentRatio");
        if (!cr || cr.value === null) return "Check liquidity ratios for short-term health.";
        return cr.status === "excellent" || cr.status === "good"
          ? `Current ratio of ${cr.value.toFixed(2)}:1 indicates strong ability to cover short-term liabilities. Consider optimising working capital deployment.`
          : `Current ratio of ${cr.value.toFixed(2)}:1 is below the 1.5 threshold. Review short-term obligations.`;
      })(),
      bg: "bg-blue-50 border-blue-200",
      iconBg: "bg-blue-100",
      icon: <Activity className="w-4 h-4 text-blue-700" />,
      textCls: "text-blue-900",
    },
    {
      title: "Operational Efficiency",
      body: (() => {
        const at = ratios.find(r => r.key === "assetTurnover");
        const dso = ratios.find(r => r.key === "daysSalesOutstanding");
        if (!at || at.value === null) return "Check efficiency ratios for asset utilisation insights.";
        const dsoText = dso?.value ? ` Days Sales Outstanding of ${dso.value.toFixed(0)} days.` : "";
        return at.status === "excellent" || at.status === "good"
          ? `Asset turnover and inventory management showing positive trends.${dsoText}`
          : `Asset turnover of ${at.value.toFixed(2)}x — explore ways to generate more revenue from existing assets.${dsoText}`;
      })(),
      bg: "bg-purple-50 border-purple-200",
      iconBg: "bg-purple-100",
      icon: <Activity className="w-4 h-4 text-purple-700" />,
      textCls: "text-purple-900",
    },
    {
      title: "Leverage & Capital Structure",
      body: (() => {
        const de = ratios.find(r => r.key === "debtToEquity");
        if (!de || de.value === null) return "Check leverage ratios for debt management insights.";
        return de.status === "excellent" || de.status === "good"
          ? `Debt to equity ratio of ${de.value.toFixed(2)}:1 indicates conservative use of leverage.`
          : `Debt to equity ratio of ${de.value.toFixed(2)}:1 is above the 1.0 benchmark. Consider deleveraging.`;
      })(),
      bg: "bg-slate-50 border-slate-200",
      iconBg: "bg-slate-100",
      icon: <Shield className="w-4 h-4 text-slate-600" />,
      textCls: "text-slate-900",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-slate-900">Key Insights & Recommendations</h3>
      </div>
      <div className="space-y-3">
        {insights.map(({ title, body, bg, iconBg, icon, textCls }) => (
          <div key={title} className={cn("flex items-start gap-3 p-4 rounded-xl border", bg)}>
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
              {icon}
            </div>
            <div>
              <p className={cn("font-semibold text-sm mb-0.5", textCls)}>{title}</p>
              <p className={cn("text-sm", textCls, "opacity-80")}>{body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Report Notes ─────────────────────────────────────────────────────────────

function ReportNotes({ sym }: { sym: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <h3 className="font-semibold text-slate-900 mb-3">Report Notes</h3>
      <ul className="space-y-1.5 text-sm text-slate-500">
        <li>• All ratios are calculated based on the most recent financial statements for the selected period.</li>
        <li>• Industry benchmarks are derived from sector averages and may vary by specific industry segment.</li>
        <li>• Ratio status (Excellent/Good/Warning/Poor) is determined by comparison with industry benchmarks.</li>
        <li>• Currency values are presented in {sym} unless otherwise stated.</li>
        <li>• For ratio definitions and detailed calculation methods, refer to the formula provided for each ratio.</li>
      </ul>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function extractRatio(ratios: RatioData[], key: string): number | null {
  return ratios.find(r => r.key === key)?.value ?? null;
}

export default function PerformanceRatios() {
  const router = useRouter();
  const now = new Date();
  const sym = useEntityCurrencySymbol();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Quarterly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Quarterly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => {
    setPeriodType(t);
    setPeriod(defaultPeriodValue(t));
  };

  // Current + 3 previous periods for trend charts
  const p0 = { period, year };
  const p1 = stepPeriodBack(periodType, period, year, 1);
  const p2 = stepPeriodBack(periodType, period, year, 2);
  const p3 = stepPeriodBack(periodType, period, year, 3);

  const params0 = periodToDates(periodType, p0.period, p0.year);
  const params1 = periodToDates(periodType, p1.period, p1.year);
  const params2 = periodToDates(periodType, p2.period, p2.year);
  const params3 = periodToDates(periodType, p3.period, p3.year);

  const { data: raw3 } = usePerformanceRatios(params3);
  const { data: raw2 } = usePerformanceRatios(params2);
  const { data: raw1 } = usePerformanceRatios(params1);
  const { data: raw0, isLoading } = usePerformanceRatios(params0);

  const ratios0: RatioData[] = (raw0 as any)?.data?.ratios ?? [];
  const ratios1: RatioData[] = (raw1 as any)?.data?.ratios ?? [];
  const ratios2: RatioData[] = (raw2 as any)?.data?.ratios ?? [];
  const ratios3: RatioData[] = (raw3 as any)?.data?.ratios ?? [];

  // Build trend data (oldest → newest)
  const trendPoints = useMemo(() => [
    { label: getPeriodShortLabel(periodType, p3.period, p3.year), ratios: ratios3 },
    { label: getPeriodShortLabel(periodType, p2.period, p2.year), ratios: ratios2 },
    { label: getPeriodShortLabel(periodType, p1.period, p1.year), ratios: ratios1 },
    { label: getPeriodShortLabel(periodType, p0.period, p0.year), ratios: ratios0 },
  ], [ratios3, ratios2, ratios1, ratios0, periodType, p0, p1, p2, p3]); // eslint-disable-line react-hooks/exhaustive-deps

  const profitTrend: TrendPoint[] = trendPoints.map(({ label, ratios }) => ({
    period: label,
    grossMargin:  extractRatio(ratios, "grossMargin"),
    netMargin:    extractRatio(ratios, "netMargin"),
    roa:          extractRatio(ratios, "roa"),
    roe:          extractRatio(ratios, "roe"),
  }));

  const liquidityTrend: TrendPoint[] = trendPoints.map(({ label, ratios }) => ({
    period: label,
    currentRatio: extractRatio(ratios, "currentRatio"),
    quickRatio:   extractRatio(ratios, "quickRatio"),
    cashRatio:    extractRatio(ratios, "cashRatio"),
  }));

  const efficiencyTrend: TrendPoint[] = trendPoints.map(({ label, ratios }) => ({
    period: label,
    assetTurnover:       extractRatio(ratios, "assetTurnover"),
    inventoryTurnover:   extractRatio(ratios, "inventoryTurnover"),
    receivablesTurnover: extractRatio(ratios, "receivablesTurnover"),
  }));

  // Group current ratios by category
  const grouped = CATEGORY_ORDER.reduce<Record<Category, RatioData[]>>((acc, cat) => {
    acc[cat] = ratios0.filter(r => RATIO_META[r.key]?.category === cat);
    return acc;
  }, {} as Record<Category, RatioData[]>);

  const hasData = ratios0.length > 0;

  const { startDate, endDate } = params0;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Business Performance Ratios</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Key financial ratios measuring profitability, liquidity, efficiency, and leverage
          </p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Period filter */}
      <ReportPeriodFilter
        periodType={periodType}
        period={period}
        year={year}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodChange={setPeriod}
        onYearChange={setYear}
      />

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-64 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
          </div>
        </div>
      )}

      {/* No data */}
      {!isLoading && !hasData && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center py-20">
          <p className="text-gray-400 text-sm">No ratio data available for this period.</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && hasData && (
        <div className="flex flex-col gap-10">
          {/* Overall score */}
          <OverallScoreCard ratios={ratios0} />

          {/* Profitability */}
          <div className="flex flex-col gap-4">
            <SectionHeader category="Profitability" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped.Profitability.map(r => (
                <RatioCard
                  key={r.key}
                  ratio={r}
                  previousValue={extractRatio(ratios1, r.key)}
                  sym={sym}
                />
              ))}
            </div>
            {profitTrend.some(p => p.grossMargin !== null) && (
              <ProfitabilityTrendsChart data={profitTrend} />
            )}
          </div>

          {/* Liquidity */}
          <div className="flex flex-col gap-4">
            <SectionHeader category="Liquidity" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped.Liquidity.map(r => (
                <RatioCard
                  key={r.key}
                  ratio={r}
                  previousValue={extractRatio(ratios1, r.key)}
                  sym={sym}
                />
              ))}
            </div>
            {liquidityTrend.some(p => p.currentRatio !== null) && (
              <LiquidityTrendsChart data={liquidityTrend} />
            )}
          </div>

          {/* Efficiency */}
          <div className="flex flex-col gap-4">
            <SectionHeader category="Efficiency" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped.Efficiency.map(r => (
                <RatioCard
                  key={r.key}
                  ratio={r}
                  previousValue={extractRatio(ratios1, r.key)}
                  sym={sym}
                />
              ))}
            </div>
            {efficiencyTrend.some(p => p.assetTurnover !== null) && (
              <EfficiencyTrendsChart data={efficiencyTrend} />
            )}
          </div>

          {/* Leverage */}
          <div className="flex flex-col gap-4">
            <SectionHeader category="Leverage" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {grouped.Leverage.map(r => (
                <RatioCard
                  key={r.key}
                  ratio={r}
                  previousValue={extractRatio(ratios1, r.key)}
                  sym={sym}
                />
              ))}
            </div>
          </div>

          {/* Key Insights */}
          <KeyInsights ratios={ratios0} />

          {/* Report Notes */}
          <ReportNotes sym={sym} />
        </div>
      )}
    </div>
  );
}
