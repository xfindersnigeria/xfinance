// lib/api/hooks/useRoles.ts

import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getAllPermissions,
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
  PermissionModule,
  Role,
  CreateRolePayload,
  UpdateRolePayload,
  PaginatedRolesResponse,
} from '../services/roleService';
import { toast } from 'sonner';
import { useModal } from '@/components/providers/ModalProvider';
import { MODAL } from '@/lib/data/modal-data';

/**
 * Hook to fetch all available permissions organized by module
 * Use to build permission selector UI in role creation/editing
 * Requires admin role
 *
 * @param scope - Optional scope filter: 'admin' or 'user'
 */
export const useAllPermissions = (
  scope?: 'admin' | 'user',
  options?: Omit<UseQueryOptions<PermissionModule[]>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['roles', 'permissions', 'all', scope || 'all'],
    queryFn: () => getAllPermissions(scope),
    staleTime: 1000 * 60 * 60, // 1 hour (permissions rarely change)
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    ...options,
  });
};

/**
 * Hook to create a new role
 * Requires admin role
 * Validation Rules:
 * - name: 3-100 chars, unique within group+scope
 * - description: 3-500 chars
 * - permissionIds: at least 1 required
 */
export const useCreateRole = (
  options?: UseMutationOptions<Role, Error, CreateRolePayload>
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: createRole,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list'] });
      toast.success(`Role "${data.name}" created successfully`);
      closeModal(MODAL.ADMIN_ROLE_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create role'
      );
    },
    ...options,
  });
};

/**
 * Hook to fetch all roles in the group with search and pagination
 * Requires admin role
 *
 * @param search - Optional search term to filter roles by name/description
 * @param page - Page number (1-indexed, default: 1)
 * @param limit - Items per page (default: 10)
 */
export const useRoles = (
  {
    search,
    page = 1,
    limit = 10,
  }: {
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  options?: Omit<UseQueryOptions<PaginatedRolesResponse>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['roles', 'list', { search, page, limit }],
    queryFn: () => getRoles({ search, page, limit }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch single role by ID
 * Requires admin role
 */
export const useRole = (
  roleId: string | null,
  options?: Omit<UseQueryOptions<Role>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: ['roles', 'detail', roleId],
    queryFn: () => getRole(roleId!),
    enabled: !!roleId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to update a role
 * Requires admin role
 * Rules:
 * - System roles cannot be modified
 * - Same validations as create apply
 */
export const useUpdateRole = (
  options?: UseMutationOptions<Role, Error, { roleId: string; payload: UpdateRolePayload }>
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ roleId, payload }) => updateRole(roleId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['roles', 'detail', data.id] });
      toast.success(`Role "${data.name}" updated successfully`);
      closeModal(MODAL.ADMIN_ROLE_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      );
    },
    ...options,
  });
};

/**
 * Hook to delete a role
 * Requires admin role
 * Restrictions:
 * - Cannot delete if role has users assigned
 * - Cannot delete system roles
 */
export const useDeleteRole = (
  options?: UseMutationOptions<{ message: string }, Error, string>
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: deleteRole,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roles', 'list'] });
      toast.success('Role deleted successfully');
      closeModal(MODAL.ADMIN_ROLE_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete role'
      );
    },
    ...options,
  });
};
