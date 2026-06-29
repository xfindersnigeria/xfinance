"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Download, Loader2, Search } from "lucide-react";
import { usePayeReport, useDownloadPayeReportCsv } from "@/lib/api/hooks/useHR";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export default function PAYEReport() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: reportData, isLoading } = usePayeReport(year);
  const report = (reportData as any)?.data;
  const exportCsv = useDownloadPayeReportCsv();

  const sym = useEntityCurrencySymbol();
  const fmt = (n?: number | null) =>
    n != null ? `${sym}${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—";

  const employees: any[] = report?.employees ?? [];
  const stats = report?.stats ?? {};
  const taxBands: any[] = report?.taxBands ?? [];
  const allowableDeductionNames: string[] = report?.allowableDeductionNames ?? [];

  const filtered = employees.filter((e) =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.tin.includes(search),
  );

  const bandLabel = (b: any) => {
    if (b.to == null) return `Above ₦${(b.from / 1000000).toFixed(0)}M @ ${b.rate}%`;
    const from = b.from === 0 ? `First ₦${b.to / 1000}k` : `Next ₦${((b.to - b.from) / 1000000).toFixed(1)}M`;
    return `${from} @ ${b.rate}%`;
  };

  return (
    <div className="space-y-4">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">PAYE Report</h3>
          <p className="text-xs text-muted-foreground">Pay As You Earn computation and remittance schedule</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-xs border rounded-lg px-3 py-2 bg-background"
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - i).map((y) => (
              <option key={y} value={y}>AY {y}</option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 text-xs"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate(year)}
          >
            {exportCsv.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export FIRS Schedule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Total Employees</div>
          <div className="text-2xl font-bold">{stats.totalEmployees ?? 0}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Monthly PAYE Due</div>
          <div className="text-2xl font-bold">{fmt(stats.monthlyPayeDue)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-1">Annual PAYE Due</div>
          <div className="text-2xl font-bold">{fmt(stats.annualPayeDue)}</div>
        </div>
        <div className="bg-white border rounded-xl p-4 border-green-200 bg-green-50">
          <div className="text-xs text-gray-500 mb-1">Pending Remittance</div>
          <div className="text-2xl font-bold text-green-700">{fmt(stats.pendingRemittance)}</div>
          {stats.remittedCount != null && (
            <div className="text-xs text-gray-400 mt-1">{stats.remittedCount}/{stats.totalEmployees ?? 0} remitted</div>
          )}
        </div>
      </div>

      {/* Tax bands info */}
      {taxBands.length > 0 && (
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <div className="text-xs font-semibold text-gray-600">FIRS Tax Bands (Assessment Year {year})</div>
          <div className="flex flex-wrap gap-2">
            {taxBands.map((b: any, i: number) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full border font-medium"
                style={{ backgroundColor: `hsl(${210 + i * 30}, 70%, 92%)`, borderColor: `hsl(${210 + i * 30}, 60%, 75%)`, color: `hsl(${210 + i * 30}, 60%, 30%)` }}
              >
                {bandLabel(b)}
              </span>
            ))}
          </div>
          <div className="text-xs text-gray-400">
            {allowableDeductionNames.map((n, i) => (
              <span key={n}>{i > 0 && " · "}{n}</span>
            ))}
            {allowableDeductionNames.length > 0 && " · "}Rent relief: lower of actual rent or ₦500,000
          </div>
        </div>
      )}

      {/* Schedule table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="text-xs font-semibold">PAYE Computation Schedule</div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search by name or TIN..."
              className="pl-8 h-8 text-xs w-52"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            {/* Header */}
            <div className="grid text-xs font-semibold text-gray-500 bg-gray-50 px-4 py-2 border-b min-w-[900px]"
              style={{ gridTemplateColumns: "2rem 1fr 8rem 7rem 7rem 7rem 7rem 7rem 7rem 7rem 7rem" }}>
              <span>#</span>
              <span>Employee</span>
              <span>TIN</span>
              <span>Annual Gross</span>
              {allowableDeductionNames.map((n) => <span key={n}>{n}</span>)}
              <span>Rent Relief</span>
              <span>Chargeable</span>
              <span>Annual Tax</span>
              <span>Monthly Tax</span>
              <span>Remittance</span>
            </div>

            {filtered.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400">No employees found</div>
            ) : (
              filtered.map((emp: any) => {
                const isOpen = openRow === emp.employeeId;
                return (
                  <div key={emp.employeeId} className="border-b last:border-0">
                    {/* Row */}
                    <div
                      className="grid text-xs px-4 py-3 items-center cursor-pointer hover:bg-gray-50 min-w-[900px]"
                      style={{ gridTemplateColumns: "2rem 1fr 8rem 7rem 7rem 7rem 7rem 7rem 7rem 7rem 7rem" }}
                      onClick={() => setOpenRow(isOpen ? null : emp.employeeId)}
                    >
                      <span className="text-gray-400">{emp.sn}</span>
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-gray-400">{emp.position}</div>
                      </div>
                      <span className="text-gray-600">{emp.tin || "—"}</span>
                      <span className="font-medium">{fmt(emp.annualGross)}</span>
                      {allowableDeductionNames.map((n) => {
                        const found = emp.deductionLines?.find((d: any) => d.name === n);
                        return <span key={n}>{fmt(found?.amount ?? 0)}</span>;
                      })}
                      <span>{fmt(emp.rentRelief)}</span>
                      <span>{fmt(emp.chargeableIncome)}</span>
                      <span className="text-red-600 font-medium">{fmt(emp.annualTax)}</span>
                      <span className="text-red-600 font-medium">{fmt(emp.monthlyTax)}</span>
                      <div className="flex items-center gap-1">
                        {emp.remittanceStatus === "Remitted" ? (
                          <Badge className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full">Remitted</Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 text-[10px] px-2 py-0.5 rounded-full">Mark Remitted</Badge>
                        )}
                        {isOpen ? <ChevronUp className="w-3 h-3 text-gray-400 ml-auto" /> : <ChevronDown className="w-3 h-3 text-gray-400 ml-auto" />}
                      </div>
                    </div>

                    {/* Accordion content */}
                    {isOpen && (
                      <div className="bg-gray-50 px-6 py-3 border-t text-xs space-y-3">
                        <div className="font-semibold text-gray-600 uppercase tracking-wide text-[10px]">
                          Tax Band Breakdown — {emp.name.toUpperCase()}
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {(emp.taxBandBreakdown ?? []).map((b: any, i: number) => (
                            <div key={i} className="bg-white border rounded-lg p-2">
                              <div className="text-gray-400 text-[10px]">
                                {b.to == null
                                  ? `Above ₦${(b.from / 1000000).toFixed(0)}M @ ${b.rate}%`
                                  : b.from === 0
                                  ? `First ₦${b.to / 1000}k @ ${b.rate}%`
                                  : `Next ₦${((b.to - b.from) / 1000000).toFixed(1)}M @ ${b.rate}%`}
                              </div>
                              <div className="font-semibold mt-1">{fmt(b.amount)}</div>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                          {emp.fctTaxpayerId && <span>FCT Taxpayer ID: <strong>{emp.fctTaxpayerId}</strong></span>}
                          <span>Chargeable Income: <strong className="text-red-600">{fmt(emp.chargeableIncome)}</strong></span>
                          <span>Annual Tax: <strong className="text-red-600">{fmt(emp.annualTax)}</strong></span>
                          <span>Monthly Tax: <strong className="text-red-600">{fmt(emp.monthlyTax)}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Totals footer */}
            {filtered.length > 0 && (
              <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 flex gap-6 border-t min-w-[900px]">
                <span>Totals ({filtered.length} employees)</span>
                <span className="ml-auto">Annual Tax: {fmt(filtered.reduce((s: number, e: any) => s + (e.annualTax ?? 0), 0))}</span>
                <span>Monthly Tax: {fmt(filtered.reduce((s: number, e: any) => s + (e.monthlyTax ?? 0), 0))}</span>
                <span>Pending: {fmt(filtered.filter((e: any) => e.remittanceStatus === "Pending").reduce((s: number, e: any) => s + (e.monthlyTax ?? 0), 0))}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
