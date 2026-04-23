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
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import ItemsForm from "./ItemsForm";
import { Item } from "./utils/types";

interface ItemsActionsProps {
  row: Item;
}

/**
 * Action dropdown menu for item rows
 * Handles edit and delete operations with modal integration
 */
export default function ItemsActions({ row }: ItemsActionsProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.ITEM_DELETE), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.ITEM_EDIT + "-" + row.id), 100);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmed) {
      // TODO: Replace with actual API call to delete item
      console.log("Delete item:", row.id);
    }
    closeModal(MODAL.ITEM_DELETE);
  };

  return (
    <>
      {/* Dropdown Menu */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
            <Edit3 className="mr-2 h-4 w-4" />
            <span>Edit Item</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            className="cursor-pointer text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Modal */}
      <CustomModal
        title="Edit Item"
        module={MODULES.SALES}
        open={isOpen(MODAL.ITEM_EDIT + "-" + row.id)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ITEM_EDIT + "-" + row.id)
            : closeModal(MODAL.ITEM_EDIT + "-" + row.id)
        }
      >
        <ItemsForm item={row} isEditMode />
      </CustomModal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        title="Delete Item"
        module={MODULES.SALES}
        open={isOpen(MODAL.ITEM_DELETE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ITEM_DELETE) : closeModal(MODAL.ITEM_DELETE)
        }
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${row.name}"? This action cannot be undone.`}
          onResult={handleConfirm}
        />
      </CustomModal>
    </>
  );
}
