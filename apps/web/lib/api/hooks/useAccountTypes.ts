import { useQuery, useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import * as accountsService from "../services/accountsService";
import { AccountType } from "./types/accountsTypes";
import { toast } from "sonner";

export const useAccountTypes = () =>
  useQuery<AccountType[]>({
    queryKey: ["account-types"],
    queryFn: (): Promise<AccountType[]> => accountsService.getAccountTypes() as Promise<AccountType[]>,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useAccountType = (id: string) =>
  useQuery<AccountType>({
    queryKey: ["account-types", id],
    queryFn: () => accountsService.getAccountTypeById(id) as Promise<AccountType>,
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useCreateAccountType = (
  options?: UseMutationOptions<any, Error, { code: string; name: string; description: string }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsService.createAccountType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-types"] });
      toast.success("Account type created successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create account type");
    },
    ...options,
  });
};

export const useUpdateAccountType = (
  options?: UseMutationOptions<any, Error, { id: string; data: Partial<{ code: string; name: string; description: string }> }>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => accountsService.updateAccountType(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["account-types"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["account-types", variables.id] });
      }
      toast.success("Account type updated successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update account type");
    },
    ...options,
  });
};

export const useDeleteAccountType = (
  options?: UseMutationOptions<any, Error, string>
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: accountsService.deleteAccountType,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["account-types"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["account-types", id] });
      }
      toast.success("Account type deleted successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete account type");
    },
    ...options,
  });
};
