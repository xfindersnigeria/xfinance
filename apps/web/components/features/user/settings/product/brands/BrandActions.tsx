"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useDeleteProductBrand } from "@/lib/api/hooks/useSettings";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import BrandForm from "./BrandForm";
import { ProductBrand } from "./BrandColumn";

export default function BrandActions({ row }: { row: ProductBrand }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteBrand = useDeleteProductBrand();

  const editKey = `${MODAL.PRODUCT_BRAND_EDIT}-${row.id}`;
  const deleteKey = `${MODAL.PRODUCT_BRAND_DELETE}-${row.id}`;

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) deleteBrand.mutate(row.id);
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
        title="Edit Brand"
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.PRODUCTS}
      >
        <BrandForm brand={row} onSuccess={() => closeModal(editKey)} />
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
          loading={deleteBrand.isPending}
        />
      </CustomModal>
    </>
  );
}
