import { User, Role } from "./types";

// Users mock data
export const mockUsersData: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@hunslow.com",
    role: "Group CFO",
    status: "Active",
    entities: ["Hunslow Group"],
    entityCount: 4,
    entityType: "Group",
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    email: "m.rodriguez@hunslow.com",
    role: "Entity Controller",
    status: "Active",
    entities: ["US Operations"],
    entityCount: 1,
    entityType: "Entity",
  },
  {
    id: "3",
    name: "Emma Thompson",
    email: "e.thompson@hunslow.co.uk",
    role: "Finance Manager",
    status: "Active",
    entities: ["UK Branch", "EU Operations"],
    entityCount: 2,
    entityType: "Entity",
  },
  {
    id: "4",
    name: "Hans Mueller",
    email: "h.mueller@hunslow.de",
    role: "Accountant",
    status: "Active",
    entities: ["DACH Region"],
    entityCount: 1,
    entityType: "Entity",
  },
  {
    id: "5",
    name: "Li Wei",
    email: "l.wei@hunslow.sg",
    role: "Accountant",
    status: "Active",
    entities: ["APAC Operations"],
    entityCount: 1,
    entityType: "Entity",
  },
  {
    id: "6",
    name: "Jessica Martinez",
    email: "j.martinez@hunslow.com",
    role: "Accountant",
    status: "Active",
    entities: ["US Operations", "LATAM"],
    entityCount: 2,
    entityType: "Entity",
  },
  {
    id: "7",
    name: "David Kim",
    email: "d.kim@hunslow.com",
    role: "Viewer",
    status: "Active",
    entities: ["Hunslow Group"],
    entityCount: 1,
    entityType: "Group",
  },
];

// Roles mock data
export const mockRolesData: any[] = [
  {
    id: "1",
    name: "Super Administrator",
    description: "Full system access across all entities and group features. Can manage users and system settings.",
    type: "System",
    moduleCount: 18,
    permissionCount: 80,
    modules: [
      "Dashboard",
      "Accounts",
      "Banking",
      "Income",
      "Expense",
      "Assets",
      "HR & Payroll",
      "Projects",
      "Products",
      "Reports",
      "Settings",
      "Consolidation",
      "Master Chart",
    ],
    permissions: ["Create", "Read", "Update", "Delete", "Export", "Approve"],
    isSystem: true,
  },
  {
    id: "2",
    name: "Group CFO",
    description:
      "Executive financial oversight across all entities. Can run consolidation and view all reports.",
    type: "System",
    moduleCount: 18,
    permissionCount: 39,
    modules: [
      "Dashboard",
      "Accounts",
      "Banking",
      "Income",
      "Expense",
      "Reports",
      "Consolidation",
    ],
    permissions: ["Read", "Export", "Approve"],
    isSystem: true,
  },
  {
    id: "3",
    name: "Entity Controller",
    description:
      "Full financial control within assigned entities. Can manage transactions, reports, and entity settings.",
    type: "System",
    moduleCount: 16,
    permissionCount: 63,
    modules: [
      "Dashboard",
      "Accounts",
      "Banking",
      "Income",
      "Expense",
      "Assets",
      "Reports",
      "Master Chart",
    ],
    permissions: ["Create", "Read", "Update", "Delete", "Export"],
    isSystem: true,
  },
  {
    id: "4",
    name: "Accountant",
    description:
      "Manage daily accounting operations, transactions, and reconciliations within assigned entities.",
    type: "System",
    moduleCount: 13,
    permissionCount: 40,
    modules: [
      "Dashboard",
      "Accounts",
      "Banking",
      "Income",
      "Expense",
      "Assets",
      "Reports",
    ],
    permissions: ["Create", "Read", "Update", "Delete"],
    isSystem: true,
  },
  {
    id: "5",
    name: "Finance Manager",
    description:
      "Approve transactions and view financial reports within assigned entities.",
    type: "System",
    moduleCount: 14,
    permissionCount: 29,
    modules: ["Dashboard", "Accounts", "Banking", "Income", "Expense", "Reports"],
    permissions: ["Read", "Approve", "Export"],
    isSystem: true,
  },
  {
    id: "6",
    name: "Viewer",
    description: "Read-only access to assigned entities and reports.",
    type: "System",
    moduleCount: 8,
    permissionCount: 8,
    modules: ["Dashboard", "Accounts", "Reports"],
    permissions: ["Read"],
    isSystem: true,
  },
];

// Role-related data
export const roleTypes = ["System", "Custom"] as const;

export const modules = [
  "Dashboard",
  "Accounts",
  "Banking",
  "Income",
  "Expense",
  "Assets & Inventory",
  "HR & Payroll",
  "Projects",
  "Products",
  "Reports",
  "Settings",
  "Consolidation",
  "Master Chart",
];

export const permissions = [
  "View",
  "Create",
  "Edit",
  "Delete",
  "Approve",
  "Export",
  "Import",
];

// Enhanced module structure with categories and permissions
export const moduleCategories = [
  {
    category: "Core Accounting",
    modules: [
      {
        id: "dashboard",
        name: "Dashboard",
        scope: "Group & Entity",
        permissions: ["View"],
      },
      {
        id: "invoices",
        name: "Invoices",
        scope: "Entity",
        permissions: ["View", "Create", "Edit", "Delete", "Approve", "Export"],
      },
      {
        id: "expenses",
        name: "Expenses",
        scope: "Entity",
        permissions: ["View", "Create", "Edit", "Delete", "Approve"],
      },
      {
        id: "journal-entries",
        name: "Journal Entries",
        scope: "Entity",
        permissions: ["View", "Create", "Edit", "Delete", "Approve"],
      },
      {
        id: "banking",
        name: "Banking",
        scope: "Entity",
        permissions: ["View", "Create", "Edit", "Delete", "Export", "Import"],
      },
    ],
  },
  {
    category: "Master Data",
    modules: [
      {
        id: "chart-of-accounts",
        name: "Chart of Accounts",
        scope: "Entity",
        permissions: ["View", "Create", "Edit", "Delete"],
      },
    ],
  },
  {
    category: "Administration",
    modules: [
      {
        id: "reports",
        name: "Reports",
        scope: "Group & Entity",
        permissions: ["View", "Create", "Edit", "Delete", "Approve", "Export"],
      },
      {
        id: "settings",
        name: "Settings",
        scope: "Group & Entity",
        permissions: ["View", "Create", "Edit", "Delete"],
      },
      {
        id: "users-permissions",
        name: "Users & Permissions",
        scope: "Group & Entity",
        permissions: ["View", "Create", "Edit", "Delete"],
      },
      {
        id: "audit-trail",
        name: "Audit Trail",
        scope: "Group & Entity",
        permissions: ["View"],
      },
    ],
  },
];

// User statistics
export const userStats = {
  total: mockUsersData.length,
  active: mockUsersData.filter((u) => u.status === "Active").length,
  roles: new Set(mockUsersData.map((u) => u.role)).size,
  pending: mockUsersData.filter((u) => u.status === "Pending").length,
};

// Role statistics
export const roleStats = {
  system: mockRolesData.filter((r) => r.type === "System").length,
  custom: mockRolesData.filter((r) => r.type === "Custom").length,
  total: mockRolesData.length,
};
