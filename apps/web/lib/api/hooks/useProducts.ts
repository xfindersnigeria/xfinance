// lib/api/hooks/useProducts.ts

import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as productsService from "../services/productsService";
import {  StoreItemsResponse, CollectionsResponse } from "./types/productsTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Collections
// ────────────────────────────────────────────────

export const useCollections = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<CollectionsResponse>({
    queryKey: ["collections", params?.search, params?.page, params?.limit],
    queryFn: () => productsService.getCollections(params) as Promise<CollectionsResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCollection = (id: string) => {
  return useQuery({
    queryKey: ["collections", "detail", id],
    queryFn: () => productsService.getCollectionById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateCollection = (
  options?: UseMutationOptions<any, Error, FormData>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: productsService.createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast.success("Collection created successfully");
      closeModal(MODAL.COLLECTION_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create collection",
      );
    },
    ...options,
  });
};

export const useUpdateCollection = (
  options?: UseMutationOptions<any, Error, { id: string; formData: FormData }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, formData }) => productsService.updateCollection(id, formData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["collections", "detail", variables.id],
        });
      }
      toast.success("Collection updated successfully");
      closeModal(MODAL.COLLECTION_EDIT + "-" + variables.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update collection",
      );
    },
    ...options,
  });
};

export const useDeleteCollection = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: productsService.deleteCollection,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["collections", "detail", id],
        });
      }
      toast.success("Collection deleted successfully");
      closeModal(MODAL.COLLECTION_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete collection",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Store Items
// ────────────────────────────────────────────────

export const useStoreItems = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  category?: string;
  type?: "product" | "service";
}) => {
  return useQuery<StoreItemsResponse>({
    queryKey: ["store-items", params?.search, params?.page, params?.limit, params?.category, params?.type],
    queryFn: () => productsService.getStoreItems(params) as Promise<StoreItemsResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useStoreItem = (id: string) => {
  return useQuery({
    queryKey: ["store-items", "detail", id],
    queryFn: () => productsService.getStoreItemById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateStoreItem = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: productsService.createStoreItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      toast.success("Store Item created successfully");
      closeModal(MODAL.ITEM_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create store item",
      );
    },
    ...options,
  });
};

export const useUpdateStoreItem = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => productsService.updateStoreItem(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["store-items", "detail", variables.id],
        });
      }
      toast.success("Store Item updated successfully");
      closeModal(MODAL.ITEM_EDIT + '-' + variables.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update item",
      );
    },
    ...options,
  });
};

export const useDeleteStoreItem = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: productsService.deleteStoreItem,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["store-items"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["store-items", "detail", id],
        });
      }
      toast.success("Store item deleted successfully");
      closeModal(MODAL.ITEM_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete item",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Inventory
// ────────────────────────────────────────────────

export const useInventory = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["inventory", params?.search, params?.page, params?.limit],
    queryFn: () => productsService.getInventory(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useAdjustInventory = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productsService.adjustInventory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      toast.success("Inventory adjusted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to adjust inventory",
      );
    },
    ...options,
  });
};

export const useInventoryMovements = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  itemId?: string;
}) => {
  return useQuery({
    queryKey: ["inventory-movements", params?.search, params?.page, params?.limit, params?.itemId],
    queryFn: () => productsService.getInventoryMovements(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useLowStockItems = () => {
  return useQuery({
    queryKey: ["low-stock-items"],
    queryFn: () => productsService.getLowStockItems(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};