"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Eye, ChevronLeft, ChevronRight, Monitor, Globe } from "lucide-react";
import { useAuditLogs, useAuditModules } from "@/lib/api/hooks/useAudit";
import { useSessionStore } from "@/lib/store/session";
import { AuditLogEntry } from "@/lib/api/services/auditService";

const ACTION_COLORS: Record<string, string> = {
  Create: "bg-green-100 text-green-800",
  Update: "bg-blue-100 text-blue-800",
  Delete: "bg-red-100 text-red-800",
  Other: "bg-gray-100 text-gray-700",
};

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? ACTION_COLORS.Other;
  return <Badge className={`${cls} border-0 font-medium`}>{action}</Badge>;
}

function DetailSheet({ log, onClose }: { log: AuditLogEntry | null; onClose: () => void }) {
  if (!log) return null;
  return (
    <Sheet open={!!log} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audit Log Detail</SheetTitle>
          <SheetDescription>{log.module} — {log.action}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          <Row label="Timestamp" value={format(new Date(log.createdAt), "dd MMM yyyy, HH:mm:ss")} />
          <Row label="User" value={log.user ? `${log.user.name} (${log.user.email})` : "—"} />
          <Row label="Entity" value={log.entityName ?? log.entityId ?? "Group level"} />
          <Row label="Module" value={log.module} />
          <Row label="Action" value={log.action} />
          <Row label="HTTP Method" value={log.method} />
          <Row label="Resource Type" value={log.resourceType} />
          <Row label="Resource ID" value={log.resourceId || "—"} />
          <Row label="IP Address" value={log.ipAddress ?? "—"} />
          <Row label="User Agent" value={log.userAgent ?? "—"} />
          {log.impersonatedGroupId && <Row label="Impersonating Group" value={log.impersonatedGroupId} />}
          {log.impersonatedEntityId && <Row label="Impersonating Entity" value={log.impersonatedEntityId} />}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div>
              <p className="font-semibold text-gray-700 mb-1">Changes</p>
              <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap border">
                {JSON.stringify(log.changes, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-gray-500 font-medium">{label}</span>
      <span className="text-gray-800 break-all">{value}</span>
    </div>
  );
}

export default function AuditTrail() {
  const availableEntities = useSessionStore((s) => s.whoami?.availableEntities ?? []);

  const [selectedModule, setSelectedModule] = useState<string>("");
  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [detailLog, setDetailLog] = useState<AuditLogEntry | null>(null);

  const { data: modulesRes } = useAuditModules();
  const modules: string[] = modulesRes?.data ?? [];

  const query = {
    ...(selectedModule && { module: selectedModule }),
    ...(selectedEntity && { entityId: selectedEntity }),
    ...(selectedAction && { action: selectedAction }),
    ...(fromDate && { from: fromDate }),
    ...(toDate && { to: toDate }),
    page,
    limit: 20,
  };

  const { data, isLoading } = useAuditLogs();
  const logs: AuditLogEntry[] = data?.data ?? [];
  const pagination = data?.pagination;

  console.log(data, "logs")

  const hasFilters = !!(selectedModule || selectedEntity || selectedAction || fromDate || toDate);

  function clearFilters() {
    setSelectedModule("");
    setSelectedEntity("");
    setSelectedAction("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (val: string) => {
      setter(val);
      setPage(1);
    };
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {/* Module */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Module</label>
            <Select value={selectedModule || "__all__"} onValueChange={(v) => handleFilterChange(setSelectedModule)(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44 h-9 text-sm">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Modules</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entity */}
          {availableEntities.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Entity</label>
              <Select value={selectedEntity || "__all__"} onValueChange={(v) => handleFilterChange(setSelectedEntity)(v === "__all__" ? "" : v)}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <SelectValue placeholder="All Entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Entities</SelectItem>
                  {availableEntities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Action</label>
            <Select value={selectedAction || "__all__"} onValueChange={(v) => handleFilterChange(setSelectedAction)(v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-36 h-9 text-sm">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Actions</SelectItem>
                <SelectItem value="Create">Create</SelectItem>
                <SelectItem value="Update">Update</SelectItem>
                <SelectItem value="Delete">Delete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="h-9 w-36 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="h-9 w-36 text-sm"
            />
          </div>

          {/* Clear */}
          {hasFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 gap-1 self-end">
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Timestamp</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Entity</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Resource</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">IP</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No audit logs found
                  </td>
                </tr>
              )}
              {!isLoading && logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {format(new Date(log.createdAt), "dd MMM yy, HH:mm")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{log.user?.name ?? "—"}</div>
                    <div className="text-xs text-gray-500">{log.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{log.module}</td>
                  <td className="px-4 py-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{log.entityName ?? "Group"}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {log.resourceId ? `${log.resourceType}/${log.resourceId.slice(0, 8)}…` : log.resourceType}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {log.ipAddress ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setDetailLog(log)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              {(page - 1) * pagination.limit + 1}–{Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm flex items-center px-2">{page} / {pagination.pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <DetailSheet log={detailLog} onClose={() => setDetailLog(null)} />
    </div>
  );
}
