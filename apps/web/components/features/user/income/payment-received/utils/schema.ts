import z from "zod";

export const paymentReceivedSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  amount: z.number().min(0.01, "Amount is required"),
  paidAt: z.date(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  depositTo: z.string().min(1, "Deposit account is required"),
  reference: z.string().min(1, "Reference is required"),
  note: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  // status: z.enum(["Paid", "Partial", "Pending"]),
});

export type PaymentReceivedFormData = z.infer<typeof paymentReceivedSchema>;
