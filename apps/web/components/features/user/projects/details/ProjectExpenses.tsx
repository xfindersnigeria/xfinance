"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import BillsForm from "@/components/features/user/purchases/bills/BillsForm";
import ExpensesForm from "@/components/features/user/purchases/expenses/ExpensesForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { useProjectExpenses } from "@/lib/api/hooks/useProjects";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectExpensesProps {
  projectId: string;
}

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  draft: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-green-100 text-green-700",
  unpaid: "bg-yellow-100 text-yellow-700",
  partial: "bg-blue-100 text-blue-700",
};

const SOURCE_STYLE: Record<string, string> = {
  expense: "border border-gray-300 text-gray-600",
  bill: "border border-indigo-200 text-indigo-600",
};

export default function ProjectExpenses({ projectId }: ProjectExpensesProps) {
  const sym = useEntityCurrencySymbol();
  const { isOpen, openModal, closeModal } = useModal();
  const { data, isLoading } = useProjectExpenses(projectId);

  function fmtMoney(value: number): string {
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return `${sym}${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sym}${(value / 1_000).toFixed(0)}K`;
    return `${sym}${value}`;
  }

  const rows: any[] = (data as any)?.data ?? [];
  const totalExpenses: number = (data as any)?.totalExpenses ?? 0;

  const columns = [
    {
      key: "reference",
      title: "Reference",
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
      key: "sourceType",
      title: "Type",
      render: (value: string) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SOURCE_STYLE[value] ?? "border border-gray-300 text-gray-600"}`}
        >
          {value === "bill" ? "Bill" : "Expense"}
        </span>
      ),
    },
    {
      key: "amount",
      title: "Amount",
      render: (value: number) => (
        <span className="text-sm font-medium text-red-600">{fmtMoney(value)}</span>
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
      <Button onClick={() => openModal(MODAL.BILL_CREATE)} className="rounded-xl" size="sm">
        <Plus className="w-4 h-4 mr-1" />
        Add Bill
      </Button>
      <Button
        variant="outline"
        onClick={() => openModal(MODAL.EXPENSE_CREATE)}
        className="rounded-xl"
        size="sm"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Expense
      </Button>
    </>
  );

  return (
    <>
      <CustomTable
        columns={columns}
        data={rows}
        tableTitle="Expense Items"
        headerActions={headerActions}
        display={{ searchComponent: false }}
        loading={isLoading}
      />

      <div className="mt-0 bg-white rounded-b-2xl border-t border-gray-100 px-4 py-3 flex items-center">
        <span className="font-semibold text-sm text-gray-700 mr-auto">Total Expenses</span>
        <span className="text-sm font-bold text-red-600">{fmtMoney(totalExpenses)}</span>
      </div>

      <CustomModal
        title="New Bill"
        description="Create a new bill for your vendor"
        open={isOpen(MODAL.BILL_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.BILL_CREATE) : closeModal(MODAL.BILL_CREATE)
        }
        module={MODULES.PURCHASES}
      >
        <BillsForm />
      </CustomModal>

      <CustomModal
        title="New Expense"
        description="Add details about the expense to create a new entry"
        open={isOpen(MODAL.EXPENSE_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.EXPENSE_CREATE) : closeModal(MODAL.EXPENSE_CREATE)
        }
        module={MODULES.PURCHASES}
      >
        <ExpensesForm />
      </CustomModal>
    </>
  );
}
