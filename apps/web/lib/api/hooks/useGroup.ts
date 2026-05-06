// lib/api/hooks/useGroup.ts

import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createGroup,
  updateGroup,
  deleteGroup,
  getGroups,
  getGroup,
  getGroupStats,
  getAllSubdomains,
  GroupFormData,
  GroupStats,
  transformGroupFormToApiPayload,
} from "../services/groupService";
import { Group } from "@/lib/types";
import { useModal } from "@/components/providers/ModalProvider";
import { toast } from "sonner";
import { MODAL } from "@/lib/data/modal-data";

type CreateGroupPayload = Omit<Group, "id" | "createdAt" | "updatedAt">;
type UpdateGroupPayload = Partial<CreateGroupPayload> & { id: string; logo?: File | any };

/**
 * Hook for creating or submitting a group from GroupForm component.
 * Automatically transforms form field names to API format.
 * Handles logo file upload to backend.
 * Triggers background job 'create-group-user' on success.
 */
export const useCreateGroup = (
  options?: UseMutationOptions<Group, Error, GroupFormData>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      toast.success("Group created successfully");
      closeModal(MODAL.GROUP_CREATE);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to create group");
    },
    ...options,
  });
};

export const useUpdateGroup = (
  options?: UseMutationOptions<Group, Error, UpdateGroupPayload>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: updateGroup,
    onSuccess: (_data, variables) => {
      if (variables.id) {
        queryClient.invalidateQueries({
          queryKey: ["groups", "detail", variables.id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      toast.success("Group updated successfully");
      closeModal(MODAL.GROUP_EDIT + "-" + variables.id);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to update group");
    },
    ...options,
  });
};

export const useDeleteGroup = (
  options?: UseMutationOptions<Group, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: deleteGroup,
    onSuccess: (_data, id) => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["groups", "detail", id] });
      }
      queryClient.invalidateQueries({ queryKey: ["groups", "list"] });
      toast.success("Group deleted successfully");
      closeModal(MODAL.GROUP_DELETE + "-" + id);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to delete group");
    },
  });
};

export const useGroups = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: [
      "groups",
      "list",
      params?.search,
      params?.page,
      params?.limit,
      params?.status,
    ],
    queryFn: () => getGroups(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
};

export const useGroup = (id: string) => {
  return useQuery({
    queryKey: ["groups", "detail", id],
    queryFn: () => getGroup(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch platform-wide group statistics
 * Requires superadmin role
 * Cache: 5 minutes
 */
export const useGroupStats = () => {
  return useQuery({
    queryKey: ["groups", "stats"],
    queryFn: getGroupStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
};

/**
 * Hook to fetch all registered subdomains
 * Cache for 30 minutes
 */
export const useSubdomains = () => {
  return useQuery({
    queryKey: ["groups", "subdomains"],
    queryFn: getAllSubdomains,
    staleTime: 30 * 60 * 1000,
  });
};
