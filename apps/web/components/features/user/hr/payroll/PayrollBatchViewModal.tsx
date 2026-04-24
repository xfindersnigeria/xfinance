"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileSpreadsheet, Info } from "lucide-react";
import { usePayrollBatch, useDownloadBatchPdf, useExportBatchCsv } from "@/lib/api/hooks/useHR";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface Props { batchId: string }

const statusClass: Record<string, string> = {
  Approved: "bg-green-100 text-green-700",
  Pending:  "bg-yellow-100 text-yellow-700",
  Draft:    "bg-gray-100 text-gray-600",
  Rejected: "bg-red-100 text-red-600",
};

const date = (d: any) => d ? new Date(d).toLocaleDateString("en-NG") : "—";

export default function PayrollBatchViewModal({ batchId }: Props) {
  const sym = useEntityCurrencySymbol();
  const fmt = (n: number) => `${sym}${(n ?? 0).toLocaleString()}`;
  const { data, isLoading } = usePayrollBatch(batchId);
  const downloadPdf = useDownloadBatchPdf();
  const exportCsv   = useExportBatchCsv();

  const batch = (data as any)?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!batch) return <p className="text-center py-8 text-muted-foreground">Batch not found.</p>;

  const records: any[] = batch.records ?? [];
  const totalBasic      = records.reduce((s, r) => s + r.basicSalary, 0);
  const totalAllowances = records.reduce((s, r) => s + r.allowances, 0);
  const totalBonus      = records.reduce((s, r) => s + r.bonus, 0);
  const totalOvertime   = records.reduce((s, r) => s + r.overtime, 0);
  const totalGross      = records.reduce((s, r) => s + r.grossPay, 0);
  const totalStatDed    = records.reduce((s, r) => s + r.statutoryDed, 0);
  const totalOtherDed   = records.reduce((s, r) => s + r.otherDed, 0);
  const totalDed        = totalStatDed + totalOtherDed;
  const totalNet        = records.reduce((s, r) => s + r.netPay, 0);

  const metaItems = [
    { label: "Period",       value: batch.period },
    { label: "Pay Date",     value: date(batch.paymentDate) },
    { label: "Employees",    value: batch.totalEmployees },
    { label: "Total Amount", value: fmt(batch.totalAmount) },
    { label: "Pay Method",   value: batch.paymentMethod },
    {
      label: "Status",
      value: (
        <Badge className={`${statusClass[batch.status] ?? "bg-gray-100 text-gray-600"} px-2 py-0.5 text-xs font-medium`}>
          {batch.status}
        </Badge>
      ),
    },
    {
      label: "Created By",
      value: batch.createdBy
        ? `${batch.createdBy.firstName} ${batch.createdBy.lastName}`
        : "—",
    },
    { label: "Created On", value: date(batch.createdAt) },
    {
      label: "Approved By",
      value: batch.approvedBy
        ? `${batch.approvedBy.firstName} ${batch.approvedBy.lastName}`
        : "—",
    },
    { label: "Approved On", value: date(batch.approvedAt) },
  ];

  const summaryCards = [
    { label: "Total Basic Salary", value: fmt(totalBasic),      color: "bg-blue-50 border-blue-100" },
    { label: "Total Allowances",   value: fmt(totalAllowances), color: "bg-green-50 border-green-100" },
    { label: "Total Deductions",   value: fmt(totalDed),        color: "bg-red-50 border-red-100" },
    { label: "Total Net Pay",      value: fmt(totalNet),        color: "bg-primary/5 border-primary/20" },
  ];

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3 flex-wrap bg-green-100 p-2 rounded-lg">
        <div>
          <h2 className="text-base font-semibold text-foreground leading-tight">{batch.batchName}</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">ID: {batch.id}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="h-8 text-xs"
            disabled={downloadPdf.isPending}
            onClick={() => downloadPdf.mutate(batchId)}
          >
            {downloadPdf.isPending
              ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
              : <FileText className="w-3 h-3 mr-1.5" />}
            Export PDF
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate(batchId)}
          >
            {exportCsv.isPending
              ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
              : <FileSpreadsheet className="w-3 h-3 mr-1.5" />}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Meta grid — 5 per row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {metaItems.map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-muted/40 border px-2.5 py-2">
            <p className="text-[9px] uppercase text-muted-foreground tracking-wide mb-0.5 font-medium">{label}</p>
            <div className="text-xs font-semibold text-foreground leading-tight">{value}</div>
          </div>
        ))}
      </div>

      {/* Employee table */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-1.5">Employee Payroll Details</p>
        <div className="overflow-x-auto rounded-xl border text-[11px]">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b">
                {[
                  "Emp #","Name","Role","Dept",
                  "Basic","Allowances","Bonus","OT","Gross",
                  "Stat Ded","Other Ded","Net Pay",
                  "Bank","Acct No","Acct Type",
                ].map(h => (
                  <th key={h} className="px-2.5 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id ?? i} className="border-t hover:bg-muted/20">
                  <td className="px-2.5 py-1.5 text-muted-foreground">{r.employee?.employeeId ?? "—"}</td>
                  <td className="px-2.5 py-1.5 font-medium whitespace-nowrap">{r.employee?.firstName} {r.employee?.lastName}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{r.employee?.position ?? "—"}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{r.employee?.dept?.name ?? "—"}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(r.basicSalary)}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(r.allowances)}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(r.bonus)}</td>
                  <td className="px-2.5 py-1.5 text-right">{fmt(r.overtime)}</td>
                  <td className="px-2.5 py-1.5 text-right font-medium">{fmt(r.grossPay)}</td>
                  <td className="px-2.5 py-1.5 text-right text-red-500">{fmt(r.statutoryDed)}</td>
                  <td className="px-2.5 py-1.5 text-right text-red-500">{fmt(r.otherDed)}</td>
                  <td className="px-2.5 py-1.5 text-right font-semibold text-primary">{fmt(r.netPay)}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground whitespace-nowrap">{r.employee?.bankName ?? "—"}</td>
                  <td className="px-2.5 py-1.5 text-muted-foreground">
                    {r.employee?.accountNumber ? `****${String(r.employee.accountNumber).slice(-4)}` : "—"}
                  </td>
                  <td className="px-2.5 py-1.5 text-muted-foreground">{r.employee?.acountType ?? "—"}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 bg-muted/30 font-semibold">
                <td className="px-2.5 py-1.5" colSpan={4}>Totals</td>
                <td className="px-2.5 py-1.5 text-right">{fmt(totalBasic)}</td>
                <td className="px-2.5 py-1.5 text-right">{fmt(totalAllowances)}</td>
                <td className="px-2.5 py-1.5 text-right">{fmt(totalBonus)}</td>
                <td className="px-2.5 py-1.5 text-right">{fmt(totalOvertime)}</td>
                <td className="px-2.5 py-1.5 text-right">{fmt(totalGross)}</td>
                <td className="px-2.5 py-1.5 text-right text-red-500">{fmt(totalStatDed)}</td>
                <td className="px-2.5 py-1.5 text-right text-red-500">{fmt(totalOtherDed)}</td>
                <td className="px-2.5 py-1.5 text-right text-primary">{fmt(totalNet)}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 ${color}`}>
            <p className="text-[10px] uppercase text-muted-foreground tracking-wide font-medium mb-1">{label}</p>
            <p className="text-base font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Info line */}
      <div className="flex items-center gap-2 rounded-lg bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 shrink-0" />
        <span>
          This batch contains <span className="font-semibold text-foreground">{records.length} employee record{records.length !== 1 ? "s" : ""}</span>.
          Export to PDF or CSV for complete details.
        </span>
      </div>
    </div>
  );
}
