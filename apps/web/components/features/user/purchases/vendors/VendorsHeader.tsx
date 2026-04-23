"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, DollarSign, Calendar, Edit3, Download } from "lucide-react";
import { Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import VendorsForm from "./VendorsForm";
import { MODULES } from "@/lib/types/enums";
import { VendorsResponse } from "./types";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

interface VendorsHeaderProps {
  loading?: boolean;
  data?: VendorsResponse;
}

export default function VendorsHeader({ loading = false, data }: VendorsHeaderProps) {
  const totalVendors = data?.totalCount || 0;
const { isOpen, openModal, closeModal } = useModal();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Vendors</h2>
          <p className="text-muted-foreground">
            Manage vendor information and payables ({totalVendors} vendors)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => openModal(MODAL.VENDOR_CREATE)} className="rounded-xl">
            <Plus /> New Vendor
          </Button>
        </div>
      </div>

      <CustomModal
        title="Add New Vendor"
        description="Create a new vendor profile with contact information and payment details"
        open={isOpen(MODAL.VENDOR_CREATE)}
        onOpenChange={(open) => (open ? openModal(MODAL.VENDOR_CREATE) : closeModal(MODAL.VENDOR_CREATE))}
        module={MODULES.PURCHASES}
      >
        <VendorsForm />{" "}
      </CustomModal>
    </div>
  );
}
