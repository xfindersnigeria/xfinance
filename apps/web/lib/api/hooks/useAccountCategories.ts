import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import * as accountsService from "../services/accountsService";
import { AccountCategory } from "./types/accountsTypes";
import { toast } from "sonner";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";

export const useAccountCategories = () =>
  useQuery<AccountCategory[]>({
    queryKey: ["account-categories"],
    queryFn: () =>
      accountsService.getAccountCategories() as Promise<AccountCategory[]>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useAccountCategoriesByType = (typeId: string) =>
  useQuery<AccountCategory[]>({
    queryKey: ["account-categories", "type", typeId],
    queryFn: () =>
      accountsService.getAccountCategoriesByType(typeId) as Promise<
        AccountCategory[]
      >,
    enabled: !!typeId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useAccountCategory = (id: string) =>
  useQuery<AccountCategory>({
    queryKey: ["account-categories", id],
    queryFn: () =>
      accountsService.getAccountCategoryById(id) as Promise<AccountCategory>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateAccountCategory = (
  options?: UseMutationOptions<
    any,
    Error,
    { name: string; typeId: string; description?: string; code?: string }
  >,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: accountsService.createAccountCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-categories"] });
      toast.success("Account category created successfully");
      closeModal(MODAL.ACCOUNT_CATEGORY_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create account category",
      );
    },
    ...options,
  });
};

export const useUpdateAccountCategory = (
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
    mutationFn: ({ id, data }) =>
      accountsService.updateAccountCategory(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account-categories"] });
      if (variables?.id) {
        queryClient.invalidateQueries({
          queryKey: ["account-categories", variables.id],
        });
      }
      toast.success("Account category updated successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update account category",
      );
    },
    ...options,
  });
};

export const useDeleteAccountCategory = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsService.deleteAccountCategory,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["account-categories"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["account-categories", id] });
      }
      toast.success("Account category deleted successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete account category",
      );
    },
    ...options,
  });
};
