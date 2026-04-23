import z from "zod";
import { customerTypeOptions, paymentTermsOptions } from "./data";

export const customerSchema = z.object({
  type: z.enum(customerTypeOptions),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phoneNumber: z.string().optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.enum(paymentTermsOptions).optional(),
  creditLimit: z.string().optional(),
  note: z.string().optional(),
});
