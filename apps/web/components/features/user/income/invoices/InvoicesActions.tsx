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
  Send,
  DollarSign,
  Download,
  Trash2,
} from "lucide-react";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useRouter } from "next/navigation";
import InvoiceForm from "./InvoiceForm";
import {
  useDeleteInvoice,
  useUpdateInvoiceStatus,
  useDownloadInvoice,
  useSendInvoice,
} from "@/lib/api/hooks/useSales";
import PaymentReceivedForm from "../payment-received/PaymentReceivedForm";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export default function InvoicesActions({ row }: { row: any }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const deleteInvoice = useDeleteInvoice();
  const updateInvoiceStatus = useUpdateInvoiceStatus();
  const downloadInvoice = useDownloadInvoice();
  const sendInvoice = useSendInvoice();
  const { isOpen, openModal, closeModal } = useModal();

  const deleteKey = MODAL.INVOICE_DELETE + "-" + row.id;
  const editKey = MODAL.INVOICE_EDIT + "-" + row.id;
  const recordPaymentKey = MODAL.PAYMENT_RECEIVED_EDIT + "-" + row.id;
  const markSentKey = MODAL.INVOICE_MARK_SENT + "-" + row.id;

  const handleDeleteClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(deleteKey), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(editKey), 100);
  };

  const handleRecordPaymentClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(recordPaymentKey), 100);
  };

  const handleMarkSentClick = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(markSentKey), 100);
  };

  const handleConfirmDelete = (confirmed: boolean) => {
    if (confirmed) {
      deleteInvoice.mutate(row.id);
    }
    closeModal(deleteKey);
  };

  const handleConfirmMarkSent = (confirmed: boolean) => {
    if (confirmed) {
      updateInvoiceStatus.mutate({ id: row.id, status: "Sent" });
    }
    closeModal(markSentKey);
  };

  return (
    <>
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="hover:bg-gray-100">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              const invoiceNumber = row?.invoiceNumber.toString().toLowerCase();
              // View logic
              router.push(`/income/invoices/${invoiceNumber}`);
            }}
          >
            <Eye className="size-4 mr-2" /> View
          </DropdownMenuItem>
          {row?.status !== "Paid" && (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleRecordPaymentClick();
              }}
            >
              <DollarSign className="size-4 mr-2" /> Record payment
            </DropdownMenuItem>
          )}
          {row?.status === "Draft" && (
            <>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleEditClick();
                }}
              >
                <Edit3 className="size-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleMarkSentClick();
                }}
              >
                <Send className="size-4 mr-2" /> Mark as Sent
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              sendInvoice.mutate(row.id);
            }}
            disabled={sendInvoice.isPending}
          >
            <Send className="size-4 mr-2" /> {sendInvoice.isPending ? "Sending..." : "Send to Customer"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              downloadInvoice.mutate(row.id);
            }}
            disabled={downloadInvoice.isPending}
          >
            <Download className="size-4 mr-2" /> {downloadInvoice.isPending ? "Downloading..." : "Download PDF"}
          </DropdownMenuItem>
          {row?.status === "Draft" && (
            <>
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
            </>
          )}
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
          title={`Are you sure you want to delete invoice ${row.invoiceNumber}?`}
          onResult={handleConfirmDelete}
          loading={deleteInvoice.isPending}
        />
      </CustomModal>
      <CustomModal
        title={`Edit Invoice: ${row.name || row.invoiceNumber || row.id}`}
        open={isOpen(editKey)}
        onOpenChange={(open) =>
          open ? openModal(editKey) : closeModal(editKey)
        }
        module={MODULES.SALES}
      >
        <InvoiceForm invoice={row} isEditMode />
      </CustomModal>

      <CustomModal
        title={`Mark Invoice as Sent`}
        description={`Are you sure you want to mark invoice ${row?.invoiceNumber} as sent?`}
        open={isOpen(markSentKey)}
        onOpenChange={(open) =>
          open ? openModal(markSentKey) : closeModal(markSentKey)
        }
        module={MODULES.SALES}
      >
        <ConfirmationForm
          title={`Mark invoice ${row.invoiceNumber} as sent?`}
          onResult={handleConfirmMarkSent}
          loading={updateInvoiceStatus.isPending}
        />
      </CustomModal>

      <CustomModal
        title={`Record a Payment`}
        description={`Record a payment received for invoice ${row?.invoiceNumber}`}
        open={isOpen(recordPaymentKey)}
        onOpenChange={(open) =>
          open ? openModal(recordPaymentKey) : closeModal(recordPaymentKey)
        }
        module={MODULES.SALES}
      >
        <PaymentReceivedForm invoiceId={row.id} />
      </CustomModal>
    </>
  );
}
