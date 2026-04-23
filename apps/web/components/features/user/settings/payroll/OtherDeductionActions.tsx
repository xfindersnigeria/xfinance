"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useDeleteOtherDeduction } from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import OtherDeductionForm from "./OtherDeductionForm";
import { OtherDeduction } from "./OtherDeductionColumn";

export default function OtherDeductionActions({ row }: { row: OtherDeduction }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteDeduction = useDeleteOtherDeduction();

  const editKey = `${MODAL.OTHER_DEDUCTION_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.OTHER_DEDUCTION_DELETE}-${row.id}`;

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) deleteDeduction.mutate(row.id);
    closeModal(deleteKey);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-gray-100 text-gray-600 gap-1 px-2"
          onClick={() => openModal(editKey)}
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-red-50 text-red-500 gap-1 px-2"
          onClick={() => openModal(deleteKey)}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </div>

      <CustomModal
        title="Edit Deduction"
        description="Update this custom deduction"
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.HR_PAYROLL}
      >
        <OtherDeductionForm
          deduction={row}
          onSuccess={() => closeModal(editKey)}
        />
      </CustomModal>

      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
        module={MODULES.HR_PAYROLL}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${row.name}"?`}
          onResult={handleConfirmDelete}
          loading={deleteDeduction.isPending}
        />
      </CustomModal>
    </>
  );
}
