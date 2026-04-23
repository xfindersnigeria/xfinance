import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import * as accountsService from "../services/accountsService";
import { AccountSubCategory } from "./types/accountsTypes";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export const useSubCategoriesByCategory = (categoryId: string) =>
  useQuery<AccountSubCategory[]>({
    queryKey: ["account-subcategories", "category", categoryId],
    queryFn: () =>
      accountsService.getSubCategoriesByCategory(categoryId) as Promise<
        AccountSubCategory[]
      >,
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useSubCategory = (id: string) =>
  useQuery<AccountSubCategory>({
    queryKey: ["account-subcategories", id],
    queryFn: () =>
      accountsService.getSubCategoryById(id) as Promise<AccountSubCategory>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateSubCategory = (
  options?: UseMutationOptions<
    any,
    Error,
    { name: string; categoryId: string; description?: string; code?: string }
  >,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: accountsService.createSubCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-subcategories"] });
      toast.success("Account subcategory created successfully");
      closeModal(MODAL.ACCOUNT_CATEGORY_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create account subcategory",
      );
    },
    ...options,
  });
};

export const useUpdateSubCategory = (
  options?: UseMutationOptions<
    any,
    Error,
    {
      id: string;
      data: Partial<{ name: string; description: string; code: string }>;
    }
  >,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => accountsService.updateSubCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account-subcategories"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["account-subcategories", variables.id],
        });
      }
      toast.success("Account subcategory updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update account subcategory",
      );
    },
    ...options,
  });
};

export const useDeleteSubCategory = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsService.deleteSubCategory,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["account-subcategories"] });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: ["account-subcategories", id],
        });
      }
      toast.success("Account subcategory deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete account subcategory",
      );
    },
    ...options,
  });
};
