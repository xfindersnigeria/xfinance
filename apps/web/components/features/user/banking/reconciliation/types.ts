export type ReconciliationStatus = "not_started" | "in_progress" | "completed";

export interface StatementTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number; // positive = credit/money in, negative = debit/money out
  category?: string;
  matched: boolean;
  matchedBookId?: string | null;
}

export interface BookTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  amount: number;
  category?: string;
  matched: boolean;
  matchedStatementId?: string | null;
}

export interface ReconciliationSetupValues {
  statementEndingDate: string;
  statementEndingBalance: number;
  accountName: string;
}

export interface ReconciliationSummary {
  statementBalance: number;
  bookBalance: number;
  difference: number;
  matchedCount: number;
  totalItems: number;
}

export interface AddStatementTransactionForm {
  date: string;
  reference?: string;
  description: string;
  transactionType: "credit" | "debit";
  amount: number;
  category?: string;
}

export interface AddBookTransactionForm {
  date: string;
  reference?: string;
  description: string;
  transactionType: "credit" | "debit";
  amount: number;
  payee?: string;
  method?: string;
}
