import z from "zod";
import { countryOptions } from "./data";

export const employeeSchema = z.object({
  // Basic Information
  profilePicture: z.any().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().optional(),
  // employeeId: z.string().optional(),

  // Employment Details
  departmentId: z.string().min(1, "Department is required"),
  jobTitle: z.string().min(1, "Position/Job Title is required"),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  hireDate: z.string().optional(),
  reportsTo: z.string().optional(),
  annualLeaveDays: z.coerce.number().optional(),

  // Compensation
  baseSalary: z.coerce.number().min(0, "Base salary is required"),
  allowances: z.coerce.number().optional(),
  payFrequency: z.enum(["Monthly", "Weekly", "Bi-weekly", "Annually"]),
  currency: z.string().min(1, "Currency is required"),

  // Bank Details
  bankName: z.string().optional(),
  accountType: z.enum(["Checking", "Savings"]).optional(),
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),

  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),

  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),

  // Additional Information
  note: z.string().optional(),
});
