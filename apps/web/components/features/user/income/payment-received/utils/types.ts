export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
  };
  status: string;
  total: number;
  invoiceDate: string;
  dueDate: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
}

export interface PaymentReceived {
  id: string;
  invoiceId: string;
  invoice?: Invoice & { customer?: Customer };
  amount: number;
  paidAt: string;
  paymentMethod: string;
  depositTo: string;
  reference: string;
  note?: string;
  postingStatus: string;
  totalAmount?: number;
  paidAmount?: number;
  outstanding?: number;
  entityId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PaymentReceivedStats {
  totalRecords: number;
  totalAmount: number;
  averageAmount: number;
  totalPaidInvoices?: number;
  currentMonthPaidTotal?: number;
  totalPartiallyPaidInvoices?: number;
}

export interface Pagination {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export type PaymentReceivedResponse = {
  payments: PaymentReceived[];
  stats: PaymentReceivedStats;
  pagination: Pagination;
};
