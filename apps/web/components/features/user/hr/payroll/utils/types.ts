export interface Employee {
  id: string;
  type: string;
  name: string;
  email: string;
  phoneNumber: string;
  department: string;
  salary: number;
  isActive: boolean;
  dateHired: string;
  // add other properties if needed
}

export type CustomersResponse = {
  customers: Employee[];

  isLoading: boolean;
  isError: boolean;
  // add other properties if needed
};
