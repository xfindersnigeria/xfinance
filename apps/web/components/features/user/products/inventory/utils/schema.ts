import z from "zod";

export const inventoryAdjustmentSchema = z.object({
  type: z.enum(["add", "remove", "set"]),
  quantity: z.number().min(1, "Quantity is required"),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
});
