"use client";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import AssetsForm from "./AssetsForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function AssetsActions({ row }: { row: any }) {
  const { openModal, isOpen, closeModal } = useModal();
  const editKey = MODAL.ASSET_EDIT + "-" + row.id;
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-gray-100"
        onClick={() => openModal(editKey)}
      >
        <Edit3 className="w-5 h-5" />
      </Button>
      <CustomModal
        title={`Edit Asset: ${row.name}`}
        open={isOpen(editKey)}
        onOpenChange={(v) => (v ? openModal(editKey) : closeModal(editKey))}
        module={MODULES.SALES}
      >
        <AssetsForm assets={row} isEditMode />
      </CustomModal>
    </>
  );
}
