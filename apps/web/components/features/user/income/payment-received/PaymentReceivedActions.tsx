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
  Download,
  Trash2,
  FileText,
} from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeletePaymentReceived } from "@/lib/api/hooks/useSales";
import PaymentReceivedForm from "./PaymentReceivedForm";
import { useRouter } from "next/navigation";
import { PaymentReceived } from "./utils/types";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

export default function PaymentReceivedActions({
  row,
}: {
  row: PaymentReceived;
}) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { isOpen, openModal, closeModal } = useModal();
  const deletePayment = useDeletePaymentReceived();

  const deleteKey = MODAL.PAYMENT_RECEIVED_DELETE + "-" + row.id;
  const editKey = MODAL.PAYMENT_RECEIVED_EDIT + "-" + row.id;

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
      deletePayment.mutate(row.id);
    }
    closeModal(deleteKey);
  };

  const handlePrint = () => {
    setDropdownOpen(false);
    toast.info("Print functionality coming soon");
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              toast.info("View details coming soon");
            }}
          >
            <Eye className="size-4 mr-2" /> View Details
          </DropdownMenuItem> */}
          {row?.postingStatus === "Pending" && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleEditClick();
              }}
            >
              <Edit3 className="size-4 mr-2" /> Edit Payment
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handlePrint();
            }}
          >
            <Download className="size-4 mr-2" /> Print Receipt
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.invoice && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                router.push(`/sales/invoices/${row.invoiceId}`);
              }}
            >
              <FileText className="size-4 mr-2" /> View Invoice
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
                    {row?.postingStatus === "Pending" && (

          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleDeleteClick();
            }}
          >
            <Trash2 className="size-4 mr-2" /> Delete Payment
          </DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>
      <CustomModal
        title="Confirm Deletion"
        open={isOpen(deleteKey)}
        onOpenChange={(open) =>
          open ? openModal(deleteKey) : closeModal(deleteKey)
        }
        module={MODULES.SALES}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete this payment (${row.reference})?`}
          onResult={handleConfirm}
          loading={deletePayment.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Payment: ${row.reference}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.SALES}
      >
        <PaymentReceivedForm
          payment={{
            ...row,
            paidAt:
              typeof row.paidAt === "string"
                ? new Date(row.paidAt)
                : row.paidAt,
          }}
          isEditMode
        />
      </CustomModal>
    </>
  );
}
