// Store Inventory (Store Supply) Hooks
import {
  getStoreSupplies,
  getStoreSupplyById,
  createStoreSupply,
  updateStoreSupply,
  deleteStoreSupply,
  getStoreSupplyStats,
  getStoreSupplyIssues,
  getStoreSupplyIssueById,
  createStoreSupplyIssueSingle,
  createStoreSupplyIssueBulk,
  updateStoreSupplyIssue,
  deleteStoreSupplyIssue,
  getStoreSupplyRestocks,
  getStoreSupplyRestockById,
  createStoreSupplyRestock,
  updateStoreSupplyRestock,
  deleteStoreSupplyRestock,
} from "../services/assetsService";

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import * as assetsService from "../services/assetsService";
import { CreateAssetInput, UpdateAssetInput } from "./types/assetsTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Assets
// ────────────────────────────────────────────────

export const useAssets = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["assets", params?.search, params?.page, params?.limit],
    queryFn: () => assetsService.getAssets(params),
    placeholderData: undefined,
    refetchOnWindowFocus: true,
  });
};

export const useAsset = (id: string) => {
  return useQuery({
    queryKey: ["assets", "detail", id],
    queryFn: () => assetsService.getAssetById(id),
    enabled: !!id,
    placeholderData: undefined,
    refetchOnWindowFocus: true,
  });
};

export const useCreateAsset = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: assetsService.createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      toast.success("Asset created successfully");
      closeModal(MODAL.ASSET_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create asset",
      );
    },
    ...options,
  });
};

export const useUpdateAsset = (
  options?: UseMutationOptions<
    any,
    Error,
    { id: string; data: UpdateAssetInput }
  >,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => assetsService.updateAsset(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["assets", "detail", variables.id],
        });
      }
      toast.success("Asset updated successfully");
      closeModal(MODAL.ASSET_EDIT + "-" + variables.id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update asset",
      );
    },
    ...options,
  });
};

export const useDeleteAsset = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: assetsService.deleteAsset,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["assets", "detail", id],
        });
      }
      toast.success("Asset deleted successfully");
      closeModal(MODAL.ASSET_DELETE + "-" + id);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete asset",
      );
    },
    ...options,
  });
};

// Store Supply CRUD hooks
export const useStoreSupplies = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ["store-supplies", params?.search, params?.page, params?.limit],
    queryFn: () => getStoreSupplies(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useStoreSupply = (id: string) => {
  return useQuery({
    queryKey: ["store-supply", id],
    queryFn: () => getStoreSupplyById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateStoreSupply = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createStoreSupply,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supply created successfully");
      closeModal(MODAL.SUPPLY_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete asset",
      );
    },
    // ...options,
  });
};

export const useUpdateStoreSupply = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateStoreSupply(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supply updated successfully");
      closeModal(MODAL.SUPPLY_EDIT + "-" + variables.id);
    },
  });
};

export const useDeleteStoreSupply = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: deleteStoreSupply,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supply deleted successfully");
      closeModal(MODAL.SUPPLY_DELETE + "-" + id);
    },
  });
};

// Store Supply Stats
export const useStoreSupplyStats = () => {
  return useQuery({
    queryKey: ["store-supply-stats"],
    queryFn: getStoreSupplyStats,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// Issue History CRUD hooks
export const useStoreSupplyIssues = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [
      "store-supply-issues",
      params?.search,
      params?.page,
      params?.limit,
    ],
    queryFn: () => getStoreSupplyIssues(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useProjectSupplyIssues = (projectId: string) => {
  return useQuery({
    queryKey: ["store-supply-issues", "project", projectId],
    queryFn: () => getStoreSupplyIssues({ projectId, limit: 100 }),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useStoreSupplyIssue = (id: string) => {
  return useQuery({
    queryKey: ["store-supply-issue", id],
    queryFn: () => getStoreSupplyIssueById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateStoreSupplyIssueSingle = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createStoreSupplyIssueSingle,
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-issues"] });
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supply issued successfully");
      if (variables?.supplyId) {
        closeModal(MODAL.SUPPLY_ISSUE_SINGLE + "-" + variables.supplyId);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to issue supply");
    },
  });
};

export const useCreateStoreSupplyIssueBulk = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createStoreSupplyIssueBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-issues"] });
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supplies issued successfully");
      closeModal(MODAL.ISSUE_SUPPLIES);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to issue supplies",
      );
    },
  });
};

export const useUpdateStoreSupplyIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateStoreSupplyIssue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-issues"] });
    },
  });
};

export const useDeleteStoreSupplyIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStoreSupplyIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-issues"] });
    },
  });
};

// Restock History CRUD hooks
export const useStoreSupplyRestocks = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [
      "store-supply-restocks",
      params?.search,
      params?.page,
      params?.limit,
    ],
    queryFn: () => getStoreSupplyRestocks(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useStoreSupplyRestock = (id: string) => {
  return useQuery({
    queryKey: ["store-supply-restock", id],
    queryFn: () => getStoreSupplyRestockById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateStoreSupplyRestock = () => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: createStoreSupplyRestock,
    onSuccess: (_, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-restocks"] });
      queryClient.invalidateQueries({ queryKey: ["store-supplies"] });
      toast.success("Supply restocked successfully");
      if (variables?.supplyId) {
        closeModal(MODAL.SUPPLY_RESTOCK + "-" + variables.supplyId);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to restock supply");
    },
  });
};

export const useUpdateStoreSupplyRestock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      updateStoreSupplyRestock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-restocks"] });
    },
  });
};

export const useDeleteStoreSupplyRestock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteStoreSupplyRestock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-supply-restocks"] });
    },
  });
};
