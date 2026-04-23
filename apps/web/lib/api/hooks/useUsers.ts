// lib/api/hooks/useUsers.ts

import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  User,
  CreateSingleUserPayload,
  CreateBulkUsersPayload,
  UpdateUserPayload,
  getUserStats,
  UserStats,
} from "../services/userService";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

/**
 * Hook to create single or bulk users
 * Requires admin role
 * Single User: creates one user with full details
 * Bulk Users: creates multiple users from comma-separated emails
 */
export const useCreateUser = (
  options?: UseMutationOptions<
    User[],
    Error,
    CreateSingleUserPayload | CreateBulkUsersPayload
  >,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: createUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["users", "stats"] });
      // console.log('Created usershhh:', data);
      // const count = (data as any).count;
      toast.success((data as any).message);
      // toast.success(`${count} user${count > 1 ? 's' : ''} created successfully`);
      closeModal(MODAL.ADMIN_USER_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user(s)",
      );
    },
    ...options,
  });
};

/**
 * Hook to fetch all users in the group
 * Requires admin role
 * Optional filter by isActive status
 */
export const useUsers = (
  {
    search,
    page = 1,
    limit = 10,
  }: {
    search?: string;
    page?: number;
    limit?: number;
  } = {},
  options?: Omit<UseQueryOptions<User[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["users", "list", { search, page, limit }],
    queryFn: () => getUsers({ search, page, limit }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to fetch single user by ID
 * Admins can view anyone, users can view only themselves
 */
export const useUser = (
  userId: string | null,
  options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["users", "detail", userId],
    queryFn: () => getUser(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    ...options,
  });
};

/**
 * Hook to update user details
 * Admins can change role/restrict entity access
 * Users can update own profile
 *
 * Admin Update can include:
 * - firstName, lastName, department
 * - roleId (change user's role)
 * - isActive (deactivate/reactivate)
 * - entityAccessIds (restrict which entities user can access)
 */
export const useUpdateUser = (
  options?: UseMutationOptions<
    User,
    Error,
    { userId: string; payload: UpdateUserPayload }
  >,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ userId, payload }) => updateUser(userId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["users", "detail", data.id] });
      toast.success("User updated successfully");
      closeModal(MODAL.ADMIN_USER_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user",
      );
    },
    ...options,
  });
};

/**
 * Hook to deactivate/delete user
 * Requires admin role
 *
 * Note: Users are deactivated, not permanently deleted
 */
export const useDeleteUser = (
  options?: UseMutationOptions<{ message: string }, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: deleteUser,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["users", "list"] });
      queryClient.invalidateQueries({ queryKey: ["users", "stats"] });
      toast.success("User deleted successfully");
      closeModal(MODAL.ADMIN_USER_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user",
      );
    },
    ...options,
  });
};

export const useUserStats = (
  options?: Omit<UseQueryOptions<UserStats>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["users", "stats"],
    queryFn: getUserStats,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    ...options,
  });
};
