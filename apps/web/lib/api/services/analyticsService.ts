import { apiClient } from "../client";

export type FilterOption = "THIS_YEAR" | "THIS_FISCAL_YEAR" | "LAST_FISCAL_YEAR" | "LAST_12_MONTHS";

export interface DashboardFilters {
  monthlyFilter?: FilterOption;
  cashFlowFilter?: FilterOption;
  expensesFilter?: FilterOption;
}

export interface KPI {
  mtd?: number;
  count?: number;
  total?: number;
  change: number;
  changePercent: number;
}

export interface KPIs {
  revenue: KPI;
  bankBalance: KPI;
  liabilities: KPI;
  outstandingReceivables: KPI;
}

export interface MonthlyBreakdown {
  month: string;
  revenue: number;
  expenses: number;
}

export interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
}

export interface TopExpense {
  category: string;
  amount: number;
  percentage: number;
}

export interface AgingData {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  type: string;
  debit: number;
  credit: number;
  amount: number;
  status: string;
}

export interface DashboardData {
  kpis: KPIs;
  monthlyBreakdown: MonthlyBreakdown[];
  cashFlow: CashFlowData[];
  topExpenses: TopExpense[];
  receivableAging: AgingData;
  payableAging: AgingData;
  recentTransactions: RecentTransaction[];
}

/**
 * Get all dashboard data in a single call (Recommended)
 */
export const getDashboardData = async (filters?: DashboardFilters): Promise<DashboardData> => {
  const queryParams = new URLSearchParams();

  if (filters?.monthlyFilter) {
    queryParams.append("monthlyFilter", filters.monthlyFilter);
  }
  if (filters?.cashFlowFilter) {
    queryParams.append("cashFlowFilter", filters.cashFlowFilter);
  }
  if (filters?.expensesFilter) {
    queryParams.append("expensesFilter", filters.expensesFilter);
  }

  const queryString = queryParams.toString();
  const url = queryString ? `analytics/dashboard?${queryString}` : "analytics/dashboard";

  return apiClient(url, { method: "GET" });
};

/**
 * Get monthly revenue and expenses for bar chart
 */
export const getMonthlyBreakdown = async (filter?: FilterOption): Promise<MonthlyBreakdown[]> => {
  const queryParams = new URLSearchParams();
  if (filter) queryParams.append("filter", filter);

  const queryString = queryParams.toString();
  const url = queryString ? `analytics/monthly-breakdown?${queryString}` : "analytics/monthly-breakdown";

  return apiClient(url, { method: "GET" });
};

/**
 * Get inflow vs outflow for line chart
 */
export const getCashFlow = async (filter?: FilterOption): Promise<CashFlowData[]> => {
  const queryParams = new URLSearchParams();
  if (filter) queryParams.append("filter", filter);

  const queryString = queryParams.toString();
  const url = queryString ? `analytics/cash-flow?${queryString}` : "analytics/cash-flow";

  return apiClient(url, { method: "GET" });
};

/**
 * Get top expenses by category for pie chart
 */
export const getExpensesByCategory = async (
  filter?: FilterOption,
  limit?: number
): Promise<TopExpense[]> => {
  const queryParams = new URLSearchParams();
  if (filter) queryParams.append("filter", filter);
  if (limit) queryParams.append("limit", limit.toString());

  const queryString = queryParams.toString();
  const url = queryString ? `analytics/expenses/by-category?${queryString}` : "analytics/expenses/by-category";

  return apiClient(url, { method: "GET" });
};

/**
 * Get KPI cards data only
 */
export const getKPIs = async (): Promise<KPIs> => {
  return apiClient("analytics/kpis", { method: "GET" });
};

/**
 * Get AR aging data
 */
export const getReceivableAging = async (): Promise<AgingData> => {
  return apiClient("analytics/receivable-aging", { method: "GET" });
};

/**
 * Get AP aging data
 */
export const getPayableAging = async (): Promise<AgingData> => {
  return apiClient("analytics/payable-aging", { method: "GET" });
};

/**
 * Get recent activity
 */
export const getRecentTransactions = async (): Promise<RecentTransaction[]> => {
  return apiClient("analytics/recent-transactions", { method: "GET" });
};

// ============================================
// ADMIN (GROUP) DASHBOARD
// ============================================

export interface GroupKPIs {
  consolidatedRevenue: { mtd: number; change: number; changePercent: number };
  netProfit: { mtd: number; change: number; changePercent: number };
  bankBalance: { total: number; change: number; changePercent: number };
  liabilities: { total: number; change: number; changePercent: number };
}

export interface MonthlyBreakdownWithProfit {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface EntityPerformance {
  entityId: string;
  entityName: string;
  revenue: number;
}

export interface GroupDashboardData {
  kpis: GroupKPIs;
  monthlyBreakdown: MonthlyBreakdownWithProfit[];
  entityPerformance: EntityPerformance[];
}

export const getGroupDashboard = async (filter?: FilterOption): Promise<GroupDashboardData> => {
  const queryParams = new URLSearchParams();
  if (filter) queryParams.append("filter", filter);
  const queryString = queryParams.toString();
  const url = queryString ? `analytics/group/dashboard?${queryString}` : "analytics/group/dashboard";
  return apiClient(url, { method: "GET" });
};

// ============================================
// SUPERADMIN DASHBOARD
// ============================================

/**
 * Card data with value, growth, and icon
 */
export interface DashboardCard {
  value: number;
  growth: number;
  icon: string;
  currency?: string;
  unit?: string;
}

/**
 * Plan distribution data point
 */
export interface PlanDistributionData {
  name: string;
  value: number;
}

/**
 * Revenue growth data point
 */
export interface RevenueGrowthData {
  month: string;
  revenue: number;
}

/**
 * Subscription growth data point
 */
export interface SubscriptionGrowthData {
  month: string;
  count: number;
}

/**
 * Recent signup data point
 */
export interface RecentSignupData {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  mrr: number;
  plan: string;
  status: string;
}

/**
 * Complete superadmin dashboard response
 */
export interface SuperadminDashboardData {
  cards: {
    totalCompanies: DashboardCard;
    activeUsers: DashboardCard;
    monthlyRevenue: DashboardCard;
    churnRate: DashboardCard;
  };
  planDistribution: PlanDistributionData[];
  revenueGrowth: RevenueGrowthData[];
  subscriptionGrowth: SubscriptionGrowthData[];
  recentSignups: RecentSignupData[];
  timestamp: string;
}

/**
 * Get complete superadmin dashboard data in a single call
 * Includes stat cards, plan distribution, revenue/subscription growth, and recent signups
 * Requires superadmin role
 * Cache: 5 minutes
 */
export const getSuperadminDashboard = async (): Promise<SuperadminDashboardData> => {
  return apiClient<SuperadminDashboardData>("analytics/superadmin/dashboard", {
    method: "GET",
  });
};
