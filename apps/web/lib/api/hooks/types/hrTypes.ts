import { z } from "zod";

// Employment Types
export enum EmploymentTypeEnum {
  FullTime = "Full-time",
  PartTime = "Part-time",
  Contract = "Contract",
  Temporary = "Temporary",
  Intern = "Intern",
}

// Employee Status
export enum EmployeeStatusEnum {
  Active = "Active",
  OnLeave = "On_Leave",
  Inactive = "Inactive",
  Terminated = "Terminated",
}

// Pay Frequency
export enum PayFrequencyEnum {
  Weekly = "Weekly",
  BiWeekly = "Bi-weekly",
  SemiMonthly = "Semi-monthly",
  Monthly = "Monthly",
  Quarterly = "Quarterly",
  Annual = "Annual",
}

// Bank Account Type
export enum BankAccountTypeEnum {
  Checking = "Checking",
  Savings = "Savings",
  MoneyMarket = "Money Market",
}

// Leave Types
export enum LeaveTypeEnum {
  Annual = "Annual",
  Sick = "Sick",
  Personal = "Personal",
  Maternity = "Maternity",
  Paternity = "Paternity",
  Bereavement = "Bereavement",
  Unpaid = "Unpaid",
}

// Interfaces
export interface AddressInfo {
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface EmergencyContact {
  contactName: string;
  contactPhone: string;
  relationship: string;
}

export interface ProfileImage {
  publicId: string;
  secureUrl: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  employeeId: string;
  department: string;
  position: string;
  employmentType: EmploymentTypeEnum;
  dateOfHire: string;
  reportingManager: string;
  anualLeave: number;
  salary: number;
  allowances: number;
  perFrequency: PayFrequencyEnum;
  currency: string;
  bankName: string;
  acountType: BankAccountTypeEnum;
  accountNumber: string;
  routingNumber: string;
  profileImage?: ProfileImage | null;
  addressInfo?: AddressInfo | null;
  emergencyContact?: EmergencyContact | null;
  note?: string | null;
  status: EmployeeStatusEnum;
  entityId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EmployeeStats {
  totalEmployees: number;
  totalActive: number;
  totalOnLeave: number;
  totalHiredThisMonth: number;
}

export interface EmployeesResponse {
  employees: Employee[];
  stats: EmployeeStats;
}

// Zod Schemas
export const addressInfoSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  province: z.string().min(1, "Province/State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

export const emergencyContactSchema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  contactPhone: z.string().min(1, "Contact phone is required"),
  relationship: z.string().min(1, "Relationship is required"),
});

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  department: z.string().min(1, "Department is required"),
  position: z.string().min(1, "Position is required"),
  employmentType: z.nativeEnum(EmploymentTypeEnum),
  dateOfHire: z.string().min(1, "Date of hire is required"),
  reportingManager: z.string().min(1, "Reporting manager is required"),
  anualLeave: z.number().min(0, "Annual leave must be positive"),
  salary: z.number().min(0, "Salary must be positive"),
  allowances: z.number().min(0, "Allowances must be positive"),
  perFrequency: z.nativeEnum(PayFrequencyEnum),
  currency: z.string().min(1, "Currency is required"),
  bankName: z.string().min(1, "Bank name is required"),
  acountType: z.nativeEnum(BankAccountTypeEnum),
  accountNumber: z.string().min(1, "Account number is required"),
  routingNumber: z.string().min(1, "Routing number is required"),
  addressInfo: addressInfoSchema.optional(),
  emergencyContact: emergencyContactSchema.optional(),
  note: z.string().max(500, "Note must be less than 500 characters").optional(),
  profileImage: z.instanceof(File).optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
