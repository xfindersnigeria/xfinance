import { apiClient } from "../client";

/**
 * Collections Endpoints
 */
export const getCollections = async (params?: {
  page?: number;
  limit?: number;
  search?: string;

}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `collections?${queryString}` : "collections";
  return apiClient(url, { method: "GET" });
};

export const getCollectionById = async (id: string) => {
  return apiClient(`collections/${id}`, { method: "GET" });
};

export const createCollection = async (formData: FormData) => {
  return apiClient("collections", {
    method: "POST",
    body: formData,
    // headers: {
      // Let the browser set Content-Type for FormData
    // },
  });
};

export const updateCollection = async (id: string, formData: FormData) => {
  return apiClient(`collections/${id}`, {
    method: "PUT",
    body: formData,
    // headers: {
      // Let the browser set Content-Type for FormData
    // },
  });
};

export const deleteCollection = async (id: string) => {
  return apiClient(`collections/${id}`, { method: "DELETE" });
};

/**
 * Items Endpoints
 */
export const getStoreItems = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  type?: "product" | "service";
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.category) queryParams.append("category", params.category);
  if (params?.type) queryParams.append("type", params.type);
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `store-items?${queryString}` : "store-items";
  return apiClient(url, { method: "GET" });
};

export const getStoreItemById = async (id: string) => {
  return apiClient(`store-items/${id}`, { method: "GET" });
};

export const createStoreItem = async (data: {
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
  return apiClient("store-items", {
    method: "POST",
    body: JSON.stringify(data),
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });
};

export const updateStoreItem = async (
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
  }
) => {
  return apiClient(`store-items/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
    // headers: {
    //   "Content-Type": "application/json",
    // },
  });
};

export const deleteStoreItem = async (id: string) => {
  return apiClient(`store-items/${id}`, { method: "DELETE" });
};

/**
 * Inventory Endpoints (Future)
 */
export const getInventory = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `inventory?${queryString}` : "inventory";
  return apiClient(url, { method: "GET" });
};

export const adjustInventory = async (data: {
  itemId: string;
  type: "add" | "remove" | "set";
  quantity: number;
  reason: string;
  notes?: string;
}) => {
  return apiClient("inventory/adjust", {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const getInventoryMovements = async (params?: {
  page?: number;
  limit?: number;
  itemId?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.itemId) queryParams.append("itemId", params.itemId);

  const queryString = queryParams.toString();
  const url = queryString ? `inventory/movements?${queryString}` : "inventory/movements";
  return apiClient(url, { method: "GET" });
};

export const getLowStockItems = async () => {
  return apiClient("inventory/low-stock", { method: "GET" });
};
