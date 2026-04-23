import z from "zod";

export const employeeSchema = z.object({
  // Basic Information
  profilePicture: z.any().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email(),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().optional(),
  employeeId: z.string().optional(),

  // Employment Details
  department: z.string().min(1, "Department is required"),
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



export const attendanceEmployeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
  status: z.enum(["Present", "Absent", "Late", "Half Day", "On Leave"]),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  notes: z.string().optional(),
});

export const attendanceFormSchema = z.object({
  date: z.string(),
  employees: z.array(attendanceEmployeeSchema),
});