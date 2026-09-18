"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Mail, MapPin, Phone, StickyNote, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtAmount, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useCancelOrder, useCompleteOrder, useOrder } from "@/lib/api/hooks/useOrders";
import { PAYMENT_METHODS, paymentMethodLabel, type Order } from "@/lib/api/services/ordersService";
import { taxLabel } from "@/lib/tax/totals";
import { formatOrderDate, OrderSourceBadge, OrderStatusBadge } from "./OrderColumn";

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-base font-semibold" : "flex justify-between text-sm"}>
      <span className={strong ? undefined : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ContactLine({ icon: Icon, children }: { icon: typeof User; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export default function OrderDetailSheet({
  order: initial,
  onOpenChange,
}: {
  order: Order | null;
  onOpenChange: (open: boolean) => void;
}) {
  const sym = useEntityCurrencySymbol();
  // Fresh copy (status changes after Mark as paid / Cancel), falling back to the row
  const { data: fresh } = useOrder(initial?.id);
  const order = fresh && fresh.id === initial?.id ? fresh : initial;
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  return (
    <Sheet open={!!initial} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {order && (
          <>
            <SheetHeader className="pr-12">
              <SheetTitle className="text-lg">{order.orderNumber}</SheetTitle>
              <SheetDescription>{formatOrderDate(order.createdAt)}</SheetDescription>
              <div className="flex flex-wrap gap-2 pt-1">
                <OrderStatusBadge status={order.status} />
                <OrderSourceBadge source={order.source} />
              </div>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              {order.status === "Pending" && (
                <div className="space-y-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm">
                    {order.source === "ONLINE"
                      ? "Contact the customer to arrange payment, then mark the order as paid. Stock is taken and the sale is recorded when you do."
                      : "This order hasn't been paid yet."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setPayOpen(true)}>
                      <CheckCircle2 className="size-4" />
                      Mark as paid
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancelOpen(true)}>
                      <Ban className="size-4" />
                      Cancel order
                    </Button>
                  </div>
                </div>
              )}

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Customer</h4>
                <ContactLine icon={User}>{order.customerName || order.customer?.name || "Walk-in customer"}</ContactLine>
                {order.customerEmail && (
                  <ContactLine icon={Mail}>
                    <a className="text-primary hover:underline" href={`mailto:${order.customerEmail}`}>
                      {order.customerEmail}
                    </a>
                  </ContactLine>
                )}
                {order.customerPhone && (
                  <ContactLine icon={Phone}>
                    <a className="text-primary hover:underline" href={`tel:${order.customerPhone}`}>
                      {order.customerPhone}
                    </a>
                  </ContactLine>
                )}
                {order.deliveryAddress && <ContactLine icon={MapPin}>{order.deliveryAddress}</ContactLine>}
                {order.notes && <ContactLine icon={StickyNote}>{order.notes}</ContactLine>}
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Items</h4>
                <div className="divide-y rounded-xl border">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0">
                        <div className="break-words">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity} × {fmtAmount(item.rate, sym)}
                        </div>
                      </div>
                      <div className="shrink-0 font-medium">{fmtAmount(item.total, sym)}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-1 pt-2">
                  <Row label="Subtotal" value={fmtAmount(order.subtotal, sym)} />
                  <Row
                    label={taxLabel(order.taxName, order.taxRate, order.taxInclusive)}
                    value={fmtAmount(order.tax, sym)}
                  />
                  <Row label="Total" value={fmtAmount(order.total, sym)} strong />
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Payment</h4>
                {order.status === "Completed" ? (
                  <>
                    <Row label="Method" value={paymentMethodLabel(order.paymentMethod)} />
                    {order.completedAt && <Row label="Paid" value={formatOrderDate(order.completedAt)} />}
                    <Row label="Receipt" value={order.receipt?.receiptNumber ?? "—"} />
                    {order.receipt && (
                      <Row
                        label="Ledger posting"
                        value={
                          <Badge
                            variant="outline"
                            className={
                              order.receipt.postingStatus === "Success"
                                ? "border-green-200 text-green-700"
                                : order.receipt.postingStatus === "Failed"
                                  ? "border-red-200 text-red-700"
                                  : "text-muted-foreground"
                            }
                          >
                            {order.receipt.postingStatus === "Success" ? "Posted" : order.receipt.postingStatus}
                            {order.receipt.journalReference ? ` · ${order.receipt.journalReference}` : ""}
                          </Badge>
                        }
                      />
                    )}
                  </>
                ) : order.status === "Cancelled" ? (
                  <>
                    {order.cancelledAt && <Row label="Cancelled" value={formatOrderDate(order.cancelledAt)} />}
                    <Row label="Reason" value={order.cancelReason || "—"} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Awaiting payment</p>
                )}
              </section>
            </div>

            <MarkPaidDialog order={order} open={payOpen} onOpenChange={setPayOpen} />
            <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MarkPaidDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sym = useEntityCurrencySymbol();
  const complete = useCompleteOrder();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    subCategory: "Cash and Cash Equivalents",
  });
  const accounts: Array<{ id: string; name: string; code?: string }> = (accountsData?.data as any) || [];
  const [paymentMethod, setPaymentMethod] = useState("Bank_Transfer");
  const [depositTo, setDepositTo] = useState("");

  useEffect(() => {
    if (!depositTo && accounts.length > 0) setDepositTo(accounts[0].id);
  }, [accounts, depositTo]);

  const submit = () =>
    complete.mutate(
      { id: order.id, paymentMethod, depositTo },
      // Close on success, and on "already processed" too — the refetch shows the real state
      { onSettled: (_, error) => (!error || /already/i.test(error.message)) && onOpenChange(false) },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark {order.orderNumber} as paid</DialogTitle>
          <DialogDescription>
            Records a {fmtAmount(order.total, sym)} sales receipt, takes the items out of stock and posts it to the
            ledger.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Payment method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Deposit to</Label>
            <Select value={depositTo} onValueChange={setDepositTo} disabled={accountsLoading}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account"} />
              </SelectTrigger>
              <SelectContent>
                {accounts.length > 0 ? (
                  accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.code ? ` (${a.code})` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-accounts" disabled>
                    No cash accounts found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!depositTo || complete.isPending}>
            {complete.isPending ? "Recording..." : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cancel = useCancelOrder();
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel {order.orderNumber}?</DialogTitle>
          <DialogDescription>The order is closed without a sale. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <Textarea
            id="cancel-reason"
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Customer couldn't be reached"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep order
          </Button>
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(
                { id: order.id, reason: reason.trim() || undefined },
                { onSuccess: () => onOpenChange(false) },
              )
            }
          >
            {cancel.isPending ? "Cancelling..." : "Cancel order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
