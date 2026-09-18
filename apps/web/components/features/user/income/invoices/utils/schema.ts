import z from "zod";

export const lineItemSchema = z.object({
  // preserve server invoice-line id when editing; not used for new items
  invoiceItemId: z.string().optional(),
  itemId: z.string().min(1, "Required"),
  quantity: z.number().min(1),
  rate: z.number().min(0),
});
export const invoiceSchema = z
  .object({
  // A saved customer, or a typed-in customerName (like income receipts)
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  // Where to email a typed-in customer's invoice
  customerEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email"),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  // invoiceNumber: z.string().min(1, "Required"),
  invoiceDate: z.date(),
  dueDate: z.date(),
  paymentTerms: z.string().min(1, "Required"),
  currency: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one item"),
  notes: z.string().optional(),
  // % applied to taxable line items; defaults to the entity's default tax (Settings → Tax)
  taxRate: z.number().min(0, "Cannot be negative").max(100, "Max 100%").optional(),
  // Tax rate / group / exemption the rate was picked from
  taxName: z.string().nullable().optional(),
  })
  .refine((v) => !!v.customerId || !!v.customerName?.trim(), {
    message: "Select a customer or type a name",
    path: ["customerId"],
  });
