import { apiClient, apiBlobClient } from "../client";

/**
 * Employee Endpoints
 */
export const createEmployee = async (formData: FormData) => {
  return apiClient("employee", {
    method: "POST",
    body: formData,
    // Don't set Content-Type header - let browser set it for multipart
  });
};

export const getEmployees = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.search) q.append("search", params.search);
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  const qs = q.toString();
  return apiClient(qs ? `employee?${qs}` : "employee", { method: "GET" });
};

export const getEmployeeById = async (id: string) => {
  return apiClient(`employee/${id}`, { method: "GET" });
};

export const updateEmployee = async (id: string, formData: FormData) => {
  return apiClient(`employee/${id}`, {
    method: "PATCH",
    body: formData,
  });
};

export const deleteEmployee = async (id: string) => {
  return apiClient(`employee/${id}`, { method: "DELETE" });
};

// ── Attendance ────────────────────────────────────────────────

export const getEntityAttendance = async (params?: {
  date?: string;
  page?: number;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (params?.date) q.append("date", params.date);
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  const qs = q.toString();
  return apiClient(
    qs ? `hr-payroll/attendance?${qs}` : "hr-payroll/attendance",
    { method: "GET" },
  );
};

export const getAttendanceByDate = async (date: string): Promise<any> => {
  try {
    return await apiClient(`hr-payroll/attendance/log?date=${date}`, { method: "GET" });
  } catch {
    return null;
  }
};

export const markAttendanceBatch = async (payload: {
  date: string;
  attendances: any[];
  isDraft?: boolean;
}) =>
  apiClient("hr-payroll/attendance/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateAttendance = async (id: string, data: any) =>
  apiClient(`hr-payroll/attendance/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

// ── Leave ─────────────────────────────────────────────────────

export const getLeaves = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.status) q.append("status", params.status);
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  if (params?.search) q.append("search", params.search);
  const qs = q.toString();
  return apiClient(qs ? `hr-payroll/leave?${qs}` : "hr-payroll/leave", {
    method: "GET",
  });
};

export const getLeaveById = async (id: string) =>
  apiClient(`hr-payroll/leave/${id}`, { method: "GET" });

export const createLeave = async (data: any) =>
  apiClient("hr-payroll/leave", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateLeave = async (id: string, data: any) =>
  apiClient(`hr-payroll/leave/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteLeave = async (id: string) =>
  apiClient(`hr-payroll/leave/${id}`, { method: "DELETE" });

export const changeLeaveStatus = async (id: string, status: string) =>
  apiClient(`hr-payroll/leave/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

// ── Payroll ───────────────────────────────────────────────────

export const getPayrollPrefill = async () =>
  apiClient("hr-payroll/payroll/prefill", { method: "GET" });

export const createPayrollBatch = async (data: any) =>
  apiClient("hr-payroll/payroll", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getPayrollBatches = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  if (params?.search) q.append("search", params.search);
  if (params?.status) q.append("status", params.status);
  const qs = q.toString();
  return apiClient(qs ? `hr-payroll/payroll?${qs}` : "hr-payroll/payroll", {
    method: "GET",
  });
};

export const getPayrollBatch = async (id: string) =>
  apiClient(`hr-payroll/payroll/${id}`, { method: "GET" });

export const changePayrollStatus = async (id: string, status: string) =>
  apiClient(`hr-payroll/payroll/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });

export const deletePayrollBatch = async (id: string) =>
  apiClient(`hr-payroll/payroll/${id}`, { method: "DELETE" });

export const getPayrollRecords = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.page) q.append("page", String(params.page));
  if (params?.limit) q.append("limit", String(params.limit));
  if (params?.search) q.append("search", params.search);
  const qs = q.toString();
  return apiClient(
    qs ? `hr-payroll/payroll/records?${qs}` : "hr-payroll/payroll/records",
    { method: "GET" },
  );
};

export const getPayrollRecord = async (id: string) =>
  apiClient(`hr-payroll/payroll/records/${id}`, { method: "GET" });

export const downloadPayslipPdf = async (id: string): Promise<Blob> =>
  apiBlobClient(`hr-payroll/payroll/records/${id}/pdf`, { method: "GET" });

export const updatePayrollBatch = async (id: string, data: any) =>
  apiClient(`hr-payroll/payroll/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const downloadBatchPdf = async (id: string): Promise<Blob> =>
  apiBlobClient(`hr-payroll/payroll/${id}/pdf`, { method: "GET" });

export const exportBatchCsv = async (id: string): Promise<Blob> =>
  apiBlobClient(`hr-payroll/payroll/${id}/csv`, { method: "GET" });
