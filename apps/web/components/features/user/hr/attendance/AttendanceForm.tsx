import React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { attendanceFormSchema } from "./utils/schema";
import dayjs from "dayjs";
import { STATUS_OPTIONS } from "./utils/data";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { Lock } from "lucide-react";

interface AttendanceFormProps {
  employees: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dept?: { name: string };
    profileImage?: { secureUrl: string };
  }>;
  existingLog?: {
    id: string;
    status: string;
    attendances: Array<{
      employeeId: string;
      status: string;
      checkInTime?: string | null;
      checkOutTime?: string | null;
      notes?: string | null;
    }>;
  } | null;
  isSubmitted?: boolean;
  isExistingLoading?: boolean;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  onSubmit: (data: any) => void;
  onSaveDraft: (data: any) => void;
  isLoading?: boolean;
  isSavingDraft?: boolean;
}

function buildDefaultRows(
  employees: AttendanceFormProps["employees"],
  existingLog: AttendanceFormProps["existingLog"],
) {
  const existingMap = new Map(
    (existingLog?.attendances ?? []).map((a) => [a.employeeId, a]),
  );

  return employees.map((emp) => {
    const existing = existingMap.get(emp.id);
    return {
      id: emp.id,
      name: `${emp.firstName} ${emp.lastName}`,
      department: emp.dept?.name || "",
      image: emp.profileImage?.secureUrl || "",
      status: (existing?.status as any) || ("Present" as const),
      checkIn: existing?.checkInTime
        ? dayjs(existing.checkInTime).format("HH:mm")
        : "",
      checkOut: existing?.checkOutTime
        ? dayjs(existing.checkOutTime).format("HH:mm")
        : "",
      notes: existing?.notes || "",
    };
  });
}

