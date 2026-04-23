"use client";
import React from "react";
import AttendanceHeader from "./AttendanceHeader";
import { CustomTable } from "@/components/local/custom/custom-table";
import {
  useEmployees,
  useEntityAttendance,
  useMarkAttendanceBatch,
  useSaveDraftAttendance,
  useAttendanceByDate,
} from "@/lib/api/hooks/useHR";
import { attendanceColumns } from "./AttendanceColumn";
import { CustomTabs } from "@/components/local/custom/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import AttendanceForm from "./AttendanceForm";
import { useDebounce } from "use-debounce";
import dayjs from "dayjs";

export default function Attendance() {
  const today = dayjs().format("YYYY-MM-DD");

  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const [recordDate, setRecordDate] = React.useState(today);
  const [formDate, setFormDate] = React.useState(today);
  const pageSize = 10;

  // Record tab — default to today
  const { data: attendanceResponse, isLoading: attendanceLoading } =
    useEntityAttendance({ date: recordDate, page, limit: pageSize });
  const attendanceData = (attendanceResponse as any)?.attendances || [];
  const stats = (attendanceResponse as any)?.stats;
  const pagination = (attendanceResponse as any)?.pagination;

  // Mark tab — employee list
  const { data: employeesResponse } = useEmployees({ search: debouncedSearch });
  const employees = (employeesResponse as any)?.employees || [];

  // Pre-load existing attendance log for the form date
  const { data: existingLogData, isLoading: existingLogLoading } =
    useAttendanceByDate(formDate);
  const existingLog = (existingLogData as any)?.data ?? null;
  const isSubmitted = existingLog?.status === "Submitted";

  const markBatch = useMarkAttendanceBatch();
  const saveDraft = useSaveDraftAttendance();

  const buildPayload = (formData: any) => {
    const datePart = formData.date || today;
    const dateIso = new Date(datePart).toISOString();
    const toTimeIso = (t: string | undefined) => {
      if (!t) return undefined;
      const d = new Date(`${datePart}T${t}:00`);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };
    return {
      date: dateIso,
      attendances: (formData.employees || []).map((emp: any) => ({
        employeeId: emp.id,
        status: emp.status,
        checkInTime: toTimeIso(emp.checkIn),
        checkOutTime: toTimeIso(emp.checkOut),
        note: emp.notes || undefined,
      })),
    };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Attendance</h2>
          <p className="text-muted-foreground">Track employee attendance and hours</p>
        </div>
        <Button variant="outline" className="rounded-xl">
          <Download /> Export
        </Button>
      </div>
      <CustomTabs
        storageKey="attendance-tab"
        tabs={[
          {
            title: "Attendance Record",
            value: "record",
            content: (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">
                    Filter by date:
                  </label>
                  <input
                    type="date"
                    value={recordDate}
                    onChange={(e) => { setRecordDate(e.target.value); setPage(1); }}
                    className="border border-input rounded-md px-3 py-1.5 text-sm"
                  />
                  {recordDate !== today && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setRecordDate(today); setPage(1); }}
                    >
                      Today
                    </Button>
                  )}
                </div>
                <AttendanceHeader stats={stats} loading={attendanceLoading} />
                <CustomTable
                  searchPlaceholder="Search attendance..."
                  tableTitle="Attendance Records"
                  columns={attendanceColumns}
                  data={attendanceData}
                  pageSize={pageSize}
                  loading={attendanceLoading}
                  onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
                  display={{ filterComponent: false, searchComponent: true }}
                  pagination={{
                    page,
                    totalPages: pagination?.totalPages || 1,
                    total: pagination?.totalCount,
                    onPageChange: setPage,
                  }}
                />
              </div>
            ),
          },
          {
            title: "Mark Attendance",
            value: "mark",
            content: (
              <AttendanceForm
                employees={employees}
                existingLog={existingLog}
                isSubmitted={isSubmitted}
                isExistingLoading={existingLogLoading}
                selectedDate={formDate}
                onDateChange={setFormDate}
                onSubmit={(formData) => markBatch.mutate(buildPayload(formData))}
                onSaveDraft={(formData) => saveDraft.mutate(buildPayload(formData))}
                isLoading={markBatch.isPending}
                isSavingDraft={saveDraft.isPending}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
