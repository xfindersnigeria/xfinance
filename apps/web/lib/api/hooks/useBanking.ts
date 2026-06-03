import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as bankingService from "../services/bankingService";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Bank Accounts
// ────────────────────────────────────────────────

export const useBankAccounts = (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}) => {
  return useQuery({
    queryKey: ["bankAccounts", params?.search, params?.page, params?.limit, params?.status],
    queryFn: () => bankingService.getBankAccounts(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useBankAccount = (id: string) => {
  return useQuery({
    queryKey: ["bankAccounts", "detail", id],
    queryFn: () => bankingService.getBankAccountById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateBankAccount = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: bankingService.createBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Bank account connected successfully");
      closeModal(MODAL.BANK_CONNECT);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to connect bank account");
    },
    ...options,
  });
};

export const useUpdateBankAccount = (
  options?: UseMutationOptions<any, Error, { id: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: ({ id, data }) => bankingService.updateBankAccount(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["bankAccounts", "detail", variables.id] });
      }
      toast.success("Bank account updated successfully");
      closeModal(MODAL.BANK_EDIT);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update bank account");
    },
    ...options,
  });
};

export const useDeleteBankAccount = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();
  return useMutation({
    mutationFn: bankingService.deleteBankAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
      toast.success("Bank account deleted successfully");
      closeModal(MODAL.BANK_DELETE);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to delete bank account");
    },
    ...options,
  });
};

export const useReconcileBankAccount = (
  options?: UseMutationOptions<any, Error, { accountId: string; data: any }>,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }) => bankingService.reconcileBankAccount(accountId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bankTransactions", variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts", "detail", variables.accountId] });
      toast.success("Bank account reconciled successfully");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to reconcile bank account");
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Reconciliation
// ────────────────────────────────────────────────

export const useBookTransactions = (
  bankAccountId: string,
  params: { startDate?: string; endDate?: string; reconcileId?: string },
) =>
  useQuery({
    queryKey: ["reconciliation", "bookTxs", bankAccountId, params.startDate, params.endDate],
    queryFn: () => bankingService.getBookTransactions(bankAccountId, params),
    enabled: !!bankAccountId && !!params.endDate,
    staleTime: 0,
    refetchOnWindowFocus: false,
    // Keep previous results visible while refetching on date change — prevents flicker
    placeholderData: (prev) => prev,
  });

export const useListReconciliations = (bankAccountId: string, page = 1, pageSize = 20) =>
  useQuery({
    queryKey: ["reconciliation", "list", bankAccountId, page, pageSize],
    queryFn: () => bankingService.listReconciliations(bankAccountId, page, pageSize),
    enabled: !!bankAccountId,
    staleTime: 30 * 1000,
  });

export const useReconciliationById = (bankAccountId: string, reconcileId: string) =>
  useQuery({
    queryKey: ["reconciliation", "detail", bankAccountId, reconcileId],
    queryFn: () => bankingService.getReconciliationById(bankAccountId, reconcileId),
    enabled: !!bankAccountId && !!reconcileId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

export const useSaveReconciliationDraft = (bankAccountId: string, reconcileId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: bankingService.SaveDraftPayload) =>
      bankingService.saveReconciliationDraft(bankAccountId, reconcileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation", "detail", bankAccountId, reconcileId] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation", "list", bankAccountId] });
      toast.success("Progress saved as draft");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    },
  });
};

export const useCompleteReconciliation = (bankAccountId: string, reconcileId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: bankingService.CompleteReconciliationPayload) =>
      bankingService.completeReconciliation(bankAccountId, reconcileId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reconciliation", "list", bankAccountId] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation", "detail", bankAccountId, reconcileId] });
      queryClient.invalidateQueries({ queryKey: ["bankAccounts", "detail", bankAccountId] });
      toast.success("Reconciliation completed!");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to complete reconciliation");
    },
  });
};

// Legacy hooks — kept so nothing else breaks
export const useActiveReconciliation = (bankAccountId: string) =>
  useQuery({
    queryKey: ["reconciliation", "active", bankAccountId],
    queryFn: () => bankingService.getActiveReconciliation(bankAccountId),
    enabled: !!bankAccountId,
    staleTime: 0,
  });

export const useReconciliationHistory = (bankAccountId: string) =>
  useListReconciliations(bankAccountId);

// ────────────────────────────────────────────────
// Banking Statistics
// ────────────────────────────────────────────────

export const useBankingStats = () => {
  return useQuery({
    queryKey: ["bankingStats"],
    queryFn: () => bankingService.getBankingStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
