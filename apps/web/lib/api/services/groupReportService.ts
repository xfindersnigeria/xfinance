import { apiClient } from "../client";

// Mirrors apps/api/src/reports/group/*. Every amount is already converted to
// the group base currency (`currency`); `byEntity` is keyed by entity id.

export interface GroupReportEntity {
  id: string;
  name: string;
  currency: string;
  rate: number | null;
  /** false = no exchange rate for its currency, so it is left out of every figure */
  included: boolean;
}

export interface GroupReportMeta {
  currency: { code: string; symbol: string };
  entities: GroupReportEntity[];
  warnings: string[];
  notes: string[];
}

export interface GroupAmount {
  byEntity: Record<string, number>;
  total: number;
  comparison: number;
}

export interface GroupLine extends GroupAmount {
  key: string;
  code: string;
  name: string;
}

export interface GroupSection extends GroupAmount {
  label: string;
  lines: GroupLine[];
}

export interface GroupPeriodParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
}

export interface GroupProfitAndLossData extends GroupReportMeta {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  sections: {
    revenue: GroupSection;
    otherIncome: GroupSection;
    cogs: GroupSection;
    operatingExpenses: GroupSection;
    otherExpenses: GroupSection;
  };
  grossProfit: GroupAmount;
  operatingProfit: GroupAmount;
  netProfit: GroupAmount;
  totalRevenue: GroupAmount;
}

export interface GroupBalanceSheetParams {
  asOfDate: string;
  compareAsOfDate?: string;
}

export interface GroupBalanceSheetData extends GroupReportMeta {
  asOfDate: string;
  compareAsOfDate: string | null;
  assets: { current: GroupSection; nonCurrent: GroupSection; total: GroupAmount };
  liabilities: { current: GroupSection; longTerm: GroupSection; total: GroupAmount };
  equity: { sections: GroupSection[]; retainedEarnings: GroupAmount; total: GroupAmount };
  totalLiabilitiesAndEquity: GroupAmount;
  isBalanced: boolean;
}

export interface GroupCashFlowLine extends GroupAmount {
  key: string;
  label: string;
}

export interface GroupCashFlowData extends GroupReportMeta {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  operating: GroupCashFlowLine[];
  operatingTotal: GroupCashFlowLine;
  investing: GroupCashFlowLine[];
  investingTotal: GroupCashFlowLine;
  financing: GroupCashFlowLine[];
  financingTotal: GroupCashFlowLine;
  netCashChange: GroupCashFlowLine;
  cashAtStart: GroupCashFlowLine;
  cashAtEnd: GroupCashFlowLine;
}

export interface EntityMetrics {
  revenue: number;
  otherIncome: number;
  totalIncome: number;
  cogs: number;
  operatingExpenses: number;
  otherExpenses: number;
  totalExpenses: number;
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  expenseRatio: number | null;
}

export interface EntityComparisonRow {
  id: string;
  name: string;
  currency: string;
  current: EntityMetrics;
  previous: EntityMetrics | null;
  growth: { revenue: number | null; totalExpenses: number | null; netProfit: number | null };
  expenseLines: Array<{ code: string; name: string; section: string; amount: number; comparison: number }>;
}

export interface EntityComparisonData extends GroupReportMeta {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  rows: EntityComparisonRow[];
  totals: {
    revenue: number;
    totalExpenses: number;
    grossProfit: number;
    operatingProfit: number;
    netProfit: number;
    previousRevenue: number | null;
    previousTotalExpenses: number | null;
    previousNetProfit: number | null;
  };
  /** 12 months ending at the period end; byEntity keyed by entity id */
  trend: Array<{ month: string; byEntity: Record<string, { revenue: number; expenses: number; netProfit: number }> }>;
}

export interface GroupForecastBucket {
  month: string;
  label: string;
  openingCash: number;
  inflows: { receivables: number; recurring: number; total: number };
  outflows: { payables: number; recurring: number; total: number };
  net: number;
  closingCash: number;
  closingByEntity: Record<string, number>;
}

export interface GroupCashFlowForecastData extends GroupReportMeta {
  asOfDate: string;
  months: number;
  method: {
    lookbackMonths: number;
    lookbackStart: string;
    lookbackEnd: string;
    avgMonthlyReceipts: number;
    avgMonthlyExpenses: number;
    avgMonthlyPayroll: number;
  } | null;
  summary: {
    currentCash: number;
    totalInflows: number;
    totalOutflows: number;
    netChange: number;
    endingCash: number;
    overdueReceivables: number;
    overduePayables: number;
    lowestCash: number;
    lowestCashMonth: string | null;
    entitiesAtRisk: number;
  };
  inflowBreakdown: { receivables: number; recurring: number };
  outflowBreakdown: { payables: number; recurringExpenses: number; recurringPayroll: number };
  buckets: GroupForecastBucket[];
  /** Per-entity forecast summary (meta `entities` still lists every entity, incl. excluded) */
  entityForecasts: GroupForecastEntitySummary[];
}

export interface GroupForecastEntitySummary {
  id: string;
  name: string;
  currentCash: number;
  totalInflows: number;
  totalOutflows: number;
  endingCash: number;
  lowestCash: number;
  lowestCashMonth: string | null;
  overdueReceivables: number;
  overduePayables: number;
  atRisk: boolean;
}

const qs = (params: Record<string, string | number | undefined>) =>
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");

export const getGroupReportContext = async () => apiClient("reports/group/context", { method: "GET" });

export const getGroupProfitAndLoss = async (params: GroupPeriodParams) =>
  apiClient(`reports/group/profit-and-loss?${qs({ ...params })}`, { method: "GET" });

export const getGroupBalanceSheet = async (params: GroupBalanceSheetParams) =>
  apiClient(`reports/group/balance-sheet?${qs({ ...params })}`, { method: "GET" });

export const getGroupCashFlow = async (params: GroupPeriodParams) =>
  apiClient(`reports/group/cash-flow-statement?${qs({ ...params })}`, { method: "GET" });

export const getGroupCashFlowForecast = async (params: { months: number }) =>
  apiClient(`reports/group/cash-flow-forecast?${qs({ ...params })}`, { method: "GET" });

export const getEntityComparison = async (params: GroupPeriodParams) =>
  apiClient(`reports/group/entity-comparison?${qs({ ...params })}`, { method: "GET" });
