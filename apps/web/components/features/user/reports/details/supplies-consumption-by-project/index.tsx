"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronRight, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSuppliesConsumptionByProject } from "@/lib/api/hooks/useReports";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { SuppliesConsumptionByProjectData, SuppliesConsumptionByProjectRow } from "@/lib/api/services/reportService";
import { ReportPeriodFilter } from "../../ReportPeriodFilter";
import { ReportPeriodType, periodToDates, defaultPeriodValue } from "@/lib/period-utils";

function fmtShort(v: number, sym: string): string {
  if (v === 0) return `${sym}0`;
  const a = Math.abs(v);
  const s = a >= 1_000_000 ? `${sym}${(a / 1_000_000).toFixed(1)}M` : a >= 1_000 ? `${sym}${(a / 1_000).toFixed(0)}K` : `${sym}${a.toLocaleString("en")}`;
  return v < 0 ? `(${s})` : s;
}

function KPICard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-1">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ProjectRow({ row, sym }: { row: SuppliesConsumptionByProjectRow; sym: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-t border-slate-50 hover:bg-slate-50/60 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="px-4 py-3 w-8">
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        </td>
        <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.projectName}</td>
        <td className="px-4 py-3 text-right text-sm text-slate-700">{row.totalQuantity.toLocaleString("en")}</td>
        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">{fmtShort(row.totalValue, sym)}</td>
      </tr>
      {expanded && row.items.map(item => (
        <tr key={item.supplyId} className="bg-slate-50 border-t border-slate-100">
          <td />
          <td className="px-4 py-2 pl-10 text-xs text-slate-500">{item.supplyName}</td>
          <td className="px-4 py-2 text-right text-xs text-slate-500">{item.quantity}</td>
          <td className="px-4 py-2 text-right text-xs text-slate-600">{fmtShort(item.totalValue, sym)}</td>
        </tr>
      ))}
    </>
  );
}

export default function SuppliesConsumptionByProject() {
  const router = useRouter();
  const sym = useEntityCurrencySymbol();
  const now = new Date();
  const [periodType, setPeriodType] = useState<ReportPeriodType>("Monthly");
  const [period, setPeriod] = useState(() => defaultPeriodValue("Monthly"));
  const [year, setYear] = useState(now.getFullYear());
  const handlePeriodTypeChange = (t: ReportPeriodType) => { setPeriodType(t); setPeriod(defaultPeriodValue(t)); };
  const { startDate, endDate } = periodToDates(periodType, period, year);
  const { data: rawData, isLoading } = useSuppliesConsumptionByProject({ startDate, endDate });
  const data: SuppliesConsumptionByProjectData | null = (rawData as any)?.data ?? null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-2 w-fit"><ArrowLeft className="w-4 h-4" /> Back to Reports</button>
          <h1 className="text-xl font-semibold text-slate-900">Supplies Consumption by Project</h1>
          <p className="text-sm text-slate-500 mt-0.5">Supply usage and cost grouped by project</p>
        </div>
        <div className="flex items-center gap-2 mt-7 shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Printer className="w-4 h-4" /> Print</Button>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl"><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      <ReportPeriodFilter periodType={periodType} period={period} year={year} onPeriodTypeChange={handlePeriodTypeChange} onPeriodChange={setPeriod} onYearChange={setYear} />

      {isLoading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      )}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KPICard label="Total Quantity" value={String(data?.summary.totalQuantity ?? 0)} />
            <KPICard label="Total Value" value={fmtShort(data?.summary.totalValue ?? 0, sym)} />
            <KPICard label="Projects" value={String(data?.summary.projectCount ?? 0)} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><p className="font-semibold text-slate-900">Consumption by Project</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-3 w-8" />
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Qty</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length ? data.rows.map((row: SuppliesConsumptionByProjectRow) => (
                    <ProjectRow key={row.projectId ?? row.projectName} row={row} sym={sym} />
                  )) : (
                    <tr><td colSpan={4} className="px-5 py-16 text-center text-slate-400 text-sm">No consumption data found.</td></tr>
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
