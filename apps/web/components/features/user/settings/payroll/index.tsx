"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useStatutoryDeductions, useOtherDeductions } from "@/lib/api/hooks/useSettings";
import { statutoryDeductionColumns } from "./StatutoryDeductionColumn";
import { otherDeductionColumns } from "./OtherDeductionColumn";
import StatutoryDeductionForm from "./StatutoryDeductionForm";
import OtherDeductionForm from "./OtherDeductionForm";

export default function PayrollSettings() {
  const { isOpen, openModal, closeModal } = useModal();

  const { data: statutoryData, isLoading: statutoryLoading } = useStatutoryDeductions();
  const { data: otherData, isLoading: otherLoading } = useOtherDeductions();

  const statutoryDeductions = (statutoryData as any)?.data ?? [];
  const otherDeductions = (otherData as any)?.data ?? [];

  return (
    <div className="space-y-6">
      {/* Statutory Deductions */}
      <CustomTable
        tableTitle="Statutory Deductions"
        tableSubtitle="Configure mandatory deductions like PAYEE, NHIS, and Pension"
        columns={statutoryDeductionColumns}
        data={statutoryDeductions}
        pageSize={10}
        loading={statutoryLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.STATUTORY_DEDUCTION_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Statutory Deduction
          </Button>
        }
      />

      {/* Other Deductions */}
      <CustomTable
        tableTitle="Other Deductions"
        tableSubtitle="Configure additional deductions like loans, advances, or union dues"
        columns={otherDeductionColumns}
        data={otherDeductions}
        pageSize={10}
        loading={otherLoading}
        display={{ searchComponent: false }}
        headerActions={
          <Button
            size="sm"
            className="rounded-2xl"
            onClick={() => openModal(MODAL.OTHER_DEDUCTION_CREATE)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Deduction
          </Button>
        }
      />

      {/* Add Statutory Deduction Modal */}
      <CustomModal
        title="Add Statutory Deduction"
        description="Configure a mandatory deduction that will be applied to all employees"
        open={isOpen(MODAL.STATUTORY_DEDUCTION_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.STATUTORY_DEDUCTION_CREATE)
            : closeModal(MODAL.STATUTORY_DEDUCTION_CREATE)
        }
        module={MODULES.HR_PAYROLL}
      >
        <StatutoryDeductionForm
          onSuccess={() => closeModal(MODAL.STATUTORY_DEDUCTION_CREATE)}
        />
      </CustomModal>

      {/* Add Other Deduction Modal */}
      <CustomModal
        title="Add Deduction"
        description="Add a custom deduction like loan repayment or union dues"
        open={isOpen(MODAL.OTHER_DEDUCTION_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.OTHER_DEDUCTION_CREATE)
            : closeModal(MODAL.OTHER_DEDUCTION_CREATE)
        }
        module={MODULES.HR_PAYROLL}
      >
        <OtherDeductionForm
          onSuccess={() => closeModal(MODAL.OTHER_DEDUCTION_CREATE)}
        />
      </CustomModal>
    </div>
  );
}
