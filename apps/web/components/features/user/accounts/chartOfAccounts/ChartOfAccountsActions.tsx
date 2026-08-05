"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit3, Trash2 } from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteAccount } from "@/lib/api/hooks/useAccounts";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import AccountEditForm from "./AccountEditForm";

export default function ChartOfAccountsActions({ row }: { row: any }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const deleteAccount = useDeleteAccount();

  // Row-suffixed: each row renders its own CustomModal/Dialog instance, so a
  // bare/shared key would open every row's modal at once (stacked overlays —
  // the black-backdrop flicker — and whichever row's data happened to render
  // on top looked like it was "the same account" for every row).
  const editKey = `${MODAL.ACCOUNT_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.ACCOUNT_DELETE}-${row.id}`;

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(editKey), 100);
  };

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(deleteKey), 100);
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
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="size-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
          >
            <Trash2 className="size-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomModal
        title="Edit Account"
        description="Update the account name or description"
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.ACCOUNTS}
      >
        <AccountEditForm
          account={{ id: row.id, name: row.name, description: row.description }}
          onSuccess={() => closeModal(editKey)}
        />
      </CustomModal>

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
