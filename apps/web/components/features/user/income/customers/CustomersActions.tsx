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
import {
  MoreVertical,
  Eye,
  Edit3,
  FilePlus,
  FileText,
  Trash2,
} from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteCustomer } from "@/lib/api/hooks/useSales";
import CustomerForm from "./CustomerForm";
import { useRouter } from "next/navigation";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function CustomersActions({ row }: { row: any }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const deleteCustomer = useDeleteCustomer();

  const deleteKey = MODAL.CUSTOMER_DELETE + "-" + row.id;
  const editKey = MODAL.CUSTOMER_EDIT + "-" + row.id;

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
      deleteCustomer.mutate(row.id);
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
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              router.push(`/sales/customers/${row.id}`);
            }}
          >
            <Eye className="size-4 mr-2" /> View details
          </DropdownMenuItem>
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
            onSelect={(e) => {
              e.preventDefault();
            }}
          >
            <FilePlus className="size-4 mr-2" /> Create invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              router.push(`/sales/invoices?customerId=${row.id}`);
            }}
          >
            <FileText className="size-4 mr-2" /> View invoices
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
        module={MODULES.SALES}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete ${row?.name || row.name}?`}
          onResult={handleConfirm}
          loading={deleteCustomer.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Customer: ${row.name}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.SALES}
      >
        <CustomerForm customer={row} isEditMode />
      </CustomModal>
    </>
  );
}
