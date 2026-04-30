import { apiClient } from "../client";

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateDepartmentPayload {
  name?: string;
  description?: string;
  status?: "active" | "inactive";
}

export const getDepartments = async () =>
  apiClient("settings/department", { method: "GET" });

export const createDepartment = async (payload: CreateDepartmentPayload) =>
  apiClient("settings/department", {
    method: "POST",
    // headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const updateDepartment = async (id: string, payload: UpdateDepartmentPayload) =>
  apiClient(`settings/department/${id}`, {
    method: "PUT",
    // headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

export const deleteDepartment = async (id: string) =>
  apiClient(`settings/department/${id}`, { method: "DELETE" });

// ── Statutory Deductions ─────────────────────────────────────

export type DeductionType = "PERCENTAGE" | "FIXED_AMOUNT" | "TIERED";

export interface CreateStatutoryDeductionPayload {
  name: string;
  type: DeductionType;
  rate?: number;
  description?: string;
  accountId?: string;
  status?: "active" | "inactive";
}

export interface UpdateStatutoryDeductionPayload {
  name?: string;
  type?: DeductionType;
  rate?: number;
  description?: string;
  accountId?: string;
  status?: "active" | "inactive";
}

export const getStatutoryDeductions = async () =>
  apiClient("settings/payroll/statutory-deductions", { method: "GET" });

export const createStatutoryDeduction = async (payload: CreateStatutoryDeductionPayload) =>
  apiClient("settings/payroll/statutory-deductions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateStatutoryDeduction = async (id: string, payload: UpdateStatutoryDeductionPayload) =>
  apiClient(`settings/payroll/statutory-deductions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteStatutoryDeduction = async (id: string) =>
  apiClient(`settings/payroll/statutory-deductions/${id}`, { method: "DELETE" });

// ── Other Deductions ─────────────────────────────────────────

export type OtherDeductionType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface CreateOtherDeductionPayload {
  name: string;
  type: OtherDeductionType;
  rate: number;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateOtherDeductionPayload {
  name?: string;
  type?: OtherDeductionType;
  rate?: number;
  description?: string;
  status?: "active" | "inactive";
}

export const getOtherDeductions = async () =>
  apiClient("settings/payroll/other-deductions", { method: "GET" });

export const createOtherDeduction = async (payload: CreateOtherDeductionPayload) =>
  apiClient("settings/payroll/other-deductions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateOtherDeduction = async (id: string, payload: UpdateOtherDeductionPayload) =>
  apiClient(`settings/payroll/other-deductions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteOtherDeduction = async (id: string) =>
  apiClient(`settings/payroll/other-deductions/${id}`, { method: "DELETE" });

// ── Product Categories ────────────────────────────────────────

export interface CreateProductCategoryPayload {
  name: string;
  color?: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateProductCategoryPayload {
  name?: string;
  color?: string;
  description?: string;
  status?: "active" | "inactive";
}

export const getProductCategories = async () =>
  apiClient("settings/product/categories", { method: "GET" });

export const createProductCategory = async (payload: CreateProductCategoryPayload) =>
  apiClient("settings/product/categories", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProductCategory = async (id: string, payload: UpdateProductCategoryPayload) =>
  apiClient(`settings/product/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteProductCategory = async (id: string) =>
  apiClient(`settings/product/categories/${id}`, { method: "DELETE" });

// ── Product Units ─────────────────────────────────────────────

export interface CreateProductUnitPayload {
  name: string;
  abbreviation: string;
  type: string;
  status?: "active" | "inactive";
}

export interface UpdateProductUnitPayload {
  name?: string;
  abbreviation?: string;
  type?: string;
  status?: "active" | "inactive";
}

export const getProductUnits = async () =>
  apiClient("settings/product/units", { method: "GET" });

export const createProductUnit = async (payload: CreateProductUnitPayload) =>
  apiClient("settings/product/units", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProductUnit = async (id: string, payload: UpdateProductUnitPayload) =>
  apiClient(`settings/product/units/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteProductUnit = async (id: string) =>
  apiClient(`settings/product/units/${id}`, { method: "DELETE" });

// ── Product Brands ────────────────────────────────────────────

export interface CreateProductBrandPayload {
  name: string;
  description?: string;
  status?: "active" | "inactive";
}

export interface UpdateProductBrandPayload {
  name?: string;
  description?: string;
  status?: "active" | "inactive";
}

export const getProductBrands = async () =>
  apiClient("settings/product/brands", { method: "GET" });

export const createProductBrand = async (payload: CreateProductBrandPayload) =>
  apiClient("settings/product/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateProductBrand = async (id: string, payload: UpdateProductBrandPayload) =>
  apiClient(`settings/product/brands/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteProductBrand = async (id: string) =>
  apiClient(`settings/product/brands/${id}`, { method: "DELETE" });

// ── Group Currencies ──────────────────────────────────────────

export interface GroupCurrency {
  id: string;
  groupId: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurrencyPayload {
  code: string;
  name: string;
  symbol: string;
  exchangeRate?: number;
  isPrimary?: boolean;
}

export interface UpdateCurrencyPayload {
  name?: string;
  symbol?: string;
  exchangeRate?: number;
}

export const getCurrencies = async (activeOnly = false) =>
  apiClient(`settings/currency${activeOnly ? '?active=true' : ''}`, { method: 'GET' });

export const createCurrency = async (payload: CreateCurrencyPayload) =>
  apiClient('settings/currency', { method: 'POST', body: JSON.stringify(payload) });

export const updateCurrency = async (id: string, payload: UpdateCurrencyPayload) =>
  apiClient(`settings/currency/${id}`, { method: 'PUT', body: JSON.stringify(payload) });

export const toggleCurrency = async (id: string, isActive: boolean) =>
  apiClient(`settings/currency/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ isActive }) });

export const setPrimaryCurrency = async (id: string) =>
  apiClient(`settings/currency/${id}/set-primary`, { method: 'PATCH' });

export const deleteCurrency = async (id: string) =>
  apiClient(`settings/currency/${id}`, { method: 'DELETE' });

// ── Entity Config ─────────────────────────────────────────────

export interface EntityConfig {
  baseCurrency: string | null;
  multiCurrency: boolean;
  dateFormat: string | null;
  numberFormat: string | null;
  language: string;
  timezone: string;
  emailNotifications: boolean;
  twoFactorAuth: boolean;
  auditLog: boolean;
  invoicePrefix?: string | null;
  paymentTerm?: string | null;
  lateFees?: boolean;
  paymentReminders?: boolean;
  taxRate?: number | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankRoutingNumber?: string | null;
  bankSwiftCode?: string | null;
  invoiceNotes?: string | null;
}

export interface UpdateEntityConfigPayload {
  baseCurrency?: string;
  multiCurrency?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  language?: string;
  timezone?: string;
  emailNotifications?: boolean;
  twoFactorAuth?: boolean;
  auditLog?: boolean;
  invoicePrefix?: string;
  paymentTerm?: string;
  lateFees?: boolean;
  paymentReminders?: boolean;
  taxRate?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankSwiftCode?: string;
  invoiceNotes?: string;
}

export const getEntityConfig = async () =>
  apiClient('settings/config', { method: 'GET' });

export const updateEntityConfig = async (payload: UpdateEntityConfigPayload) =>
  apiClient('settings/config', { method: 'PATCH', body: JSON.stringify(payload) });

// ── Module Toggle ─────────────────────────────────────────────

export const toggleEntityMenu = async (menuName: string, enabled: boolean) =>
  apiClient("settings/modules/menu-toggle", {
    method: "PATCH",
    body: JSON.stringify({ menuName, enabled }),
  });
