"use client";

import { CreditCard, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaxSelect } from "@/components/local/shared/TaxSelect";
import { fmtAmount } from "@/lib/api/hooks/useCurrencyFormat";
import { PAYMENT_METHODS } from "@/lib/api/services/ordersService";
import { taxLabel } from "@/lib/tax/totals";
import { cn } from "@/lib/utils";

export interface CartLine {
  id: string;
  name: string;
  price: number;
  taxable: boolean;
  quantity: number;
  /** null = not stock-tracked (services, untracked products) */
  max: number | null;
}

export interface PosCustomer {
  id: string;
  name: string;
  email: string;
}

interface PosCartProps {
  sym: string;
  cart: CartLine[];
  onQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  customer: PosCustomer;
  onCustomerChange: (c: PosCustomer) => void;
  customers: Array<{ id: string; name: string; email?: string | null }>;
  customersLoading: boolean;
  tax: { taxRate?: number; taxName?: string | null };
  onTaxChange: (v: { taxRate: number; taxName: string | null }) => void;
  inclusive: boolean;
  totals: { subtotal: number; tax: number; total: number };
  paymentMethod: string;
  onPaymentMethod: (v: string) => void;
  depositTo: string;
  onDepositTo: (v: string) => void;
  accounts: Array<{ id: string; name: string; code?: string }>;
  accountsLoading: boolean;
  onCharge: () => void;
  charging: boolean;
  className?: string;
}

export default function PosCart({
  sym,
  cart,
  onQuantity,
  onRemove,
  onClear,
  customer,
  onCustomerChange,
  customers,
  customersLoading,
  tax,
  onTaxChange,
  inclusive,
  totals,
  paymentMethod,
  onPaymentMethod,
  depositTo,
  onDepositTo,
  accounts,
  accountsLoading,
  onCharge,
  charging,
  className,
}: PosCartProps) {
  const count = cart.reduce((s, l) => s + l.quantity, 0);
  const canCharge = cart.length > 0 && !!depositTo && !charging;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-5" />
          Current Sale
        </h3>
        <Badge variant="secondary">
          {count} {count === 1 ? "item" : "items"}
        </Badge>
      </div>
      <Separator />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
        <div className="space-y-2">
          <Label>Customer</Label>
          <CreatableCombobox
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            selectedId={customer.id}
            freeText={customer.name}
            isLoading={customersLoading}
            placeholder="Walk-in customer"
            searchPlaceholder="Search customers or type a name..."
            emptyMessage="No customers found."
            onSelect={(id) => {
              const c = customers.find((x) => x.id === id);
              onCustomerChange({ id, name: "", email: c?.email || customer.email });
            }}
            onFreeText={(text) => onCustomerChange({ ...customer, id: "", name: text })}
          />
          <Input
            type="email"
            placeholder="Email for the receipt (optional)"
            value={customer.email}
            onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
          />
        </div>

        <Separator />

        {cart.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">
            <ShoppingCart className="mx-auto mb-3 size-10 opacity-40" />
            <p>No items in cart</p>
            <p className="text-sm">Tap products to add them</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((line) => {
              const atMax = line.max !== null && line.quantity >= line.max;
              return (
                <div key={line.id} className="flex items-center gap-2 rounded-xl bg-muted p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{line.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmtAmount(line.price, sym)} each
                      {line.max !== null && ` · ${line.max} in stock`}
                    </div>
                    <div className="text-sm font-medium">{fmtAmount(line.price * line.quantity, sym)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label={`Decrease ${line.name}`}
                      onClick={() => onQuantity(line.id, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-7 text-center text-sm">{line.quantity}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-8"
                      aria-label={`Increase ${line.name}`}
                      disabled={atMax}
                      onClick={() => onQuantity(line.id, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-destructive"
                      aria-label={`Remove ${line.name}`}
                      onClick={() => onRemove(line.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Tax</Label>
            <TaxSelect value={tax} onChange={onTaxChange} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={onPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Payment method" />
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
              <Select value={depositTo} onValueChange={onDepositTo} disabled={accountsLoading}>
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
        </div>
      </div>

      <div className="shrink-0 space-y-3 border-t px-4 py-3">
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{fmtAmount(totals.subtotal, sym)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {taxLabel(tax.taxName, tax.taxRate ?? 0, inclusive)}
            </span>
            <span>{fmtAmount(totals.tax, sym)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">{fmtAmount(totals.total, sym)}</span>
          </div>
        </div>
        <Button type="button" className="w-full" size="lg" disabled={!canCharge} onClick={onCharge}>
          <CreditCard className="size-4" />
          {charging ? "Processing..." : `Charge ${fmtAmount(totals.total, sym)}`}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={cart.length === 0 || charging}
          onClick={onClear}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
