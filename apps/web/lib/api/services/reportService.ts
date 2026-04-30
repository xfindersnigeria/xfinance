import { apiClient } from "../client";

export interface PLAccountLine {
  id: string;
  name: string;
  code: string;
  actual: number;
  comparison: number;
}

export interface PLSection {
  actual: number;
  comparison: number;
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

export const getProfitAndLoss = async (
  params: ProfitAndLossParams
): Promise<ProfitAndLossData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.compareStartDate) q.append("compareStartDate", params.compareStartDate);
  if (params.compareEndDate) q.append("compareEndDate", params.compareEndDate);
  return apiClient<ProfitAndLossData>(`reports/profit-and-loss?${q.toString()}`);
};
