"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import PaymentMadeForm from "./PaymentMadeForm";
import { BillPaymentsResponse } from "../bills/types";

interface PaymentMadeHeaderProps {
  loading?: boolean;
  data?: BillPaymentsResponse;
}

export default function PaymentMadeHeader({ loading = false, data }: PaymentMadeHeaderProps) {
  const [open, setOpen] = React.useState(false);
  const totalPayments = data?.total || 0;

  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Payment Made</h2>
          <p className="text-muted-foreground">
            Track and manage vendor payments ({totalPayments} payments)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => setOpen(true)} className="rounded-xl">
            <Plus /> Record Payment
          </Button>
        </div>
      </div>

      <CustomModal
        title="Record Payment Made"
        description="Record a payment to a vendor"
        open={open}
        onOpenChange={setOpen}
        module={MODULES.PURCHASES}
      >
        <PaymentMadeForm  />
      </CustomModal>
    </div>
  );
}
