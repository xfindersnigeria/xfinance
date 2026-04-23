// Vendors Types

export interface Vendor {
  id: string;
  name: string;
  type: string;
  displayName: string;
  taxId: string;
  website: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentTerms: string;
  currency: string;
  accountNumber: string;
  creditLimit: string;
  expenseAccount: string;
  bankName: string;
  accountName: string;
  routingNumber: string;
  internalNote: string;
  entityId: string;
  createdAt: string;
}

export interface VendorsResponse {
  vendors: Vendor[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}
