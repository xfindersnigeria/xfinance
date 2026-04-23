"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import SalesReceiptStatCardSmall from "./SalesReceiptStatCardSmall";
import {
  FileText,
  Send,
  Clock,
  CheckCircle,
  DollarSign,
  Calendar,
  Edit3,
  Download,
} from "lucide-react";
import { Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import SalesReceiptsForm from "./SalesReceiptsForm";
import { MODULES } from "@/lib/types/enums";
import { ReceiptStats } from "./utils/types";
import { useModal } from '@/components/providers/ModalProvider';
import { MODAL } from '@/lib/data/modal-data';

export default function SalesReceiptHeader({
  stats,
  loading,
}: {
  stats?: ReceiptStats;
  loading: boolean;
}) {
  const { isOpen, openModal, closeModal } = useModal();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Sales Receipts</h2>
          <p className="text-muted-foreground">
            Manage non-invoiced sales and cash transactions{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.SALES_RECEIPT_CREATE)} className="rounded-xl">
            <Plus /> New Receipt
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SalesReceiptStatCardSmall
          title="Total Sales"
          value={<span className="text-2xl">₦{(stats?.totalSales || 0).toLocaleString()}</span>}
          icon={
            <DollarSign className="h-6 w-6 text-emerald-600 bg-emerald-100 rounded-xl p-1" />
          }
          loading={loading}
        />
        <SalesReceiptStatCardSmall
          title="Today's Sales"
          value={<span className="text-2xl">₦{(stats?.todaysSales || 0).toLocaleString()}</span>}
          icon={
            <Calendar className="h-6 w-6 text-primary bg-indigo-100 rounded-xl p-1" />
          }
          loading={loading}
        />
        <SalesReceiptStatCardSmall
          title="Total Receipts"
          value={<span className="text-2xl">{stats?.totalReceipts || 0}</span>}
          icon={
            <FileText className="h-6 w-6 text-fuchsia-600 bg-fuchsia-100 rounded-xl p-1" />
          }
          loading={loading}
        />
        <SalesReceiptStatCardSmall
          title="Avg Receipt Value"
          value={<span className="text-2xl">₦{(stats?.averageReceiptValue || 0).toLocaleString()}</span>}
          icon={
            <Edit3 className="h-6 w-6 text-amber-500 bg-amber-100 rounded-xl p-1" />
          }
          loading={loading}
        />
      </div>

      <CustomModal
        title="New Sales Receipt"
        description="Create a new sales receipt for non-invoiced sales"
        open={isOpen(MODAL.SALES_RECEIPT_CREATE)}
        onOpenChange={(open) => open ? openModal(MODAL.SALES_RECEIPT_CREATE) : closeModal(MODAL.SALES_RECEIPT_CREATE)}
        module={MODULES.SALES}
      >
        <SalesReceiptsForm />
      </CustomModal>
    </div>
  );
}
