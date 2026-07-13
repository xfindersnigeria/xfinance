"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, ChevronDown, ChevronRight,
  Download, Printer, TrendingDown, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalanceSheet } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { BSAccountLine, BSSection } from "@/lib/api/services/reportService";
import {
  MONTHS, QUARTERS, REPORT_PERIOD_TYPES, ReportPeriodType,
  getFiscalYears, periodToDates, defaultPeriodValue,
} from "@/lib/period-utils";

const FISCAL_YEARS = getFiscalYears();

function fmt(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const f = `${sym}${abs.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${f})` : f;
}

function changePct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
}

function ChangeCell({ current, prev }: { current: number; prev: number }) {
  const p = changePct(current, prev);
  if (p === null) return <div />;
  if (p > 0)
    return (
      <div className="flex items-center justify-end gap-1">
        <TrendingUp className="w-3 h-3 text-green-600" />
        <span className="text-xs text-green-600">+{p.toFixed(1)}%</span>
      </div>
    );
  if (p < 0)
    return (
      <div className="flex items-center justify-end gap-1">
        <TrendingDown className="w-3 h-3 text-red-600" />
        <span className="text-xs text-red-600">{p.toFixed(1)}%</span>
      </div>
    );
  return <span className="text-xs text-slate-500">0%</span>;
}

function asOfLabel(periodType: ReportPeriodType, period: string, year: number): string {
  if (periodType === "Monthly") {
    const mi = MONTHS.indexOf(period) + 1;
    const last = new Date(year, mi, 0).getDate();
    return `${period} ${last}, ${year}`;
  }
  const qEnd: Record<string, string> = {
    Q1: `March 31, ${year}`, Q2: `June 30, ${year}`,
    Q3: `September 30, ${year}`, Q4: `December 31, ${year}`,
  };
  if (periodType === "Quarterly") return qEnd[period] ?? "";
  return `December 31, ${year}`;
}

function prevPeriodOf(periodType: ReportPeriodType, period: string, year: number) {
  if (periodType === "Monthly") {
    const i = MONTHS.indexOf(period);
    return i === 0 ? { period: MONTHS[11], year: year - 1 } : { period: MONTHS[i - 1], year };
  }
  if (periodType === "Quarterly") {
    const qs = ["Q1", "Q2", "Q3", "Q4"];
    const i = qs.indexOf(period);
    return i === 0 ? { period: "Q4", year: year - 1 } : { period: qs[i - 1], year };
  }
  return { period, year: year - 1 };
}

// ── Sub-section (Current Assets, Non-Current Assets, etc.) ────────────────────

interface SubSectionProps {
  label: string;
  section: BSSection;
  sym: string;
  showComparison: boolean;
  colClass: string;
}

function SubSection({ label, section, sym, showComparison, colClass }: SubSectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <div
        className={`grid ${colClass} gap-4 py-3 px-6 hover:bg-slate-50 transition-colors cursor-pointer select-none`}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="flex items-center gap-2">
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
          <span className="font-semibold text-slate-900 text-sm">{label}</span>
        </div>
        <div />
        {showComparison && <><div /><div /></>}
      </div>

      {!collapsed && section.accounts.map((acc: BSAccountLine) => (
        <div
          key={acc.id}
          className={`grid ${colClass} gap-4 py-2.5 px-6 pl-14 hover:bg-slate-50 transition-colors border-t border-slate-100`}
        >
          <span className="text-sm text-slate-700">{acc.name}</span>
          <div className={`text-right text-sm ${acc.balance < 0 ? "text-red-600" : "text-slate-700"}`}>
            {fmt(acc.balance, sym)}
          </div>
          {showComparison && (
            <>
              <div className={`text-right text-sm ${acc.comparison < 0 ? "text-red-600" : "text-slate-600"}`}>
                {fmt(acc.comparison, sym)}
              </div>
              <ChangeCell current={acc.balance} prev={acc.comparison} />
            </>
          )}
        </div>
      ))}

      {!collapsed && (
        <div className={`grid ${colClass} gap-4 py-3 px-6 border-t border-slate-200`}>
          <div className="pl-8 font-semibold text-slate-900 text-sm">Total {label}</div>
          <div className="text-right font-semibold text-slate-900 text-sm">{fmt(section.total, sym)}</div>
          {showComparison && (
            <>
              <div className="text-right font-semibold text-slate-900 text-sm">{fmt(section.comparison, sym)}</div>
              <ChangeCell current={section.total} prev={section.comparison} />
            </>
          )}
        </div>
      )}
    </>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  badge?: React.ReactNode;
}

