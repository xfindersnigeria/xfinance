import z from "zod";
import { productCategories, productUnits, serviceCategories, serviceUnits } from "./data";

export const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.enum(productCategories),
  unit: z.enum(productUnits),
  description: z.string().optional(),
  sellingPrice: z.string().min(1),
  costPrice: z.string().optional(),
  taxable: z.boolean(),
  trackInventory: z.boolean(),
  currentStock: z.coerce.number(),
  lowStockAlert: z.coerce.number(),
  sellOnline: z.boolean(),
});

export const serviceSchema = z.object({
  name: z.string().min(1),
  category: z.enum(serviceCategories),
  unit: z.enum(serviceUnits),
  description: z.string().optional(),
  rate: z.string().min(1),
  taxable: z.boolean(),
});