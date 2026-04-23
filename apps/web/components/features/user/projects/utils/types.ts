export interface BurnRateEntry {
  month: string;
  budgeted: number;
  actual: number;
}

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  projectCode?: string;
  description: string;
  customerId: string;
  managerId: string;
  entityId: string;
  groupId: string;
  status: "Planning" | "In_Progress" | "Completed" | "On_Hold";
  startDate: string;
  endDate: string;
  billingType: "Fixed Price" | "Time and Materials" | "Cost Plus";
  currency: "NGN" | "USD" | "EUR" | "GBP";
  budgetedRevenue: number;
  budgetedCost: number;
  createdAt: string;
  updatedAt?: string;
  // relations
  customer?: { id: string; name: string; email: string };
  employee?: { id: string; firstName: string; lastName: string };
  // computed — present on detail endpoint (header stat cards)
  actualRevenue?: number;
  actualCost?: number;
  actualProfit?: number;
  budgetProfit?: number;
  profitMargin?: number;
  progress?: number;
  teamMemberCount?: number;
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  totalBudgetRevenue: number;
  totalBudgetCost: number;
  totalActualRevenue: number;
  totalActualCost: number;
  avgProfitMargin: string;
}

// Legacy alias kept for backwards compat with ProjectsHeader
export type ProjectsResponse = ProjectStats;
