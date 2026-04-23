export interface Customer {
  id: string;
  type: string;
  name: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  country: string;
  address: string;
  invoiceCount: number;
  city: string;
  state: string;
  postalCode: string;
  paymentTerms: string;
  creditLimit: string;
  note: string;
  entityId: string;
  isActive: boolean;
}

export type CustomersResponse = {
  customers: Customer[];
  averageBalance: number;
  outstandingReceivables: number;
  active: number;
  total: number;


  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;

};
