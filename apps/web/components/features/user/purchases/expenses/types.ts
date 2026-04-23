// Expenses Types

export enum ExpensePaymentMethodEnum {
  Cash = 'Cash',
  Card = 'Card',
  Transfer = 'Transfer',
  Check = 'Check',
}

export interface ExpenseAttachment {
  publicId: string;
  secureUrl: string;
}

export interface Expense {
  id: string;
  date: string;
  reference: string;
  supplier: string;
  category: string;
  paymentMethod: ExpensePaymentMethodEnum;
  account: string;
  amount: number;
  tax: string;
  description: string;
  tags: string[];
  attachment: ExpenseAttachment | null;
  entityId: string;
  createdAt: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface Vendor {
  id: string;
  displayName: string;
  email: string;
  phone: string;
}
