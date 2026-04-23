export class KPIDto {
  revenue?: {
    mtd: number;
    change: number;
    changePercent: number;
  };

  bankBalance?: {
    total: number;
    change: number;
    changePercent: number;
  };

  liabilities?: {
    total: number;
    change: number;
    changePercent: number;
  };

  activeCustomers?: {
    count: number;
    change: number;
    changePercent: number;
  };
}

export class MonthlyDataPointDto {
  month: string;
  revenue: number;
  expenses: number;
}

export class CashFlowDataPointDto {
  month: string;
  inflow: number;
  outflow: number;
}

export class ExpenseCategoryDto {
  category: string;
  categoryId?: string; // Account ID for form population
  amount: number;
  percentage: number;
}

export class AgingBucketDto {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
}

export class RecentTransactionDto {
  id: string;
  date: Date;
  description: string;
  reference: string;
  type: string;
  debit: number;
  credit: number;
  amount: number;
  status: string;
}

export class BankAccountSummaryDto {
  id: string;
  accountName: string;
  bankName: string;
  accountType: string;
  currency: string;
  status: string;
  linkedAccount?: { balance: number };
}

export class BankingSummaryDto {
  totalBankCash: number;
  numberOfBankAccounts: number;
  accounts: BankAccountSummaryDto[];
}

export class DashboardResponseDto {
  kpis: KPIDto;
  monthlyBreakdown: MonthlyDataPointDto[];
  cashFlow: CashFlowDataPointDto[];
  topExpenses: ExpenseCategoryDto[];
  receivableAging: AgingBucketDto;
  payableAging: AgingBucketDto;
  recentTransactions: RecentTransactionDto[];
}

export class GroupKPIDto {
  consolidatedRevenue: { mtd: number; change: number; changePercent: number };
  netProfit: { mtd: number; change: number; changePercent: number };
  bankBalance: { total: number; change: number; changePercent: number };
  liabilities: { total: number; change: number; changePercent: number };
}

export class MonthlyDataPointWithProfitDto {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export class EntityPerformanceDto {
  entityId: string;
  entityName: string;
  revenue: number;
}

export class GroupDashboardResponseDto {
  kpis: GroupKPIDto;
  monthlyBreakdown: MonthlyDataPointWithProfitDto[];
  entityPerformance: EntityPerformanceDto[];
}
