
import { z } from "zod";

export const assetsSchema = z.object({
  assetName: z.string().min(1, "Asset Name is required"),
  assetType: z.string().min(1, "Asset Type is required"),
  assetId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedId: z.string().optional(),
  description: z.string().optional(),
  purchaseDate: z.string().min(1, "Purchase Date is required"),
  purchaseCost: z.union([z.string(), z.number()]).refine(val => val !== "", { message: "Purchase Cost is required" }),
  currentValue: z.union([z.string(), z.number()]).optional(),
  warrantyExpiry: z.string().optional(),
  trackDepreciation: z.boolean(),
  depreciationMethod: z.string().optional(),
  usefulLife: z.union([z.string(), z.number()]).optional(),
  salvageValue: z.union([z.string(), z.number()]).optional(),
  activeAsset: z.boolean(),
});