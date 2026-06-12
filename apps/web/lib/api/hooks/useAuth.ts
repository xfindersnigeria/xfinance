// lib/api/hooks/useAuth.ts

import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  impersonateEntity,
  stopEntityImpersonation,
  impersonateGroup,
  stopGroupImpersonation,
  logout,
  getWhoami,
  forgotPassword,
  resetPassword,
} from "../services/authService";

// --- Group Impersonation Hooks ---
import { UserPayload, WhoamiResponse } from "@/lib/types";
import { LoginCredentials } from "@/lib/schema";
import { useSessionStore } from "@/lib/store/session";
import { useRouter } from "next/navigation";

interface ImpersonateGroupPayload {
  groupId: string;
  groupName: string;
}

interface ImpersonateGroupResponse {
  success: boolean;
  message: string;
  groupId: string;
  groupName: string;
}

interface ImpersonateEntityPayload {
  entityId: string;
  entityName: string;
}

interface ImpersonateEntityResponse {
  success: boolean;
  message: string;
  entityId: string;
  entityName: string;
}

interface ImpersonationResponse {
  success: boolean;
  message: string;
}

export const useImpersonateGroup = (
  options?: UseMutationOptions<
    ImpersonateGroupResponse,
    Error,
    ImpersonateGroupPayload
  >,
) => {
  return useMutation({
    mutationFn: impersonateGroup,
    ...options,
  });
};

export const useStopGroupImpersonation = (
  options?: UseMutationOptions<ImpersonationResponse, Error, void>,
) => {
  return useMutation({
    mutationFn: stopGroupImpersonation,
    ...options,
  });
};

export const useLogin = (
  options?: Omit<
    UseMutationOptions<UserPayload, Error, LoginCredentials>,
    "mutationFn"
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: loginUser,
    onSuccess: (data, variables, context, mutation) => {
      // Invalidate whoami after login so it gets refetched
      queryClient.invalidateQueries({ queryKey: ["whoami"] });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
};

/**
 * Hook to fetch complete user context with menus, permissions, entities, etc.
 * Automatically handles caching with 5-minute stale time
 *
 * @param options - React Query useQuery options (e.g., enabled, retry, etc.)
 */
export const useWhoami = (
  options?: Omit<UseQueryOptions<WhoamiResponse>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["whoami"],
    queryFn: getWhoami,
    staleTime: 0, // Data is immediately stale
    gcTime: 0, // No caching - garbage collect immediately
    refetchOnWindowFocus: true,
    ...options,
  });
};

export const useRefreshWhoami = () => {
  const queryClient = useQueryClient();

  return async () => {
    const whoami = await queryClient.fetchQuery({
      queryKey: ["whoami"],
      queryFn: getWhoami,
      staleTime: 0,
      gcTime: 0,
    });

    useSessionStore.getState().setWhoami(whoami);

    return whoami;
  };
};

export const useProfile = () => {
  return useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
  });
};

export const useUpdateProfile = (
  options?: Omit<UseMutationOptions<UserPayload, Error, { firstName?: string; lastName?: string; department?: string }>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["whoami"] });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
};

export const useChangePassword = (
  options?: Omit<UseMutationOptions<{ message: string }, Error, { currentPassword: string; newPassword: string }>, "mutationFn">,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: changePassword,
    onSuccess: (data, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey: ["whoami"] });
      options?.onSuccess?.(data, variables, context, mutation);
    },
    ...options,
  });
};

// --- Entity Impersonation Hooks ---
export const useImpersonateEntity = (
  options?: UseMutationOptions<
    ImpersonateEntityResponse,
    Error,
    ImpersonateEntityPayload
  >,
) => {
  return useMutation({
    mutationFn: impersonateEntity,
    ...options,
  });
};

export const useStopEntityImpersonation = (
  options?: UseMutationOptions<ImpersonationResponse, Error, void>,
) => {
  return useMutation({
    mutationFn: stopEntityImpersonation,
    ...options,
  });
};

export const useForgotPassword = (
  options?: Omit<UseMutationOptions<{ message: string }, Error, { email: string }>, "mutationFn">,
) => {
  return useMutation({
    mutationFn: forgotPassword,
    ...options,
  });
};

export const useResetPassword = (
  options?: Omit<
    UseMutationOptions<{ message: string }, Error, { email: string; otp: string; newPassword: string }>,
    "mutationFn"
  >,
) => {
  return useMutation({
    mutationFn: resetPassword,
    ...options,
  });
};

// Logout hook
export const useLogout = (options?: UseMutationOptions<void, Error, void>) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: logout,

    onSuccess: async (...args) => {
      // 2. Navigate immediately
      router.push("/auth/login");

      // 3. Defer heavy cleanup to avoid interrupting navigation
      setTimeout(async () => {
        useSessionStore.getState().clearSession();

        await queryClient.clear();
      }, 1000);

      options?.onSuccess?.(...args);
    },

    ...options,
  });
};
