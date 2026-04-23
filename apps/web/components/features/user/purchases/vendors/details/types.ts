export interface BillTransaction {
  id: string;
  date: string;
  type: "Bill" | "Payment" | "Credit";
  reference: string;
  description: string;
  amount: number;
  balance: number;
  dueDate?: string;
  status: "Pending" | "Paid" | "Draft" | "Overdue";
}

export interface VendorStats {
  outstandingBalance: number;
  totalBills: number;
  totalPayments: number;
  pendingBills: number;
  transactionsCount: number;
}

export interface VendorProfile {
  id: string;
  vendorId: string; // e.g., VEN-001
  name: string;
  email: string;
  phone: string;
  location: string;
  avatarUrl?: string;
}

// API Response Types
export interface BillApiResponse {
  id: string;
  vendorId: string;
  entityId: string;
  billNumber: string;
  billDate: string;
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

export interface VendorApiResponse {
  id: string;
  type: string;
  name: string;
  displayName: string;
  email: string;
  phone: string;
  companyName: string;
  website: string;
  taxId: string;
  jobTitle: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  paymentTerms: string;
  currency: string;
  entityId: string;
  isActive: boolean;
  country: string;
  createdAt: string;
  updatedAt: string;
  bills?: BillApiResponse[];
}
