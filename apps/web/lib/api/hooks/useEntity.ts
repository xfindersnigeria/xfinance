// lib/api/hooks/useEntity.ts

import {
  useMutation,
  useQuery,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createEntity,
  updateEntity,
  deleteEntity,
  getEntities,
  getEntity,
  EntityFormData,
} from "../services/entityService";
import { Entity } from "@/lib/types";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

type CreateEntityPayload = EntityFormData;
type UpdateEntityPayload = EntityFormData & { id: string };

/**
 * Hook for creating an entity (business unit) within the user's group.
 * Handles logo file upload via multipart/form-data.
 * Triggers background job 'create-entity-user' on success.
 * Entity is automatically assigned to authenticated user's group.
 */
export const useCreateEntity = (
  options?: UseMutationOptions<Entity, Error, CreateEntityPayload>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createEntity,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      toast.success("Entity created successfully");
      closeModal(MODAL.ENTITY_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create entity",
      );
    },
    ...options,
  });
};

/**
 * Hook for updating an existing entity.
 * Handles logo file upload via multipart/form-data.
 * Email and taxId cannot be changed after creation (immutable).
 */
export const useUpdateEntity = (
  options?: UseMutationOptions<Entity, Error, UpdateEntityPayload>,
) => {
  const queryClient = useQueryClient();
  const { closeModal, isOpen } = useModal();
  return useMutation({
    mutationFn: updateEntity,
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["entities", "detail", variables.id],
        });
      }
      // console.log(isOpen, "isOpen in useUpdateEntity onSuccess"); // Debug log
      closeModal(MODAL.ENTITY_EDIT + '-' + variables.id);
      toast.success("Entity updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update entity",
      );
    },
    ...options,
  });
};

/**
 * Hook for deleting an entity.
 * This is a destructive operation with cascading deletes.
 * Deletes: accounts, transactions, employees, customers, etc.
 */
export const useDeleteEntity = (
  options?: UseMutationOptions<void, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: deleteEntity,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["entities", "list"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["entities", "detail", id] });
      }

      closeModal(MODAL.ENTITY_DELETE);

      toast.success("Entity deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete entity",
      );
    },
    ...options,
  });
};

/**
 * Hook to fetch all entities within the authenticated user's group.
 * Each entity can have different currency (ISO 4217) and fiscal year-end.
 * Supports search, filtering, and pagination.
 */
export const useEntities = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    // queryKey: ["entities", "list"],

    queryKey: ["entities", "list", params?.search, params?.page, params?.limit],
    queryFn: () => getEntities(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to fetch a specific entity by ID.
 * User must have access to the entity's group.
 */
export const useEntity = (id: string) => {
  return useQuery({
    queryKey: ["entities", "detail", id],
    queryFn: () => getEntity(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};
