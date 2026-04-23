"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useDeleteProductCategory } from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import CategoryForm from "./CategoryForm";
import { ProductCategory } from "./CategoryColumn";

export default function CategoryActions({ row }: { row: ProductCategory }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteCategory = useDeleteProductCategory();

  const editKey = `${MODAL.PRODUCT_CATEGORY_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.PRODUCT_CATEGORY_DELETE}-${row.id}`;

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) deleteCategory.mutate(row.id);
    closeModal(deleteKey);
  };

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
          onClick={() => openModal(editKey)}
        >
          <Pencil className="w-4 h-4 text-gray-500" />
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
        title="Edit Category"
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.PRODUCTS}
      >
        <CategoryForm category={row} onSuccess={() => closeModal(editKey)} />
      </CustomModal>

      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
        module={MODULES.PRODUCTS}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${row.name}"?`}
          onResult={handleConfirmDelete}
          loading={deleteCategory.isPending}
        />
      </CustomModal>
    </>
  );
}
