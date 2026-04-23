// lib/api/services/userService.ts
import { apiClient } from '../client';

/**
 * Role info nested in user response
 */
export interface RoleInfo {
  id: string;
  name: string;
  scope: 'USER' | 'ADMIN';
}

/**
 * User object as returned from API
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  systemRole: 'user' | 'admin' | 'superadmin';
  roleId: string;
  role: RoleInfo;
  isActive: boolean;
  requirePasswordChange: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Payload for creating a single user
 */
export interface CreateSingleUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  roleId: string;
  scope?: 'ENTITY' | 'GROUP';
  requirePasswordChange?: boolean;
  sendWelcomeEmail?: boolean;
  customMessage?: string;
}

/**
 * Payload for creating bulk users
 */
export interface CreateBulkUsersPayload {
  emails: string; // comma-separated email addresses
  roleId: string;
  scope?: 'ENTITY' | 'GROUP';
  requirePasswordChange?: boolean;
  sendWelcomeEmail?: boolean;
}

/**
 * Payload for updating user details
 */
export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  department?: string;
  roleId?: string;
  isActive?: boolean;
  entityAccessIds?: string[];
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  roles: number;
  pendingInvites: number;
}

export const getUserStats = (): Promise<UserStats> => {
  return apiClient<UserStats>('users/stats', {
    method: 'GET',
  });
};


/**
 * Create single or bulk users
 * Requires admin role
 *
 * Single User creates one user with full details
 * Bulk Users creates multiple users from comma-separated emails
 */
export const createUser = (
  payload: CreateSingleUserPayload | CreateBulkUsersPayload
): Promise<User[]> => {
  return apiClient<User[]>('users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Get all users in the group
 * Requires admin role
 */
export const getUsers = ({
  search,
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<User[]> => {
  const queryParams = new URLSearchParams();
  if (search) {
    queryParams.append('search', search);
  }
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));

  const query = queryParams.toString();
  const url = query ? `users?${query}` : 'users';

  return apiClient<User[]>(url, {
    method: 'GET',
  });
};

/**
 * Get single user by ID
 * Admins can view anyone, users can view only themselves
 */
export const getUser = (userId: string): Promise<User> => {
  return apiClient<User>(`users/${userId}`, {
    method: 'GET',
  });
};

/**
 * Update user details
 * Admins can change role/restrict entity access
 * Users can update own profile
 *
 * Admin Update can include:
 * - firstName, lastName, department
 * - roleId (change user's role)
 * - isActive (deactivate/reactivate)
 * - entityAccessIds (restrict which entities user can access)
 *
 * User Self-Update can only include:
 * - firstName, lastName, department
 */
export const updateUser = (userId: string, payload: UpdateUserPayload): Promise<User> => {
  return apiClient<User>(`users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Deactivate/delete user
 * Requires admin role
 *
 * Note: Users are deactivated, not permanently deleted
 */
export const deleteUser = (userId: string): Promise<{ message: string }> => {
  return apiClient<{ message: string }>(`users/${userId}`, {
    method: 'DELETE',
  });
};
