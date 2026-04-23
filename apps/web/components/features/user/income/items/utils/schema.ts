import { z } from "zod";

export const itemFormSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  type: z.enum(["service", "goods"]).refine((val) => val, {
    message: "Please select a valid type",
  }),
  category: z.string().min(1, "Category is required"),
  unitPrice: z.number().positive("Unit price must be greater than 0"),
  incomeAccountId: z.string().min(1, "Income account is required"),
  isTaxable: z.boolean(),
  isActive: z.boolean(),
});

export type ItemFormInputs = z.infer<typeof itemFormSchema>;
