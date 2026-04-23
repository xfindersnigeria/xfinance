// lib/api/services/moduleService.ts
import { apiClient } from "../client";

/**
 * Action within a module
 */
export interface ModuleAction {
  id: string;
  actionName: string;
  permissionId: string;
}

/**
 * System module (Items, Invoices, etc.)
 */
export interface Module {
  id: string;
  moduleKey: string;
  displayName: string;
  description?: string;
  scope: "SUPERADMIN" | "GROUP" | "ENTITY";
  menu: string;
  isMenuVisible?: boolean;
  actions: ModuleAction[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a module
 */
export interface CreateModulePayload {
  moduleKey: string;
  displayName: string;
  description?: string;
  scope?: "SUPERADMIN" | "GROUP" | "ENTITY";
  menu: string;
  isMenuVisible?: boolean;
}

/**
 * Payload for updating a module
 */
export interface UpdateModulePayload {
  displayName?: string;
  description?: string;
  scope?: string;
  menu?: string;
  isMenuVisible?: boolean;
}

/**
 * Get all system modules with their actions
 * Results cached with version-based invalidation
 * Requires authentication
 *
 * @param moduleVersion - Optional version number for cache validation
 */
export const getModulesAll = (moduleVersion?: number): Promise<Module[]> => {
  const queryParams = new URLSearchParams();
  if (moduleVersion !== undefined) {
    queryParams.append("moduleVersion", String(moduleVersion));
  }

  const query = queryParams.toString();
  const url = query ? `modules/all?${query}` : "modules/all";

  return apiClient<Module[]>(url, {
    method: "GET",
  });
};

/**
 * Get modules filtered by scope
 * Requires authentication
 *
 * @param scope - Module scope (SUPERADMIN, GROUP, or ENTITY)
 * @param moduleVersion - Optional version number for cache validation
 */
export const getModulesByScope = (
  scope: "SUPERADMIN" | "GROUP" | "ENTITY",
  moduleVersion?: number,
  optional?: string,
): Promise<Module[]> => {
  const queryParams = new URLSearchParams();
  if (moduleVersion !== undefined) {
    queryParams.append("moduleVersion", String(moduleVersion));
  }
  if (optional) {
    queryParams.append("optional", optional);
  }

  const query = queryParams.toString();
  const url = query
    ? `modules/scope/${scope}?${query}`
    : `modules/scope/${scope}`;

  return apiClient<Module[]>(url, {
    method: "GET",
  });
};

/**
 * Get a single module by its key
 * Requires authentication
 *
 * @param moduleKey - Module identifier (e.g., "items", "invoices")
 * @param moduleVersion - Optional version number for cache validation
 */
export const getModuleByKey = (
  moduleKey: string,
  moduleVersion?: number,
): Promise<Module> => {
  const queryParams = new URLSearchParams();
  if (moduleVersion !== undefined) {
    queryParams.append("moduleVersion", String(moduleVersion));
  }

  const query = queryParams.toString();
  const url = query ? `modules/${moduleKey}?${query}` : `modules/${moduleKey}`;

  return apiClient<Module>(url, {
    method: "GET",
  });
};

/**
 * Create a new module
 * Requires admin/superadmin role
 * Module version automatically incremented, invalidating all caches
 */
export const createModule = (payload: CreateModulePayload): Promise<Module> => {
  return apiClient<Module>("modules", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/**
 * Update an existing module
 * Requires admin/superadmin role
 * All fields optional - only provided fields are updated
 * Module version automatically incremented
 */
export const updateModule = (
  moduleId: string,
  payload: UpdateModulePayload,
): Promise<Module> => {
  return apiClient<Module>(`modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
};

/**
 * Delete a module
 * Requires admin/superadmin role
 * WARNING: Cascades deletion to all associated Actions and Permissions
 * Module version automatically incremented
 */
export const deleteModule = (moduleId: string): Promise<Module> => {
  return apiClient<Module>(`modules/${moduleId}`, {
    method: "DELETE",
  });
};
