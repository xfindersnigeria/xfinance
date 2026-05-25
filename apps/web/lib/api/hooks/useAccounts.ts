// lib/api/hooks/useAccounts.ts

import {
  useQuery,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import * as accountsService from "../services/accountsService";
import {
  CreateAccountInput,
  UpdateAccountInput,
  CreateBudgetInput,
  CreateJournalInput,
  UpdateJournalInput,
  AccountsResponse,
  JournalResponse,
  AccountTransactionsResponse,
  AccountTransactionTypeEnum,
  TransactionPostingStatusEnum,
  BudgetListResponse,
  BudgetVsActualResponse,
  PreviousPeriodBudget,
  GroupBudgetListResponse,
  GroupBudgetVsActualResponse,
  GroupPreviousPeriodBudget,
  ForecastListResponse,
  CreateForecastInput,
} from "./types/accountsTypes";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import { toast } from "sonner";

// ────────────────────────────────────────────────
// Accounts
// ────────────────────────────────────────────────

export const useAccounts = (params?: { search?: string; page?: number; limit?: number; subCategory?: string; type?: string }) => {
  return useQuery<AccountsResponse>({
    queryKey: ["accounts", params?.search, params?.page, params?.limit, params?.subCategory, params?.type],
    queryFn: () => accountsService.getAccounts(params) as Promise<AccountsResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useAccount = (id: string) => {
  return useQuery({
    queryKey: ["accounts", "detail", id],
    queryFn: () => accountsService.getAccountById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useAccountTransactions = (params?: {
  accountId?: string;
  bankAccountId?: string;
  type?: "BANK" | "INVOICE_POSTING" | "PAYMENT_RECEIVED_POSTING" | "OPENING_BALANCE" | "MANUAL_ENTRY" | "JOURNAL_ENTRY" | "EXPENSE_POSTING" | "BILL_POSTING";
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: "Pending" | "Processing" | "Success" | "Failed";
  page?: number;
  pageSize?: number;
}) => {
  return useQuery<AccountTransactionsResponse>({
    queryKey: ["accountTransactions", params?.accountId, params?.bankAccountId, params?.type, params?.search, params?.fromDate, params?.toDate, params?.status, params?.page, params?.pageSize],
    queryFn: () => accountsService.getAccountTransactions(params) as Promise<AccountTransactionsResponse>,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useAccountTransactionsByAccountId = (
  accountId: string,
  params?: {
    search?: string;
    fromDate?: string;
    toDate?: string;
    status?: "Pending" | "Processing" | "Success" | "Failed";
    page?: number;
    pageSize?: number;
  },
) => {
  return useQuery<AccountTransactionsResponse>({
    queryKey: ["accountTransactions", "byAccountId", accountId, params?.search, params?.fromDate, params?.toDate, params?.status, params?.page, params?.pageSize],
    queryFn: () => accountsService.getAccountTransactionsByAccountId(accountId, params) as Promise<AccountTransactionsResponse>,
    enabled: !!accountId,
    staleTime: 1 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};



export const useCreateAccount = (
  options?: UseMutationOptions<any, Error, CreateAccountInput>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: accountsService.createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Account created successfully");
      closeModal(MODAL.ACCOUNT_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account",
      );
    },
    ...options,
  });
};

export const useUpdateAccount = (
  options?: UseMutationOptions<any, Error, { id: string; data: UpdateAccountInput }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => accountsService.updateAccount(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["accounts", "detail", variables.id] });
      }
      toast.success("Account updated successfully");
      closeModal(MODAL.ACCOUNT_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update account",
      );
    },
    ...options,
  });
};

export const useSetOpeningBalances = (
  options?: UseMutationOptions<any, Error, { date: string; fiscalYear: string; note?: string; items: any[] }>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => accountsService.setOpeningBalances(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["openingBalances"] });
      toast.success("Opening balances set successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to set opening balances",
      );
    },
    ...options,
  });
};

