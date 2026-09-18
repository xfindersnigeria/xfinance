import { apiClient } from "../client";

/** Shape of the newer `{ data, message, statusCode }` envelope */
interface Envelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

export type OrderSource = "POS" | "ONLINE";
export type OrderStatus = "Pending" | "Completed" | "Cancelled";

export const PAYMENT_METHODS = [
  { value: "Cash", label: "Cash" },
  { value: "Card", label: "Card" },
  { value: "Bank_Transfer", label: "Bank Transfer" },
  { value: "Mobile_Money", label: "Mobile Money" },
  { value: "Debit_Card", label: "Debit Card" },
  { value: "Credit_Card", label: "Credit Card" },
  { value: "Check", label: "Check" },
  { value: "ACH", label: "ACH" },
  { value: "Wire_Transfer", label: "Wire Transfer" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export const paymentMethodLabel = (value?: string | null) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value ?? "—";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  storeItemId: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  taxRate: number;
  taxName: string | null;
  taxInclusive: boolean;
  total: number;
  paymentMethod: string | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  itemCount: number;
  items: OrderItem[];
  customer?: { id: string; name: string; email?: string | null; phoneNumber?: string | null } | null;
  receipt: {
    id: string;
    receiptNumber: string;
    postingStatus: string;
    journalReference: string | null;
  } | null;
}

export interface OrderStats {
  salesToday: number;
  salesChange: number | null;
  ordersToday: number;
  completedToday: number;
  pendingOrders: number;
  avgOrderValue: number;
  avgOrderChange: number | null;
}

export interface OrdersList {
  orders: Order[];
  stats: OrderStats;
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface OrdersQuery {
  page?: number;
  limit?: number;
  search?: string;
  source?: OrderSource;
  status?: OrderStatus;
}

export interface StoreSettings {
  enabled: boolean;
  slug: string | null;
  suggestedSlug: string;
  path: string | null;
  onlineItems: number;
}

export interface PosCheckoutPayload {
  items: Array<{ storeItemId: string; quantity: number }>;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  paymentMethod: string;
  depositTo: string;
  taxRate?: number;
  taxName?: string;
  notes?: string;
}

function qs(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const getOrders = async (params: OrdersQuery = {}) =>
  (
    await apiClient<Envelope<OrdersList>>(
      `orders${qs({
        page: params.page,
        limit: params.limit,
        search: params.search,
        source: params.source,
        status: params.status,
      })}`,
    )
  ).data;

export const getOrder = async (id: string) => (await apiClient<Envelope<Order>>(`orders/${id}`)).data;

export const posCheckout = async (payload: PosCheckoutPayload) =>
  (
    await apiClient<Envelope<Order>>("orders/pos-checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  ).data;

export const completeOrder = async (id: string, payload: { paymentMethod: string; depositTo: string }) =>
  (
    await apiClient<Envelope<Order>>(`orders/${id}/complete`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  ).data;

export const cancelOrder = async (id: string, reason?: string) =>
  (
    await apiClient<Envelope<Order>>(`orders/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify(reason ? { reason } : {}),
    })
  ).data;

export const getStoreSettings = async () => (await apiClient<Envelope<StoreSettings>>("orders/store")).data;

export const updateStoreSettings = async (payload: { enabled?: boolean; slug?: string }) =>
  (
    await apiClient<Envelope<StoreSettings>>("orders/store", {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  ).data;

export const emailReceipt = async (receiptId: string, to: string) =>
  apiClient<Envelope<unknown>>(`sales/receipts/${receiptId}/email`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
