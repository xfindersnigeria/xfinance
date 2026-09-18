"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreVertical, CheckCircle2, XCircle, Trash2, Eye, Pencil, Banknote, AlertTriangle, BookCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useChangePayrollStatus, useDeletePayrollBatch, usePostPayrollToLedger } from "@/lib/api/hooks/useHR";
import PayrollBatchViewModal from "./PayrollBatchViewModal";
import PayrollBatchEditSheet from "./PayrollBatchEditSheet";
import MarkPayrollPaidForm from "./MarkPayrollPaidForm";

export default function PayrollActions({ row }: { row: any }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const changeStatus = useChangePayrollStatus();
  const deleteBatch = useDeletePayrollBatch();
  const postToLedger = usePostPayrollToLedger();

  const viewKey     = `${MODAL.PAYROLL_BATCH_VIEW}-${row.id}`;
  const editKey     = `${MODAL.PAYROLL_BATCH_EDIT}-${row.id}`;
  const deleteKey   = `${MODAL.PAYROLL_BATCH_DELETE}-${row.id}`;
  const markPaidKey = `${MODAL.PAYROLL_BATCH_MARK_PAID}-${row.id}`;

  const canEdit = row.status !== "Approved" && row.status !== "Rejected" && row.status !== "Paid";
  const canMarkPaid = row.status === "Approved" && row.postingStatus === "Success";
  const postingFailed = row.status === "Approved" && row.postingStatus === "Failed";
  // Approved but never reached the ledger: approved before payroll posting
  // existed, or its posting failed. "Post to Ledger" (re)queues it.
  const canPost = row.status === "Approved" && row.postingStatus !== "Success";

  const openDelayed = (key: string) => {
    setDropdownOpen(false);
    setTimeout(() => openModal(key), 100);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative hover:bg-gray-100" title={postingFailed ? "Ledger posting failed — see batch details" : undefined}>
            <MoreVertical className="w-5 h-5" />
            {postingFailed && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-0.5 right-0.5" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDelayed(viewKey); }}>
            <Eye className="size-4 mr-2" /> View
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDelayed(editKey); }}>
              <Pencil className="size-4 mr-2" /> Edit
            </DropdownMenuItem>
          )}

          {row.status === "Draft" && (
            <DropdownMenuItem
              disabled={changeStatus.isPending}
              onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); changeStatus.mutate({ id: row.id, status: "Pending" }); }}
            >
              <CheckCircle2 className="size-4 mr-2 text-yellow-600" /> Submit for Approval
            </DropdownMenuItem>
          )}

          {row.status === "Pending" && (
            <>
              <DropdownMenuItem
                disabled={changeStatus.isPending}
                onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); changeStatus.mutate({ id: row.id, status: "Approved" }); }}
              >
                <CheckCircle2 className="size-4 mr-2 text-green-600" /> Approve
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={changeStatus.isPending}
                onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); changeStatus.mutate({ id: row.id, status: "Rejected" }); }}
              >
                <XCircle className="size-4 mr-2 text-red-500" /> Reject
              </DropdownMenuItem>
            </>
          )}

          {canPost && (
            <DropdownMenuItem
              disabled={postToLedger.isPending}
              onSelect={(e) => { e.preventDefault(); setDropdownOpen(false); postToLedger.mutate(row.id); }}
            >
              <BookCheck className="size-4 mr-2 text-green-600" /> Post to Ledger
            </DropdownMenuItem>
          )}

          {canMarkPaid && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openDelayed(markPaidKey); }}>
              <Banknote className="size-4 mr-2 text-blue-600" /> Mark as Paid
            </DropdownMenuItem>
          )}

          {canEdit && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem data-variant="destructive" onSelect={(e) => { e.preventDefault(); openDelayed(deleteKey); }}>
                <Trash2 className="size-4 mr-2" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

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

      {/* Mark as Paid modal */}
      {canMarkPaid && (
        <CustomModal
          title="Mark Payroll as Paid"
          description="Record that this approved payroll has been paid out"
          open={isOpen(markPaidKey)}
          onOpenChange={(open) => open ? openModal(markPaidKey) : closeModal(markPaidKey)}
          module={MODULES.HR_PAYROLL}
        >
          <MarkPayrollPaidForm
            batchId={row.id}
            batchName={row.batchName}
            totalAmount={row.totalAmount}
            onSuccess={() => closeModal(markPaidKey)}
          />
        </CustomModal>
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
