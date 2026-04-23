"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard } from "lucide-react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import InvoiceForm from "@/components/features/user/income/invoices/InvoiceForm";
import PaymentReceivedForm from "@/components/features/user/income/payment-received/PaymentReceivedForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useProjectIncome } from "@/lib/api/hooks/useProjects";

interface ProjectIncomeProps {
  projectId: string;
}

function fmtMoney(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value}`;
}

const STATUS_STYLE: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Partial: "bg-yellow-100 text-yellow-700",
  Sent: "bg-blue-100 text-blue-700",
  Draft: "bg-gray-100 text-gray-600",
  Overdue: "bg-red-100 text-red-700",
};

export default function ProjectIncome({ projectId }: ProjectIncomeProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const { data, isLoading } = useProjectIncome(projectId);

  const rows: any[] = (data as any)?.data ?? [];
  const totalIncome: number = (data as any)?.totalIncome ?? 0;

  const columns = [
    {
      key: "invoiceNumber",
      title: "ID",
      render: (value: string) => (
        <span className="text-indigo-600 font-medium text-sm">{value}</span>
      ),
    },
    {
      key: "date",
      title: "Date",
      render: (value: string) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toISOString().slice(0, 10)}
        </span>
      ),
    },
    {
      key: "description",
      title: "Description",
      render: (value: string) => (
        <span className="text-sm text-gray-700">{value || "—"}</span>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-300 text-gray-600">
          {value}
        </span>
      ),
    },
    {
      key: "amount",
      title: "Amount",
      render: (value: number) => (
        <span className="text-sm font-medium text-green-600">{fmtMoney(value)}</span>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (value: string) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[value] ?? "bg-gray-100 text-gray-600"}`}
        >
          {value}
        </span>
      ),
    },
  ];

  const headerActions = (
    <>
      <Button onClick={() => openModal(MODAL.INVOICE_CREATE)} className="rounded-xl" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        Create Invoice
      </Button>
      <Button
        variant="outline"
        onClick={() => openModal(MODAL.PAYMENT_RECEIVED_CREATE)}
        className="rounded-xl"
        size="sm"
      >
        <CreditCard className="w-4 h-4 mr-1" />
        Record Payment
      </Button>
    </>
  );

  return (
    <>
      <CustomTable
        columns={columns}
        data={rows}
        tableTitle="Income Items"
        headerActions={headerActions}
        display={{ searchComponent: false }}
        loading={isLoading}
      />

      <div className="mt-0 bg-white rounded-b-2xl border-t border-gray-100 px-4 py-3 flex items-center">
        <span className="font-semibold text-sm text-gray-700 mr-auto">Total Income</span>
        <span className="text-sm font-bold text-green-600">{fmtMoney(totalIncome)}</span>
      </div>

      <CustomModal
        title="Create New Invoice"
        description="Create a new invoice with line items, payment terms, and customer details"
        open={isOpen(MODAL.INVOICE_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.INVOICE_CREATE) : closeModal(MODAL.INVOICE_CREATE)
        }
        module={MODULES.SALES}
      >
        <InvoiceForm />
      </CustomModal>

      <CustomModal
        title="Record Payment"
        description="Record a payment received against an invoice"
        open={isOpen(MODAL.PAYMENT_RECEIVED_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.PAYMENT_RECEIVED_CREATE) : closeModal(MODAL.PAYMENT_RECEIVED_CREATE)
        }
        module={MODULES.SALES}
      >
        <PaymentReceivedForm />
      </CustomModal>
    </>
  );
}