export default function AttendanceForm({
  employees,
  existingLog,
  isSubmitted = false,
  isExistingLoading = false,
  selectedDate,
  onDateChange,
  onSubmit,
  onSaveDraft,
  isLoading = false,
  isSavingDraft = false,
}: AttendanceFormProps) {
  const form = useForm({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      date: selectedDate || dayjs().format("YYYY-MM-DD"),
      employees: buildDefaultRows(employees, existingLog),
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: "employees",
  });

  // Re-populate form whenever the date changes (new existingLog loaded)
  React.useEffect(() => {
    if (!isExistingLoading) {
      form.reset({
        date: selectedDate || dayjs().format("YYYY-MM-DD"),
        employees: buildDefaultRows(employees, existingLog),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingLog, selectedDate, isExistingLoading]);

  const markAll = (status: any) => {
    if (isSubmitted) return;
    const now = dayjs().format("HH:mm");
    fields.forEach((_, idx) => {
      update(idx, {
        ...fields[idx],
        status,
        checkIn: status === "Present" ? now : "",
        checkOut: "",
      });
    });
  };

  const stats = {
    Present: fields.filter((f) => f.status === "Present").length,
    Absent: fields.filter((f) => f.status === "Absent").length,
    Late: fields.filter((f) => f.status === "Late").length,
    NotMarked: fields.filter((f) => !STATUS_OPTIONS.includes(f.status)).length,
  };

  const disabled = isSubmitted;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Submitted banner */}
        {isSubmitted && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 mb-4">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="text-sm font-medium">
              This attendance record has been submitted and is read-only.
            </span>
          </div>
        )}

        {/* Date & Quick Actions */}
        <div className="bg-purple-50 p-2 rounded-xl flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-50">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="font-semibold flex items-center gap-2 text-purple-700">
                    <span>📅 Attendance Date</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      className="bg-white border border-input rounded-md px-3 py-2 text-sm"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(e);
                        onDateChange?.(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {!disabled && (
            <div className="flex flex-col gap-2 justify-end">
              <span className="font-semibold text-gray-700 text-xs">Quick Actions</span>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200"
                  onClick={() => markAll("Present")}
                >
                  ✔️ Mark All Present
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="bg-red-50 text-red-700 border-red-200"
                  onClick={() => markAll("Absent")}
                >
                  ❌ Mark All Absent
                </Button>
              </div>
            </div>
          )}
          {existingLog && (
            <div className="ml-auto">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isSubmitted
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {isSubmitted ? "Submitted" : "Draft"}
              </span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {(
            [
              { label: "Present", count: stats.Present, color: "text-green-600" },
              { label: "Absent", count: stats.Absent, color: "text-red-600" },
              { label: "Late", count: stats.Late, color: "text-orange-600" },
              { label: "Not Marked", count: stats.NotMarked, color: "text-gray-400" },
            ] as const
          ).map(({ label, count, color }) => (
            <div key={label} className="bg-white rounded-lg p-4 text-center">
              <div className="text-gray-700">{label}</div>
              <div className={`text-xl ${color}`}>{count}</div>
            </div>
          ))}
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-xl p-4 mb-4">
          <label className="font-semibold flex items-center gap-2 text-purple-700 mb-2">
            <span>👥 Employee Attendance</span>
          </label>
          {isExistingLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading existing attendance...
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="flex flex-col gap-4 bg-purple-50 rounded-lg p-4 mb-2"
                >
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3 min-w-45">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                        {field.image ? (
                          <Image
                            src={field.image}
                            alt=""
                            className="rounded-full w-10 h-10 object-cover"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <span className="text-indigo-700 font-bold text-sm">
                            {field.name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">{field.name}</div>
                        <div className="text-xs text-gray-500">
                          {field.department || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="ml-auto">
                      {(
                        [
                          ["Present", "bg-green-100 text-green-700"],
                          ["Absent", "bg-red-100 text-red-700"],
                          ["Late", "bg-orange-100 text-orange-700"],
                          ["On Leave", "bg-violet-100 text-violet-700"],
                          ["Half Day", "bg-blue-100 text-blue-700"],
                        ] as [string, string][]
                      ).find(([s]) => s === field.status) && (
                        <span
                          className={`px-3 py-1 rounded-full font-medium text-sm ${
                            (
                              [
                                ["Present", "bg-green-100 text-green-700"],
                                ["Absent", "bg-red-100 text-red-700"],
                                ["Late", "bg-orange-100 text-orange-700"],
                                ["On Leave", "bg-violet-100 text-violet-700"],
                                ["Half Day", "bg-blue-100 text-blue-700"],
                              ] as [string, string][]
                            ).find(([s]) => s === field.status)?.[1]
                          }`}
                        >
                          {field.status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-4">
                    <FormField
                      control={form.control}
                      name={`employees.${idx}.status`}
                      render={({ field: sf }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Status</FormLabel>
                          <FormControl>
                            <Select
                              onValueChange={sf.onChange}
                              value={sf.value}
                              disabled={disabled}
                            >
                              <SelectTrigger className="w-full bg-white">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`employees.${idx}.checkIn`}
                      render={({ field: cf }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Check In</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="bg-white"
                              disabled={disabled}
                              {...cf}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`employees.${idx}.checkOut`}
                      render={({ field: cf }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Check Out</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              className="bg-white"
                              disabled={disabled}
                              {...cf}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`employees.${idx}.notes`}
                      render={({ field: nf }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Notes</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Optional notes..."
                              className="bg-white"
                              disabled={disabled}
                              {...nf}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Guidelines */}
        <div className="bg-blue-50 rounded-xl p-4 mb-4">
          <div className="font-semibold mb-2 flex items-center gap-2 text-blue-700">
            <span>ℹ️ Attendance Guidelines</span>
          </div>
          <ul className="text-sm text-blue-700 list-disc pl-5 space-y-1">
            <li>Mark attendance for all employees before submitting</li>
            <li>Check-in and check-out times are required for Present, Late, and Half Day</li>
            <li>Use &quot;On Leave&quot; for employees on approved leave</li>
            <li>Save as draft to continue editing later — submitted records cannot be changed</li>
          </ul>
        </div>

        {/* Actions */}
        {!disabled && (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-violet-700 border-violet-300"
              disabled={isSavingDraft}
              onClick={form.handleSubmit(onSaveDraft)}
            >
              {isSavingDraft ? "Saving..." : "Save as Draft"}
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-linear-to-r from-violet-500 to-blue-500 text-white font-semibold shadow"
            >
              {isLoading ? "Submitting..." : "✔️ Submit Attendance"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
