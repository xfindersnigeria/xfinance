"use client";

import { useState } from "react";
import { CheckCircle2, Mail, Plus, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { useEmailReceipt } from "@/lib/api/hooks/useOrders";
import { paymentMethodLabel, type Order } from "@/lib/api/services/ordersService";
import { printOrderReceipt } from "./printReceipt";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function PosSuccess({
  order,
  sym,
  businessName,
  onNewSale,
}: {
  order: Order;
  sym: string;
  businessName?: string;
  onNewSale: () => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState(order.customerEmail ?? "");
  const emailReceipt = useEmailReceipt();

  const sendEmail = () => {
    if (!order.receipt) return;
    if (!EMAIL_RE.test(to.trim())) {
      toast.error("Enter a valid email address");
      return;
    }
    emailReceipt.mutate(
      { receiptId: order.receipt.id, to: to.trim() },
      { onSuccess: () => setEmailOpen(false) },
    );
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardContent className="space-y-6 p-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sale complete</h2>
            <p className="text-sm text-muted-foreground">
              {order.customerName || "Walk-in customer"} · {paymentMethodLabel(order.paymentMethod)}
            </p>
          </div>
          <div className="text-3xl font-bold text-primary">{fmtAmount(order.total, sym)}</div>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted p-4 text-left text-sm">
            <div>
              <div className="text-muted-foreground">Order</div>
              <div className="font-medium">{order.orderNumber}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Receipt</div>
              <div className="font-medium">{order.receipt?.receiptNumber ?? "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!printOrderReceipt(order, sym, businessName)) {
                  toast.error("Allow pop-ups for this site to print the receipt");
                }
              }}
            >
              <Printer className="size-4" />
              Print receipt
            </Button>
            <Button variant="outline" disabled={!order.receipt} onClick={() => setEmailOpen(true)}>
              <Mail className="size-4" />
              Email receipt
            </Button>
          </div>
          <Button className="w-full" size="lg" onClick={onNewSale}>
            <Plus className="size-4" />
            New sale
          </Button>
        </CardContent>
      </Card>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email receipt</DialogTitle>
            <DialogDescription>Send receipt {order.receipt?.receiptNumber} to the customer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pos-receipt-email">Email address</Label>
            <Input
              id="pos-receipt-email"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              onKeyDown={(e) => e.key === "Enter" && sendEmail()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={emailReceipt.isPending}>
              {emailReceipt.isPending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