function KPICard({ label, value, sub, badge }: KPICardProps) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">{label}</span>
          {badge}
        </div>
        <div className="text-slate-900 font-semibold text-lg mb-1">{value}</div>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function BalanceSheet() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();

  // Primary period
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  // Comparison period
  const [showComparison, setShowComparison] = useState(false);
  const defaultPrev = prevPeriodOf("Monthly", defaultPeriodValue("Monthly"), now.getFullYear());
  const [cmpPeriod, setCmpPeriod] = useState(defaultPrev.period);
  const [cmpYear, setCmpYear] = useState(defaultPrev.year);

  const handlePeriodTypeChange = (t: ReportPeriodType) => {
    setPeriodType(t);
    const p = defaultPeriodValue(t);
    setPeriod(p);
    const prev = prevPeriodOf(t, p, year);
    setCmpPeriod(prev.period);
    setCmpYear(prev.year);
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    const prev = prevPeriodOf(periodType, p, year);
    setCmpPeriod(prev.period);
    setCmpYear(prev.year);
  };

  const handleYearChange = (y: number) => {
    setYear(y);
    const prev = prevPeriodOf(periodType, period, y);
    setCmpYear(prev.year);
  };

  const { endDate } = periodToDates(periodType, period, year);
  const { endDate: cmpEndDate } = periodToDates(periodType, cmpPeriod, cmpYear);

  const { data: rawData, isLoading } = useBalanceSheet({
    asOfDate: endDate,
    compareAsOfDate: showComparison ? cmpEndDate : undefined,
  });
  const data = (rawData as any)?.data ?? null;

  const colClass = showComparison
    ? "grid-cols-[1fr_160px_160px_100px]"
    : "grid-cols-[1fr_180px]";

  // Derived ratios (computed from data when available)
  const currentAssets = data?.assets.current.total ?? 0;
  const currentLiabilities = data?.liabilities.current.total ?? 0;
  const totalAssets = data?.assets.total ?? 0;
  const totalLiabilities = data?.liabilities.total ?? 0;
  const totalEquity = data?.equity.total ?? 0;
  const totalLE = data?.totalLiabilitiesAndEquity ?? 0;

  const prevTotalAssets = data?.assets.comparison ?? 0;
  const prevTotalLiabilities = data?.liabilities.comparison ?? 0;
  const prevTotalEquity = data?.equity.comparison ?? 0;

  const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : null;

  const debtToEquity = totalEquity !== 0 ? totalLiabilities / totalEquity : null;
  const equityRatio = totalAssets !== 0 ? (totalEquity / totalAssets) * 100 : null;

  const assetsPct = changePct(totalAssets, prevTotalAssets);
  const liabPct = changePct(totalLiabilities, prevTotalLiabilities);
  const eqPct = changePct(totalEquity, prevTotalEquity);

  const currentRatioBadge =
    currentRatio === null
      ? null
      : currentRatio >= 2
        ? { label: "Excellent", cls: "bg-green-100 text-green-700 hover:bg-green-100" }
        : currentRatio >= 1
          ? { label: "Good", cls: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" }
          : { label: "Poor", cls: "bg-red-100 text-red-700 hover:bg-red-100" };

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Balance Sheet</h1>
          <p className="text-sm text-primary">Statement of financial position showing assets, liabilities, and equity</p>
        </div>
        <div className="flex items-center gap-2 mt-6 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period type */}
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as ReportPeriodType)}>
            <SelectTrigger className="w-32 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{REPORT_PERIOD_TYPES.map((pt) => <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Period sub-selector */}
        {periodType !== "Annual" && (
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periodType === "Monthly"
                ? MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                : QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={String(year)} onValueChange={(v) => handleYearChange(Number(v))}>
          <SelectTrigger className="w-24 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>{FISCAL_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
        </Select>

        {/* Comparison */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Compare:</span>
          {showComparison && (
            <>
              {periodType !== "Annual" && (
                <Select value={cmpPeriod} onValueChange={setCmpPeriod}>
                  <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {periodType === "Monthly"
                      ? MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                      : QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <Select value={String(cmpYear)} onValueChange={(v) => setCmpYear(Number(v))}>
                <SelectTrigger className="w-24 h-9 text-sm bg-gray-100 border-0 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{FISCAL_YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowComparison((v) => !v)}
            className="rounded-xl"
          >
            {showComparison ? "Hide Comparison" : "Show Comparison"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Assets"
              value={fmt(totalAssets, sym)}
              sub={showComparison && prevTotalAssets ? `Previous: ${fmt(prevTotalAssets, sym)}` : undefined}
              badge={showComparison && assetsPct !== null ? (
                <Badge className={`${assetsPct >= 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"} hover:bg-opacity-90 rounded-full`}>
                  {assetsPct >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {assetsPct >= 0 ? "+" : ""}{assetsPct.toFixed(1)}%
                </Badge>
              ) : undefined}
            />
            <KPICard
              label="Total Liabilities"
              value={fmt(totalLiabilities, sym)}
              sub={showComparison && prevTotalLiabilities ? `Previous: ${fmt(prevTotalLiabilities, sym)}` : undefined}
              badge={showComparison && liabPct !== null ? (
                <Badge className={`${liabPct >= 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"} hover:bg-opacity-90 rounded-full`}>
                  {liabPct >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {liabPct >= 0 ? "+" : ""}{liabPct.toFixed(1)}%
                </Badge>
              ) : undefined}
            />
            <KPICard
              label="Total Equity"
              value={fmt(totalEquity, sym)}
              sub={showComparison && prevTotalEquity ? `Previous: ${fmt(prevTotalEquity, sym)}` : undefined}
              badge={showComparison && eqPct !== null ? (
                <Badge className={`${eqPct >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"} hover:bg-opacity-90 rounded-full`}>
                  {eqPct >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {eqPct >= 0 ? "+" : ""}{eqPct.toFixed(1)}%
                </Badge>
              ) : undefined}
            />
            <KPICard
              label="Current Ratio"
              value={currentRatio !== null ? currentRatio.toFixed(2) : "—"}
              sub={`Working Capital: ${fmt(currentAssets - currentLiabilities, sym)}`}
              badge={currentRatioBadge ? (
                <Badge className={`${currentRatioBadge.cls} rounded-full`}>{currentRatioBadge.label}</Badge>
              ) : undefined}
            />
          </div>

          {/* Balance Sheet Table */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200 bg-white rounded-t-2xl text-center py-5">
              <CardTitle className="text-slate-900 text-base">Balance Sheet</CardTitle>
              <p className="text-sm text-primary">Statement of Financial Position</p>
              <p className="text-sm text-slate-500 mt-1">As of {asOfLabel(periodType, period, year)}</p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Column headers */}
              <div className={`grid ${colClass} gap-4 py-3 px-6 bg-slate-100 border-b border-slate-200 sticky top-0`}>
                <div className="text-xs text-slate-600 uppercase tracking-wider">Account</div>
                <div className="text-xs text-slate-600 uppercase tracking-wider text-right">{asOfLabel(periodType, period, year)}</div>
                {showComparison && (
                  <>
                    <div className="text-xs text-slate-600 uppercase tracking-wider text-right">{asOfLabel(periodType, cmpPeriod, cmpYear)}</div>
                    <div className="text-xs text-slate-600 uppercase tracking-wider text-right">Change</div>
                  </>
                )}
              </div>

              {data ? (
                <>
                  {/* ── ASSETS ── */}
                  <div className="border-b-4 border-slate-300">
                    <div className="py-3 px-6 bg-slate-100">
                      <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-sm">Assets</h3>
                    </div>

                    <SubSection label="Current Assets" section={data.assets.current} sym={sym} showComparison={showComparison} colClass={colClass} />
                    <SubSection label="Non-Current Assets" section={data.assets.nonCurrent} sym={sym} showComparison={showComparison} colClass={colClass} />

                    {/* TOTAL ASSETS */}
                    <div className={`grid ${colClass} gap-4 py-4 px-6 bg-slate-100`}>
                      <div className="font-bold text-slate-900 uppercase text-sm">Total Assets</div>
                      <div className="text-right font-bold text-blue-700 text-sm">{fmt(totalAssets, sym)}</div>
                      {showComparison && (
                        <>
                          <div className="text-right font-bold text-blue-700 text-sm">{fmt(prevTotalAssets, sym)}</div>
                          <div className="text-right">
                            {assetsPct !== null && (
                              <Badge className="bg-blue-600 text-white hover:bg-blue-600 rounded-full">
                                {assetsPct >= 0 ? "+" : ""}{assetsPct.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── LIABILITIES & EQUITY ── */}
                  <div>
                    <div className="py-3 px-6 bg-slate-100">
                      <h3 className="font-semibold text-slate-900 uppercase tracking-wider text-sm">Liabilities &amp; Equity</h3>
                    </div>

                    <SubSection label="Current Liabilities" section={data.liabilities.current} sym={sym} showComparison={showComparison} colClass={colClass} />
                    <SubSection label="Non-Current Liabilities" section={data.liabilities.longTerm} sym={sym} showComparison={showComparison} colClass={colClass} />

                    {/* TOTAL LIABILITIES */}
                    <div className={`grid ${colClass} gap-4 py-3 px-6 border-b-2 border-slate-300`}>
                      <div className="font-bold text-slate-900 uppercase text-sm">Total Liabilities</div>
                      <div className="text-right font-bold text-orange-700 text-sm">{fmt(totalLiabilities, sym)}</div>
                      {showComparison && (
                        <>
                          <div className="text-right font-bold text-orange-700 text-sm">{fmt(prevTotalLiabilities, sym)}</div>
                          <div className="text-right">
                            {liabPct !== null && (
                              <Badge className="bg-orange-600 text-white hover:bg-orange-600 rounded-full">
                                {liabPct >= 0 ? "+" : ""}{liabPct.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Equity sub-sections */}
                    {data.equity.sections.map((s: BSSection) => (
                      <SubSection key={s.label} label={s.label} section={s} sym={sym} showComparison={showComparison} colClass={colClass} />
                    ))}

                    {/* Retained Earnings line */}
                    <div className={`grid ${colClass} gap-4 py-2.5 px-6 pl-14 border-t border-slate-100 hover:bg-slate-50`}>
                      <span className="text-sm text-slate-700">Retained Earnings</span>
                      <div className={`text-right text-sm ${data.equity.retainedEarnings < 0 ? "text-red-600" : "text-slate-700"}`}>
                        {fmt(data.equity.retainedEarnings, sym)}
                      </div>
                      {showComparison && (
                        <>
                          <div className={`text-right text-sm ${data.equity.retainedEarningsComparison < 0 ? "text-red-600" : "text-slate-600"}`}>
                            {fmt(data.equity.retainedEarningsComparison, sym)}
                          </div>
                          <ChangeCell current={data.equity.retainedEarnings} prev={data.equity.retainedEarningsComparison} />
                        </>
                      )}
                    </div>

                    {/* TOTAL EQUITY */}
                    <div className={`grid ${colClass} gap-4 py-3 px-6 border-t border-slate-200`}>
                      <div className="font-bold text-slate-900 uppercase text-sm">Total Equity</div>
                      <div className="text-right font-bold text-green-700 text-sm">{fmt(totalEquity, sym)}</div>
                      {showComparison && (
                        <>
                          <div className="text-right font-bold text-green-700 text-sm">{fmt(prevTotalEquity, sym)}</div>
                          <div className="text-right">
                            {eqPct !== null && (
                              <Badge className="bg-green-600 text-white hover:bg-green-600 rounded-full">
                                {eqPct >= 0 ? "+" : ""}{eqPct.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* TOTAL LIABILITIES & EQUITY */}
                    <div className={`grid ${colClass} gap-4 py-4 px-6 bg-slate-100`}>
                      <div className="font-bold text-slate-900 uppercase text-sm">Total Liabilities &amp; Equity</div>
                      <div className="text-right font-bold text-blue-700 text-sm">{fmt(totalLE, sym)}</div>
                      {showComparison && (
                        <>
                          <div className="text-right font-bold text-blue-700 text-sm">{fmt(data.totalLiabilitiesAndEquityComparison, sym)}</div>
                          <div className="text-right">
                            {changePct(totalLE, data.totalLiabilitiesAndEquityComparison) !== null && (
                              <Badge className="bg-blue-600 text-white hover:bg-blue-600 rounded-full">
                                {changePct(totalLE, data.totalLiabilitiesAndEquityComparison)! >= 0 ? "+" : ""}
                                {changePct(totalLE, data.totalLiabilitiesAndEquityComparison)!.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="px-6 py-16 text-center text-slate-400 text-sm">No data for this period.</div>
              )}
            </CardContent>
          </Card>

          {/* Financial Ratios */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-slate-900">Key Financial Ratios</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Current Ratio</p>
                  <p className="font-semibold text-slate-900">{currentRatio !== null ? currentRatio.toFixed(2) : "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">Current Assets ÷ Current Liabilities</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Debt-to-Equity Ratio</p>
                  <p className="font-semibold text-slate-900">{debtToEquity !== null ? debtToEquity.toFixed(2) : "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Liabilities ÷ Total Equity</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Equity Ratio</p>
                  <p className="font-semibold text-slate-900">{equityRatio !== null ? `${equityRatio.toFixed(1)}%` : "—"}</p>
                  <p className="text-xs text-slate-500 mt-1">Total Equity ÷ Total Assets</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Notes */}
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Report Notes</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• This balance sheet is prepared in accordance with generally accepted accounting principles (GAAP).</p>
                <p>• All amounts are presented in {sym} unless otherwise stated.</p>
                <p>• Assets are listed in order of liquidity, and liabilities in order of maturity.</p>
                <p>• Property, Plant &amp; Equipment is stated at cost less accumulated depreciation.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
