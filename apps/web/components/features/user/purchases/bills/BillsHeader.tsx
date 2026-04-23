"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import BillsForm from "./BillsForm";
import { BillsResponse } from "./types";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface BillsHeaderProps {
  loading?: boolean;
  data?: BillsResponse;
}

export default function BillsHeader({
  loading = false,
  data,
}: BillsHeaderProps) {
  const totalBills = data?.total || 0;

  const { isOpen, openModal, closeModal } = useModal();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Bills</h2>
          <p className="text-muted-foreground">
            Manage vendor bills and accounts payable ({totalBills} bills)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button
            onClick={() => openModal(MODAL.BILL_CREATE)}
            className="rounded-xl"
          >
            <Plus /> New Bill
          </Button>
        </div>
      </div>

      <CustomModal
        title="New Bill"
        description="Create a new bill for your vendor"
        open={isOpen(MODAL.BILL_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.BILL_CREATE) : closeModal(MODAL.BILL_CREATE)
        }
        module={MODULES.PURCHASES}
      >
        <BillsForm />
      </CustomModal>
    </div>
  );
}
