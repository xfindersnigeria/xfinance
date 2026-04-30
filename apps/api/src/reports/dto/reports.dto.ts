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
