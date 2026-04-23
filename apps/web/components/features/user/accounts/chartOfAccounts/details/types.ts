export interface AccountProfile {
  id: string;
  code: string;
  name: string;
  typeName: string;
  categoryName: string;
  description: string;
  balance: number;
  currency?: string;
}

export interface AccountStats {
  currentBalance: number;
  totalDebits: number;
  totalCredits: number;
  currency?: string;
}

export interface AccountApiResponse {
  id: string;
  code: string;
  name: string;
  typeName: string;
  categoryName: string;
  description: string;
  balance: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountsDetailResponse {
  account: AccountApiResponse;
}
