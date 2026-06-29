"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { usePayrollRecord, useDownloadPayslip } from "@/lib/api/hooks/useHR";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { Loader2, Download } from "lucide-react";

function PayslipModal({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const key = `${MODAL.PAYROLL_SLIP_VIEW}-${row.id}`;
  const { data: recordData, isLoading } = usePayrollRecord(isOpen(key) ? row.id : "");
  const record = (recordData as any)?.data;
  const downloadPdf = useDownloadPayslip();

  const sym = useEntityCurrencySymbol();
  const fmt = (n?: number | null) => (n != null ? `${sym}${Number(n).toLocaleString("en-NG", { minimumFractionDigits: 2 })}` : "—");

  const breakdown = record?.deductionBreakdown as { statutory?: any[]; other?: any[] } | undefined;
  const statutoryLines: any[] = breakdown?.statutory ?? [];
  const otherLines: any[] = breakdown?.other ?? [];

  return (
    <>
      <Button size="sm" variant="outline" className="rounded-xl text-xs gap-1"
        onClick={() => openModal(key)}
      >
        <FileText className="w-3.5 h-3.5" /> View Payslip
      </Button>

      <CustomModal
        title="Payslip"
        open={isOpen(key)}
        onOpenChange={(open) => open ? openModal(key) : closeModal(key)}
        module={MODULES.HR_PAYROLL}
        width="sm:max-w-lg"
      >
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary w-8 h-8" /></div>
        ) : record ? (
          <div className="pb-4 text-sm">
            {/* Period header */}
            <div className="text-center text-xs text-gray-500 mb-3 border-b pb-2">
              <span className="font-medium">Period: {record.batch?.period}</span>
              {record.batch?.paymentDate && (
                <span className="ml-2">| Pay Date: {new Date(record.batch.paymentDate).toLocaleDateString("en-GB")}</span>
              )}
            </div>

            {/* Company + Employee Info */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Company Information</div>
                <div className="text-sm font-semibold">{record.entity?.name}</div>
                {record.entity?.address && <div className="text-xs text-gray-500">{record.entity.address}</div>}
                {record.entity?.email && <div className="text-xs text-gray-500">{record.entity.email}</div>}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Employee Information</div>
                <div className="text-sm font-semibold">{record.employee?.firstName} {record.employee?.lastName}</div>
                <div className="text-xs text-gray-500">{record.employee?.position}</div>
                {record.employee?.employeeId && <div className="text-xs text-gray-400">ID: {record.employee.employeeId}</div>}
              </div>
            </div>

            <div className="border-t pt-3 mb-3">
              {/* Earnings */}
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Earnings</div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs"><span>Basic Salary</span><span className="font-medium">{fmt(record.basicSalary)}</span></div>
                {(record.allowances ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-600"><span className="pl-2">Allowances</span><span>+{fmt(record.allowances)}</span></div>
                )}
                {(record.bonus ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-600"><span className="pl-2">Bonus</span><span>+{fmt(record.bonus)}</span></div>
                )}
                {(record.overtime ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-600"><span className="pl-2">Overtime</span><span>+{fmt(record.overtime)}</span></div>
                )}
                <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                  <span>Gross Pay</span><span>{fmt(record.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border-t pt-3 mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</div>

              {statutoryLines.length > 0 ? (
                <>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Statutory Deductions</div>
                  <div className="space-y-1 mb-2">
                    {statutoryLines.map((d: any) => (
                      <div key={d.name} className="flex justify-between text-xs">
                        <div>
                          <span>{d.name}</span>
                          {d.type === 'TIERED' && <div className="text-gray-400 text-[10px]">Progressive tax per FIRS bands</div>}
                          {d.type === 'PERCENTAGE' && d.rate && <div className="text-gray-400 text-[10px]">{d.rate}% of gross salary</div>}
                        </div>
                        <span className="text-red-600 font-medium">-{fmt(d.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-semibold border-t pt-1">
                      <span>Total Statutory Deductions</span>
                      <span className="text-red-600">-{fmt(statutoryLines.reduce((s: number, d: any) => s + (d.amount ?? 0), 0))}</span>
                    </div>
                  </div>
                </>
              ) : (record.statutoryDed ?? 0) > 0 ? (
                <div className="flex justify-between text-xs mb-2">
                  <span>Statutory Deductions</span>
                  <span className="text-red-600 font-medium">-{fmt(record.statutoryDed)}</span>
                </div>
              ) : null}

              {otherLines.length > 0 ? (
                <>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Other Deductions</div>
                  <div className="space-y-1">
                    {otherLines.map((d: any) => (
                      <div key={d.name} className="flex justify-between text-xs">
                        <span>{d.name}</span>
                        <span className="text-red-600 font-medium">-{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (record.otherDed ?? 0) > 0 ? (
                <div className="flex justify-between text-xs mb-2">
                  <span>Other Deductions</span>
                  <span className="text-red-600 font-medium">-{fmt(record.otherDed)}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-xs font-bold border-t pt-1 mt-1">
                <span>Total Deductions</span>
                <span className="text-red-700">-{fmt((record.statutoryDed ?? 0) + (record.otherDed ?? 0))}</span>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-primary to-primary/70 rounded-xl p-4 text-center text-white mb-4">
              <div className="text-xs opacity-80 mb-1">Net Pay</div>
              <div className="text-2xl font-bold">{fmt(record.netPay)}</div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => closeModal(key)}>Close</Button>
              <Button size="sm" className="gap-1" disabled={downloadPdf.isPending} onClick={() => downloadPdf.mutate(row.id)}>
                {downloadPdf.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Downloading...</>
                  : <><Download className="w-3.5 h-3.5" /> Download PDF</>
                }
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">Payslip not found</div>
        )}
      </CustomModal>
    </>
  );
}

export function createPayrollRecordsColumns(sym: string): Column<any>[] {
  return [
  {
    key: "employee",
    title: "Employee",
    className: "text-xs",
    render: (_, row) => (
      <div>
        <div className="font-medium text-gray-900 line-clamp-1">
          {row.employee?.firstName} {row.employee?.lastName}
        </div>
        <div className="text-xs text-gray-400 line-clamp-1">
          {row.batch?.paymentDate ? new Date(row.batch.paymentDate).toLocaleDateString("en-NG") : "—"}
        </div>
      </div>
    ),
  },
  {
    key: "role",
    title: "Role",
    className: "text-xs",
    render: (_, row) => <span className="text-gray-700">{row.employee?.position || "—"}</span>,
  },
  {
    key: "basicSalary",
    title: "Basic Salary",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" ? (
        <span className="text-green-600 font-medium">{sym}{value.toLocaleString()}</span>
      ) : <span className="text-gray-400">—</span>,
  },
  {
    key: "allowances",
    title: "Allowances",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" && value > 0 ? (
        <span className="text-green-600 font-medium">+{sym}{value.toLocaleString()}</span>
      ) : <span className="text-gray-400">—</span>,
  },
  {
    key: "statutoryDed",
    title: "Deductions",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <span className="text-red-600 font-medium">
          -{sym}{((row.statutoryDed ?? 0) + (row.otherDed ?? 0)).toLocaleString()}
        </span>
        <div className="text-xs text-gray-400">
          Stat: {sym}{(row.statutoryDed ?? 0).toLocaleString()} | Other: {sym}{(row.otherDed ?? 0).toLocaleString()}
        </div>
      </div>
    ),
  },
  {
    key: "netPay",
    title: "Net Pay",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" ? (
        <span className="text-primary font-bold">{sym}{value.toLocaleString()}</span>
      ) : <span className="text-gray-400">—</span>,
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (_, row) => {
      const s = row.batch?.status;
      if (s === "Approved") return <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Processed</Badge>;
      if (s === "Pending") return <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Pending</Badge>;
      return <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{s || "Draft"}</Badge>;
    },
  },
  {
    key: "payslip",
    title: "",
    className: "text-xs",
    render: (_, row) => <PayslipModal row={row} />,
    searchable: false,
  },
  ];
}
