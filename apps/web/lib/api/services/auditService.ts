import { apiClient } from "../client";

export interface AuditLogEntry {
  id: string;
  user: { id: string; name: string; email: string } | null;
  entityId: string | null;
  entityName: string | null;
  module: string;
  action: string;
  method: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress: string | null;
  userAgent: string | null;
  impersonatedGroupId: string | null;
  impersonatedEntityId: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogEntry[];
  pagination: { total: number; page: number; limit: number; pages: number };
}

export interface AuditLogsQuery {
  entityId?: string;
  module?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const getAuditLogs = (query: AuditLogsQuery = {}): Promise<AuditLogsResponse> => {
  const params = new URLSearchParams();
  if (query.entityId) params.set("entityId", query.entityId);
  if (query.module) params.set("module", query.module);
  if (query.action) params.set("action", query.action);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  return apiClient<AuditLogsResponse>(`audit/logs${qs ? `?${qs}` : ""}`, { method: "GET" });
};

export const getAuditModules = (): Promise<{ data: string[] }> =>
  apiClient<{ data: string[] }>("audit/modules", { method: "GET" });
