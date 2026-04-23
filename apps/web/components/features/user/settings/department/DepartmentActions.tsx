"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useDeleteDepartment } from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import DepartmentForm from "./DepartmentForm";

interface Department {
  id: string;
  name: string;
  description?: string | null;
  status: string;
}

export default function DepartmentActions({ row }: { row: Department }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteDepartment = useDeleteDepartment();

  const editKey = `${MODAL.DEPARTMENT_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.DEPARTMENT_DELETE}-${row.id}`;

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) deleteDepartment.mutate(row.id);
    closeModal(deleteKey);
  };

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
          onClick={() => openModal(editKey)}
        >
          <Edit3 className="w-4 h-4 text-gray-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-red-50"
          onClick={() => openModal(deleteKey)}
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      <CustomModal
        title={`Edit Department`}
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.SETTINGS}
      >
        <DepartmentForm
          department={row}
          onSuccess={() => closeModal(editKey)}
        />
      </CustomModal>

      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
        module={MODULES.SETTINGS}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${row.name}"?`}
          onResult={handleConfirmDelete}
          loading={deleteDepartment.isPending}
        />
      </CustomModal>
    </>
  );
}
