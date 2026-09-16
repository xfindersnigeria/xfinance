import { z } from "zod";

const requiredAmount = (message: string) =>
  z.union([z.number(), z.undefined()]).refine((v) => v !== undefined && v >= 0, { message });

export const assetsSchema = z.object({
  name: z.string().trim().min(1, "Asset name is required"),
  categoryId: z.string().min(1, "Asset category is required"),
  status: z.enum(["in_use", "in_storage"]),
  purchaseCost: requiredAmount("Purchase cost is required"),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  openingAccumulatedDepreciation: z.number().min(0).optional(),
});

export const assetCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  depreciationRate: z
    .union([z.number(), z.undefined()])
    .refine((v) => v !== undefined && v >= 0 && v <= 100, {
      message: "Enter a rate between 0 and 100",
    }),
  description: z.string().optional(),
});
