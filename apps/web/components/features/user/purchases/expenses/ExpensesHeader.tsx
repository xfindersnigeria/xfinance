"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ExpensesForm from "./ExpensesForm";
import { MODULES } from "@/lib/types/enums";
import { ExpensesResponse } from "./types";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface ExpensesHeaderProps {
  loading?: boolean;
  data?: ExpensesResponse;
}

export default function ExpensesHeader({ loading = false, data }: ExpensesHeaderProps) {
  const { openModal, closeModal, isOpen } = useModal();
  const totalExpenses = data?.totalCount || 0;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Expenses</h2>
          <p className="text-muted-foreground">
            Track and manage business expenses ({totalExpenses} expenses)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.EXPENSE_CREATE)} className="rounded-xl">
            <Plus /> New Expense
          </Button>
        </div>
      </div>

      <CustomModal
        title="New Expense"
        description="Add details about the expense to create a new entry"
        open={isOpen(MODAL.EXPENSE_CREATE)}
        onOpenChange={(open) => open ? openModal(MODAL.EXPENSE_CREATE) : closeModal(MODAL.EXPENSE_CREATE)}
        module={MODULES.PURCHASES}
      >
        <ExpensesForm />
      </CustomModal>
    </div>
  );
}
