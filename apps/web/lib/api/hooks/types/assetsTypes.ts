import { z } from "zod";

export enum AssetTypeEnum {
  ComputerEquipment = "computer_equipment",
  Vehicle = "vehicle",
  Furniture = "furniture",
  OfficeEquipment = "office_equipment",
  Machinery = "machinery",
  RealEstate = "real_estate",
  Tools = "tools",
  Electronics = "electronics",
  Other = "other",
}

export enum AssetStatusEnum {
  InUse = "in_use",
  InStorage = "in_storage",
  Retired = "retired",
  Sold = "sold",
  Damaged = "damaged",
}

export enum AssetDepartmentEnum {
  IT = "it",
  Operations = "operations",
  Finance = "finance",
  HR = "hr",
  Marketing = "marketing",
  Sales = "sales",
  Logistics = "logistics",
  Manufacturing = "manufacturing",
  Other = "other",
}

export enum DepreciationMethodEnum {
  StraightLine = "straight_line",
  DecliningBalance = "declining_balance",
  UnitsOfProduction = "units_of_production",
  SumOfYearsDigits = "sum_of_years_digits",
}

export interface Asset {
  id: string;
  name: string;
  type: AssetTypeEnum;
  department: AssetDepartmentEnum;
  assigned: string;
  description: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  expiryDate: string;
  depreciationMethod: DepreciationMethodEnum;
  years: number;
  salvageValue: number;
  status: AssetStatusEnum;
  createdAt: string;
  updatedAt: string;
}

export interface AssetsResponse {
  data: Asset[];
  summary: {
    total: number;
    inUse: number;
    inStorage: number;
    retired: number;
    sold: number;
    damaged: number;
    totalValue: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface AssetSummaryResponse {
  total: number;
  inUse: number;
  inStorage: number;
  retired: number;
  sold: number;
  damaged: number;
  totalValue: number;
}

export const createAssetSchema = z.object({
  name: z.string().min(1, "Asset name is required"),
  type: z.nativeEnum(AssetTypeEnum),
  department: z.nativeEnum(AssetDepartmentEnum),
  assignedId: z.string().min(1, "Assigned to is required"),
  description: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  purchaseCost: z.number().min(0, "Purchase cost must be positive"),
  currentValue: z.number().min(0, "Current value must be positive"),
  expiryDate: z.string().optional(),
  depreciationMethod: z.nativeEnum(DepreciationMethodEnum),
  years: z.number().min(1, "Years must be at least 1"),
  salvageValue: z.number().min(0, "Salvage value must be positive"),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = createAssetSchema.partial();

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
