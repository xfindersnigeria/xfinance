"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RotateCcw } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { BankAccountLedger } from "@/components/features/user/banking/details";

export default function BankAccountDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id?.toString() ?? "";

  return (
    <div className="space-y-4 p-2">
      <div className="flex items-center justify-between">
        <Button
          variant={"ghost"}
          className="cursor-pointer gap-2"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> Export Ledger
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => router.push(`/banking/${id}/reconcile`)}
          >
            <RotateCcw className="w-4 h-4" /> Reconcile Account
          </Button>
        </div>
      </div>
      <BankAccountLedger />
    </div>
  );
}
