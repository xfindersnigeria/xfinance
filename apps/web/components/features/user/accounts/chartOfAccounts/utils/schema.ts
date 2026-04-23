import z from "zod";

export const chartOfAccountsSchema = z.object({
  accountType: z.string().min(1, "Account type is required"),
  // accountCode: z.string().min(1, "Account code is required"),
  accountName: z.string().min(1, "Account name is required"),
  categoryId: z.string().min(1, "Primary category is required"),
  subCategoryId: z.string().min(1, "Sub category is required"),
  description: z.string().default(""),
  status: z.string().min(1, "Status is required"),
});

export type ChartOfAccountsFormData = z.infer<typeof chartOfAccountsSchema>;
