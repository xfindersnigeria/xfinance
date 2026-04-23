"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteLeave, useChangeLeaveStatus } from "@/lib/api/hooks/useHR";
import LeaveManagementForm from "./LeaveManagementForm";

export default function LeaveManagementActions({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteLeave = useDeleteLeave();
  const changeStatus = useChangeLeaveStatus();

  const editKey = `${MODAL.LEAVE_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.LEAVE_DELETE}-${row.id}`;

  const handleApprove = () => changeStatus.mutate({ id: row.id, status: "Approved" });
  const handleReject = () => changeStatus.mutate({ id: row.id, status: "Rejected" });

  return (
    <>
      <div className="flex gap-1 items-center">
        <Button
          variant="ghost" size="icon" className="hover:bg-blue-50"
          title="Edit"
          onClick={() => openModal(editKey)}
        >
          <Edit3 className="w-4 h-4 text-blue-500" />
        </Button>
        {row.status === "Pending" && (
          <>
            <Button
              variant="ghost" size="icon" className="hover:bg-green-50"
              title="Approve"
              disabled={changeStatus.isPending}
              onClick={handleApprove}
            >
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </Button>
            <Button
              variant="ghost" size="icon" className="hover:bg-red-50"
              title="Reject"
              disabled={changeStatus.isPending}
              onClick={handleReject}
            >
              <XCircle className="w-4 h-4 text-red-500" />
            </Button>
          </>
        )}
        <Button
          variant="ghost" size="icon" className="hover:bg-red-50"
          title="Delete"
          onClick={() => openModal(deleteKey)}
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      <CustomModal
        title="Edit Leave Request"
        open={isOpen(editKey)}
        onOpenChange={(open) => open ? openModal(editKey) : closeModal(editKey)}
        module={MODULES.HR_PAYROLL}
        width="sm:max-w-2xl"
      >
        <LeaveManagementForm leave={row} onSuccess={() => closeModal(editKey)} />
      </CustomModal>

      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => open ? openModal(deleteKey) : closeModal(deleteKey)}
        module={MODULES.HR_PAYROLL}
      >
        <ConfirmationForm
          title={`Delete this leave request?`}
          onResult={(confirmed) => {
            if (confirmed) deleteLeave.mutate(row.id);
            closeModal(deleteKey);
          }}
          loading={deleteLeave.isPending}
        />
      </CustomModal>
    </>
  );
}
