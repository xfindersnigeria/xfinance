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
import { useDeleteStoreItem } from "@/lib/api/hooks/useProducts";
import StoreItemForm from "./StoreItemForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function StoreItemsAction({ row }: { row: any }) {
  const { isOpen, openModal, closeModal } = useModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deleteItem = useDeleteStoreItem();
  const deleteKey = `${MODAL.STORE_ITEM_DELETE}-${row.id}`;

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(deleteKey), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.ITEM_EDIT + "-" + row.id), 100);
  };

  const handleConfirm = (confirmed: boolean) => {
    if (confirmed) {
      deleteItem.mutate(row.id);
      return; // the hook closes the dialog once the item is gone
    }
    closeModal(deleteKey);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {/* <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              router.push(`/sales/customers/${row.id}`);
            }}
          >
            <Eye className="size-4 mr-2" /> View details
          </DropdownMenuItem> */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="size-4 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
          >
            <Trash2 className="size-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CustomModal
        title={"Confirm Deletion"}
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.PRODUCTS}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row.name}?`}
          onResult={handleConfirm}
          loading={deleteItem.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Item: ${row.name}`}
        open={isOpen(MODAL.ITEM_EDIT + "-" + row.id)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ITEM_EDIT + "-" + row.id) : closeModal(MODAL.ITEM_EDIT + "-" + row.id)
        }
        module={MODULES.PRODUCTS}
      >
        <StoreItemForm item={row} isEditMode />
      </CustomModal>
    </>
  );
}
