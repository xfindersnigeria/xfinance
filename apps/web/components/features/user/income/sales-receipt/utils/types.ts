export interface Receipt {
  id: string;
  customerId: string;
  date: string;
  paymentMethod: 'Cash' | 'Check' | 'CreditCard' | 'BankTransfer' | 'Other';
  items: string[];
  total: number;
  status: 'Complete' | 'Void' | 'Pending';
  entityId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReceiptStats {
  totalReceipts: number;
  totalSales: number;
  todaysSales: number;
  averageReceiptValue: number;
}

export type ReceiptsResponse = {
  receipts: Receipt[];
  stats: ReceiptStats;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
};
