export interface Customer {
  id: string;
  type: string;
  name: string;
  email: string;
  phoneNumber: string;
  companyName: string;
  country: string;
  address: string;
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

  isLoading: boolean;
  isError: boolean;
  // add other properties if needed
};
