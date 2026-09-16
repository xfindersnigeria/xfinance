"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteAssetCategory } from "@/lib/api/hooks/useAssets";
import type { AssetCategory } from "@/lib/api/services/assetsService";
import AssetCategoryForm from "./AssetCategoryForm";

export default function AssetCategoryActions({ category }: { category: AssetCategory }) {
  const { isOpen, openModal, closeModal } = useModal();
  const deleteCategory = useDeleteAssetCategory();

  const editKey = `${MODAL.ASSET_CATEGORY_EDIT}-${category.id}`;
  const deleteKey = `${MODAL.ASSET_CATEGORY_DELETE}-${category.id}`;
  const inUse = category.assetCount > 0;

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
          aria-label={`Edit ${category.name}`}
          onClick={() => openModal(editKey)}
        >
          <Pencil className="w-4 h-4 text-gray-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-red-50"
          aria-label={`Delete ${category.name}`}
          title={inUse ? `${category.assetCount} asset(s) use this category` : undefined}
          disabled={inUse}
          onClick={() => openModal(deleteKey)}
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </Button>
      </div>

      <CustomModal
        title="Edit Asset Category"
        open={isOpen(editKey)}
        onOpenChange={(open) => (open ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.ASSETS}
      >
        <AssetCategoryForm category={category} />
      </CustomModal>

      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) => (open ? openModal(deleteKey) : closeModal(deleteKey))}
        module={MODULES.ASSETS}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${category.name}"?`}
          onResult={(confirmed) => {
            if (confirmed) deleteCategory.mutate(category.id);
            closeModal(deleteKey);
          }}
          loading={deleteCategory.isPending}
        />
      </CustomModal>
    </>
  );
}
