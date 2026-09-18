"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ImageIcon,
  Mail,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { computeTaxTotals } from "@/lib/tax/totals";

// ─── API (public, no auth) ───────────────────────────────────────────────

interface PublicItem {
  id: string;
  name: string;
  description: string | null;
  type: "product" | "service";
  category: string | null;
  price: number;
  taxable: boolean;
  imageUrl: string | null;
  inStock: boolean;
  /** null = no cap */
  available: number | null;
}

interface PublicStore {
  store: {
    name: string;
    logoUrl: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    currency: string;
  };
  tax: { rate: number; name: string | null; inclusive: boolean };
  items: PublicItem[];
}

interface PlacedOrder {
  orderNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  store: { name: string; email: string | null; phone: string | null };
}

class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function publicFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/backend/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    const raw = typeof err === "string" ? err : err?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : raw;
    throw new HttpError(
      res.status === 429 ? "Too many attempts — please wait a minute and try again." : message || "Something went wrong",
      res.status,
    );
  }
  // { data: { data, message, statusCode } }
  return body?.data?.data as T;
}

// ─── Cart persistence (per store) ────────────────────────────────────────

type Cart = Record<string, number>;

function readCart(key: string): Cart {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCart(key: string, cart: Cart) {
  try {
    window.localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    // storage unavailable (private mode, blocked) — the cart just won't persist
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type SortKey = "featured" | "name" | "price-asc" | "price-desc";

export default function StoreFront({ slug }: { slug: string }) {
  const storageKey = `xf-store-cart:${slug}`;
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-store", slug],
    queryFn: () => publicFetch<PublicStore>(`public/store/${encodeURIComponent(slug)}`),
    retry: (count, err) => !(err instanceof HttpError && err.status === 404) && count < 2,
    staleTime: 60 * 1000,
  });

  const [cart, setCart] = useState<Cart>({});
  const cartLoaded = useRef(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<"cart" | "checkout">("cart");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  // Restore the cart after mount (localStorage isn't available during SSR)
  useEffect(() => {
    setCart(readCart(storageKey));
    cartLoaded.current = true;
  }, [storageKey]);
  useEffect(() => {
    if (cartLoaded.current) writeCart(storageKey, cart);
  }, [cart, storageKey]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Drop items that are no longer sold and clamp quantities to what's available
  useEffect(() => {
    if (!data) return;
    setCart((prev) => {
      let changed = false;
      const next: Cart = {};
      for (const [id, qty] of Object.entries(prev)) {
        const item = byId.get(id);
        if (!item || !item.inStock) {
          changed = true;
          continue;
        }
        const capped = item.available === null ? qty : Math.min(qty, item.available);
        if (capped !== qty) changed = true;
        if (capped > 0) next[id] = capped;
      }
      return changed ? next : prev;
    });
  }, [data, byId]);

  const money = useMemo(() => {
    const currency = data?.store.currency || "NGN";
    let f: Intl.NumberFormat;
    try {
      f = new Intl.NumberFormat("en-NG", { style: "currency", currency });
    } catch {
      f = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return (n: number) => f.format(Number(n) || 0);
  }, [data?.store.currency]);

  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category).filter((c): c is string => !!c))).sort(),
    [items],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = items.filter(
      (i) =>
        (category === "all" || i.category === category) &&
        (!q ||
          i.name.toLowerCase().includes(q) ||
          (i.description ?? "").toLowerCase().includes(q) ||
          (i.category ?? "").toLowerCase().includes(q)),
    );
    if (sort === "name") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price-asc") return [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [items, category, search, sort]);

  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ item: byId.get(id), qty }))
    .filter((l): l is { item: PublicItem; qty: number } => !!l.item && l.qty > 0);
  const cartCount = lines.reduce((s, l) => s + l.qty, 0);
  const totals = computeTaxTotals(
    lines.map((l) => ({ total: l.item.price * l.qty, taxable: l.item.taxable })),
    data?.tax.rate ?? 0,
    data?.tax.inclusive ?? false,
  );
  const taxRate = Number(data?.tax.rate ?? 0);
  const taxLine = data?.tax.inclusive
    ? `Includes ${data?.tax.name || "tax"} (${taxRate}%)`
    : `${data?.tax.name || "Tax"} (${taxRate}%)`;

  const setQty = (item: PublicItem, qty: number) => {
    const max = item.available === null ? Infinity : item.available;
    if (qty > max) toast.error(`Only ${item.available} ${item.name} available`);
    const next = Math.max(0, Math.min(qty, max));
    setCart((prev) => {
      const copy = { ...prev };
      if (next === 0) delete copy[item.id];
      else copy[item.id] = next;
      return copy;
    });
  };

  const placeOrder = useMutation({
    mutationFn: () =>
      publicFetch<PlacedOrder>(`public/store/${encodeURIComponent(slug)}/orders`, {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ storeItemId: l.item.id, quantity: l.qty })),
          customerName: form.name.trim(),
          customerEmail: form.email.trim(),
          customerPhone: form.phone.trim(),
          deliveryAddress: form.address.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      }),
    onSuccess: (order) => {
      setPlaced(order);
      setCart({});
      setCartOpen(false);
      setStep("cart");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitOrder = () => {
    if (!form.name.trim()) return toast.error("Enter your name");
    if (!EMAIL_RE.test(form.email.trim())) return toast.error("Enter a valid email address");
    if (form.phone.trim().replace(/\D/g, "").length < 7) return toast.error("Enter a valid phone number");
    if (lines.length === 0) return toast.error("Your cart is empty");
    placeOrder.mutate();
  };

  // ─── States ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-10 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    const notFound = error instanceof HttpError && error.status === 404;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <Store className="size-8 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-semibold">{notFound ? "Store not found" : "Something went wrong"}</h1>
          <p className="mt-2 text-muted-foreground">
            {notFound
              ? "This store link may be mistyped, or the store isn't open online right now."
              : "We couldn't load this store. Please check your connection and try again."}
          </p>
          {!notFound && (
            <Button className="mt-6" onClick={() => window.location.reload()}>
              Try again
            </Button>
          )}
        </div>
      </div>
    );
  }

  const { store } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 text-left"
              onClick={() => {
                setPlaced(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              {store.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logoUrl} alt={store.name} className="size-10 shrink-0 rounded-xl border object-contain" />
              ) : (
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
                  <Store className="size-5 text-primary-foreground" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{store.name}</span>
                <span className="block text-xs text-muted-foreground">Online Store</span>
              </span>
            </button>

            {!placed && (
              <div className="mx-8 hidden max-w-xl flex-1 md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    className="rounded-full pl-10"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="relative shrink-0 rounded-full"
              aria-label={`Cart, ${cartCount} items`}
              onClick={() => {
                setStep("cart");
                setCartOpen(true);
              }}
            >
              <ShoppingCart className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Button>
          </div>

          {!placed && (
            <div className="pb-3 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  className="rounded-full pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {placed ? (
        <OrderConfirmation order={placed} name={form.name} money={money} onContinue={() => setPlaced(null)} />
      ) : (
        <>
          {/* Hero */}
          <section className="bg-primary py-12 text-primary-foreground md:py-16">
            <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
              <h1 className="mb-3 text-3xl font-bold md:text-4xl">Welcome to {store.name}</h1>
              <p className="mx-auto max-w-2xl text-primary-foreground/80">
                Browse our products and services and place your order online — we&apos;ll get in touch to arrange
                payment and delivery.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="mt-6 rounded-full px-8"
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
              >
                Shop now
              </Button>
            </div>
          </section>

          {/* Filters + grid */}
          <main id="products" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full rounded-xl sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-full rounded-xl sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Featured</SelectItem>
                  <SelectItem value="name">Name: A to Z</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-2xl border py-16 text-center text-muted-foreground">
                {items.length === 0 ? "Nothing for sale yet — check back soon." : "No products match your search."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((item) => {
                  const qty = cart[item.id] ?? 0;
                  const atMax = item.available !== null && qty >= item.available;
                  return (
                    <div
                      key={item.id}
                      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-lg"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <ImageIcon className="size-10 text-muted-foreground" />
                          </div>
                        )}
                        {item.category && (
                          <Badge className="absolute left-3 top-3 rounded-full">{item.category}</Badge>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        <div>
                          <h3 className="font-semibold">{item.name}</h3>
                          {item.description && (
                            <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold">{money(item.price)}</div>
                            <div className={item.inStock ? "text-xs text-green-600" : "text-xs text-destructive"}>
                              {item.inStock
                                ? item.available !== null && item.available <= 5
                                  ? `Only ${item.available} left`
                                  : "In stock"
                                : "Out of stock"}
                            </div>
                          </div>
                          {qty > 0 ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-8 rounded-full"
                                aria-label={`Remove one ${item.name}`}
                                onClick={() => setQty(item, qty - 1)}
                              >
                                <Minus className="size-3" />
                              </Button>
                              <span className="w-6 text-center text-sm">{qty}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="size-8 rounded-full"
                                aria-label={`Add one ${item.name}`}
                                disabled={atMax}
                                onClick={() => setQty(item, qty + 1)}
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              className="rounded-full"
                              disabled={!item.inStock}
                              onClick={() => setQty(item, 1)}
                            >
                              <ShoppingCart className="size-4" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {cartCount > 0 && (
            <div className="sticky bottom-0 z-30 border-t bg-background p-3 md:hidden">
              <Button
                className="w-full justify-between rounded-full"
                size="lg"
                onClick={() => {
                  setStep("cart");
                  setCartOpen(true);
                }}
              >
                <span className="flex items-center gap-2">
                  <ShoppingCart className="size-4" />
                  View cart ({cartCount})
                </span>
                <span>{money(totals.total)}</span>
              </Button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-12 border-t bg-muted">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 text-sm sm:grid-cols-2 sm:px-6 lg:px-8">
          <div>
            <div className="mb-2 font-semibold">{store.name}</div>
            <p className="text-muted-foreground">
              Order online and we&apos;ll contact you to arrange payment and delivery.
            </p>
          </div>
          <div className="space-y-2 text-muted-foreground">
            {store.email && (
              <a href={`mailto:${store.email}`} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" /> {store.email}
              </a>
            )}
            {store.phone && (
              <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-foreground">
                <Phone className="size-4" /> {store.phone}
              </a>
            )}
            {store.address && (
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0" /> {store.address}
              </div>
            )}
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {store.name}
        </div>
      </footer>

      {/* Cart + checkout drawer */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b pr-12">
            <SheetTitle className="flex items-center gap-2">
              {step === "checkout" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-ml-2 size-8"
                  aria-label="Back to cart"
                  onClick={() => setStep("cart")}
                >
                  <ArrowLeft className="size-4" />
                </Button>
              )}
              {step === "cart" ? "Your cart" : "Checkout"}
            </SheetTitle>
            <SheetDescription>
              {step === "cart"
                ? `${cartCount} ${cartCount === 1 ? "item" : "items"}`
                : "We'll contact you to arrange payment and delivery."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {lines.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <ShoppingCart className="mx-auto mb-3 size-10 opacity-40" />
                Your cart is empty
              </div>
            ) : step === "cart" ? (
              <div className="space-y-3">
                {lines.map(({ item, qty }) => (
                  <div key={item.id} className="flex gap-3 rounded-xl border p-3">
                    <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.imageUrl} alt={item.name} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="size-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 text-sm font-medium">{item.name}</div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-mr-1 -mt-1 size-7 shrink-0 text-destructive"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => setQty(item, 0)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">{money(item.price)} each</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => setQty(item, qty - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-7 text-center text-sm">{qty}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-7"
                            aria-label={`Add one ${item.name}`}
                            disabled={item.available !== null && qty >= item.available}
                            onClick={() => setQty(item, qty + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <div className="text-sm font-semibold">{money(item.price * qty)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <form
                id="checkout-form"
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitOrder();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="co-name">Full name *</Label>
                  <Input
                    id="co-name"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-email">Email *</Label>
                  <Input
                    id="co-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-phone">Phone *</Label>
                  <Input
                    id="co-phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-address">Delivery address</Label>
                  <Textarea
                    id="co-address"
                    autoComplete="street-address"
                    rows={2}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="co-notes">Notes</Label>
                  <Textarea
                    id="co-notes"
                    rows={2}
                    placeholder="Anything we should know?"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </form>
            )}
          </div>

          {lines.length > 0 && (
            <div className="space-y-3 border-t p-4">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{money(totals.subtotal)}</span>
                </div>
                {taxRate > 0 && totals.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{taxLine}</span>
                    <span>{money(totals.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <span>Total</span>
                  <span>{money(totals.total)}</span>
                </div>
              </div>
              {step === "cart" ? (
                <Button className="w-full rounded-full" size="lg" onClick={() => setStep("checkout")}>
                  Checkout
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="checkout-form"
                  className="w-full rounded-full"
                  size="lg"
                  disabled={placeOrder.isPending}
                >
                  {placeOrder.isPending ? "Placing order..." : `Place order · ${money(totals.total)}`}
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                No payment is taken online — {store.name} will contact you to arrange it.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OrderConfirmation({
  order,
  name,
  money,
  onContinue,
}: {
  order: PlacedOrder;
  name: string;
  money: (n: number) => string;
  onContinue: () => void;
}) {
  const firstName = name.trim().split(/\s+/)[0];
  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-center sm:py-16">
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-9 text-green-600" />
      </div>
      <h1 className="text-2xl font-bold">Thank you{firstName ? `, ${firstName}` : ""}!</h1>
      <p className="mt-2 text-muted-foreground">Your order has been placed. We&apos;ve emailed you a confirmation.</p>

      <div className="mt-6 space-y-2 rounded-2xl border p-5 text-left">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Order number</span>
          <span className="font-semibold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{money(order.subtotal)}</span>
        </div>
        {order.tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{money(order.tax)}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-muted p-5 text-left text-sm">
        <p>
          <span className="font-semibold">{order.store.name}</span> will contact you to arrange payment and delivery.
        </p>
        {(order.store.email || order.store.phone) && (
          <div className="mt-3 space-y-2">
            {order.store.email && (
              <a href={`mailto:${order.store.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="size-4" /> {order.store.email}
              </a>
            )}
            {order.store.phone && (
              <a href={`tel:${order.store.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                <Phone className="size-4" /> {order.store.phone}
              </a>
            )}
          </div>
        )}
      </div>

      <Button className="mt-8 rounded-full" size="lg" onClick={onContinue}>
        Continue shopping
      </Button>
    </main>
  );
}
