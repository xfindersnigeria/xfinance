import z from "zod";

// Amounts are whole currency units; NumberInput emits numbers (or undefined when cleared)
const amount = (label: string) =>
  z.number({ error: `${label} is required` }).min(0, `${label} can't be negative`);

export const productSchema = z.object({
  name: z.string().trim().min(1, "Product name is required"),
  sku: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
  sellingPrice: amount("Selling price"),
  costPrice: z.number().min(0, "Cost price can't be negative").optional(),
  taxable: z.boolean(),
  trackInventory: z.boolean(),
  currentStock: z.number().int("Whole numbers only").min(0).optional(),
  lowStockAlert: z.number().int("Whole numbers only").min(0).optional(),
  sellOnline: z.boolean(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Service name is required"),
  categoryId: z.string().min(1, "Category is required"),
  unitId: z.string().min(1, "Unit is required"),
  description: z.string().optional(),
  rate: amount("Rate"),
  taxable: z.boolean(),
  sellOnline: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ServiceFormValues = z.infer<typeof serviceSchema>;