export const useOpeningBalances = (params?: { search?: string; page?: number; limit?: number }) => {
  return useQuery<any>({
    queryKey: ["openingBalances", params?.search, params?.page, params?.limit],
    queryFn: () => accountsService.getOpeningBalances(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

// ────────────────────────────────────────────────
// Budgets
// ────────────────────────────────────────────────

export const useCreateBudget = (
  options?: UseMutationOptions<any, Error, CreateBudgetInput>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: accountsService.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created successfully");
      closeModal(MODAL.BUDGET_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create budget",
      );
    },
    ...options,
  });
};

export const useBudgets = (params?: {
  periodType?: string;
  period?: string;
  fiscalYear?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<BudgetListResponse>({
    queryKey: [
      "budgets",
      "list",
      params?.periodType,
      params?.period,
      params?.fiscalYear,
      params?.search,
      params?.page,
      params?.limit,
    ],
    queryFn: () =>
      accountsService.getBudgets(params) as Promise<BudgetListResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useBudgetVsActual = (params?: {
  periodType?: string;
  period?: string;
  fiscalYear?: string;
}) => {
  return useQuery<BudgetVsActualResponse>({
    queryKey: [
      "budgets",
      "vsActual",
      params?.periodType,
      params?.period,
      params?.fiscalYear,
    ],
    queryFn: () =>
      accountsService.getBudgetVsActual(params) as Promise<BudgetVsActualResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const usePreviousPeriodBudget = (
  params: { periodType: string; period: string; fiscalYear: string },
  enabled = true,
) => {
  return useQuery<PreviousPeriodBudget>({
    queryKey: [
      "budgets",
      "previousPeriod",
      params.periodType,
      params.period,
      params.fiscalYear,
    ],
    queryFn: () =>
      accountsService.getPreviousPeriodBudget(params) as Promise<PreviousPeriodBudget>,
    enabled: enabled && !!params.periodType && !!params.fiscalYear,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useDeleteBudget = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsService.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget line deleted");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete budget line",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Group Budgets
// ────────────────────────────────────────────────

export const useCreateGroupBudget = (
  options?: UseMutationOptions<any, Error, any>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsService.createGroupBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupBudgets"] });
      toast.success("Group budget created successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create group budget",
      );
    },
    ...options,
  });
};

export const useGroupBudgets = (params?: {
  periodType?: string;
  period?: string;
  fiscalYear?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<GroupBudgetListResponse>({
    queryKey: ["groupBudgets", "list", params?.periodType, params?.period, params?.fiscalYear, params?.search, params?.page, params?.limit],
    queryFn: () => accountsService.getGroupBudgets(params) as Promise<GroupBudgetListResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useGroupBudgetVsActual = (params?: {
  periodType?: string;
  period?: string;
  fiscalYear?: string;
}) => {
  return useQuery<GroupBudgetVsActualResponse>({
    queryKey: ["groupBudgets", "vsActual", params?.periodType, params?.period, params?.fiscalYear],
    queryFn: () => accountsService.getGroupBudgetVsActual(params) as Promise<GroupBudgetVsActualResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useGroupPreviousPeriodBudget = (
  params: { periodType: string; period: string; fiscalYear: string },
  enabled = true,
) => {
  return useQuery<GroupPreviousPeriodBudget>({
    queryKey: ["groupBudgets", "previousPeriod", params.periodType, params.period, params.fiscalYear],
    queryFn: () => accountsService.getGroupPreviousPeriodBudget(params) as Promise<GroupPreviousPeriodBudget>,
    enabled: enabled && !!params.periodType && !!params.fiscalYear,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useDeleteGroupBudget = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsService.deleteGroupBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupBudgets"] });
      toast.success("Group budget line deleted");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete group budget line",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Forecasts
// ────────────────────────────────────────────────

export const useCreateForecast = (
  options?: UseMutationOptions<any, Error, CreateForecastInput>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsService.createForecast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      toast.success("Forecast created successfully");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create forecast",
      );
    },
    ...options,
  });
};

export const useForecasts = (params?: {
  periodType?: string;
  period?: string;
  fiscalYear?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery<ForecastListResponse>({
    queryKey: ["forecasts", "list", params?.periodType, params?.period, params?.fiscalYear, params?.search, params?.page, params?.limit],
    queryFn: () => accountsService.getForecasts(params) as Promise<ForecastListResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useDeleteForecast = (
  options?: UseMutationOptions<any, Error, { periodType: string; period: string; fiscalYear: string }>,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: accountsService.deleteForecast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
      toast.success("Forecast deleted");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete forecast",
      );
    },
    ...options,
  });
};

// ────────────────────────────────────────────────
// Journals
// ────────────────────────────────────────────────

export const useJournals = (params?: { search?: string; page?: number; limit?: number }) => {
  return useQuery<JournalResponse>({
    queryKey: ["journals", params?.search, params?.page, params?.limit],
    queryFn: () => accountsService.getJournal(params) as Promise<JournalResponse>,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useJournal = (id: string) => {
  return useQuery({
    queryKey: ["journals", "detail", id],
    queryFn: () => accountsService.getJournalById(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useJournalLines = (params?: { search?: string; page?: number; limit?: number }) => {
  return useQuery<any>({
    queryKey: ["journalLines", params?.search, params?.page, params?.limit],
    queryFn: () => accountsService.getJournalLines(params),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useJournalByReference = (reference: string) => {
  return useQuery({
    queryKey: ["journals", "reference", reference],
    queryFn: () => accountsService.getJournalByReference(reference),
    enabled: !!reference,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCreateJournal = (
  options?: UseMutationOptions<any, Error, CreateJournalInput>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: accountsService.createJournal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["journalLines"] });
      toast.success("Journal created successfully");
      closeModal(MODAL.JOURNAL_CREATE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create journal",
      );
    },
    ...options,
  });
};

export const useUpdateJournal = (
  options?: UseMutationOptions<any, Error, { id: string; data: UpdateJournalInput }>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: ({ id, data }) => accountsService.updateJournal(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ["journals", "detail", variables.id] });
      }
      toast.success("Journal updated successfully");
      closeModal(MODAL.JOURNAL_EDIT);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update journal",
      );
    },
    ...options,
  });
};

export const useDeleteJournal = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: accountsService.deleteJournal,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["journals", "detail", id] });
      }
      toast.success("Journal deleted successfully");
      closeModal(MODAL.JOURNAL_DELETE);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete journal",
      );
    },
    ...options,
  });
};

export const usePostJournal = (
  options?: UseMutationOptions<any, Error, string>,
) => {
  const queryClient = useQueryClient();
  const { closeModal } = useModal();

  return useMutation({
    mutationFn: accountsService.postJournal,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["journals"] });
      queryClient.invalidateQueries({ queryKey: ["journalLines"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["journals", "detail", id] });
      }
      toast.success("Journal posted successfully");
      closeModal(MODAL.JOURNAL_POST);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to post journal",
      );
    },
    ...options,
  });
};