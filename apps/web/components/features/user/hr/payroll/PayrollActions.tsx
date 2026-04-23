"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Trash2, Eye, Pencil } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useChangePayrollStatus, useDeletePayrollBatch } from "@/lib/api/hooks/useHR";
import PayrollBatchViewModal from "./PayrollBatchViewModal";
import PayrollBatchEditSheet from "./PayrollBatchEditSheet";

export default function PayrollActions({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const changeStatus = useChangePayrollStatus();
  const deleteBatch = useDeletePayrollBatch();

  const viewKey   = `${MODAL.PAYROLL_BATCH_VIEW}-${row.id}`;
  const editKey   = `${MODAL.PAYROLL_BATCH_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.PAYROLL_BATCH_DELETE}-${row.id}`;

  const canEdit = row.status !== "Approved" && row.status !== "Rejected";

  return (
    <>
      <div className="flex gap-1 items-center">
        {/* View */}
        <Button variant="ghost" size="icon" className="hover:bg-blue-50" title="View Batch"
          onClick={() => openModal(viewKey)}
        >
          <Eye className="w-4 h-4 text-blue-500" />
        </Button>

        {/* Edit — only Draft / Pending */}
        {canEdit && (
          <Button variant="ghost" size="icon" className="hover:bg-amber-50" title="Edit Batch"
            onClick={() => openModal(editKey)}
          >
            <Pencil className="w-4 h-4 text-amber-500" />
          </Button>
        )}

        {/* Status transitions */}
        {row.status === "Draft" && (
          <Button variant="ghost" size="icon" className="hover:bg-yellow-50" title="Submit for Approval"
            disabled={changeStatus.isPending}
            onClick={() => changeStatus.mutate({ id: row.id, status: "Pending" })}
          >
            <CheckCircle2 className="w-4 h-4 text-yellow-600" />
          </Button>
        )}
        {row.status === "Pending" && (
          <>
            <Button variant="ghost" size="icon" className="hover:bg-green-50" title="Approve"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id: row.id, status: "Approved" })}
            >
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-red-50" title="Reject"
              disabled={changeStatus.isPending}
              onClick={() => changeStatus.mutate({ id: row.id, status: "Rejected" })}
            >
              <XCircle className="w-4 h-4 text-red-500" />
            </Button>
          </>
        )}

        {/* Delete — only non-approved */}
        {canEdit && (
          <Button variant="ghost" size="icon" className="hover:bg-red-50" title="Delete"
            onClick={() => openModal(deleteKey)}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </Button>
        )}
      </div>

      {/* View modal */}
      <CustomModal
        title={row.batchName}
        open={isOpen(viewKey)}
        onOpenChange={(open) => open ? openModal(viewKey) : closeModal(viewKey)}
        module={MODULES.HR_PAYROLL}
        width="sm:max-w-3xl"
      >
        <PayrollBatchViewModal batchId={row.id} />
      </CustomModal>

      {/* Edit sheet — only when canEdit */}
      {canEdit && (
        <PayrollBatchEditSheet
          batchId={row.id}
          open={isOpen(editKey)}
          onClose={() => closeModal(editKey)}
        />
      )}

      {/* Delete confirm */}
      {canEdit && (
        <CustomModal title="Confirm Deletion" open={isOpen(deleteKey)}
          onOpenChange={(open) => open ? openModal(deleteKey) : closeModal(deleteKey)}
          module={MODULES.HR_PAYROLL}
        >
          <ConfirmationForm
            title={`Delete payroll batch "${row.batchName}"?`}
            onResult={(confirmed) => { if (confirmed) deleteBatch.mutate(row.id); closeModal(deleteKey); }}
            loading={deleteBatch.isPending}
          />
        </CustomModal>
      )}
    </>
  );
}
