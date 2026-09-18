"use client";
import React from "react";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODULES } from "@/lib/types/enums";

interface Props {
  /** Unique modal keys for this row */
  editKey: string;
  deleteKey: string;
  editTitle: string;
  editDescription?: string;
  /** Rendered inside the edit modal; call `close` when saved */
  renderForm: (close: () => void) => React.ReactNode;
  deleteTitle: string;
  onDelete: (done: () => void) => void;
  deleting?: boolean;
  canDelete?: boolean;
  editLabel?: string;
  /** Extra buttons shown before Edit */
  extra?: React.ReactNode;
}

/** Edit + Delete buttons with their modals — shared by every tax settings list */
export default function TaxRowActions({
  editKey,
  deleteKey,
  editTitle,
  editDescription,
  renderForm,
  deleteTitle,
  onDelete,
  deleting,
  canDelete = true,
  editLabel = "Edit",
  extra,
}: Props) {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <>
      <div className="flex items-center justify-end gap-1 sm:gap-2">
        {extra}
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-gray-100 text-gray-600 gap-1 px-2"
          onClick={() => openModal(editKey)}
        >
          <Edit3 className="w-3.5 h-3.5" />
          {editLabel}
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-red-50 text-red-500 gap-1 px-2"
            onClick={() => openModal(deleteKey)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </Button>
        )}
      </div>

      <CustomModal
        title={editTitle}
        description={editDescription}
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.SETTINGS}
      >
        {isOpen(editKey) && renderForm(() => closeModal(editKey))}
      </CustomModal>

      {canDelete && (
        <CustomModal
          title="Confirm Deletion"
          open={isOpen(deleteKey)}
          onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
          module={MODULES.SETTINGS}
        >
          <ConfirmationForm
            title={deleteTitle}
            loading={deleting}
            onResult={(confirmed) => {
              if (!confirmed) return closeModal(deleteKey);
              onDelete(() => closeModal(deleteKey));
            }}
          />
        </CustomModal>
      )}
    </>
  );
}
