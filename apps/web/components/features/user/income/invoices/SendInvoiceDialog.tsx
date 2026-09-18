"use client";

import React, { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSendInvoice } from "@/lib/api/hooks/useSales";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Confirm the recipient before emailing an invoice. Prefilled with the saved
 * customer's email (or the email typed for a typed-in customer); can be
 * changed — required when the customer has no email on file.
 */
export default function SendInvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sendInvoice = useSendInvoice();
  const defaultTo: string = invoice?.customer?.email || invoice?.customerEmail || "";
  const [to, setTo] = useState(defaultTo);

  useEffect(() => {
    if (open) setTo(defaultTo);
  }, [open, defaultTo]);

  const valid = EMAIL_RE.test(to.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send invoice {invoice?.invoiceNumber}</DialogTitle>
          <DialogDescription>
            The invoice PDF is emailed to {invoice?.customer?.name || invoice?.customerName || "the customer"}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            sendInvoice.mutate(
              { id: invoice.id, to: to.trim() },
              { onSuccess: () => onOpenChange(false) },
            );
          }}
        >
          <Label htmlFor="send-invoice-to">Send to</Label>
          <Input
            id="send-invoice-to"
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="customer@example.com"
            autoFocus
          />
          {!defaultTo && (
            <p className="text-xs text-muted-foreground">This customer has no email on file — enter one to send.</p>
          )}
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || sendInvoice.isPending} className="gap-2">
              {sendInvoice.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendInvoice.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
