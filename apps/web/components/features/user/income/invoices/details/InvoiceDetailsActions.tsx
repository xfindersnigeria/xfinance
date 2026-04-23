"use client";

import React, { useState } from "react";
import {
  MoreVertical,
  CheckCircle,
  Copy,
  Trash2,
  Currency,
  X,
  Printer,
  Edit3,
  Send,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import InvoiceForm from "../InvoiceForm";
import PaymentReceivedForm from "../../payment-received/PaymentReceivedForm";
import { useMarkInvoicePaid, useVoidInvoice, useSendInvoice, useDownloadInvoice } from "@/lib/api/hooks/useSales";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface InvoiceDetailsActionsProps {
  invoice: any;
}

export default function InvoiceDetailsActions({
  invoice,
}: InvoiceDetailsActionsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { isOpen, openModal, closeModal } = useModal();
  const markAsPaid = useMarkInvoicePaid();
  const voidInvoice = useVoidInvoice();
  const sendInvoice = useSendInvoice();
  const downloadInvoice = useDownloadInvoice();

  const handleRecordPayment = () => {
    setDropdownOpen(false);
    setTimeout(() => openModal(MODAL.PAYMENT_RECEIVED_CREATE), 100);
  };

  const handleMarkAsPaid = () => {
    setDropdownOpen(false);
    markAsPaid.mutate(invoice.id);
  };

  const handleDuplicate = () => {
    setDropdownOpen(false);
    toast.success("Invoice duplicated successfully");
  };

  const handleVoidInvoice = () => {
    setDropdownOpen(false);
    setTimeout(() => setVoidOpen(true), 100);
  };

  const handleEditClick = () => {
    setDropdownOpen(false);
    setTimeout(() => setEditOpen(true), 100);
  };

  const handleConfirmVoid = (confirmed: boolean) => {
    if (confirmed) {
      voidInvoice.mutate(invoice.id);
      setVoidOpen(false);
    }
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
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleRecordPayment();
            }}
          >
            <Currency className="size-4 mr-2" /> Record Payment
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => window.print()}
          >
            <Printer className="size-4 mr-2" /> Print
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              sendInvoice.mutate(invoice.id);
            }}
            disabled={sendInvoice.isPending}
          >
            <Send className="size-4 mr-2" /> {sendInvoice.isPending ? "Sending..." : "Send to Customer"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              downloadInvoice.mutate(invoice.id);
            }}
            disabled={downloadInvoice.isPending}
          >
            <Download className="size-4 mr-2" /> {downloadInvoice.isPending ? "Downloading..." : "Download PDF"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleMarkAsPaid();
            }}
          >
            <CheckCircle className="size-4 mr-2" /> Mark as Paid
          </DropdownMenuItem>
          <DropdownMenuItem
            data-variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              handleVoidInvoice();
            }}
          >
            <X className="size-4 mr-2" /> Void Invoice
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleDuplicate();
            }}
          >
            <Copy className="size-4 mr-2" /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              handleEditClick();
            }}
          >
            <Edit3 className="size-4 mr-2" /> Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Void Invoice Modal */}
      <CustomModal
        title="Void Invoice"
        open={voidOpen}
        onOpenChange={setVoidOpen}
        module={MODULES.SALES}
      >
        <ConfirmationForm
          title={`Are you sure you want to void invoice ${invoice.invoiceNumber}?`}
          onResult={handleConfirmVoid}
          loading={false}
        />
      </CustomModal>

      {/* Edit Invoice Modal */}
      <CustomModal
        title={`Edit Invoice: ${invoice.invoiceNumber}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        module={MODULES.SALES}
      >
        <InvoiceForm
          invoice={invoice}
          isEditMode
        />
      </CustomModal>

      <CustomModal
        title={`Record a Payment`}
        description={`Record a payment received for invoice ${invoice?.invoiceNumber} `}
        open={isOpen(MODAL.PAYMENT_RECEIVED_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.PAYMENT_RECEIVED_CREATE) : closeModal(MODAL.PAYMENT_RECEIVED_CREATE)
        }
        module={MODULES.SALES}
      >
        <PaymentReceivedForm invoiceId={invoice?.id} />
      </CustomModal>
    </>
  );
}
