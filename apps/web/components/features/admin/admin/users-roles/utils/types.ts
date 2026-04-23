// User types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
  entities: string[];
  entityCount: number;
  entityType?: "Group" | "Entity";
}

// Role types
export interface Role {
  id: string;
  name: string;
  description: string;
  type: "System" | "Custom";
  moduleCount: number;
  scope: string;
  permissionCount: number;
  usersCount: number;
  modules: string[];
  permissions: string[];
  isSystem: boolean;
}

// Form types
export interface CreateUserInput {
  name: string;
  email: string;
  role: string;
  status: "Active" | "Inactive" | "Pending";
}

export interface CreateRoleInput {
  name: string;
  description: string;
  modules: string[];
  permissions: string[];
  scope: string;
}
