"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronDown, ChevronRight, Download, Printer } from "lucide-react";
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
import { useTrialBalance } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { TBSection, TBAccountLine } from "@/lib/api/services/reportService";
import {
  MONTHS,
  QUARTERS,
  REPORT_PERIOD_TYPES,
  ReportPeriodType,
  getFiscalYears,
  periodToDates,
  getPeriodEndLabel,
  defaultPeriodValue,
} from "@/lib/period-utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FISCAL_YEARS = getFiscalYears();

// Pluralised section labels for accordion headers
const SECTION_LABEL: Record<string, string> = {
  "1000": "Assets",
  "2000": "Liabilities",
  "3000": "Equity",
  "4000": "Income",
  "5000": "Expenses",
};

// Badge colour per linkedType
const BADGE_CLS: Record<string, string> = {
  SPP: "bg-blue-100 text-blue-700",
  PAL: "bg-yellow-100 text-yellow-800",
};

function fmt(amount: number, sym: string): string {
  if (amount === 0) return "—";
  const abs = Math.abs(amount);
  const formatted = `${sym}${abs.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return amount < 0 ? `(${formatted})` : formatted;
}

function amountCls(amount: number): string {
  if (amount < 0) return "text-red-600";
  return "";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TBSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-[600px] rounded-2xl" />
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sym,
  valueColour,
  children,
}: {
  label: string;
  value?: number;
  sym: string;
  valueColour?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col gap-1.5">
      <p className="text-xs text-gray-500">{label}</p>
      {children ?? (
        <p className={cn("text-lg font-semibold", valueColour ?? "text-gray-900")}>
          {fmt(value ?? 0, sym)}
        </p>
      )}
    </div>
  );
}

// ─── Section (accordion) ──────────────────────────────────────────────────────

function SectionRows({
  section,
  collapsed,
  onToggle,
  sym,
}: {
  section: TBSection;
  collapsed: boolean;
  onToggle: () => void;
  sym: string;
}) {
  const sectionLabel = SECTION_LABEL[section.typeCode] ?? section.typeName;

  return (
    <>
      {/* Accordion header */}
      <tr
        className="bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5" colSpan={4}>
          <div className="flex items-center gap-2">
            {collapsed
              ? <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                section.linkedType === "SPP" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-800",
              )}
            >
              {sectionLabel}
            </span>
            <span className="text-xs text-gray-400">{section.accounts.length} accounts</span>
          </div>
        </td>
        <td className={cn("px-4 py-2.5 text-right text-xs font-semibold", amountCls(section.totalOpeningBalance))}>
          {fmt(section.totalOpeningBalance, sym)}
        </td>
        <td className="px-4 py-2.5 text-right text-xs font-semibold text-red-600">
          {fmt(section.totalDebit, sym)}
        </td>
        <td className="px-4 py-2.5 text-right text-xs font-semibold text-green-600">
          {fmt(section.totalCredit, sym)}
        </td>
        <td className={cn("px-4 py-2.5 text-right text-xs font-semibold", amountCls(section.totalClosingBalance))}>
          {fmt(section.totalClosingBalance, sym)}
        </td>
      </tr>

      {/* Account rows */}
      {!collapsed &&
        section.accounts.map((acc: TBAccountLine) => (
          <tr key={acc.id} className="hover:bg-gray-50 border-t border-gray-50">
            <td className="px-4 py-2.5">
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", BADGE_CLS[acc.linkedType] ?? "bg-gray-100 text-gray-600")}>
                {acc.linkedType}
              </span>
            </td>
            <td className="px-4 py-2.5 text-xs text-gray-700">{acc.typeName}</td>
            <td className="px-4 py-2.5 text-xs text-gray-800 font-medium max-w-[180px] truncate">
              {acc.subCategoryName}
            </td>
            <td className="px-4 py-2.5 text-xs text-primary truncate max-w-[180px]">
              {acc.name}
            </td>
            <td className={cn("px-4 py-2.5 text-right text-xs", amountCls(acc.openingBalance))}>
              {fmt(acc.openingBalance, sym)}
            </td>
            <td className={cn("px-4 py-2.5 text-right text-xs", acc.debitAmount > 0 ? "text-red-600" : "text-gray-400")}>
              {fmt(acc.debitAmount, sym)}
            </td>
            <td className={cn("px-4 py-2.5 text-right text-xs", acc.creditAmount > 0 ? "text-green-600" : "text-gray-400")}>
              {fmt(acc.creditAmount, sym)}
            </td>
            <td className={cn("px-4 py-2.5 text-right text-xs font-medium", amountCls(acc.closingBalance))}>
              {fmt(acc.closingBalance, sym)}
            </td>
          </tr>
        ))}

      {/* Section total row */}
      {!collapsed && (
        <tr className="border-t border-gray-200 bg-white">
          <td colSpan={4} className="px-4 py-2.5 text-xs font-bold text-gray-700 uppercase tracking-wide">
            Total {sectionLabel}
          </td>
          <td className={cn("px-4 py-2.5 text-right text-xs font-bold", amountCls(section.totalOpeningBalance))}>
            {fmt(section.totalOpeningBalance, sym)}
          </td>
          <td className="px-4 py-2.5 text-right text-xs font-bold text-red-600">
            {fmt(section.totalDebit, sym)}
          </td>
          <td className="px-4 py-2.5 text-right text-xs font-bold text-green-600">
            {fmt(section.totalCredit, sym)}
          </td>
          <td className={cn("px-4 py-2.5 text-right text-xs font-bold", amountCls(section.totalClosingBalance))}>
            {fmt(section.totalClosingBalance, sym)}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrialBalance() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();

  const now = new Date();
  const curYear = now.getFullYear();

  // Default: current month
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(curYear);

  const handlePeriodTypeChange = (t: ReportPeriodType) => {
    setPeriodType(t);
    setPeriod(defaultPeriodValue(t));
  };

  const { startDate, endDate } = periodToDates(periodType, period, year);

  const { data: tbRaw, isLoading } = useTrialBalance({ startDate, endDate });
  const tb = (tbRaw as any)?.data ?? null;

  // All sections start expanded
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (typeCode: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(typeCode) ? next.delete(typeCode) : next.add(typeCode);
      return next;
    });

  const periodLabel = getPeriodEndLabel(periodType, period, year);

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-1 w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>
          <h1 className="text-xl font-semibold">Trial Balance</h1>
          <p className="text-sm text-primary">Summarised debit and credit balances by account</p>
        </div>
        <div className="flex items-center gap-2 mt-6 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-500" />
          <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as ReportPeriodType)}>
            <SelectTrigger className="w-32 h-9 text-sm bg-gray-100 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_PERIOD_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {periodType !== "Annual" && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periodType === "Monthly"
                ? MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                : QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-24 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FISCAL_YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <TBSkeleton />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard label="Opening Balance" value={tb?.totalOpeningBalance ?? 0} sym={sym} />
            <KPICard label="Total Debits" value={tb?.grandTotalDebit ?? 0} sym={sym} valueColour="text-red-600" />
            <KPICard label="Total Credits" value={tb?.grandTotalCredit ?? 0} sym={sym} valueColour="text-green-600" />
            <KPICard label="Closing Balance" value={tb?.totalClosingBalance ?? 0} sym={sym} />
            <KPICard label="Status" sym={sym}>
              {tb ? (
                tb.isBalanced ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-semibold text-green-700">In Balance</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5 mt-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-sm font-semibold text-red-700">Out of Balance</span>
                    </div>
                    <p className="text-xs text-red-600">
                      Difference: {sym}{tb.difference.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )
              ) : (
                <span className="text-sm text-gray-400">—</span>
              )}
            </KPICard>
          </div>

          {/* Report Document */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Document header */}
            <div className="text-center py-5 border-b">
              <p className="font-semibold text-base">Trial Balance</p>
              <p className="text-primary text-sm mt-0.5">Summarised Debit and Credit Balances by Account</p>
              <p className="text-gray-500 text-sm mt-0.5">{periodLabel}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-16">Class</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide w-28">Acct Type</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Account Heading</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Opening Bal</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Debit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Credit</th>
                    <th className="px-4 py-3 text-right text-[10px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Closing Bal</th>
                  </tr>
                </thead>
                <tbody>
                  {tb?.sections?.map((section: TBSection) => (
                    <SectionRows
                      key={section.typeCode}
                      section={section}
                      collapsed={collapsed.has(section.typeCode)}
                      onToggle={() => toggle(section.typeCode)}
                      sym={sym}
                    />
                  ))}

                  {/* Grand Total */}
                  {tb && (
                    <tr className="bg-[#0d1b2a]">
                      <td colSpan={4} className="px-4 py-4 text-sm font-bold text-white uppercase tracking-wide">
                        Grand Total
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap">
                        —
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-red-400 whitespace-nowrap">
                        {fmt(tb.grandTotalDebit, sym)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-green-400 whitespace-nowrap">
                        {fmt(tb.grandTotalCredit, sym)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-gray-300 whitespace-nowrap">
                        —
                      </td>
                    </tr>
                  )}

                  {!tb && (
                    <tr>
                      <td colSpan={8} className="px-4 py-16 text-center text-gray-400 text-sm">
                        No accounts found for this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">
                All amounts in {sym}. Figures in parentheses represent negative balances.{" "}
                SPP = Special Purpose Portfolio &middot; PAL = Profit and Loss
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
