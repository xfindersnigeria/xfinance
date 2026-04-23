"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { CustomModal } from "@/components/local/custom/modal";
import StoreSupplyForm from "./StoreSupplyForm";
import { MODULES } from "@/lib/types/enums";

export default function StoreInventoryActions({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const editKey = MODAL.SUPPLY_EDIT + "-" + row.id;

  const handleEditClick = () => {
    setTimeout(() => openModal(editKey), 100);
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={handleEditClick}>
        <Edit3 className="w-4 h-4" />
      </Button>
      <CustomModal
        title={`Edit Supply: ${row.name}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.ASSETS}
      >
        <StoreSupplyForm supply={row} isEditMode closeModal={() => closeModal(editKey)} />
      </CustomModal>
    </>
  );
}
