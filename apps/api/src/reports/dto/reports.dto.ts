export class PLAccountLineDto {
  id: string;
  name: string;
  code: string;
  actual: number;
  comparison: number;
}

export class PLSectionDto {
  actual: number;
  comparison: number;
  accounts: PLAccountLineDto[];
}

export class PLKPIEntryDto {
  actual: number;
  comparison: number;
}

export class PLKPIsDto {
  totalRevenue: PLKPIEntryDto;
  grossProfit: PLKPIEntryDto;
  operatingProfit: PLKPIEntryDto;
  netProfit: PLKPIEntryDto;
}

export class ProfitAndLossDto {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  revenue: PLSectionDto;
  otherIncome: PLSectionDto;
  cogs: PLSectionDto;
  operatingExpenses: PLSectionDto;
  otherExpenses: PLSectionDto;
  grossProfit: PLKPIEntryDto;
  operatingProfit: PLKPIEntryDto;
  netProfit: PLKPIEntryDto;
  kpis: PLKPIsDto;
}

// ─── Cash Flow Statement ──────────────────────────────────────────────────────

export class CFEntryDto {
  actual: number;
  comparison: number;
}

export class CashFlowOperatingDto {
  netProfit: CFEntryDto;
  depreciation: CFEntryDto;
  arChange: CFEntryDto;
  inventoryChange: CFEntryDto;
  prepaidChange: CFEntryDto;
  apChange: CFEntryDto;
  wagesPayableChange: CFEntryDto;
  deferredRevenueChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowInvestingDto {
  fixedAssetsChange: CFEntryDto;
  intangibleAssetsChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowFinancingDto {
  longTermDebtChange: CFEntryDto;
  capitalStockChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowKPIsDto {
  operatingCashFlow: CFEntryDto;
  investingCashFlow: CFEntryDto;
  financingCashFlow: CFEntryDto;
  netCashIncrease: CFEntryDto;
}

export class CashFlowStatementDto {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  operating: CashFlowOperatingDto;
  investing: CashFlowInvestingDto;
  financing: CashFlowFinancingDto;
  netCashChange: CFEntryDto;
  cashAtStart: CFEntryDto;
  cashAtEnd: CFEntryDto;
  kpis: CashFlowKPIsDto;
}
