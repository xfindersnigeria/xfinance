"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import InvoiceDetailsActions from "./InvoiceDetailsActions";
import { useSendInvoice, useDownloadInvoice } from "@/lib/api/hooks/useSales";

interface InvoiceDetailsHeaderProps {
  invoice: any;
  onBack: () => void;
}

export default function InvoiceDetailsHeader({
  invoice,
  onBack,
}: InvoiceDetailsHeaderProps) {
  const sendInvoice = useSendInvoice();
  const downloadInvoice = useDownloadInvoice();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Sent":
        return "bg-blue-100 text-primary";
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Draft":
        return "bg-gray-100 text-gray-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="mb-3">
      <div className="flex md:items-center md:flex-row md:justify-between flex-col gap-2 ">
        {/* Back button */}
       <div className="flex items-center justify-between w-full"> <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900 p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to Invoices</span>
          <span className="sm:hidden">Back</span>
        </Button>

        <Badge className={`${getStatusColor(invoice.status)} shrink-0  md:hidden`}>
            {invoice.status}
          </Badge></div>

        {/* Actions row - wraps on mobile */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 sm:gap-3">
          <Badge className={`${getStatusColor(invoice.status)} shrink-0 hidden md:block`}>
            {invoice.status}
          </Badge>
          <div className="flex flex-wrap gap-2 md:flex-nowrap justify-end w-full">
            {/* Hidden on small screens, shown on sm and up */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4" />
                <span className="hidden md:inline">Print</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={downloadInvoice.isPending}
                onClick={() => downloadInvoice.mutate(invoice.id)}
              >
                {downloadInvoice.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span className="hidden md:inline">
                  {downloadInvoice.isPending ? "Downloading…" : "Download PDF"}
                </span>
              </Button>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 flex-1 sm:flex-none"
              disabled={sendInvoice.isPending}
              onClick={() => sendInvoice.mutate(invoice.id)}
            >
              {sendInvoice.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span className="text-xs sm:text-sm">
                {sendInvoice.isPending ? "Sending…" : "Send to Customer"}
              </span>
            </Button>
            <InvoiceDetailsActions invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
}
