"use client";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar } from "lucide-react";
import { leaveRequestSchema } from "./utils/schema";
import { useCreateLeave, useUpdateLeave, useEmployees } from "@/lib/api/hooks/useHR";

const schema = leaveRequestSchema.extend({
  employeeId: z.string().min(1, "Employee is required"),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onSuccess?: () => void;
  leave?: any;
}

export default function LeaveManagementForm({ onSuccess, leave }: Props) {
  const isEdit = !!leave;
  const createLeave = useCreateLeave();
  const updateLeave = useUpdateLeave();
  const { data: employeesData } = useEmployees({ limit: 1000 } as any);
  const employees = (employeesData as any)?.employees || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: leave?.employeeId ?? "",
      leaveType: leave?.leaveType ?? "Annual Leave",
      startDate: leave?.startDate ? new Date(leave.startDate).toISOString().slice(0, 10) : "",
      endDate: leave?.endDate ? new Date(leave.endDate).toISOString().slice(0, 10) : "",
      reason: leave?.reason ?? "",
      contactNumber: leave?.contact ?? "",
      emergencyContact: leave?.emergencyContact ?? "",
    },
  });

  const watchStart = form.watch("startDate");
  const watchEnd = form.watch("endDate");
  const totalDays = React.useMemo(() => {
    if (!watchStart || !watchEnd) return 0;
    const diff = Math.ceil((new Date(watchEnd).getTime() - new Date(watchStart).getTime()) / 86400000) + 1;
    return Math.max(0, diff);
  }, [watchStart, watchEnd]);

  const isPending = createLeave.isPending || updateLeave.isPending;

  const onSubmit = (values: FormValues) => {
    const payload = {
      employeeId: values.employeeId,
      leaveType: values.leaveType,
      startDate: new Date(values.startDate).toISOString(),
      endDate: new Date(values.endDate).toISOString(),
      reason: values.reason,
      contact: values.contactNumber,
      emergencyContact: values.emergencyContact,
    };
    if (isEdit) {
      updateLeave.mutate({ id: leave.id, data: payload }, { onSuccess });
    } else {
      createLeave.mutate(payload, { onSuccess });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        {/* Employee */}
        <FormField control={form.control} name="employeeId" render={({ field }) => (
          <FormItem>
            <FormLabel>Employee</FormLabel>
            <Select value={field.value} onValueChange={field.onChange} disabled={isEdit}>
              <FormControl>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select employee" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Leave Type */}
          <FormField control={form.control} name="leaveType" render={({ field }) => (
            <FormItem>
              <FormLabel>Leave Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["Annual Leave", "Sick Leave", "Personal Leave", "Casual Leave", "Maternity Leave"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* Total Days (read-only) */}
          <FormItem>
            <FormLabel>Total Days</FormLabel>
            <div className="border rounded-md px-3 py-2 text-sm text-gray-700 bg-gray-50">{totalDays} day{totalDays !== 1 ? "s" : ""}</div>
          </FormItem>

          {/* Start Date */}
          <FormField control={form.control} name="startDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input type="date" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* End Date */}
          <FormField control={form.control} name="endDate" render={({ field }) => (
            <FormItem>
              <FormLabel>End Date</FormLabel>
              <FormControl>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <Input type="date" className="pl-9" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Reason */}
        <FormField control={form.control} name="reason" render={({ field }) => (
          <FormItem>
            <FormLabel>Reason</FormLabel>
            <FormControl>
              <Textarea placeholder="Reason for leave..." rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="contactNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>Contact During Leave</FormLabel>
              <FormControl><Input type="tel" placeholder="+234..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="emergencyContact" render={({ field }) => (
            <FormItem>
              <FormLabel>Emergency Contact</FormLabel>
              <FormControl><Input type="tel" placeholder="+234..." {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Submit Request"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
