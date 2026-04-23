// lib/api/services/salesService.ts
import {
  Customer,
  CustomersResponse,
} from "@/components/features/user/income/customers/utils/types";
import { apiBlobClient, apiClient } from "../client";
import {
  InvoicesResponse,
  PaidInvoicesResponse,
} from "@/components/features/user/income/invoices/utils/types";
import { ReceiptsResponse } from "@/components/features/user/income/sales-receipt/utils/types";
import { PaymentReceivedResponse } from "@/components/features/user/income/payment-received/utils/types";

// Customers
export const getCustomers: (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => Promise<CustomersResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString
    ? `sales/customers?${queryString}`
    : "sales/customers";

  return apiClient(url, { method: "GET" });
};
export const getCustomerById = (id: string | number) =>
  apiClient(`sales/customers/${id}`, {
    method: "GET",
  });
export const createCustomer = (data: any) =>
  apiClient("sales/customers", { method: "POST", body: JSON.stringify(data) });

export const updateCustomer = (id: string | number, data: any) =>
  apiClient(`sales/customers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteCustomer = (id: string | number) =>
  apiClient(`sales/customers/${id}`, { method: "DELETE" });

// Invoices
export const getInvoices: (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  customerId?: string;
}) => Promise<InvoicesResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.status && params.status !== "All Statuses")
    queryParams.append("status", params.status);
  if (params.search) queryParams.append("search", params.search);
  if (params.customerId) queryParams.append("customerId", params.customerId);
  const queryString = queryParams.toString();
  const url = queryString ? `sales/invoices?${queryString}` : "sales/invoices";

  return apiClient(url, { method: "GET" });
};
export const getInvoiceById = (id: string | number) =>
  apiClient(`sales/invoices/${id}`, {
    method: "GET",
  });
export const createInvoice = (data: any) =>
  apiClient("sales/invoices", { method: "POST", body: JSON.stringify(data) });
export const updateInvoice = (id: string | number, data: any) =>
  apiClient(`sales/invoices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteInvoice = (id: string | number) =>
  apiClient(`sales/invoices/${id}`, { method: "DELETE" });

export const updateInvoiceStatus = (id: string | number, status: string) =>
  apiClient(`sales/invoices/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const sendInvoice = (id: string | number) =>
  apiClient(`sales/invoices/${id}/send`, { method: "POST" });

export const downloadInvoice = async (id: string | number) => {
  return apiBlobClient(`/sales/invoices/${id}/download`, { method: "GET" });
};

export const getInvoiceGraphs = (params: any = {}) => {
  const queryParams = new URLSearchParams();
  if (params.from) queryParams.append("from", params.from);
  if (params.to) queryParams.append("to", params.to);
  const queryString = queryParams.toString();
  const url = queryString
    ? `sales/invoices/analytics?${queryString}`
    : "sales/invoices/analytics";
  return apiClient(url, { method: "GET" });
};

// Get Paid Invoices
export const getPaidInvoices: (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => Promise<PaidInvoicesResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString
    ? `sales/invoices/paid?${queryString}`
    : "sales/invoices/paid";

  return apiClient(url, { method: "GET" });
};

// Receipts
export const getReceipts: (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  paymentMethod?: string;
}) => Promise<ReceiptsResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.status && params.status !== "All Statuses")
    queryParams.append("status", params.status);
  if (params.search) queryParams.append("search", params.search);
  if (params.paymentMethod && params.paymentMethod !== "All Methods")
    queryParams.append("paymentMethod", params.paymentMethod);

  const queryString = queryParams.toString();
  const url = queryString ? `sales/receipts?${queryString}` : "sales/receipts";

  return apiClient(url, { method: "GET" });
};
export const getReceiptById = (id: string | number) =>
  apiClient(`sales/receipts/${id}`, {
    method: "GET",
  });
export const createReceipt = (data: any) =>
  apiClient("sales/receipts", { method: "POST", body: JSON.stringify(data) });
export const updateReceipt = (id: string | number, data: any) =>
  apiClient(`sales/receipts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteReceipt = (id: string | number) =>
  apiClient(`sales/receipts/${id}`, { method: "DELETE" });

// Payment Received
export const getPaymentsReceived: (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => Promise<PaymentReceivedResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.search) queryParams.append("search", params.search);
  if (params.status && params.status !== "All Statuses")
    queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  const url = queryString
    ? `sales/payments-received?${queryString}`
    : "sales/payments-received";

  return apiClient(url, { method: "GET" });
};

export const getPaymentReceivedById = (id: string | number) =>
  apiClient(`sales/payments-received/${id}`, {
    method: "GET",
  });

export const createPaymentReceived = (data: any) =>
  apiClient("sales/payments-received", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updatePaymentReceived = (id: string | number, data: any) =>
  apiClient(`sales/payments-received/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deletePaymentReceived = (id: string | number) =>
  apiClient(`sales/payments-received/${id}`, { method: "DELETE" });

export const getPaymentReceivedReportsSummary: (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  from?: string;
  to?: string;
}) => Promise<PaymentReceivedResponse> = (params = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append("page", String(params.page));
  if (params.limit) queryParams.append("limit", String(params.limit));
  if (params.search) queryParams.append("search", params.search);
  if (params.status && params.status !== "All Statuses")
    queryParams.append("status", params.status);
  if (params.from) queryParams.append("from", params.from);
  if (params.to) queryParams.append("to", params.to);

  const queryString = queryParams.toString();
  const url = queryString
    ? `sales/payments-received/reports/summary?${queryString}`
    : "sales/payments-received/reports/summary";

  return apiClient(url, { method: "GET" });
};

/**
 * Items Endpoints
 */
export const getItems = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  type?: any;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.category) queryParams.append("category", params.category);
  if (params?.type) queryParams.append("type", params.type);
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `items?${queryString}` : "items";
  return apiClient(url, { method: "GET" });
};

export const getItemById = async (id: string) => {
  return apiClient(`items/${id}`, { method: "GET" });
};

export const createItem = async (data: {
  name: string;
  category: string;
  sku: string;
  unit: string;
  description?: string;
  sellingPrice: number;
  costPrice?: number;
  rate?: number;
  taxable: boolean;
  currentStock: number;
  lowStock: number;
  type: "product" | "service";
}) => {
  return apiClient("items", {
    method: "POST",
    body: JSON.stringify(data),
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });
};

export const updateItem = async (
  id: string,
  data: {
    name?: string;
    category?: string;
    sku?: string;
    unit?: string;
    description?: string;
    sellingPrice?: number;
    costPrice?: number;
    rate?: number;
    taxable?: boolean;
    currentStock?: number;
    lowStock?: number;
    type?: "product" | "service";
  },
) => {
  return apiClient(`items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });
};

export const deleteItem = async (id: string) => {
  return apiClient(`items/${id}`, { method: "DELETE" });
};
