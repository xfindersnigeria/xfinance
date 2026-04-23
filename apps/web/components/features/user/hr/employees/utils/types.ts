export interface Employee {
  id: string;
  type: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  department: string;
  salary: number;
  isActive: boolean;
  dateOfHire: string;
  employeeId: string;
  status: string;
acountType?: string;

  dateOfBirth: string;
  position: string;
  jobTitle?: string;
  employmentType: string;
  emergencyContact?: {
    contactName: string;
    contactPhone: string;
    relationship: string;
  };
  addressInfo?: {
    address: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  routingNumber?: string;
  anualLeave?: number;
  note?: string;
  allowances?: number;
  perFrequency?: string;
  currency?: string;
  profileImage?: {
    publicId: string;
    secureUrl: string;
  };
  reportingManager?: string;

  // add other properties if needed
}

export type CustomersResponse = {
  customers: Employee[];

  isLoading: boolean;
  isError: boolean;
  // add other properties if needed
};
