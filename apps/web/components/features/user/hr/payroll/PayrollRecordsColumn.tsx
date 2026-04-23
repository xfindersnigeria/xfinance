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
import { Loader2, Download } from "lucide-react";

function PayslipModal({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const key = `${MODAL.PAYROLL_SLIP_VIEW}-${row.id}`;
  const { data: recordData, isLoading } = usePayrollRecord(isOpen(key) ? row.id : "");
  const record = (recordData as any)?.data;
  const downloadPdf = useDownloadPayslip();

  const fmt = (n?: number) => n !== undefined ? `₦${n.toLocaleString()}` : "—";

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
        width="sm:max-w-2xl"
      >
        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 w-8 h-8" /></div>
        ) : record ? (
          <div className="pb-4">
            {/* Header */}
            <div className="flex justify-between items-start bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 mb-4 text-white">
              <div>
                <div className="text-lg font-bold">{record.entity?.name}</div>
                <div className="text-xs opacity-75 mt-1">{record.entity?.address}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">PAYSLIP</div>
                <div className="text-xs opacity-80">{record.batch?.period}</div>
                <Badge className="mt-1 bg-white/20 text-white border-white/30 text-xs">{record.batch?.status}</Badge>
              </div>
            </div>

            {/* Employee + Payment */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Employee</div>
                <div className="font-semibold text-gray-900">{record.employee?.firstName} {record.employee?.lastName}</div>
                <div className="text-xs text-gray-500 mt-1">{record.employee?.position}</div>
                <div className="text-xs text-gray-500">{record.employee?.dept?.name}</div>
                <div className="text-xs text-gray-400 mt-1">ID: {record.employee?.employeeId}</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment</div>
                <div className="text-xs text-gray-700">
                  <div className="flex justify-between py-1"><span>Date</span><span className="font-medium">{record.batch?.paymentDate ? new Date(record.batch.paymentDate).toLocaleDateString("en-NG") : "—"}</span></div>
                  <div className="flex justify-between py-1"><span>Method</span><span className="font-medium">{record.batch?.paymentMethod}</span></div>
                  <div className="flex justify-between py-1"><span>Bank</span><span className="font-medium">{record.employee?.bankName || "—"}</span></div>
                  <div className="flex justify-between py-1"><span>Account</span><span className="font-medium">****{record.employee?.accountNumber?.slice(-4) || "—"}</span></div>
                </div>
              </div>
            </div>

            {/* Earnings */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Earnings</div>
              <div className="bg-green-50 rounded-xl overflow-hidden">
                {[
                  ["Basic Salary", record.basicSalary],
                  record.allowances > 0 && ["Allowances", record.allowances],
                  record.bonus > 0 && ["Bonus", record.bonus],
                  record.overtime > 0 && ["Overtime", record.overtime],
                ].filter(Boolean).map(([label, amount]: any) => (
                  <div key={label} className="flex justify-between px-4 py-2 text-xs border-b border-green-100 last:border-0">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-green-700">{fmt(amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-2 text-xs bg-green-100 font-bold">
                  <span>Gross Pay</span><span className="text-green-800">{fmt(record.grossPay)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</div>
              <div className="bg-red-50 rounded-xl overflow-hidden">
                {record.statutoryDed > 0 && (
                  <div className="flex justify-between px-4 py-2 text-xs border-b border-red-100">
                    <span className="text-gray-600">Statutory Deductions</span>
                    <span className="font-medium text-red-600">- {fmt(record.statutoryDed)}</span>
                  </div>
                )}
                {record.otherDed > 0 && (
                  <div className="flex justify-between px-4 py-2 text-xs border-b border-red-100">
                    <span className="text-gray-600">Other Deductions</span>
                    <span className="font-medium text-red-600">- {fmt(record.otherDed)}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2 text-xs bg-red-100 font-bold">
                  <span>Total Deductions</span>
                  <span className="text-red-700">- {fmt((record.statutoryDed ?? 0) + (record.otherDed ?? 0))}</span>
                </div>
              </div>
            </div>

            {/* Net Pay */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-center text-white mb-4">
              <div className="text-xs opacity-80 mb-1">NET PAY</div>
              <div className="text-3xl font-bold">{fmt(record.netPay)}</div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => closeModal(key)}>Close</Button>
              <Button
                className="gap-2"
                disabled={downloadPdf.isPending}
                onClick={() => downloadPdf.mutate(row.id)}
              >
                {downloadPdf.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</>
                  : <><Download className="w-4 h-4" /> Download PDF</>
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

export const payrollRecordsColumns: Column<any>[] = [
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
        <span className="text-green-600 font-medium">₦{value.toLocaleString()}</span>
      ) : <span className="text-gray-400">—</span>,
  },
  {
    key: "allowances",
    title: "Allowances",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" && value > 0 ? (
        <span className="text-green-600 font-medium">+₦{value.toLocaleString()}</span>
      ) : <span className="text-gray-400">—</span>,
  },
  {
    key: "statutoryDed",
    title: "Deductions",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <span className="text-red-600 font-medium">
          -₦{((row.statutoryDed ?? 0) + (row.otherDed ?? 0)).toLocaleString()}
        </span>
        <div className="text-xs text-gray-400">
          Stat: ₦{(row.statutoryDed ?? 0).toLocaleString()} | Other: ₦{(row.otherDed ?? 0).toLocaleString()}
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
        <span className="text-primary font-bold">₦{value.toLocaleString()}</span>
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
