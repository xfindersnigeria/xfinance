"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PaymentReceivedStatCardSmall from "./PaymentReceivedStatCardSmall";
import { FileText, Send, Clock, CheckCircle, Download } from "lucide-react";
import { Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import PaymentReceivedForm from "./PaymentReceivedForm";
import { MODULES } from "@/lib/types/enums";
import { PaymentReceivedStats } from "./utils/types";
import { useModal } from '@/components/providers/ModalProvider';
import { MODAL } from '@/lib/data/modal-data';
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface PaymentReceivedHeaderProps {
  stats?: PaymentReceivedStats;
  loading?: boolean;
}
export default function PaymentReceivedHeader({
  stats,
  loading = false,
}: PaymentReceivedHeaderProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const sym = useEntityCurrencySymbol();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">
            Payment Received
          </h2>
          <p className="text-muted-foreground">
            Track and manage invoice payments{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.PAYMENT_RECEIVED_CREATE)} className="rounded-xl">
            <Plus /> Record Paymnent
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : (
          <>
            <PaymentReceivedStatCardSmall
              title="Total Paid"
              value={
                <span className="text-xl">
                  {sym}{(stats?.totalAmount || 0).toLocaleString()}
                </span>
              }
              subtitle={`${stats?.totalRecords || 0} payment${stats?.totalRecords !== 1 ? "s" : ""}`}
              color="blue"
            />
            <PaymentReceivedStatCardSmall
              title="This Month Paid"
              value={
                <span className="text-xl">
                  {sym}{(stats?.currentMonthPaidTotal || 0).toLocaleString()}
                </span>
              }
              subtitle="Payments received this month"
              color="green"
            />
            <PaymentReceivedStatCardSmall
              title="Partial Payments"
              value={
                <span className="text-xl">
                  {(stats?.totalPartiallyPaidInvoices || 0).toLocaleString()}
                </span>
              }
              subtitle="Invoices partially paid"
              color="orange"
            />
          </>
        )}
      </div>

      <CustomModal
        title="Record Payment"
        description="Record a payment received for invoice"
        open={isOpen(MODAL.PAYMENT_RECEIVED_CREATE)}
        onOpenChange={(open) => open ? openModal(MODAL.PAYMENT_RECEIVED_CREATE) : closeModal(MODAL.PAYMENT_RECEIVED_CREATE)}
        module={MODULES.SALES}
      >
        <PaymentReceivedForm />
      </CustomModal>
    </div>
  );
}
