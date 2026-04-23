"use client";

import { CustomModal } from "@/components/local/custom/modal";
import { useModal } from "@/components/providers/ModalProvider";
import { Button } from "@/components/ui/button";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { Plus } from "lucide-react";
import { EntityForm } from "./EntityForm";

export default function EntitiesHeader() {
  const { isOpen, openModal, closeModal } = useModal();

  return (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold">Entities</h3>
        <p className="text-sm text-gray-600">
          Manage group entities and ownership structure
        </p>
      </div>
      <Button
        onClick={() => openModal(MODAL.ENTITY_CREATE)}
        className="bg-primary hover:bg-primary/80"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Entity
      </Button>

      <CustomModal
        title="Add New Entity"
        description={"Create a new entity within your group"}
        module={MODULES.ENTITY}
        open={isOpen(MODAL.ENTITY_CREATE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ENTITY_CREATE)
            : closeModal(MODAL.ENTITY_CREATE)
        }
      >
        <EntityForm />
      </CustomModal>
    </div>
  );
}
