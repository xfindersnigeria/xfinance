/**
 * Collection Types
 */
export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  visibility: boolean;
  featured: boolean;
  image?: {
    publicId: string;
    secureUrl: string;
  };
  entityId: string;
  createdAt: string;
  updatedAt?: string;
  totalItems: number;
  totalValue: number;
}

export interface CollectionsResponse {
  collections: Collection[];
  stats: {
    totalCollections: number;
    activeCollections: number;
    totalItems: number;
    totalValue: number;
    mostPopularCollection: string;
    mostPopularItemCount: number;
  };
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Item Types
 */
export enum StoreItemTypeEnum {
  Product = "product",
  Service = "service",
}

export enum StoreItemStatusEnum {
  InStock = "in_stock",
  OutOfStock = "out_of_stock",
}

export interface StoreItem {
  id: string;
  name: string;
  category: string;
  sku: string;
  unit: string;
  description: string;
  sellingPrice: number;
  costPrice?: number;
  rate?: number;
  taxable: boolean;
  currentStock: number;
  lowStock: number;
  type: StoreItemTypeEnum;
  status: StoreItemStatusEnum;
  unitPrice: number;
  entityId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface StoreItemsResponse {
  items: StoreItem[];
  total: number;
  totalInStock: number;
  totalOutOfStock: number;
  totalValue: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Inventory Types
 */
export interface InventoryMovement {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string;
  previousStock: number;
  newStock: number;
  createdAt: string;
}

export interface InventoryMovementsResponse {
  movements: InventoryMovement[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  lowStock: number;
  stockPercentage: number;
}

/**
 * Form Types
 */
export interface CollectionFormData {
  name: string;
  slug: string;
  description: string;
  image?: File;
  visible: boolean;
  featured: boolean;
}

export interface ItemProductFormData {
  name: string;
  sku: string;
  category: string;
  unit: string;
  description?: string;
  sellingPrice: number;
  costPrice?: number;
  taxable: boolean;
  trackInventory: boolean;
  currentStock: number;
  lowStockAlert: number;
  sellOnline?: boolean;
  type: StoreItemTypeEnum;
}

export interface ItemServiceFormData {
  name: string;
  category: string;
  unit: string;
  description?: string;
  rate: number;
  taxable: boolean;
  type: StoreItemTypeEnum;
}
