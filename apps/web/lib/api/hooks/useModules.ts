// lib/api/hooks/useModules.ts

import {
  useMutation,
  useQuery,
  UseMutationOptions,
  UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getModulesAll,
  getModulesByScope,
  getModuleByKey,
  createModule,
  updateModule,
  deleteModule,
  Module,
  CreateModulePayload,
  UpdateModulePayload,
} from "../services/moduleService";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";

/**
 * Hook to fetch all system modules
 * Results cached with version-based invalidation (30 min TTL)
 * Requires authentication
 */
export const useModulesAll = (
  moduleVersion?: number,
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["modules", "all", moduleVersion],
    queryFn: () => getModulesAll(moduleVersion),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
};

/**
 * Hook to fetch modules filtered by scope
 * Results cached with version-based invalidation (30 min TTL)
 * Requires authentication
 */
export const useModulesByScope = ({
  scope,
  moduleVersion,
  optional,
  options,
}: {
  scope: "SUPERADMIN" | "GROUP" | "ENTITY";
  moduleVersion?: number;
  optional?: string;
  options?: Omit<UseQueryOptions<Module[]>, "queryKey" | "queryFn">;
}) => {
  return useQuery({
    queryKey: ["modules", "scope", scope, moduleVersion],
    queryFn: () => getModulesByScope(scope, moduleVersion, optional),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
};

/**
 * Hook to fetch a single module by key
 * Results cached with version-based invalidation (30 min TTL)
 * Requires authentication
 */
export const useModuleByKey = (
  moduleKey: string | null,
  moduleVersion?: number,
  options?: Omit<UseQueryOptions<Module>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: ["modules", "detail", moduleKey, moduleVersion],
    queryFn: () => getModuleByKey(moduleKey!, moduleVersion),
    enabled: !!moduleKey,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
};

/**
 * Hook to create a new module
 * Requires admin/superadmin role
 * Module version auto-incremented, invalidating all module caches
 */
export const useCreateModule = (
  options?: UseMutationOptions<Module, Error, CreateModulePayload>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createModule,
    onSuccess: (data) => {
      // Invalidate all module caches since version changed
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success(`Module "${data.displayName}" created successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create module",
      );
    },
    ...options,
  });
};

/**
 * Hook to update an existing module
 * Requires admin/superadmin role
 * Module version auto-incremented, invalidating all module caches
 */
export const useUpdateModule = (
  options?: UseMutationOptions<
    Module,
    Error,
    { moduleId: string; payload: UpdateModulePayload }
  >,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ moduleId, payload }) => updateModule(moduleId, payload),
    onSuccess: (data) => {
      // Invalidate all module caches since version changed
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast.success(`Module "${data.displayName}" updated successfully`);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update module",
      );
    },
    ...options,
  });
};

/**
 * Hook to delete a module
 * Requires admin/superadmin role
 * WARNING: Cascades deletion to all associated Actions and Permissions
 * Module version auto-incremented, invalidating all module caches
 */
export const useDeleteModule = (
  options?: UseMutationOptions<Module, Error, string>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteModule,
    onSuccess: (data) => {
      // Invalidate all module caches since version changed
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      // Also invalidate role-related queries since permissions changed
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.success("Module deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete module",
      );
    },
    ...options,
  });
};
