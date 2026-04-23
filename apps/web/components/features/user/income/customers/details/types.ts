export interface Transaction {
  id: string;
  date: string;
  type: "Invoice" | "Payment" | "Credit Note";
  reference: string;
  description: string;
  debit?: number;
  credit?: number;
  balance: number;
  status: "Pending" | "Paid" | "Sent" | "Draft" | "Overdue";
}

export interface CustomerStats {
  currentBalance: number;
  totalInvoiced: number;
  totalPaid: number;
  lifetimeValue: number;
  transactionsCount: number;
}

export interface CustomerProfile {
  id: string; // Added ID for actions
  name: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
}

// API Response Types
export interface InvoiceApiResponse {
  id: string;
  customerId: string;
  entityId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  currency: string;
  items: any[];
  total: number;
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerApiResponse {
  id: string;
  type: string;
  name: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  paymentTerms: string;
  creditLimit: string;
  note: string;
  entityId: string;
  isActive: boolean;
  country: string;
  createdAt: string;
  updatedAt: string;
  invoice: InvoiceApiResponse[];
}
