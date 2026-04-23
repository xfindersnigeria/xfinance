import { z } from "zod";

// Account Categories
export enum AccountCategoryEnum {
  Asset = "Asset",
  Liability = "Liability",
  Equity = "Equity",
  Revenue = "Revenue",
  Expense = "Expense",
}

// Account Sub-Categories
export enum AccountSubCategoryEnum {
  CurrentAsset = "Current Asset",
  FixedAsset = "Fixed Asset",
  IntangibleAsset = "Intangible Asset",
  CurrentLiability = "Current Liability",
  LongTermLiability = "Long-term Liability",
  OwnersCapital = "Owner's Capital",
  RetainedEarnings = "Retained Earnings",
  SalesRevenue = "Sales Revenue",
  ServiceRevenue = "Service Revenue",
  OtherIncome = "Other Income",
  OperatingExpense = "Operating Expense",
  CostOfGoodsSold = "Cost of Goods Sold",
  AdministrativeExpense = "Administrative Expense",
}

// Budget Period Types
export enum BudgetPeriodTypeEnum {
  Monthly = "Monthly",
  Quarterly = "Quarterly",
  Yearly = "Yearly",
  Custom = "Custom",
}

// Account Interface
export interface Account {
  id: string;
  name: string;
  code: string;
  description: string;
  balance: number;
  entityId: string;
  subCategoryId: string;
  createdAt: string;
  updatedAt: string;
  subCategory?: AccountSubCategory;
  typeName?: string;
  categoryName?: string;
  subCategoryName?: string;
  // Legacy fields for backward compatibility
  category?: AccountCategoryEnum;
  type?: string;
  credit?: number;
  debit?: number;
  date?: string;
}

// Account Type (system-wide)
export interface AccountType {
  id: string;
  code: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

// Account Category (group-scoped)
export interface AccountCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  groupId: string;
  typeId: string;
  createdAt: string;
  updatedAt: string;
  subCategories?: AccountSubCategory[];
}

// Account SubCategory (group-scoped)
export interface AccountSubCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  category?: AccountCategory;
  accounts?: Account[];
}

// Budget Interface
export interface Budget {
  id?: string;
  name: string;
  periodType: BudgetPeriodTypeEnum;
  month: string;
  fiscalYear: string;
  note?: string;
  accountId?: string;
  amount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Journal Line Interface
export interface JournalLine {
  account: string;
  debit?: number;
  credit?: number;
  description?: string;
}

// Journal Interface
export interface Journal {
  id: string;
  description: string;
  date: string;
  reference: string;
  entityId: string;
  lines: JournalLine[];
  createdAt: string;
  updatedAt?: string;
}

// Response Types
export interface AccountsResponse {
  data: Account[];
  total?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface JournalResponse {
  data: Journal[];
  total?: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Account Transaction Enums
export enum AccountTransactionTypeEnum {
  BANK = "BANK",
  INVOICE_POSTING = "INVOICE_POSTING",
  PAYMENT_RECEIVED_POSTING = "PAYMENT_RECEIVED_POSTING",
  OPENING_BALANCE = "OPENING_BALANCE",
  MANUAL_ENTRY = "MANUAL_ENTRY",
  JOURNAL_ENTRY = "JOURNAL_ENTRY",
  EXPENSE_POSTING = "EXPENSE_POSTING",
  BILL_POSTING = "BILL_POSTING",
}

export enum TransactionPostingStatusEnum {
  Pending = "Pending",
  Processing = "Processing",
  Success = "Success",
  Failed = "Failed",
}

// Account Transaction Interface
export interface AccountTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: AccountTransactionTypeEnum;
  status: TransactionPostingStatusEnum;
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  entityId?: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
  bankAccountId?: string;
  payee?: string;
  method?: string;
  metadata?: Record<string, any>;
  account?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface AccountTransactionsResponse {
  data: AccountTransaction[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Zod Schemas
export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  // code: z.string().min(1, "Account code is required"),
  categoryId:  z.string().min(1, "Category is required"),
  subCategoryId: z.string().min(1, "Sub-category is required"),
  description: z.string().min(1, "Description is required"),
  // type: z.string().min(1, "Account type is required"),
  // credit: z.number().optional(),
  // debit: z.number().optional(),
  // date: z.string().optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export const updateAccountSchema = createAccountSchema.partial();
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export const createBudgetSchema = z.object({
  name: z.string().min(1, "Budget name is required"),
  periodType: z.nativeEnum(BudgetPeriodTypeEnum),
  month: z.string().min(1, "Month is required"),
  fiscalYear: z.string().min(1, "Fiscal year is required"),
  note: z.string().optional(),
  lines: z.array(
    z.object({
      accountId: z.string().min(1, "Account ID is required"),
      amount: z.number().min(0, "Amount must be positive"),
    })
  ),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

export const createJournalSchema = z.object({
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  entityId: z.string().min(1, "Entity ID is required"),
  status: z.enum(["Draft", "Active"]).optional(),
  lines: z.array(
    z.object({
      accountId: z.string().min(1, "Account ID is required"),
      debit: z.number().optional(),
      credit: z.number().optional(),
      description: z.string().optional(),
    })
  ),
});

export type CreateJournalInput = z.infer<typeof createJournalSchema>;

export const updateJournalSchema = z.object({
  description: z.string().optional(),
  date: z.string().optional(),
  reference: z.string().optional(),
  lines: z.array(
    z.object({
      accountId: z.string(),
      debit: z.number().optional(),
      credit: z.number().optional(),
      description: z.string().optional(),
    })
  ).optional(),
});

export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
