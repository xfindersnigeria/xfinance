// lib/api/services/purchasesService.ts
import { apiClient } from "../client";

// =============== VENDORS ===============

export const getVendors = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.search) queryParams.append("search", params.search);
  if (params?.type) queryParams.append("type", params.type);

  const queryString = queryParams.toString();
  const url = queryString ? `purchases/vendors?${queryString}` : "purchases/vendors";

  return apiClient(url, {
    method: "GET",
  });
};

export const getVendorById = async (id: string | number) =>
  apiClient(`purchases/vendors/${id}`, {
    method: "GET",
  });

export const createVendor = async (data: any) =>
  apiClient("purchases/vendors", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateVendor = async (id: string | number, data: any) =>
  apiClient(`purchases/vendors/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteVendor = async (id: string | number) =>
  apiClient(`purchases/vendors/${id}`, { method: "DELETE" });

// =============== BILLS ===============

export const createBill = async (data: FormData) =>
  apiClient("bills/create", {
    method: "POST",
    body: data,
    // headers: {
      // Don't set Content-Type header - let browser set it for multipart/form-data
    // },
  });

export const getBills = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  vendorId?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.category) queryParams.append("category", params.category);
  if (params?.search) queryParams.append("search", params.search);
  if (params?.vendorId) queryParams.append("vendorId", params.vendorId);

  const queryString = queryParams.toString();
  const url = queryString ? `bills?${queryString}` : "bills";

  return apiClient(url, {
    method: "GET",
  });
};

export const getBillById = async (id: string | number) =>
  apiClient(`bills/${id}`, {
    method: "GET",
  });

export const createBillPayment = async (
  billId: string | number,
  data: any
) =>
  apiClient(`bills/${billId}/payments`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteBill = async (id: string | number) =>
  apiClient(`bills/${id}`, { method: "DELETE" });

export const markBillUnpaid = async (id: string | number) =>
  apiClient(`bills/${id}/mark-unpaid`, { method: "PATCH" });

export const updateBill = async (id: string | number, data: FormData) =>
  apiClient(`bills/${id}`, {
    method: "PATCH",
    body: data,
  });

export const getBillPayments = async (params?: {
  page?: number;
  limit?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));

  const queryString = queryParams.toString();
  // Note: API endpoint uses /bills/:id/payments but id is not used, so we use 'all'
  const url = queryString
    ? `purchases/payment-made?${queryString}`
    : "purchases/payment-made";

  return apiClient(url, {
    method: "GET",
  });
};

// =============== EXPENSES ===============

export const getExpenses = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.category) queryParams.append("category", params.category);
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `purchases/expenses?${queryString}` : "purchases/expenses";

  return apiClient(url, {
    method: "GET",
  });
};

export const getExpenseById = async (id: string | number) =>
  apiClient(`purchases/expenses/${id}`, {
    method: "GET",
  });

export const createExpense = async (data: FormData) =>
  apiClient("purchases/expenses", {
    method: "POST",
    body: data,
    // headers: {
      // Don't set Content-Type header - let browser set it for multipart/form-data
    // },
  });

export const updateExpense = async (id: string | number, data: any) =>
  apiClient(`purchases/expenses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteExpense = async (id: string | number) =>
  apiClient(`purchases/expenses/${id}`, { method: "DELETE" });

export const updateExpenseStatus = async (id: string | number, status: string) =>
  apiClient(`purchases/expenses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const approveExpense = async (id: string | number) =>
  apiClient(`purchases/expenses/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved" }),
  });

// =============== PAYMENT MADE ===============

export const createPaymentMade = async (data: any) =>
  apiClient("purchases/payment-made", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getPaymentMadeById = async (id: string | number) =>
  apiClient(`purchases/payment-made/${id}`, {
    method: "GET",
  });

export const updatePaymentMade = async (id: string | number, data: any) =>
  apiClient(`purchases/payment-made/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deletePaymentMade = async (id: string | number) =>
  apiClient(`purchases/payment-made/${id}`, { method: "DELETE" });
