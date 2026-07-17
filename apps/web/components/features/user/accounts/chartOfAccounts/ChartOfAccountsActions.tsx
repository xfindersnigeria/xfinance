"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteAccount } from "@/lib/api/hooks/useAccounts";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function ChartOfAccountsActions({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteAccount = useDeleteAccount();

  const deleteKey = MODAL.ACCOUNT_DELETE + "-" + row.id;

  const handleDeleteClick = () => {
    openModal(deleteKey);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (!confirmed) {
      closeModal(deleteKey);
      return;
    }
    deleteAccount.mutate(row.id, {
      onSuccess: () => closeModal(deleteKey),
      onError: () => closeModal(deleteKey),
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-2 items-center">
        {/* <Button variant="ghost" size="icon" className="hover:bg-gray-100">
          <Eye className="w-4 h-4" />
        </Button> */}
        {/* <Button variant="ghost" size="icon" className="hover:bg-gray-100">
          <Edit3 className="w-4 h-4" />
        </Button> */}
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-red-100 text-red-600"
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.ACCOUNTS}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row?.name}?`}
          onResult={handleConfirm}
          loading={deleteAccount.isPending}
        />
      </CustomModal>
    </div>
  );
}
