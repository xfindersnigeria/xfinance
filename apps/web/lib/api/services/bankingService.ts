import { apiClient } from "@/lib/api/client";

// ────────────────────────────────────────────────
// Bank Accounts
// ────────────────────────────────────────────────

export const getBankAccounts = async (params?: {
  search?: string;
  page?: number;
  limit?: number;
  status?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  const url = queryString ? `banking/accounts?${queryString}` : "banking/accounts";

  return apiClient(url, {
    method: "GET",
  });
};

export const getBankAccountById = async (id: string) =>
  apiClient(`banking/accounts/${id}`, {
    method: "GET",
  });

export const createBankAccount = async (data: any) =>
  apiClient("banking/accounts", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updateBankAccount = async (id: string, data: any) =>
  apiClient(`banking/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const deleteBankAccount = async (id: string) =>
  apiClient(`banking/accounts/${id}`, {
    method: "DELETE",
  });

// ────────────────────────────────────────────────
// Bank Account Transactions
// ────────────────────────────────────────────────

export const getBankTransactions = async (
  accountId: string,
  params?: {
    search?: string;
    page?: number;
    limit?: number;
    status?: string;
  },
) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", String(params.page));
  if (params?.limit) queryParams.append("limit", String(params.limit));
  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);

  const queryString = queryParams.toString();
  const url = queryString
    ? `banking/accounts/${accountId}/transactions?${queryString}`
    : `banking/accounts/${accountId}/transactions`;

  return apiClient(url, {
    method: "GET",
  });
};

// ────────────────────────────────────────────────
// Reconciliation
// ────────────────────────────────────────────────

export interface ReconciliationStatementTx {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  category: string | null;
  matched: boolean;
  matchedBookId: string | null;
}

export interface ReconciliationBookTx {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  category: string | null;
  matched: boolean;
  matchedStatementId: string | null;
}

export interface ReconciliationMatch {
  statementTransactionId: string;
  bookTransactionId: string;
}

export interface ActiveReconciliation {
  reconciliation: {
    id: string;
    statementEndDate: string;
    statementEndingBalance: number;
    status: "DRAFT" | "COMPLETED";
    notes: string | null;
  } | null;
  statementTransactions: ReconciliationStatementTx[];
  bookTransactions: ReconciliationBookTx[];
  matches: ReconciliationMatch[];
}

export interface ReconciliationHistoryItem {
  id: string;
  statementEndDate: string;
  statementEndingBalance: number;
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  statementTransactionCount: number;
  matchedCount: number;
}

export interface SaveDraftPayload {
  statementEndDate: string;
  statementEndingBalance: number;
  statementTransactions: Array<{
    id: string;
    date: string;
    description: string;
    reference?: string;
    amount: number;
    category?: string;
  }>;
  matches: ReconciliationMatch[];
}

export interface CompleteReconciliationPayload extends SaveDraftPayload {
  notes?: string;
}

export const getActiveReconciliation = async (bankAccountId: string): Promise<ActiveReconciliation> =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/active`, { method: "GET" });

export const getReconciliationHistory = async (bankAccountId: string): Promise<ReconciliationHistoryItem[]> =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations`, { method: "GET" });

export const saveReconciliationDraft = async (bankAccountId: string, data: SaveDraftPayload) =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/draft`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const completeReconciliation = async (bankAccountId: string, data: CompleteReconciliationPayload) =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const importStatement = async (bankAccountId: string, file: File): Promise<{ data: Array<{ date: string; description: string; reference: string; amount: number; category: string }>; count: number }> => {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient(`banking/accounts/${bankAccountId}/reconciliations/import`, {
    method: "POST",
    body: formData,
  });
};

export const reconcileBankAccount = async (
  accountId: string,
  data: any,
) =>
  apiClient(`banking/accounts/${accountId}/reconcile`, {
    method: "POST",
    body: JSON.stringify(data),
  });
// ────────────────────────────────────────────────
// Banking Statistics
// ────────────────────────────────────────────────

export interface BankingStats {
  totalBankCash: number;
  numberOfBankAccounts: number;
  accounts: Array<{
    id: string;
    accountName: string;
    bankName: string;
    accountType: string;
    currency: string;
    currentBalance: number;
    status: string;
  }>;
}

export const getBankingStats = async (): Promise<BankingStats> =>
  apiClient("analytics/banking-summary", {
    method: "GET",
  });