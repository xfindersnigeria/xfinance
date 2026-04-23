// lib/api/hooks/useEmployees.ts

import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as hrService from "../services/hrService";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Employees
// ────────────────────────────────────────────────

export const useEmployees = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["employees", params?.search, params?.page, params?.limit],
    queryFn: () => hrService.getEmployees(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => hrService.getEmployeeById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateEmployee = (
  options?: UseMutationOptions<any, Error, FormData>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: hrService.createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created successfully");
      closeModal(MODAL.EMPLOYEE_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create employee",
      );
    },
    ...options,
  });
};

export const useUpdateEmployee = (
  options?: UseMutationOptions<any, Error, { id: string; formData: FormData }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, formData }) => hrService.updateEmployee(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["employees", "detail", variables.id],
        });
      }
      toast.success("Employee updated successfully");
      closeModal(MODAL.EMPLOYEE_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update employee",
      );
    },
    ...options,
  });
};

export const useDeleteEmployee = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: hrService.deleteEmployee,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["employees", "detail", id],
        });
      }
      toast.success("Employee deleted successfully");
      closeModal(MODAL.EMPLOYEE_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete employee",
      );
    },
    ...options,
  });
};
// ── Attendance Hooks ──────────────────────────────────────────

export const useEntityAttendance = (params?: { date?: string; page?: number; limit?: number }) => {
  return useQuery({
    queryKey: ["attendance", params?.date, params?.page, params?.limit],
    queryFn: () => hrService.getEntityAttendance(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useAttendanceByDate = (date: string) => {
  return useQuery({
    queryKey: ["attendance-log", date],
    queryFn: () => hrService.getAttendanceByDate(date),
    enabled: !!date,
    staleTime: 2 * 60 * 1000,
  });
};

export const useMarkAttendanceBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrService.markAttendanceBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-log"] });
      toast.success("Attendance submitted for processing");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to submit attendance");
    },
  });
};

export const useSaveDraftAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { date: string; attendances: any[] }) =>
      hrService.markAttendanceBatch({ ...payload, isDraft: true }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-log", variables.date.slice(0, 10)] });
      toast.success("Draft saved successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrService.updateAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update attendance");
    },
  });
};

// ── Leave Hooks ───────────────────────────────────────────────

export const useLeaves = (params?: { status?: string; page?: number; limit?: number; search?: string }) => {
  return useQuery({
    queryKey: ["leaves", params?.status, params?.page, params?.limit, params?.search],
    queryFn: () => hrService.getLeaves(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateLeave = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: hrService.createLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave request submitted successfully");
      closeModal(MODAL.LEAVE_CREATE);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to submit leave request");
    },
  });
};

export const useUpdateLeave = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrService.updateLeave(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave request updated");
      closeModal(MODAL.LEAVE_EDIT + "-" + variables.id);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update leave");
    },
  });
};

export const useDeleteLeave = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrService.deleteLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave request deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete leave");
    },
  });
};

export const useChangeLeaveStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => hrService.changeLeaveStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      toast.success("Leave status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update leave status");
    },
  });
};

// ── Payroll Hooks ─────────────────────────────────────────────

export const usePayrollPrefill = () =>
  useQuery({
    queryKey: ["payroll-prefill"],
    queryFn: hrService.getPayrollPrefill,
    staleTime: 5 * 60 * 1000,
  });

export const useProcessPayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrService.createPayrollBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-records"] });
      toast.success("Payroll batch created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to process payroll");
    },
  });
};

export const usePayrollBatches = (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
  useQuery({
    queryKey: ["payroll-batches", params?.page, params?.limit, params?.search, params?.status],
    queryFn: () => hrService.getPayrollBatches(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const usePayrollBatch = (id: string) =>
  useQuery({
    queryKey: ["payroll-batch", id],
    queryFn: () => hrService.getPayrollBatch(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useChangePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      hrService.changePayrollStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      toast.success("Payroll status updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update status");
    },
  });
};

export const useDeletePayrollBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hrService.deletePayrollBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      toast.success("Payroll batch deleted");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete batch");
    },
  });
};

export const usePayrollRecords = (params?: { page?: number; limit?: number; search?: string }) =>
  useQuery({
    queryKey: ["payroll-records", params?.page, params?.limit, params?.search],
    queryFn: () => hrService.getPayrollRecords(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const usePayrollRecord = (id: string) =>
  useQuery({
    queryKey: ["payroll-record", id],
    queryFn: () => hrService.getPayrollRecord(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });

export const useUpdatePayrollBatch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hrService.updatePayrollBatch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-batches"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-batch"] });
      toast.success("Payroll batch updated");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update payroll batch");
    },
  });
};

export const useDownloadBatchPdf = () =>
  useMutation({
    mutationFn: (id: string) => hrService.downloadBatchPdf(id),
    onSuccess: (data, id) => {
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll-batch-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF download started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to download PDF");
    },
  });

export const useExportBatchCsv = () =>
  useMutation({
    mutationFn: (id: string) => hrService.exportBatchCsv(id),
    onSuccess: (data, id) => {
      const url = window.URL.createObjectURL(new Blob([data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `payroll-batch-${id}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("CSV export started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to export CSV");
    },
  });

export const useDownloadPayslip = () =>
  useMutation({
    mutationFn: hrService.downloadPayslipPdf,
      
     onSuccess: (data) => { // data is Blob
        // Create a link and download
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payslip.pdf`); // Ideally get filename from headers
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Payslip download started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to download payslip");
    },
  });
 