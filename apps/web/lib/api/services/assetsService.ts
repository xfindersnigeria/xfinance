
import { apiClient } from "../client";

/**
 * Asset Endpoints
 */
export const getAssets = async (params?: { search?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `asset?${queryString}` : "asset";
  return apiClient(url, { method: "GET" });
};

export const getAssetById = async (id: string) => {
  return apiClient(`asset/${id}`, { method: "GET" });
};

export const createAsset = async (data: {
  name: string;
  type: string;
  department: string;
  assignedId: string;
  description?: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  expiryDate?: string;
  depreciationMethod: string;
  years: number;
  salvageValue: number;
}) => {
  return apiClient("asset", {
    method: "POST",
    body: JSON.stringify(data),
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });
};

export const updateAsset = async (
  id: string,
  data: {
    name?: string;
    type?: string;
    department?: string;
    assigned?: string;
    description?: string;
    purchaseDate?: string;
    purchaseCost?: number;
    currentValue?: number;
    expiryDate?: string;
    depreciationMethod?: string;
    years?: number;
    salvageValue?: number;
  },
) => {
  return apiClient(`asset/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    // headers: {
      // "Content-Type": "application/json",
    // },
  });
};

export const deleteAsset = async (id: string) => {
  return apiClient(`asset/${id}`, { method: "DELETE" });
};


// ────────────────────────────────────────────────
// Store Inventory Endpoints
// ────────────────────────────────────────────────

// Store Supply CRUD
export const getStoreSupplies = async (params?: { search?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  const queryString = queryParams.toString();
  const url = queryString ? `store-supply?${queryString}` : "store-supply";
  return apiClient(url, { method: "GET" });
};

export const getStoreSupplyById = async (id: string) => {
  return apiClient(`store-supply/${id}`, { method: "GET" });
};

export const createStoreSupply = async (data: any) => {
  return apiClient("store-supply", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateStoreSupply = async (id: string, data: any) => {
  return apiClient(`store-supply/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteStoreSupply = async (id: string) => {
  return apiClient(`store-supply/${id}`, { method: "DELETE" });
};

// Store Supply Stats
export const getStoreSupplyStats = async () => {
  return apiClient("store-supply/stats", { method: "GET" });
};

// Issue History CRUD
export const getStoreSupplyIssues = async (params?: { search?: string; page?: number; limit?: number; projectId?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.projectId) queryParams.append("projectId", params.projectId);
  const queryString = queryParams.toString();
  const url = queryString ? `store-supply/issue-history?${queryString}` : "store-supply/issue-history";
  return apiClient(url, { method: "GET" });
};

export const getStoreSupplyIssueById = async (id: string) => {
  return apiClient(`store-supply/issue-history/${id}`, { method: "GET" });
};

export const createStoreSupplyIssueSingle = async (data: any) => {
  return apiClient("store-supply/issue-history/single", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const createStoreSupplyIssueBulk = async (data: any) => {
  return apiClient("store-supply/issue-history/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateStoreSupplyIssue = async (id: string, data: any) => {
  return apiClient(`store-supply/issue-history/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteStoreSupplyIssue = async (id: string) => {
  return apiClient(`store-supply/issue-history/${id}`, { method: "DELETE" });
};

// Restock History CRUD
export const getStoreSupplyRestocks = async (params?: { search?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append("search", params.search);
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  const queryString = queryParams.toString();
  const url = queryString ? `store-supply/restock-history?${queryString}` : "store-supply/restock-history";
  return apiClient(url, { method: "GET" });
};

export const getStoreSupplyRestockById = async (id: string) => {
  return apiClient(`store-supply/restock-history/${id}`, { method: "GET" });
};

export const createStoreSupplyRestock = async (data: any) => {
  return apiClient("store-supply/restock-history", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const updateStoreSupplyRestock = async (id: string, data: any) => {
  return apiClient(`store-supply/restock-history/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const deleteStoreSupplyRestock = async (id: string) => {
  return apiClient(`store-supply/restock-history/${id}`, { method: "DELETE" });
};