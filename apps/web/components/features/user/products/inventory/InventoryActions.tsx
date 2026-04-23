"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { useAdjustInventory } from "@/lib/api/hooks/useProducts";
import InventoryForm from "./InventoryForm";

export default function InventoryAction({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const adjustInventory = useAdjustInventory();
  const key = `${MODAL.INVENTORY_ADJUST}-${row.id}`;

  const handleConfirm = (values: { type: "add" | "remove" | "set"; quantity: number; reason: string; notes?: string }) => {
    adjustInventory.mutate(
      { itemId: row.id, ...values },
      { onSuccess: () => closeModal(key) },
    );
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="rounded-xl text-xs gap-1"
        onClick={() => openModal(key)}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Adjust Stock
      </Button>

      <CustomModal
        title={`Adjust Stock: ${row.name}`}
        description={`SKU: ${row.sku || "—"}`}
        open={isOpen(key)}
        onOpenChange={(open) => open ? openModal(key) : closeModal(key)}
        module={MODULES.PRODUCTS}
      >
        <InventoryForm
          currentStock={row.currentStock ?? 0}
          onCancel={() => closeModal(key)}
          onConfirm={handleConfirm}
          isLoading={adjustInventory.isPending}
        />
      </CustomModal>
    </>
  );
}
