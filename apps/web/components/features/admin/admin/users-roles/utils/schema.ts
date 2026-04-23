import { z } from "zod";

// User form schema
export const userFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Invalid email address").toLowerCase(),
  role: z.string().min(1, "Please select a role"),
  status: z
    .enum(["Active", "Inactive", "Pending"], {
      // errorMap: () => ({ message: "Please select a valid status" }), // REMOVE THIS LINE
    })
    .refine((val) => ["Active", "Inactive", "Pending"].includes(val), {
      message: "Please select a valid status",
    }),
});

export type UserFormSchema = z.infer<typeof userFormSchema>;

// Role form schema
export const roleFormSchema = z.object({
  name: z
    .string()
    .min(2, "Role name must be at least 2 characters")
    .max(50, "Role name must be less than 50 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be less than 500 characters"),
  modules: z.array(z.string()).min(1, "Please select at least one module"),
  permissions: z
    .array(z.string())
    .min(1, "Please select at least one permission"),
});

export type RoleFormSchema = z.infer<typeof roleFormSchema>;
