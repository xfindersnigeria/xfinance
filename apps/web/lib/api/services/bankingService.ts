import { apiClient } from "../client";

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

  return apiClient(url, { method: "GET" });
};

export const getBankAccountById = async (id: string) =>
  apiClient(`banking/accounts/${id}`, { method: "GET" });

export const createBankAccount = async (data: any) =>
  apiClient("banking/accounts", { method: "POST", body: JSON.stringify(data) });

export const updateBankAccount = async (id: string, data: any) =>
  apiClient(`banking/accounts/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteBankAccount = async (id: string) =>
  apiClient(`banking/accounts/${id}`, { method: "DELETE" });

// ────────────────────────────────────────────────
// Bank Account Transactions
// ────────────────────────────────────────────────

export const getBankTransactions = async (
  accountId: string,
  params?: { search?: string; page?: number; limit?: number; status?: string },
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
  return apiClient(url, { method: "GET" });
};

// ────────────────────────────────────────────────
// Reconciliation types
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

export interface ReconciliationRecord {
  reconciliation: {
    id: string;
    statementStartDate: string | null;
    statementEndDate: string;
    statementEndingBalance: number;
    status: "DRAFT" | "COMPLETED";
    notes: string | null;
  } | null;
  statementTransactions: ReconciliationStatementTx[];
  bookTransactions: ReconciliationBookTx[];
  matches: ReconciliationMatch[];
  glBalance: number;
}

export interface ReconciliationListItem {
  id: string;
  statementStartDate: string | null;
  statementEndDate: string;
  statementEndingBalance: number;
  status: "DRAFT" | "COMPLETED";
  completedAt: string | null;
  completedBy: string | null;
  notes: string | null;
  statementTransactionCount: number;
  matchedCount: number;
}

export interface ReconciliationHistoryItem extends ReconciliationListItem {}

export interface SaveDraftPayload {
  statementStartDate?: string;
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

// ────────────────────────────────────────────────
// Reconciliation API
// ────────────────────────────────────────────────

export const getBookTransactions = async (
  bankAccountId: string,
  params: { startDate?: string; endDate?: string; reconcileId?: string },
): Promise<{ data: ReconciliationBookTx[]; glBalance: number }> => {
  const q = new URLSearchParams();
  if (params.startDate) q.append("startDate", params.startDate);
  if (params.endDate) q.append("endDate", params.endDate);
  if (params.reconcileId) q.append("reconcileId", params.reconcileId);
  return apiClient(`banking/accounts/${bankAccountId}/book-transactions?${q.toString()}`, { method: "GET" });
};

export const listReconciliations = async (
  bankAccountId: string,
  page = 1,
  pageSize = 20,
): Promise<{ data: ReconciliationListItem[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations?page=${page}&pageSize=${pageSize}`, { method: "GET" });

export const getReconciliationById = async (
  bankAccountId: string,
  reconcileId: string,
): Promise<ReconciliationRecord> =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/${reconcileId}`, { method: "GET" });

export const saveReconciliationDraft = async (
  bankAccountId: string,
  reconcileId: string,
  data: SaveDraftPayload,
) =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/${reconcileId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const completeReconciliation = async (
  bankAccountId: string,
  reconcileId: string,
  data: CompleteReconciliationPayload,
) =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/${reconcileId}/complete`, {
    method: "POST",
    body: JSON.stringify(data),
  });

// Legacy — used only for redirect on BankTransactions page
export const getActiveReconciliation = async (bankAccountId: string): Promise<{ draftId: string | null }> =>
  apiClient(`banking/accounts/${bankAccountId}/reconciliations/active`, { method: "GET" });

export const reconcileBankAccount = async (accountId: string, data: any) =>
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
  apiClient("analytics/banking-summary", { method: "GET" });
