import z from "zod";

export const leaveRequestSchema = z.object({
  leaveType: z.string().min(1, "Leave type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
  contactNumber: z.string().min(10, "Valid contact number is required"),
  emergencyContact: z.string().min(10, "Valid emergency contact is required"),
});