"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit3, Trash2 } from "lucide-react";
import { Entity } from "./EntitiesColumn";
import { useDeleteEntity } from "@/lib/api/hooks/useEntity";
import { MODAL } from "@/lib/data/modal-data";
import { useModal } from "@/components/providers/ModalProvider";
import { CustomModal } from "@/components/local/custom/modal";
import { EntityForm } from "./EntityForm";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";

interface EntitiesActionsProps {
  row: Entity;
}

export default function EntitiesActions({ row }: EntitiesActionsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();

  const deleteEntity = useDeleteEntity();

  const deleteKey = MODAL.ENTITY_DELETE + "-" + row.id;
  const editKey = MODAL.ENTITY_EDIT + "-" + row.id;

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(deleteKey), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(editKey), 100);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmed) {
      deleteEntity.mutate(row.id);
    }
    closeModal(deleteKey);
  };
  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomModal
        title={"Confirm Deletion"}
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.ENTITY}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row?.name || row.name}?`}
          onResult={handleConfirm}
          loading={deleteEntity.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Customer: ${row.name}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.ENTITY}
      >
        <EntityForm entity={row as any} isEditMode />
      </CustomModal>
    </>
  );
}
