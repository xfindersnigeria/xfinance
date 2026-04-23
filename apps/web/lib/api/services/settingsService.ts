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

// ── Module Toggle ─────────────────────────────────────────────

export const toggleEntityMenu = async (menuName: string, enabled: boolean) =>
  apiClient("settings/modules/menu-toggle", {
    method: "PATCH",
    body: JSON.stringify({ menuName, enabled }),
  });
