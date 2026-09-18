"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ImageIcon, Plus, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useDefaultTax } from "@/components/local/shared/TaxSelect";
import { useStoreItems } from "@/lib/api/hooks/useProducts";
import { useCustomers } from "@/lib/api/hooks/useSales";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { usePosCheckout } from "@/lib/api/hooks/useOrders";
import { fmtAmount, useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useSessionStore } from "@/lib/store/session";
import { computeTaxTotals } from "@/lib/tax/totals";
import type { Order } from "@/lib/api/services/ordersService";
import { cn } from "@/lib/utils";
import PosCart, { type CartLine, type PosCustomer } from "./PosCart";
import PosSuccess from "./PosSuccess";

interface PosItem {
  id: string;
  name: string;
  type: "product" | "service";
  unitPrice: number;
  taxable: boolean;
  trackInventory: boolean;
  currentStock: number | null;
  imageUrl: string | null;
  category?: { id: string; name: string } | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMPTY_CUSTOMER: PosCustomer = { id: "", name: "", email: "" };

/** Tracked products are capped at stock; services and untracked items aren't */
const stockCap = (item: PosItem): number | null =>
  item.type === "product" && item.trackInventory ? Math.max(0, item.currentStock ?? 0) : null;

export default function PointOfSale({ onExit }: { onExit: () => void }) {
  const sym = useEntityCurrencySymbol();
  const whoami = useSessionStore((s) => s.whoami);
  const businessName: string | undefined = (whoami as any)?.context?.currentEntity?.name;

  // The whole catalogue — POS filters locally so taps feel instant
  const { data: itemsData, isLoading: itemsLoading } = useStoreItems({ page: 1, limit: 500 });
  const items: PosItem[] = useMemo(() => (itemsData as any)?.items ?? [], [itemsData]);
  const { data: customersData, isLoading: customersLoading } = useCustomers();
  const customers = useMemo(
    () => (Array.isArray(customersData?.customers) ? customersData.customers : []) as any[],
    [customersData],
  );
  const { data: accountsData, isLoading: accountsLoading } = useAccounts({
    subCategory: "Cash and Cash Equivalents",
  });
  const accounts: Array<{ id: string; name: string; code?: string }> = (accountsData?.data as any) || [];

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<PosCustomer>(EMPTY_CUSTOMER);
  const [tax, setTax] = useState<{ taxRate?: number; taxName?: string | null }>({});
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [depositTo, setDepositTo] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [completed, setCompleted] = useState<Order | null>(null);
  const checkout = usePosCheckout();

  const defaultTax = useDefaultTax(true, tax, setTax);

  // Pre-select the first cash account so a sale is one tap away
  useEffect(() => {
    if (!depositTo && accounts.length > 0) setDepositTo(accounts[0].id);
  }, [accounts, depositTo]);

  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.category?.name).filter((n): n is string => !!n))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [items],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filter === "product" || filter === "service") {
        if (i.type !== filter) return false;
      } else if (filter.startsWith("cat:") && i.category?.name !== filter.slice(4)) return false;
      return !q || i.name.toLowerCase().includes(q) || (i.category?.name ?? "").toLowerCase().includes(q);
    });
  }, [items, filter, search]);

  const totals = computeTaxTotals(
    cart.map((l) => ({ total: l.price * l.quantity, taxable: l.taxable })),
    tax.taxRate ?? 0,
    defaultTax.inclusive,
  );
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);

  const addToCart = (item: PosItem) => {
    const max = stockCap(item);
    const existing = cart.find((l) => l.id === item.id);
    const nextQty = (existing?.quantity ?? 0) + 1;
    if (max !== null && nextQty > max) {
      toast.error(max === 0 ? `${item.name} is out of stock` : `Only ${max} ${item.name} in stock`);
      return;
    }
    setCart((prev) =>
      existing
        ? prev.map((l) => (l.id === item.id ? { ...l, quantity: nextQty, max } : l))
        : [
            ...prev,
            {
              id: item.id,
              name: item.name,
              price: Number(item.unitPrice) || 0,
              taxable: !!item.taxable,
              quantity: 1,
              max,
            },
          ],
    );
  };

  const changeQuantity = (id: string, delta: number) =>
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.id !== id) return l;
          const q = l.quantity + delta;
          return { ...l, quantity: l.max !== null ? Math.min(q, l.max) : q };
        })
        .filter((l) => l.quantity > 0),
    );

  const resetSale = () => {
    setCart([]);
    setCustomer(EMPTY_CUSTOMER);
    setCompleted(null);
    setCartOpen(false);
  };

  const charge = () => {
    if (cart.length === 0) return;
    if (!depositTo) {
      toast.error("Choose the account the money goes into");
      return;
    }
    const email = customer.email.trim();
    if (email && !EMAIL_RE.test(email)) {
      toast.error("The receipt email address looks invalid");
      return;
    }
    checkout.mutate(
      {
        items: cart.map((l) => ({ storeItemId: l.id, quantity: l.quantity })),
        customerId: customer.id || undefined,
        customerName: customer.id ? undefined : customer.name.trim() || undefined,
        customerEmail: email || undefined,
        paymentMethod,
        depositTo,
        taxRate: tax.taxRate ?? 0,
        taxName: tax.taxName ?? undefined,
      },
      {
        onSuccess: (order) => {
          setCompleted(order);
          setCartOpen(false);
          toast.success(`Sale ${order.orderNumber} recorded`);
        },
      },
    );
  };

  const renderCart = (className?: string) => (
    <PosCart
      className={className}
      sym={sym}
      cart={cart}
      onQuantity={changeQuantity}
      onRemove={(id) => setCart((prev) => prev.filter((l) => l.id !== id))}
      onClear={() => {
        setCart([]);
        setCustomer(EMPTY_CUSTOMER);
      }}
      customer={customer}
      onCustomerChange={setCustomer}
      customers={customers}
      customersLoading={customersLoading}
      tax={tax}
      onTaxChange={setTax}
      inclusive={defaultTax.inclusive}
      totals={totals}
      paymentMethod={paymentMethod}
      onPaymentMethod={setPaymentMethod}
      depositTo={depositTo}
      onDepositTo={setDepositTo}
      accounts={accounts}
      accountsLoading={accountsLoading}
      onCharge={charge}
      charging={checkout.isPending}
    />
  );

  const chips = [
    { key: "all", label: "All" },
    { key: "product", label: "Products" },
    { key: "service", label: "Services" },
    ...categories.map((c) => ({ key: `cat:${c}`, label: c })),
  ];

  return (
    <div className="flex h-full flex-col bg-background-subtle">
      {/* Top bar */}
      <div className="shrink-0 border-b bg-background px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3">
          <Button variant="outline" onClick={onExit}>
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Exit POS</span>
          </Button>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">Point of Sale</h2>
            <p className="truncate text-sm text-muted-foreground">{businessName || "Quick sales and checkout"}</p>
          </div>
        </div>
      </div>

      {completed ? (
        <PosSuccess order={completed} sym={sym} businessName={businessName} onNewSale={resetSale} />
      ) : (
        <div className="flex-1 min-h-0">
          <div className="mx-auto flex h-full max-w-[1800px] gap-6 p-4 md:p-6">
            {/* Catalogue */}
            <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto pb-24 lg:pb-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products and services..."
                  className="bg-background pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {chips.map((c) => (
                  <Button
                    key={c.key}
                    size="sm"
                    variant={filter === c.key ? "default" : "outline"}
                    className="shrink-0 rounded-full"
                    onClick={() => setFilter(c.key)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>

              {itemsLoading ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-56 rounded-xl" />
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="rounded-xl border bg-background py-16 text-center text-muted-foreground">
                  {items.length === 0 ? "No store items yet — add some under Products → Store Items." : "No items match."}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {visible.map((item) => {
                    const cap = stockCap(item);
                    const inCart = cart.find((l) => l.id === item.id)?.quantity ?? 0;
                    const soldOut = cap !== null && cap <= 0;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={soldOut}
                        onClick={() => addToCart(item)}
                        className={cn(
                          "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-shadow",
                          "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-sm",
                        )}
                      >
                        <div className="relative aspect-[4/3] w-full bg-muted">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt={item.name} className="size-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <ImageIcon className="size-8 text-muted-foreground" />
                            </div>
                          )}
                          {inCart > 0 && (
                            <Badge className="absolute right-2 top-2 rounded-full">{inCart}</Badge>
                          )}
                          {soldOut && (
                            <Badge variant="destructive" className="absolute left-2 top-2 rounded-full">
                              Out of stock
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-2 p-3">
                          <div className="min-w-0">
                            <div className="line-clamp-2 text-sm font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.category?.name ?? (item.type === "service" ? "Service" : "Product")}
                            </div>
                          </div>
                          <div className="mt-auto flex items-end justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-primary">
                                {fmtAmount(Number(item.unitPrice) || 0, sym)}
                              </div>
                              {cap !== null && (
                                <div className={cn("text-xs", cap <= 0 ? "text-destructive" : "text-muted-foreground")}>
                                  {cap} in stock
                                </div>
                              )}
                            </div>
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                              <Plus className="size-4" />
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart — side panel on desktop */}
            <aside className="hidden w-96 shrink-0 overflow-hidden rounded-2xl border bg-background shadow-sm lg:block">
              {renderCart()}
            </aside>
          </div>

          {/* Cart — bottom bar + sheet on phones/tablets */}
          <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background p-3 lg:hidden">
            <Button className="w-full justify-between" size="lg" onClick={() => setCartOpen(true)}>
              <span className="flex items-center gap-2">
                <ShoppingCart className="size-4" />
                Cart ({cartCount})
              </span>
              <span>{fmtAmount(totals.total, sym)}</span>
            </Button>
          </div>
          <Sheet open={cartOpen} onOpenChange={setCartOpen}>
            <SheetContent side="bottom" className="h-[90dvh] gap-0 rounded-t-2xl p-0 lg:hidden">
              <SheetTitle className="sr-only">Cart</SheetTitle>
              <SheetDescription className="sr-only">Items in the current sale and checkout</SheetDescription>
              {/* leave room for the sheet's close button */}
              {renderCart("[&>div:first-child]:pr-12")}
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  );
}
