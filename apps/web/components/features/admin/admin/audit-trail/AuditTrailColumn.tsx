import { Column } from "@/components/local/custom/custom-table";

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  entity: string;
}

export const auditColumns: Column<any>[] = [
  {
    key: "timestamp",
    title: "Timestamp",
    className: "text-sm",
  },
  {
    key: "user",
    title: "User",
    className: "text-sm",
  },
  {
    key: "action",
    title: "Action",
    className: "text-sm",
  },
  {
    key: "module",
    title: "Module",
    className: "text-sm",
  },
  {
    key: "entity",
    title: "Entity",
    className: "text-sm",
  },
];

export const auditLogsData: AuditLog[] = [
  {
    id: "1",
    timestamp: "2025-11-06 10:30",
    user: "Sarah Chen",
    action: "Generated Group P&L Report",
    module: "Reports",
    entity: "Group Level",
  },
  {
    id: "2",
    timestamp: "2025-11-06 09:15",
    user: "Michael Rodriguez",
    action: "Posted journal entry JE-2025-1847",
    module: "Transactions",
    entity: "Hunslow Inc. (US)",
  },
  {
    id: "3",
    timestamp: "2025-11-05 16:45",
    user: "Emma Thompson",
    action: "Approved invoice INV-2025-1248",
    module: "Invoices",
    entity: "Hunslow UK Ltd",
  },
  {
    id: "4",
    timestamp: "2025-11-05 14:20",
    user: "Sarah Chen",
    action: "Completed Q3 consolidation",
    module: "Consolidation",
    entity: "Group Level",
  },
  {
    id: "5",
    timestamp: "2025-11-05 11:30",
    user: "Hans Mueller",
    action: "Updated FX rates for EUR",
    module: "Settings",
    entity: "Hunslow GmbH (DE)",
  },
  {
    id: "6",
    timestamp: "2025-11-05 10:15",
    user: "Li Wei",
    action: "Created vendor VEN-2025-0892",
    module: "Vendors",
    entity: "Hunslow Asia Pte Ltd",
  },
  {
    id: "7",
    timestamp: "2025-11-04 15:20",
    user: "Michael Rodriguez",
    action: "Processed payroll PR-2025-11",
    module: "Payroll",
    entity: "Hunslow Inc. (US)",
  },
  {
    id: "8",
    timestamp: "2025-11-04 13:45",
    user: "Emma Thompson",
    action: "Reconciled bank account UK-001",
    module: "Banking",
    entity: "Hunslow UK Ltd",
  },
  {
    id: "9",
    timestamp: "2025-11-04 11:10",
    user: "Sarah Chen",
    action: "Updated budget allocations",
    module: "Budgeting",
    entity: "Group Level",
  },
  {
    id: "10",
    timestamp: "2025-11-03 16:30",
    user: "Hans Mueller",
    action: "Created expense report EXP-2025-3421",
    module: "Expenses",
    entity: "Hunslow GmbH (DE)",
  },
];
