import { useQuery } from "@tanstack/react-query";
import * as auditService from "../services/auditService";
import { AuditLogsQuery } from "../services/auditService";

export const useAuditLogs = (query: AuditLogsQuery = {}) =>
  useQuery({
    queryKey: ["audit-logs", query],
    queryFn: () => auditService.getAuditLogs(query),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

export const useAuditModules = () =>
  useQuery({
    queryKey: ["audit-modules"],
    queryFn: auditService.getAuditModules,
    staleTime: 5 * 60 * 1000,
  });
