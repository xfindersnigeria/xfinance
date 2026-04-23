import { z } from "zod";

export const projectFormSchema = z.object({
  // code: z.string().min(1, "Project code is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  customerId: z.string().min(1, "Customer is required"),
  status: z
    .enum(["Planning", "In_Progress", "Completed", "On_Hold"])
    .refine((val) => val, {
      message: "Please select a valid status",
    }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  budgetedRevenue: z.number().positive("Budget revenue must be greater than 0"),
  budgetedCost: z.number().positive("Budget cost must be greater than 0"),
  managerId: z.string().min(1, "Project manager is required"),
  billingType: z
    .enum(["Fixed Price", "Time and Materials", "Cost Plus"])
    .refine((val) => val, {
      message: "Please select a valid billing type",
    }),
  currency: z.enum(["USD", "EUR", "GBP", "NGN"]).refine((val) => val, {
    message: "Please select a valid currency",
  }),
});

export type ProjectFormInputs = z.infer<typeof projectFormSchema>;
