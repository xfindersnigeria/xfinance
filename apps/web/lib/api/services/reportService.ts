import { apiClient } from "../client";

export interface PLAccountLine {
  id: string;
  name: string;
  code: string;
  actual: number;
  comparison: number;
  budget: number;
}

export interface PLSection {
  actual: number;
  comparison: number;
  budget: number;
  accounts: PLAccountLine[];
}

export interface PLKPIEntry {
  actual: number;
  comparison: number;
}

export interface ProfitAndLossData {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  revenue: PLSection;
  otherIncome: PLSection;
  cogs: PLSection;
  operatingExpenses: PLSection;
  otherExpenses: PLSection;
  grossProfit: PLKPIEntry;
  operatingProfit: PLKPIEntry;
  netProfit: PLKPIEntry;
  kpis: {
    totalRevenue: PLKPIEntry;
    grossProfit: PLKPIEntry;
    operatingProfit: PLKPIEntry;
    netProfit: PLKPIEntry;
  };
}

export interface ProfitAndLossParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export interface CFEntry {
  actual: number;
  comparison: number;
}

export interface CashFlowStatementData {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  operating: {
    netProfit: CFEntry;
    depreciation: CFEntry;
    arChange: CFEntry;
    inventoryChange: CFEntry;
    prepaidChange: CFEntry;
    apChange: CFEntry;
    wagesPayableChange: CFEntry;
    deferredRevenueChange: CFEntry;
    netCash: CFEntry;
  };
  investing: {
    fixedAssetsChange: CFEntry;
    intangibleAssetsChange: CFEntry;
    netCash: CFEntry;
  };
  financing: {
    longTermDebtChange: CFEntry;
    capitalStockChange: CFEntry;
    netCash: CFEntry;
  };
  netCashChange: CFEntry;
  cashAtStart: CFEntry;
  cashAtEnd: CFEntry;
  kpis: {
    operatingCashFlow: CFEntry;
    investingCashFlow: CFEntry;
    financingCashFlow: CFEntry;
    netCashIncrease: CFEntry;
  };
}

export interface CashFlowParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export interface TBAccountLine {
  id: string;
  name: string;
  code: string;
  linkedType: string;
  typeName: string;
  subCategoryName: string;
  openingBalance: number;
  debitAmount: number;
  creditAmount: number;
  closingBalance: number;
}

export interface TBSection {
  typeCode: string;
  typeName: string;
  linkedType: string;
  accounts: TBAccountLine[];
  totalOpeningBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalClosingBalance: number;
}

export interface TrialBalanceData {
  period: { startDate: string; endDate: string };
  sections: TBSection[];
  totalOpeningBalance: number;
  grandTotalDebit: number;
  grandTotalCredit: number;
  totalClosingBalance: number;
  isBalanced: boolean;
  difference: number;
}

export interface TrialBalanceParams {
  startDate: string;
  endDate: string;
}

export const getTrialBalance = async (params: TrialBalanceParams): Promise<TrialBalanceData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<TrialBalanceData>(`reports/trial-balance?${q.toString()}`);
};

export const getCashFlowStatement = async (
  params: CashFlowParams
): Promise<CashFlowStatementData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.compareStartDate) q.append("compareStartDate", params.compareStartDate);
  if (params.compareEndDate) q.append("compareEndDate", params.compareEndDate);
  return apiClient<CashFlowStatementData>(`reports/cash-flow-statement?${q.toString()}`);
};

// ─── Profit & Loss ────────────────────────────────────────────────────────────

export const getProfitAndLoss = async (
  params: ProfitAndLossParams
): Promise<ProfitAndLossData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.compareStartDate) q.append("compareStartDate", params.compareStartDate);
  if (params.compareEndDate) q.append("compareEndDate", params.compareEndDate);
  return apiClient<ProfitAndLossData>(`reports/profit-and-loss?${q.toString()}`);
};
