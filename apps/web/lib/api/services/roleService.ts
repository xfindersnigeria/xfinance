// lib/api/services/roleService.ts
import { apiClient } from '../client';

/**
 * Single permission/action within a module
 */
export interface Permission {
  id: string;
  actionName: string;
  actionId: string;
}

/**
 * Module with all its available actions/permissions
 */
export interface PermissionModule {
  moduleId: string;
  moduleKey: string;
  moduleName: string;
  scope: string;
  actions: Permission[];
}

/**
 * Role with permission details
 */
export interface Role {
  id: string;
  name: string;
  description: string;
  scope: 'USER' | 'ADMIN';
  groupId: string;
  isSystemRole: boolean;
  permissions: Array<{
    moduleKey: string;
    moduleName: string;
    actions: string[];
    permissions: string[];
  }>;
  permissionIds: string[];
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload for creating a new role
 */
export interface CreateRolePayload {
  name: string;
  description: string;
  scope?: 'USER' | 'ADMIN';
  permissionIds: string[];
}

/**
 * Payload for updating a role
 */
export interface UpdateRolePayload {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

/**
 * Paginated response for roles list
 */
export interface PaginatedRolesResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get all available permissions organized by module
 * Use to build permission selector UI
 * Requires admin role
 *
 * @param scope - Optional scope filter: 'admin' or 'user'
 */
export const getAllPermissions = (scope?: 'admin' | 'user'): Promise<PermissionModule[]> => {
  const queryParams = new URLSearchParams();
  if (scope) {
    queryParams.append('scope', scope);
  }

  const query = queryParams.toString();
  const url = query ? `roles/permissions/all?${query}` : 'roles/permissions/all';

  return apiClient<PermissionModule[]>(url, {
    method: 'GET',
  });
};

/**
 * Create a new role
 * Requires admin role
 *
 * Validation Rules:
 * - name: 3-100 chars, unique within group+scope
 * - description: 3-500 chars
 * - scope: 'USER' or 'ADMIN'
 * - permissionIds: at least 1 required
 * - If any non-view action selected, view permission MUST be included
 */
export const createRole = (payload: CreateRolePayload): Promise<Role> => {
  return apiClient<Role>('roles', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Get all roles in the group with search and pagination
 * Requires admin role
 *
 * @param search - Optional search term to filter roles by name/description
 * @param page - Page number (1-indexed, default: 1)
 * @param limit - Items per page (default: 10)
 */
export const getRoles = ({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PaginatedRolesResponse> => {
  const queryParams = new URLSearchParams();
  if (search) {
    queryParams.append('search', search);
  }
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));

  const query = queryParams.toString();
  const url = query ? `roles?${query}` : 'roles';

  return apiClient<PaginatedRolesResponse>(url, {
    method: 'GET',
  });
};

/**
 * Get single role by ID
 * Requires admin role
 */
export const getRole = (roleId: string): Promise<Role> => {
  return apiClient<Role>(`roles/${roleId}`, {
    method: 'GET',
  });
};

/**
 * Update a role
 * Requires admin role
 *
 * Rules:
 * - System roles cannot be modified
 * - Same validations as create apply
 * - Cannot change scope
 */
export const updateRole = (roleId: string, payload: UpdateRolePayload): Promise<Role> => {
  return apiClient<Role>(`roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Delete a role
 * Requires admin role
 *
 * Restrictions:
 * - Cannot delete if role has users assigned
 * - Cannot delete system roles
 */
export const deleteRole = (roleId: string): Promise<{ message: string }> => {
  return apiClient<{ message: string }>(`roles/${roleId}`, {
    method: 'DELETE',
  });
};
