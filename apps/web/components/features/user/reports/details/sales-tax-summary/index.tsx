"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSalesTaxSummary } from "@/lib/api/hooks/useReports";
import {
  fmtAmount,
  fmtAmountCompact,
  useEntityBaseCurrency,
  useEntityCurrencySymbol,
} from "@/lib/api/hooks/useCurrencyFormat";
import { SalesTaxSummaryData } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportExportButtons } from "../../ReportExportButtons";
import type { ReportExportPayload } from "@/lib/reports/export-types";
import {
  ReportPeriodType,
  periodToDates,
  defaultPeriodValue,
  getPeriodEndLabel,
} from "@/lib/period-utils";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

const tooltipStyle = {
  contentStyle: { backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" },
};

function KPICard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "green" | "red" | "primary" }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          tone === "green" ? "text-green-600" : tone === "red" ? "text-red-500" : tone === "primary" ? "text-primary" : "text-slate-900",
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const fmtRate = (rate: number | null) => (rate == null ? "Amount-based" : `${rate}%`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function SalesTaxSummary() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const currency = useEntityBaseCurrency();
  const now = new Date();

  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());

  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useSalesTaxSummary({ startDate, endDate });
  const data: SalesTaxSummaryData | null = (rawData as any)?.data ?? null;
  const summary = data?.summary;
  const byRate = data?.byRate ?? [];
  const transactions = data?.transactions ?? [];

  const unposted = summary ? Math.abs(summary.ledgerNetMovement - summary.netTaxPayable) >= 1 : false;

  const chartData = (data?.trend ?? []).map((t) => ({ period: t.label, "Output VAT": t.outputTax, "Input VAT": t.inputTax }));

  const buildExport = (): ReportExportPayload | null => {
    if (!data || !summary) return null;
    return {
      title: "Sales Tax Summary",
      scope: "entity",
      period: getPeriodEndLabel(periodType, period, year),
      currency,
      summary: [
        { label: "Output VAT", value: summary.outputTax, format: "amount" },
        { label: "Input VAT", value: summary.inputTax, format: "amount" },
        { label: "Net VAT Payable", value: summary.netTaxPayable, format: "amount" },
        { label: "Effective Output Rate", value: summary.effectiveOutputRate, format: "percent" },
      ],
      columns: [
        { key: "direction", label: "Direction" },
        { key: "source", label: "Source" },
        { key: "rate", label: "Rate" },
        { key: "docs", label: "Documents", format: "number" },
        { key: "taxable", label: "Taxable Amount", format: "amount" },
        { key: "tax", label: "Tax", format: "amount" },
      ],
      sections: [
        {
          title: "Tax Summary by Rate",
          rows: [
            ...byRate.map((r) => ({
              cells: { direction: r.direction, source: r.source, rate: fmtRate(r.rate), docs: r.documentCount, taxable: r.taxableAmount, tax: r.tax },
            })),
            { kind: "subtotal" as const, cells: { direction: "Output VAT", taxable: summary.taxableSales, tax: summary.outputTax } },
            { kind: "subtotal" as const, cells: { direction: "Input VAT", taxable: summary.taxablePurchases, tax: summary.inputTax } },
            { kind: "total" as const, cells: { direction: "Net VAT Payable", tax: summary.netTaxPayable } },
          ],
        },
        {
          title: "Tax Transactions",
          columns: [
            { key: "date", label: "Date" },
            { key: "type", label: "Type" },
            { key: "reference", label: "Reference" },
            { key: "party", label: "Customer / Vendor" },
            { key: "rate", label: "Rate" },
            { key: "taxable", label: "Taxable Amount", format: "amount" },
            { key: "tax", label: "Tax", format: "amount" },
          ],
          rows: transactions.map((t) => ({
            cells: {
              date: fmtDate(t.date),
              type: `${t.type} (${t.direction})`,
              reference: t.reference,
              party: t.party,
              rate: fmtRate(t.rate),
              taxable: t.taxableAmount,
              tax: t.tax,
            },
          })),
        },
      ],
      warnings: unposted
        ? [`Posted VAT in the ledger for this period is ${fmtAmount(summary.ledgerNetMovement, sym)}; some documents may not have posted yet.`]
        : [],
      notes: [
        "Output VAT is from invoices and income receipts at each document's own tax rate; input VAT is the tax recorded on bills and approved expenses.",
      ],
      landscape: true,
    };
  };

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
          <h1 className="text-xl font-semibold text-slate-900">Sales Tax Summary</h1>
          <p className="text-sm text-slate-500 mt-0.5">VAT charged on sales against VAT paid on purchases</p>
        </div>
        <div className="mt-7">
          <ReportExportButtons getPayload={buildExport} disabled={isLoading || !data} />
        </div>
      </div>

      <ReportPeriodFilter
        periodType={periodType}
        period={period}
        year={year}
        onPeriodTypeChange={handlePeriodTypeChange}
        onPeriodChange={setPeriod}
        onYearChange={setYear}
      />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {!isLoading && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard label="Output VAT" value={fmtAmount(summary.outputTax, sym)} sub={`On ${fmtAmount(summary.taxableSales, sym)} taxable sales`} />
            <KPICard label="Input VAT" value={fmtAmount(summary.inputTax, sym)} sub={`On ${fmtAmount(summary.taxablePurchases, sym)} taxable purchases`} />
            <KPICard
              label={summary.netTaxPayable >= 0 ? "Net VAT Payable" : "Net VAT Refundable"}
              value={fmtAmount(Math.abs(summary.netTaxPayable), sym)}
              tone={summary.netTaxPayable >= 0 ? "red" : "green"}
            />
            <KPICard label="Effective Output Rate" value={`${summary.effectiveOutputRate.toFixed(2)}%`} tone="primary" />
          </div>

          {unposted && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                The VAT posted to the ledger for this period is {fmtAmount(summary.ledgerNetMovement, sym)}, which differs from the
                documents below — some invoices, receipts, bills or expenses may not have posted yet.
              </span>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <p className="font-semibold text-slate-800 mb-4">Output vs Input VAT (last 6 months)</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => fmtAmountCompact(v, sym)} axisLine={false} tickLine={false} width={70} />
                  <Tooltip {...tooltipStyle} formatter={(v: number) => fmtAmount(v, sym)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Output VAT" fill="#4152b6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Input VAT" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By rate */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Tax Summary by Rate</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Documents</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Taxable Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {byRate.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center text-slate-400 text-sm">No taxed documents in this period.</td>
                    </tr>
                  ) : (
                    <>
                      {byRate.map((r) => (
                        <tr key={`${r.source}-${r.rate}`} className="border-t border-slate-50 hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-sm text-slate-800">
                            <span
                              className={cn(
                                "mr-2 inline-block rounded-full px-2 py-0.5 text-xs",
                                r.direction === "Output" ? "bg-primary/10 text-primary" : "bg-green-100 text-green-700",
                              )}
                            >
                              {r.direction}
                            </span>
                            {r.source}
                          </td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtRate(r.rate)}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{r.documentCount}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtAmount(r.taxableAmount, sym)}</td>
                          <td className="px-5 py-3 text-right text-sm font-medium text-slate-800">{fmtAmount(r.tax, sym)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/80">
                        <td className="px-5 py-3 text-sm font-semibold text-slate-900" colSpan={4}>
                          Net VAT {summary.netTaxPayable >= 0 ? "Payable" : "Refundable"}
                        </td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">{fmtAmount(summary.netTaxPayable, sym)}</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Tax Transactions</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer / Vendor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Taxable Amount</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center text-slate-400 text-sm">No tax transactions in this period.</td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={`${t.type}-${t.id}`} className="border-t border-slate-50 hover:bg-slate-50/60">
                        <td className="px-5 py-3 text-sm text-slate-600">{fmtDate(t.date)}</td>
                        <td className="px-5 py-3 text-sm text-slate-700">{t.type}</td>
                        <td className="px-5 py-3 text-sm text-slate-800">{t.reference}</td>
                        <td className="px-5 py-3 text-sm text-slate-600">{t.party || "—"}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtRate(t.rate)}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-600">{fmtAmount(t.taxableAmount, sym)}</td>
                        <td className={cn("px-5 py-3 text-right text-sm font-medium", t.direction === "Output" ? "text-slate-800" : "text-green-600")}>
                          {t.direction === "Input" ? `(${fmtAmount(t.tax, sym)})` : fmtAmount(t.tax, sym)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
