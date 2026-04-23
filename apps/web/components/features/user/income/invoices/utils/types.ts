export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    id: string;
    name: string;
  };
  status: string;
  total: number;
  invoiceDate: string;
  dueDate: string;
}

export interface InvoiceStatsItem {
  count: number;
  total: number;
}

export interface InvoiceStats {
  pending: InvoiceStatsItem;
  sent: InvoiceStatsItem;
  paid: InvoiceStatsItem;
  draft: InvoiceStatsItem;
  overdue: InvoiceStatsItem;
}

export type InvoicesResponse = {
  invoices: Invoice[];
  stats: InvoiceStats;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};

export interface PaidInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  invoiceDate: string;
  dueDate: string;
}

export interface CurrentMonthStats {
  month: string;
  total: number;
  count: number;
}

export type PaidInvoicesResponse = {
  paidInvoices: PaidInvoice[];
  totalPaidAmount: number;
  totalPaidCount: number;
  currentMonthStats: CurrentMonthStats;
  currentMonth: string;
  totalCountFiltered: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};
