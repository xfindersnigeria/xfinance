// Bills Types

export enum PaymentMethodEnum {
  Cash = 'Cash',
  Check = 'Check',
  CreditCard = 'CreditCard',
  BankTransfer = 'BankTransfer',
  Other = 'Other',
}

export enum BillStatusEnum {
  Pending = 'pending',
  Paid = 'paid',
  Overdue = 'overdue',
}

export interface BillAttachment {
  publicId: string;
  secureUrl: string;
}

export interface Vendor {
  id: string;
  displayName: string;
  email: string;
  phone: string;
}

export interface Bill {
  id: string;
  billDate: string;
  billNumber: string;
  vendorId: string;
  dueDate: string;
  poNumber: string;
  paymentTerms: string;
  items: string[];
  total: number;
  category?: string;
  notes: string;
  attachment: BillAttachment | null;
  vendor?: Vendor;
  status: string;
  entityId: string;
  createdAt: string;
}

export interface BillPayment {
  id: string;
  billId: string;
  paidAt: string;
  paymentMethod: PaymentMethodEnum;
  reference: string;
  account: string;
  note: string;
  vendorName?: string;
  createdAt: string;
}

export interface BillsResponse {
  bills: Bill[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

export interface BillPaymentsResponse {
  payments: BillPayment[];
  total: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}
