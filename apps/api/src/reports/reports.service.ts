import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BudgetService } from '@/accounts/budget/budget.service';
import {
  PLAccountLineDto,
  PLSectionDto,
  PLKPIEntryDto,
  ProfitAndLossDto,
  CFEntryDto,
  CashFlowStatementDto,
  TBAccountLineDto,
  TBSectionDto,
  TrialBalanceDto,
  BalanceSheetDto,
  BSSectionDto,
  BSAccountLineDto,
  PerformanceRatiosDto,
  RatioDto,
  SalesByCustomerDto,
  SalesByItemDto,
  InvoiceDetailsDto,
  ReceivableSummaryDto,
  AgedReceivablesDto,
  CustomerBalancesDto,
  PaymentMethodSummaryDto,
  PayableSummaryDto,
  AgedPayablesDto,
  VendorBalancesDto,
  VendorBalanceRowDto,
  ExpenseByCategoryDto,
  ExpenseByVendorDto,
  BillDetailsDto,
  BankReconciliationSummaryDto,
  BankAccountTransactionsDto,
  SuppliesInventoryReportDto,
  SuppliesConsumptionByDeptDto,
  SuppliesConsumptionByProjectDto,
  CashFlowForecastDto,
  CashFlowForecastBucketDto,
  MovementOfEquityDto,
  EquityMovementRowDto,
  SalesTaxSummaryDto,
  SalesTaxRateRowDto,
  SalesTaxTransactionDto,
  TaxLiabilityReportDto,
  TaxLiabilityRowDto,
} from './dto/reports.dto';

// Category codes from the seeded chart of accounts
const CATEGORY_CODES = {
  OPERATING_REVENUE: '4100',
  OTHER_INCOME: '4200',
  COGS: '5100',
  OPERATING_EXPENSES: '5200',
  OTHER_EXPENSES: '5300',
} as const;

type CategoryCode = (typeof CATEGORY_CODES)[keyof typeof CATEGORY_CODES];

interface AccountBucket {
  id: string;
  name: string;
  code: string;
  categoryCode: string;
  typeCode: string;
  totalDebit: number;
  totalCredit: number;
}

type SectionMap = Record<CategoryCode, { accounts: Map<string, AccountBucket>; total: number }>;

/**
 * Invoices and bills can name a customer/vendor that isn't a saved record
 * (free-text customerName / vendorName). Reports group those by name so each
 * typed-in party still gets its own row.
 */
function partyOf(
  id: string | null,
  savedName: string | null | undefined,
  typedName: string | null | undefined,
  fallback: string,
): { key: string; id: string | null; name: string } {
  const name = savedName || typedName?.trim() || fallback;
  return { key: id ?? `name:${name.toLowerCase()}`, id, name };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetService: BudgetService,
  ) {}

  async getProfitAndLoss(
    entityId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): Promise<ProfitAndLossDto> {
    const [actual, comparison, budgetMap] = await Promise.all([
      this.fetchPLSections(entityId, startDate, endDate),
      compareStartDate && compareEndDate
        ? this.fetchPLSections(entityId, compareStartDate, compareEndDate)
        : Promise.resolve(null),
      this.budgetService.resolveBudgetForDateRange(entityId, startDate, endDate),
    ]);

    return this.buildResponse(
      actual,
      comparison,
      budgetMap,
      startDate,
      endDate,
      compareStartDate,
      compareEndDate,
    );
  }

  // ─── Private: fetch & bucket transactions by account/category ────────────────

  private async fetchPLSections(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SectionMap> {
    const sections: SectionMap = {
      [CATEGORY_CODES.OPERATING_REVENUE]: { accounts: new Map(), total: 0 },
      [CATEGORY_CODES.OTHER_INCOME]: { accounts: new Map(), total: 0 },
      [CATEGORY_CODES.COGS]: { accounts: new Map(), total: 0 },
      [CATEGORY_CODES.OPERATING_EXPENSES]: { accounts: new Map(), total: 0 },
      [CATEGORY_CODES.OTHER_EXPENSES]: { accounts: new Map(), total: 0 },
    };

    const txns = await this.prisma.accountTransaction.findMany({
      where: {
        entityId,
        status: { not: 'Failed' } as any,
        date: { gte: startDate, lte: endDate },
        account: {
          subCategory: {
            category: {
              type: { code: { in: ['4000', '5000'] } },
            },
          },
        },
      },
      select: {
        debitAmount: true,
        creditAmount: true,
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            subCategory: {
              select: {
                category: {
                  select: {
                    code: true,
                    type: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const tx of txns) {
      const acc = tx.account;
      const categoryCode = acc.subCategory.category.code as CategoryCode;
      const typeCode = acc.subCategory.category.type.code;
      const section = sections[categoryCode];
      if (!section) continue;

      const existing = section.accounts.get(acc.id);
      if (existing) {
        existing.totalDebit += tx.debitAmount;
        existing.totalCredit += tx.creditAmount;
      } else {
        section.accounts.set(acc.id, {
          id: acc.id,
          name: acc.name,
          code: acc.code,
          categoryCode,
          typeCode,
          totalDebit: tx.debitAmount,
          totalCredit: tx.creditAmount,
        });
      }
    }

    // Calculate net per account and accumulate section totals
    for (const [, section] of Object.entries(sections)) {
      let sectionTotal = 0;
      for (const acc of section.accounts.values()) {
        // Revenue accounts: credit side increases balance → net = credit - debit
        // Expense accounts: debit side increases balance → net = debit - credit
        const net =
          acc.typeCode === '4000'
            ? acc.totalCredit - acc.totalDebit
            : acc.totalDebit - acc.totalCredit;
        (acc as any).net = net;
        sectionTotal += net;
      }
      section.total = sectionTotal;
    }

    return sections;
  }

  // ─── Private: merge actual + comparison into response ─────────────────────────

  private buildSection(
    actualSection: SectionMap[CategoryCode],
    compSection: SectionMap[CategoryCode] | undefined,
    budgetMap: Map<string, number>,
  ): PLSectionDto {
    const merged = new Map<string, PLAccountLineDto>();

    for (const acc of actualSection.accounts.values()) {
      merged.set(acc.id, {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        actual: (acc as any).net ?? 0,
        comparison: 0,
        budget: budgetMap.get(acc.id) ?? 0,
      });
    }

    if (compSection) {
      for (const acc of compSection.accounts.values()) {
        const net = (acc as any).net ?? 0;
        const existing = merged.get(acc.id);
        if (existing) {
          existing.comparison = net;
        } else {
          merged.set(acc.id, {
            id: acc.id,
            name: acc.name,
            code: acc.code,
            actual: 0,
            comparison: net,
            budget: budgetMap.get(acc.id) ?? 0,
          });
        }
      }
    }

    // Also include accounts that have a budget but no transactions this period
    for (const [accountId, budgetAmt] of budgetMap) {
      if (!merged.has(accountId)) {
        // We need the account name/code — skip if not in transactions
        // (they'll appear once they have activity)
      }
    }

    const accounts = Array.from(merged.values()).sort((a, b) => b.actual - a.actual);
    const sectionBudget = accounts.reduce((sum, a) => sum + a.budget, 0);

    return {
      actual: actualSection.total,
      comparison: compSection?.total ?? 0,
      budget: sectionBudget,
      accounts,
    };
  }

  private buildResponse(
    actual: SectionMap,
    comparison: SectionMap | null,
    budgetMap: Map<string, number>,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): ProfitAndLossDto {
    const revenue = this.buildSection(
      actual[CATEGORY_CODES.OPERATING_REVENUE],
      comparison?.[CATEGORY_CODES.OPERATING_REVENUE],
      budgetMap,
    );
    const otherIncome = this.buildSection(
      actual[CATEGORY_CODES.OTHER_INCOME],
      comparison?.[CATEGORY_CODES.OTHER_INCOME],
      budgetMap,
    );
    const cogs = this.buildSection(
      actual[CATEGORY_CODES.COGS],
      comparison?.[CATEGORY_CODES.COGS],
      budgetMap,
    );
    const operatingExpenses = this.buildSection(
      actual[CATEGORY_CODES.OPERATING_EXPENSES],
      comparison?.[CATEGORY_CODES.OPERATING_EXPENSES],
      budgetMap,
    );
    const otherExpenses = this.buildSection(
      actual[CATEGORY_CODES.OTHER_EXPENSES],
      comparison?.[CATEGORY_CODES.OTHER_EXPENSES],
      budgetMap,
    );

    const kpi = (actual: number, comparison: number): PLKPIEntryDto => ({
      actual,
      comparison,
    });

    const grossProfit = kpi(
      revenue.actual - cogs.actual,
      revenue.comparison - cogs.comparison,
    );
    const operatingProfit = kpi(
      grossProfit.actual - operatingExpenses.actual,
      grossProfit.comparison - operatingExpenses.comparison,
    );
    const netProfit = kpi(
      operatingProfit.actual + otherIncome.actual - otherExpenses.actual,
      operatingProfit.comparison + otherIncome.comparison - otherExpenses.comparison,
    );

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      comparePeriod:
        compareStartDate && compareEndDate
          ? { startDate: compareStartDate.toISOString(), endDate: compareEndDate.toISOString() }
          : null,
      revenue,
      otherIncome,
      cogs,
      operatingExpenses,
      otherExpenses,
      grossProfit,
      operatingProfit,
      netProfit,
      kpis: {
        totalRevenue: kpi(revenue.actual, revenue.comparison),
        grossProfit,
        operatingProfit,
        netProfit,
      },
    };
  }

  // ─── Cash Flow Statement ──────────────────────────────────────────────────────

  async getCashFlowStatement(
    entityId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): Promise<CashFlowStatementDto> {
    const [actual, comparison] = await Promise.all([
      this.fetchCFData(entityId, startDate, endDate),
      compareStartDate && compareEndDate
        ? this.fetchCFData(entityId, compareStartDate, compareEndDate)
        : Promise.resolve(null),
    ]);

    return this.buildCFResponse(
      actual,
      comparison,
      startDate,
      endDate,
      compareStartDate,
      compareEndDate,
    );
  }

  /**
   * Fetches all data needed for one period of the cash flow statement.
   * Uses 3 queries:
   *  1. All entity accounts with their full category hierarchy
   *  2. All transactions strictly before startDate (for opening balances)
   *  3. All transactions in the period startDate–endDate (for net profit, depreciation, closing delta)
   */
  private async fetchCFData(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // ── 1. Account metadata ──────────────────────────────────────────────────
    const accounts = await this.prisma.account.findMany({
      where: { entityId },
      select: {
        id: true,
        subCategory: {
          select: {
            code: true,
            category: {
              select: {
                code: true,
                type: { select: { code: true } },
              },
            },
          },
        },
      },
    });

    // Build lookup: accountId → { subcatCode, catCode, typeCode }
    const accountMeta = new Map<
      string,
      { subcatCode: string; catCode: string; typeCode: string }
    >();
    for (const a of accounts) {
      accountMeta.set(a.id, {
        subcatCode: a.subCategory.code,
        catCode: a.subCategory.category.code,
        typeCode: a.subCategory.category.type.code,
      });
    }

    // ── 2. Opening transactions (before startDate) ───────────────────────────
    const openingTxns = await this.prisma.accountTransaction.findMany({
      where: {
        entityId,
        date: { lt: startDate },
        status: { not: 'Failed' } as any,
      },
      select: { accountId: true, debitAmount: true, creditAmount: true },
    });

    // ── 3. Period transactions (startDate → endDate) ─────────────────────────
    const periodTxns = await this.prisma.accountTransaction.findMany({
      where: {
        entityId,
        date: { gte: startDate, lte: endDate },
        status: { not: 'Failed' } as any,
      },
      select: { accountId: true, debitAmount: true, creditAmount: true },
    });

    // ── Helper: sum debit/credit for a set of account IDs ───────────────────
    const sumTxns = (
      txns: { accountId: string; debitAmount: number; creditAmount: number }[],
      ids: Set<string>,
    ) => {
      let debit = 0;
      let credit = 0;
      for (const tx of txns) {
        if (ids.has(tx.accountId)) {
          debit += tx.debitAmount;
          credit += tx.creditAmount;
        }
      }
      return { debit, credit };
    };

    // ── Build account ID sets per group ──────────────────────────────────────
    const group = (
      filter: (meta: { subcatCode: string; catCode: string; typeCode: string }) => boolean,
    ): Set<string> => {
      const ids = new Set<string>();
      for (const [id, meta] of accountMeta) {
        if (filter(meta)) ids.add(id);
      }
      return ids;
    };

    const revenueIds   = group((m) => m.typeCode === '4000');
    const expenseIds   = group((m) => m.typeCode === '5000');
    const deprIds      = group((m) => m.subcatCode === '5260');
    const cashIds      = group((m) => m.subcatCode === '1110');
    const arIds        = group((m) => m.subcatCode === '1120');
    const inventoryIds = group((m) => m.subcatCode === '1130');
    const prepaidIds   = group((m) => m.subcatCode === '1140');
    const apIds        = group((m) => m.subcatCode === '2110');
    const wagesIds     = group((m) => m.subcatCode === '2120');
    const deferredIds  = group((m) => m.subcatCode === '2150');
    const fixedIds     = group((m) => m.catCode === '1200');
    const intangIds    = group((m) => m.catCode === '1300');
    const ltDebtIds    = group((m) => m.catCode === '2200');
    const equityIds    = group((m) => m.subcatCode === '3110');

    // ── Net profit ───────────────────────────────────────────────────────────
    const revP  = sumTxns(periodTxns, revenueIds);
    const expP  = sumTxns(periodTxns, expenseIds);
    const revenue  = revP.credit - revP.debit;
    const expenses = expP.debit - expP.credit;
    const netProfit = revenue - expenses;

    // ── Depreciation add-back ────────────────────────────────────────────────
    const deprP = sumTxns(periodTxns, deprIds);
    const depreciation = deprP.debit - deprP.credit; // debit-normal expense account

    // ── Balance helpers ──────────────────────────────────────────────────────
    // Asset accounts: balance = debit - credit  (debit increases)
    // Liability/Equity: balance = credit - debit (credit increases)
    const openingBalance = (ids: Set<string>, isAsset: boolean) => {
      const { debit, credit } = sumTxns(openingTxns, ids);
      return isAsset ? debit - credit : credit - debit;
    };
    const closingBalance = (ids: Set<string>, isAsset: boolean) => {
      const opn = sumTxns(openingTxns, ids);
      const per = sumTxns(periodTxns, ids);
      const d = opn.debit + per.debit;
      const c = opn.credit + per.credit;
      return isAsset ? d - c : c - d;
    };
    const change = (ids: Set<string>, isAsset: boolean) =>
      closingBalance(ids, isAsset) - openingBalance(ids, isAsset);

    // Working capital changes → cash flow sign convention:
    //   AR increased → use of cash (negative)
    //   AP increased → source of cash (positive, already handled by sign of liability change)
    const arChange        = -(change(arIds, true));
    const inventoryChange = -(change(inventoryIds, true));
    const prepaidChange   = -(change(prepaidIds, true));
    const apChange        = change(apIds, false);      // liability: increase = positive CF
    const wagesChange     = change(wagesIds, false);
    const deferredChange  = change(deferredIds, false);

    // Investing: net change in non-current assets (increase = outflow = negative CF)
    const fixedChange    = -(change(fixedIds, true));
    const intangChange   = -(change(intangIds, true));

    // Financing: net change in LT debt + capital stock (increase = inflow = positive CF)
    const ltDebtChange   = change(ltDebtIds, false);
    const equityChange   = change(equityIds, false);

    // Cash positions
    const cashStart = openingBalance(cashIds, true);
    const cashEnd   = closingBalance(cashIds, true);

    const netOperating =
      netProfit + depreciation + arChange + inventoryChange +
      prepaidChange + apChange + wagesChange + deferredChange;
    const netInvesting  = fixedChange + intangChange;
    const netFinancing  = ltDebtChange + equityChange;
    const netCashChange = cashEnd - cashStart;

    return {
      netProfit,
      depreciation,
      arChange,
      inventoryChange,
      prepaidChange,
      apChange,
      wagesChange,
      deferredChange,
      netOperating,
      fixedChange,
      intangChange,
      netInvesting,
      ltDebtChange,
      equityChange,
      netFinancing,
      netCashChange,
      cashStart,
      cashEnd,
    };
  }

  private buildCFResponse(
    a: ReturnType<ReportsService['fetchCFData']> extends Promise<infer T> ? T : never,
    b: (ReturnType<ReportsService['fetchCFData']> extends Promise<infer T> ? T : never) | null,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): CashFlowStatementDto {
    const entry = (actual: number, comparison: number): CFEntryDto => ({
      actual,
      comparison,
    });
    const c = (field: keyof typeof a) =>
      entry(a[field] as number, b ? (b[field] as number) : 0);

    const operating = {
      netProfit:            c('netProfit'),
      depreciation:         c('depreciation'),
      arChange:             c('arChange'),
      inventoryChange:      c('inventoryChange'),
      prepaidChange:        c('prepaidChange'),
      apChange:             c('apChange'),
      wagesPayableChange:   c('wagesChange'),
      deferredRevenueChange: c('deferredChange'),
      netCash:              c('netOperating'),
    };
    const investing = {
      fixedAssetsChange:    c('fixedChange'),
      intangibleAssetsChange: c('intangChange'),
      netCash:              c('netInvesting'),
    };
    const financing = {
      longTermDebtChange:  c('ltDebtChange'),
      capitalStockChange:  c('equityChange'),
      netCash:             c('netFinancing'),
    };

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      comparePeriod:
        compareStartDate && compareEndDate
          ? { startDate: compareStartDate.toISOString(), endDate: compareEndDate.toISOString() }
          : null,
      operating,
      investing,
      financing,
      netCashChange: c('netCashChange'),
      cashAtStart:   c('cashStart'),
      cashAtEnd:     c('cashEnd'),
      kpis: {
        operatingCashFlow: c('netOperating'),
        investingCashFlow: c('netInvesting'),
        financingCashFlow: c('netFinancing'),
        netCashIncrease:   c('netCashChange'),
      },
    };
  }

  // ─── Trial Balance ────────────────────────────────────────────────────────────

  async getTrialBalance(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TrialBalanceDto> {
    const TYPE_ORDER = ['1000', '2000', '3000', '4000', '5000'];

    // 1. All accounts for this entity with full category hierarchy
    const accounts = await this.prisma.account.findMany({
      where: { entityId },
      select: {
        id: true,
        name: true,
        code: true,
        linkedType: true,
        subCategory: {
          select: {
            name: true,
            category: {
              select: {
                type: { select: { code: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // 2. Pre-period aggregates — opening balance
    const preAggs = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: {
        entityId,
        status: { not: 'Failed' as any },
        date: { lt: startDate },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    // 3. In-period aggregates
    const periodAggs = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: {
        entityId,
        status: { not: 'Failed' as any },
        date: { gte: startDate, lte: endDate },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const preMap = new Map<string, { debit: number; credit: number }>();
    for (const a of preAggs) preMap.set(a.accountId, { debit: a._sum.debitAmount ?? 0, credit: a._sum.creditAmount ?? 0 });

    const periodMap = new Map<string, { debit: number; credit: number }>();
    for (const a of periodAggs) periodMap.set(a.accountId, { debit: a._sum.debitAmount ?? 0, credit: a._sum.creditAmount ?? 0 });

    // 4. Build per-account lines grouped by AccountType code
    const sectionMap = new Map<string, { typeCode: string; typeName: string; linkedType: string; accounts: TBAccountLineDto[] }>();

    for (const acc of accounts) {
      const typeCode = acc.subCategory.category.type.code;
      const typeName = acc.subCategory.category.type.name;
      const linkedType = ['1000', '2000', '3000'].includes(typeCode) ? 'SPP' : 'PAL';

      if (!sectionMap.has(typeCode)) sectionMap.set(typeCode, { typeCode, typeName, linkedType, accounts: [] });

      const pre = preMap.get(acc.id) ?? { debit: 0, credit: 0 };
      const period = periodMap.get(acc.id) ?? { debit: 0, credit: 0 };
      const openingBalance = pre.debit - pre.credit;
      const closingBalance = openingBalance + period.debit - period.credit;

      sectionMap.get(typeCode)!.accounts.push({
        id: acc.id,
        name: acc.name,
        code: acc.code,
        linkedType,
        typeName,
        subCategoryName: acc.subCategory.name,
        openingBalance,
        debitAmount: period.debit,
        creditAmount: period.credit,
        closingBalance,
      });
    }

    // 5. Assemble sections in standard order
    const sections: TBSectionDto[] = TYPE_ORDER
      .filter((code) => sectionMap.has(code))
      .map((code) => {
        const sec = sectionMap.get(code)!;
        const totalOpeningBalance = sec.accounts.reduce((s, a) => s + a.openingBalance, 0);
        const totalDebit = sec.accounts.reduce((s, a) => s + a.debitAmount, 0);
        const totalCredit = sec.accounts.reduce((s, a) => s + a.creditAmount, 0);
        const totalClosingBalance = sec.accounts.reduce((s, a) => s + a.closingBalance, 0);
        return { typeCode: sec.typeCode, typeName: sec.typeName, linkedType: sec.linkedType, accounts: sec.accounts, totalOpeningBalance, totalDebit, totalCredit, totalClosingBalance };
      });

    // 6. Grand totals
    const totalOpeningBalance = sections.reduce((s, sec) => s + sec.totalOpeningBalance, 0);
    const grandTotalDebit = sections.reduce((s, sec) => s + sec.totalDebit, 0);
    const grandTotalCredit = sections.reduce((s, sec) => s + sec.totalCredit, 0);
    const totalClosingBalance = sections.reduce((s, sec) => s + sec.totalClosingBalance, 0);
    const difference = Math.abs(grandTotalDebit - grandTotalCredit);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      sections,
      totalOpeningBalance,
      grandTotalDebit,
      grandTotalCredit,
      totalClosingBalance,
      isBalanced: difference < 1,
      difference,
    };
  }

  // ─── Balance Sheet ────────────────────────────────────────────────────────────

  async getBalanceSheet(
    entityId: string,
    asOfDate: Date,
    compareAsOfDate?: Date,
  ): Promise<BalanceSheetDto> {
    const [actual, comparison] = await Promise.all([
      this.fetchBalanceSheetData(entityId, asOfDate),
      compareAsOfDate ? this.fetchBalanceSheetData(entityId, compareAsOfDate) : Promise.resolve(null),
    ]);
    return this.buildBalanceSheetResponse(actual, comparison, asOfDate, compareAsOfDate);
  }

  private async fetchBalanceSheetData(entityId: string, asOfDate: Date) {
    const accounts = await this.prisma.account.findMany({
      where: { entityId },
      select: {
        id: true, name: true, code: true,
        subCategory: {
          select: {
            code: true,
            category: { select: { code: true, name: true, type: { select: { code: true } } } },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    const txnAggs = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: { entityId, status: { not: 'Failed' as any }, date: { lte: asOfDate } },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const balanceMap = new Map<string, number>();
    for (const a of txnAggs) {
      balanceMap.set(a.accountId, (a._sum.debitAmount ?? 0) - (a._sum.creditAmount ?? 0));
    }

    return { accounts, balanceMap };
  }

  private buildBalanceSheetResponse(
    actual: Awaited<ReturnType<ReportsService['fetchBalanceSheetData']>>,
    comparison: Awaited<ReturnType<ReportsService['fetchBalanceSheetData']>> | null,
    asOfDate: Date,
    compareAsOfDate?: Date,
  ): BalanceSheetDto {
    const getBalance = (data: typeof actual, accountId: string, typeCode: string) => {
      const raw = data.balanceMap.get(accountId) ?? 0;
      // Assets: debit-normal (debit - credit = positive balance)
      // Liabilities & Equity: credit-normal (credit - debit = positive balance → negate raw)
      return typeCode === '1000' ? raw : -raw;
    };

    const buildSection = (
      label: string,
      catCodePrefix: string,
      typeCode: string,
      data: typeof actual,
      compData: typeof actual | null,
    ): BSSectionDto => {
      const accs = data.accounts.filter(
        (a) => a.subCategory.category.code.startsWith(catCodePrefix) &&
                a.subCategory.category.type.code === typeCode,
      );
      const accounts: BSAccountLineDto[] = accs.map((a) => ({
        id: a.id, name: a.name, code: a.code,
        balance: getBalance(data, a.id, typeCode),
        comparison: compData ? getBalance(compData, a.id, typeCode) : 0,
      }));
      return {
        label,
        accounts,
        total: accounts.reduce((s, a) => s + a.balance, 0),
        comparison: accounts.reduce((s, a) => s + a.comparison, 0),
      };
    };

    const currentAssets    = buildSection('Current Assets',     '11', '1000', actual, comparison);
    const nonCurrentAssets = buildSection('Non-Current Assets', '12', '1000', actual, comparison);
    const intangAssets     = buildSection('Intangible Assets',  '13', '1000', actual, comparison);
    // Merge non-current + intangible into one non-current section
    const nonCurrentMerged: BSSectionDto = {
      label: 'Non-Current Assets',
      accounts: [...nonCurrentAssets.accounts, ...intangAssets.accounts],
      total: nonCurrentAssets.total + intangAssets.total,
      comparison: nonCurrentAssets.comparison + intangAssets.comparison,
    };

    const currentLiabilities  = buildSection('Current Liabilities',   '21', '2000', actual, comparison);
    const longTermLiabilities  = buildSection('Long-Term Liabilities', '22', '2000', actual, comparison);
    const equitySection        = buildSection('Equity',                '3',  '3000', actual, comparison);

    // Retained earnings = cumulative revenue - cumulative expenses to asOfDate
    const revAggs = this.computeRetainedEarnings(actual, comparison);
    const retainedEarnings = revAggs.actual;
    const retainedEarningsComparison = revAggs.comparison;

    const totalAssets = currentAssets.total + nonCurrentMerged.total;
    const totalAssetsComp = currentAssets.comparison + nonCurrentMerged.comparison;
    const totalLiabilities = currentLiabilities.total + longTermLiabilities.total;
    const totalLiabilitiesComp = currentLiabilities.comparison + longTermLiabilities.comparison;
    const totalEquity = equitySection.total + retainedEarnings;
    const totalEquityComp = equitySection.comparison + retainedEarningsComparison;
    const totalLE = totalLiabilities + totalEquity;
    const totalLEComp = totalLiabilitiesComp + totalEquityComp;

    return {
      asOfDate: asOfDate.toISOString(),
      compareAsOfDate: compareAsOfDate?.toISOString() ?? null,
      assets: { current: currentAssets, nonCurrent: nonCurrentMerged, total: totalAssets, comparison: totalAssetsComp },
      liabilities: { current: currentLiabilities, longTerm: longTermLiabilities, total: totalLiabilities, comparison: totalLiabilitiesComp },
      equity: { sections: [equitySection], retainedEarnings, retainedEarningsComparison, total: totalEquity, comparison: totalEquityComp },
      totalLiabilitiesAndEquity: totalLE,
      totalLiabilitiesAndEquityComparison: totalLEComp,
      isBalanced: Math.abs(totalAssets - totalLE) < 1,
    };
  }

  private computeRetainedEarnings(
    actual: Awaited<ReturnType<ReportsService['fetchBalanceSheetData']>>,
    comparison: Awaited<ReturnType<ReportsService['fetchBalanceSheetData']>> | null,
  ) {
    // Revenue accounts: credit-normal → net = credit - debit (positive = income)
    // Expense accounts: debit-normal → net = debit - credit (positive = expense)
    // Retained earnings = sum of revenue net - sum of expense net
    const revenueIds = new Set(actual.accounts.filter(a => a.subCategory.category.type.code === '4000').map(a => a.id));
    const expenseIds = new Set(actual.accounts.filter(a => a.subCategory.category.type.code === '5000').map(a => a.id));

    let revActual = 0, expActual = 0, revComp = 0, expComp = 0;
    for (const [id, rawBal] of actual.balanceMap) {
      if (revenueIds.has(id)) revActual += -rawBal; // credit-normal: negate debit-credit
      if (expenseIds.has(id)) expActual += rawBal;   // debit-normal
    }
    if (comparison) {
      for (const [id, rawBal] of comparison.balanceMap) {
        if (revenueIds.has(id)) revComp += -rawBal;
        if (expenseIds.has(id)) expComp += rawBal;
      }
    }
    return { actual: revActual - expActual, comparison: revComp - expComp };
  }

  // ─── Business Performance Ratios ─────────────────────────────────────────────

  async getPerformanceRatios(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PerformanceRatiosDto> {
    const [bs, pl] = await Promise.all([
      this.getBalanceSheet(entityId, endDate),
      this.getProfitAndLoss(entityId, startDate, endDate),
    ]);

    const totalAssets      = bs.assets.total;
    const currentAssets    = bs.assets.current.total;
    const nonCurrentAssets = bs.assets.nonCurrent.total;
    const currentLiabilities = bs.liabilities.current.total;
    const totalLiabilities = bs.liabilities.total;
    const totalEquity      = bs.equity.total;
    const revenue          = pl.revenue.actual + pl.otherIncome.actual;
    const grossProfit      = pl.grossProfit.actual;
    const operatingProfit  = pl.operatingProfit.actual;
    const netProfit        = pl.netProfit.actual;

    // Approximate inventory from balance sheet current assets accounts (subcat 1130)
    const inventoryBalance = bs.assets.current.accounts
      .filter(a => a.code?.startsWith('1130') || a.name?.toLowerCase().includes('inventor'))
      .reduce((s, a) => s + a.balance, 0);

    const arBalance = bs.assets.current.accounts
      .filter(a => a.code?.startsWith('1120') || a.name?.toLowerCase().includes('receivable'))
      .reduce((s, a) => s + a.balance, 0);

    const safe = (n: number, d: number): number | null => (d === 0 ? null : Math.round((n / d) * 100) / 100);
    const pct  = (n: number, d: number): number | null => (d === 0 ? null : Math.round((n / d) * 10000) / 100);

    const cashBalance = bs.assets.current.accounts
      .filter(a => a.code?.startsWith('1110') || a.name?.toLowerCase().includes('cash'))
      .reduce((s, a) => s + a.balance, 0);

    const cogs = pl.cogs?.actual ?? (revenue - grossProfit);

    // Higher-is-better: excellent ≥ excellent_thresh, good ≥ good_thresh, warning ≥ warn_thresh
    const clsHigh = (v: number | null, ex: number, good: number, warn: number): RatioDto['status'] => {
      if (v === null) return 'neutral';
      if (v >= ex)   return 'excellent';
      if (v >= good) return 'good';
      if (v >= warn) return 'warning';
      return 'poor';
    };
    // Lower-is-better: excellent ≤ excellent_thresh
    const clsLow = (v: number | null, ex: number, good: number, warn: number): RatioDto['status'] => {
      if (v === null) return 'neutral';
      if (v <= ex)   return 'excellent';
      if (v <= good) return 'good';
      if (v <= warn) return 'warning';
      return 'poor';
    };

    const rtVal   = safe(revenue, arBalance); // receivables turnover value (reused for DSO)
    const dsoVal  = rtVal ? Math.round(365 / rtVal * 100) / 100 : null;

    const ratios: RatioDto[] = [
      // ── Profitability ───────────────────────────────────────────────────────
      {
        key: 'grossMargin', name: 'Gross Profit Margin',
        value: pct(grossProfit, revenue),
        description: 'Revenue minus cost of goods sold, as a percentage of revenue',
        interpretation: 'Revenue remaining after direct costs. Higher is better.',
        status: clsHigh(pct(grossProfit, revenue), 50, 40, 20),
      },
      {
        key: 'netMargin', name: 'Net Profit Margin',
        value: pct(netProfit, revenue),
        description: 'Net profit as a percentage of revenue',
        interpretation: 'Bottom-line profitability after all costs.',
        status: clsHigh(pct(netProfit, revenue), 15, 10, 0),
      },
      {
        key: 'operatingMargin', name: 'Operating Margin %',
        value: pct(operatingProfit, revenue),
        description: 'Operating Profit ÷ Revenue × 100',
        interpretation: 'Profitability from core operations.',
        status: clsHigh(pct(operatingProfit, revenue), 20, 15, 0),
      },
      {
        key: 'roa', name: 'Return on Assets (ROA)',
        value: pct(netProfit, totalAssets),
        description: 'Net income as a percentage of total assets',
        interpretation: 'How efficiently assets generate profit.',
        status: clsHigh(pct(netProfit, totalAssets), 10, 5, 0),
      },
      {
        key: 'roe', name: 'Return on Equity (ROE)',
        value: pct(netProfit, totalEquity),
        description: 'Net income as a percentage of shareholder equity',
        interpretation: 'Returns generated on shareholders\' equity.',
        status: clsHigh(pct(netProfit, totalEquity), 20, 15, 0),
      },
      // ── Liquidity ───────────────────────────────────────────────────────────
      {
        key: 'currentRatio', name: 'Current Ratio',
        value: safe(currentAssets, currentLiabilities),
        description: 'Current assets divided by current liabilities',
        interpretation: 'Ability to cover short-term obligations. >1.5 is healthy.',
        status: clsHigh(safe(currentAssets, currentLiabilities), 2.5, 1.5, 1.0),
      },
      {
        key: 'quickRatio', name: 'Quick Ratio',
        value: safe(currentAssets - inventoryBalance, currentLiabilities),
        description: 'Quick assets divided by current liabilities',
        interpretation: 'Liquidity excluding inventory. >1.0 is healthy.',
        status: clsHigh(safe(currentAssets - inventoryBalance, currentLiabilities), 1.5, 1.0, 0.7),
      },
      {
        key: 'cashRatio', name: 'Cash Ratio',
        value: safe(cashBalance, currentLiabilities),
        description: 'Cash and cash equivalents divided by current liabilities',
        interpretation: 'Strictest liquidity measure. >0.5 is healthy.',
        status: clsHigh(safe(cashBalance, currentLiabilities), 0.75, 0.5, 0.2),
      },
      {
        key: 'workingCapital', name: 'Working Capital',
        value: currentAssets - currentLiabilities,
        description: 'Current assets minus current liabilities',
        interpretation: 'Positive working capital means the company can cover short-term liabilities.',
        status: (currentAssets - currentLiabilities) > 0 ? 'good' : 'poor',
      },
      // ── Efficiency ──────────────────────────────────────────────────────────
      {
        key: 'assetTurnover', name: 'Asset Turnover',
        value: safe(revenue, totalAssets),
        description: 'Revenue divided by total assets',
        interpretation: 'Revenue generated per unit of assets. Higher is better.',
        status: clsHigh(safe(revenue, totalAssets), 1.5, 1.2, 0.8),
      },
      {
        key: 'inventoryTurnover', name: 'Inventory Turnover',
        value: safe(cogs, inventoryBalance),
        description: 'Cost of goods sold divided by average inventory',
        interpretation: 'How quickly inventory is sold. Higher is generally better.',
        status: clsHigh(safe(cogs, inventoryBalance), 8, 6, 3),
      },
      {
        key: 'receivablesTurnover', name: 'Receivables Turnover',
        value: rtVal,
        description: 'Revenue divided by average accounts receivable',
        interpretation: 'How quickly receivables are collected. Higher is better.',
        status: clsHigh(rtVal, 10, 6, 3),
      },
      {
        key: 'daysSalesOutstanding', name: 'Days Sales Outstanding',
        value: dsoVal,
        description: 'Average number of days to collect receivables',
        interpretation: 'Lower is better — faster collection improves cash flow.',
        status: clsLow(dsoVal, 30, 45, 60),
      },
      // ── Leverage ────────────────────────────────────────────────────────────
      {
        key: 'debtToEquity', name: 'Debt to Equity',
        value: safe(totalLiabilities, totalEquity),
        description: 'Total debt divided by shareholder equity',
        interpretation: 'Financial leverage. <1.0 is conservative.',
        status: clsLow(safe(totalLiabilities, totalEquity), 0.5, 1.0, 2.0),
      },
      {
        key: 'debtRatio', name: 'Debt to Assets',
        value: pct(totalLiabilities, totalAssets),
        description: 'Total debt as a percentage of total assets',
        interpretation: 'Proportion of assets financed by debt. <50% is healthy.',
        status: clsLow(pct(totalLiabilities, totalAssets), 30, 50, 70),
      },
      {
        key: 'equityMultiplier', name: 'Equity Multiplier',
        value: safe(totalAssets, totalEquity),
        description: 'Total assets divided by shareholder equity',
        interpretation: 'Financial leverage factor. Lower indicates less debt reliance.',
        status: clsLow(safe(totalAssets, totalEquity), 1.5, 2.0, 3.0),
      },
    ];

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      asOfDate: endDate.toISOString(),
      ratios,
    };
  }

  // ─── Sales by Customer ────────────────────────────────────────────────────────

  async getSalesByCustomer(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SalesByCustomerDto> {
    // Compute equal-length previous period for growth comparison
    const duration = endDate.getTime() - startDate.getTime();
    const prevEnd   = new Date(startDate.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const [invoices, prevInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { entityId, invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'Draft' as any } },
        select: { customerId: true, customerName: true, total: true, customer: { select: { name: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { entityId, invoiceDate: { gte: prevStart, lte: prevEnd }, status: { not: 'Draft' as any } },
        select: { customerId: true, customerName: true, total: true, customer: { select: { name: true } } },
      }),
    ]);

    const prevMap = new Map<string, number>();
    for (const inv of prevInvoices) {
      const { key } = partyOf(inv.customerId, inv.customer?.name, inv.customerName, 'Unknown customer');
      prevMap.set(key, (prevMap.get(key) ?? 0) + inv.total);
    }

    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const inv of invoices) {
      const party = partyOf(inv.customerId, inv.customer?.name, inv.customerName, 'Unknown customer');
      const existing = map.get(party.key);
      if (existing) { existing.total += inv.total; existing.count++; }
      else map.set(party.key, { name: party.name, total: inv.total, count: 1 });
    }

    const totalSales = invoices.reduce((s, i) => s + i.total, 0);
    const rows = Array.from(map.entries())
      .map(([customerId, d]) => {
        const prev = prevMap.get(customerId) ?? null;
        const growth = prev !== null && prev > 0
          ? Math.round(((d.total - prev) / prev) * 10000) / 100
          : null;
        return {
          customerId,
          customerName: d.name,
          totalSales: d.total,
          invoiceCount: d.count,
          avgInvoice: d.count > 0 ? Math.round(d.total / d.count) : 0,
          percentOfTotal: totalSales > 0 ? Math.round((d.total / totalSales) * 10000) / 100 : 0,
          growth,
        };
      })
      .sort((a, b) => b.totalSales - a.totalSales);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { totalSales, totalInvoices: invoices.length, avgInvoice: invoices.length > 0 ? Math.round(totalSales / invoices.length) : 0 },
      rows,
    };
  }

  // ─── Sales by Item ────────────────────────────────────────────────────────────

  async getSalesByItem(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SalesByItemDto> {
    const items = await this.prisma.invoiceItem.findMany({
      where: { invoice: { entityId, invoiceDate: { gte: startDate, lte: endDate }, status: { not: 'Draft' as any } } },
      select: { itemId: true, quantity: true, rate: true, total: true, item: { select: { name: true, unitPrice: true } } },
    });

    const map = new Map<string, { name: string; revenue: number; cost: number; qty: number; rateSum: number; count: number }>();
    for (const row of items) {
      const lineCost = (row.item.unitPrice ?? 0) * row.quantity;
      const existing = map.get(row.itemId);
      if (existing) { existing.revenue += row.total; existing.cost += lineCost; existing.qty += row.quantity; existing.rateSum += row.rate; existing.count++; }
      else map.set(row.itemId, { name: row.item.name, revenue: row.total, cost: lineCost, qty: row.quantity, rateSum: row.rate, count: 1 });
    }

    const totalRevenue = items.reduce((s, i) => s + i.total, 0);
    const totalQty     = items.reduce((s, i) => s + i.quantity, 0);

    const rows = Array.from(map.entries()).map(([itemId, d]) => {
      const profit = d.revenue - d.cost;
      const margin = d.revenue > 0 ? Math.round((profit / d.revenue) * 10000) / 100 : null;
      return {
        itemId,
        itemName: d.name,
        totalRevenue: d.revenue,
        totalQuantity: d.qty,
        totalCost: d.cost,
        totalProfit: profit,
        margin,
        avgRate: d.qty > 0 ? Math.round(d.revenue / d.qty) : 0,
        invoiceCount: d.count,
        percentOfTotal: totalRevenue > 0 ? Math.round((d.revenue / totalRevenue) * 10000) / 100 : 0,
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const totalCost   = rows.reduce((s, r) => s + r.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : null;

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { totalRevenue, totalQuantity: totalQty, totalCost, totalProfit, profitMargin, totalInvoices: new Set(items.map(i => i.itemId)).size },
      rows,
    };
  }

  // ─── Invoice Details ──────────────────────────────────────────────────────────

  async getInvoiceDetails(
    entityId: string,
    startDate: Date,
    endDate: Date,
    status?: string,
    customerId?: string,
  ): Promise<InvoiceDetailsDto> {
    const where: any = {
      entityId,
      invoiceDate: { gte: startDate, lte: endDate },
    };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        paymentReceived: { select: { amount: true } },
        invoiceItem: { select: { id: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const rows = invoices.map((inv) => {
      const paid = inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      const balance = inv.total - paid;
      const daysOverdue = balance > 0 && inv.dueDate < now
        ? Math.floor((now.getTime() - inv.dueDate.getTime()) / 86400000)
        : 0;
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        customerName: inv.customer?.name ?? inv.customerName ?? '',
        paymentTerms: inv.paymentTerms,
        total: inv.total,
        paid,
        balance,
        daysOverdue,
        status: inv.status as string,
        currency: inv.currency,
        itemCount: inv.invoiceItem.length,
      };
    });

    const totalAmount = rows.reduce((s, r) => s + r.total, 0);
    const totalPaid   = rows.reduce((s, r) => s + r.paid, 0);
    const paidRows    = rows.filter(r => r.status === 'Paid');
    const unpaidRows  = rows.filter(r => r.status === 'Pending' || r.status === 'Unpaid');
    const partialRows = rows.filter(r => r.status === 'Partial');
    const overdueRows = rows.filter(r => r.status === 'Overdue');

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: {
        totalInvoices: rows.length,
        totalAmount,
        totalPaid,
        totalOutstanding: totalAmount - totalPaid,
        paidCount: paidRows.length,
        unpaidCount: unpaidRows.length,
        partialCount: partialRows.length,
        overdueCount: overdueRows.length,
        paidAmount: paidRows.reduce((s, r) => s + r.total, 0),
        unpaidAmount: unpaidRows.reduce((s, r) => s + r.total, 0),
        partialAmount: partialRows.reduce((s, r) => s + r.total, 0),
        overdueAmount: overdueRows.reduce((s, r) => s + r.total, 0),
      },
      rows,
    };
  }

  // ─── Receivable Summary ───────────────────────────────────────────────────────

  async getReceivableSummary(entityId: string, asOfDate: Date): Promise<ReceivableSummaryDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, invoiceDate: { lte: asOfDate }, status: { notIn: ['Draft'] as any } },
      include: {
        customer: { select: { id: true, name: true, paymentTerms: true, creditLimit: true } },
        paymentReceived: { select: { amount: true, paidAt: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Aggregate by customer
    const custMap = new Map<string, {
      customerId: string; customerName: string; paymentTerms: string; creditLimit: string;
      totalReceivable: number; current: number; overdue: number; invoiceCount: number;
      lastPaymentDate: Date | null;
    }>();

    for (const inv of invoices) {
      const paid = inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      const outstanding = inv.total - paid;
      if (outstanding <= 0) continue;

      const isOverdue = inv.dueDate < asOfDate;
      const party = partyOf(inv.customerId, inv.customer?.name, inv.customerName, 'Unknown customer');
      const key = party.key;
      if (!custMap.has(key)) {
        custMap.set(key, {
          customerId: key, customerName: party.name,
          paymentTerms: inv.customer?.paymentTerms ?? inv.paymentTerms, creditLimit: inv.customer?.creditLimit ?? '',
          totalReceivable: 0, current: 0, overdue: 0, invoiceCount: 0, lastPaymentDate: null,
        });
      }
      const c = custMap.get(key)!;
      c.totalReceivable += outstanding;
      if (isOverdue) c.overdue += outstanding; else c.current += outstanding;
      c.invoiceCount++;

      const lastPaid = inv.paymentReceived.reduce<Date | null>((max, p) => (!max || p.paidAt > max) ? p.paidAt : max, null);
      if (lastPaid && (!c.lastPaymentDate || lastPaid > c.lastPaymentDate)) c.lastPaymentDate = lastPaid;
    }

    const rows = Array.from(custMap.values())
      .sort((a, b) => b.totalReceivable - a.totalReceivable)
      .map((c) => {
        const creditLimitNum = parseFloat(c.creditLimit) || null;
        const creditUtilization = creditLimitNum ? Math.round((c.totalReceivable / creditLimitNum) * 100) : null;
        const overdueRatio = c.totalReceivable > 0 ? c.overdue / c.totalReceivable : 0;
        const status: 'Good' | 'Warning' | 'Critical' =
          c.overdue === 0 ? 'Good' : overdueRatio >= 0.5 ? 'Critical' : 'Warning';
        return {
          customerId: c.customerId, customerName: c.customerName, paymentTerms: c.paymentTerms,
          totalReceivable: c.totalReceivable, current: c.current, overdue: c.overdue,
          invoiceCount: c.invoiceCount, lastPaymentDate: c.lastPaymentDate?.toISOString() ?? null,
          creditLimit: creditLimitNum, creditUtilization, status,
        };
      });

    const totalReceivables = rows.reduce((s, r) => s + r.totalReceivable, 0);
    const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
    const totalOverdue = rows.reduce((s, r) => s + r.overdue, 0);
    const goodCount = rows.filter(r => r.status === 'Good').length;
    const warningCount = rows.filter(r => r.status === 'Warning').length;
    const criticalCount = rows.filter(r => r.status === 'Critical').length;

    return {
      asOfDate: asOfDate.toISOString(),
      totalReceivables, totalCurrent, totalOverdue,
      customerCount: rows.length,
      overdueCustomerCount: rows.filter(r => r.overdue > 0).length,
      avgReceivable: rows.length > 0 ? Math.round(totalReceivables / rows.length) : 0,
      overduePercentage: totalReceivables > 0 ? Math.round((totalOverdue / totalReceivables) * 10000) / 100 : 0,
      goodCount, warningCount, criticalCount,
      rows,
    };
  }

  // ─── Aged Receivables ─────────────────────────────────────────────────────────

  async getAgedReceivables(entityId: string, asOfDate: Date): Promise<AgedReceivablesDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, invoiceDate: { lte: asOfDate }, status: { notIn: ['Draft'] as any } },
      include: { customer: { select: { name: true } }, paymentReceived: { select: { amount: true } } },
    });

    const customerMap = new Map<string, { name: string; current: number; d1_30: number; d31_60: number; d61_90: number; d91_120: number; d120p: number }>();

    for (const inv of invoices) {
      const paid = inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      const outstanding = inv.total - paid;
      if (outstanding <= 0) continue;

      const days = Math.floor((asOfDate.getTime() - inv.dueDate.getTime()) / 86400000);
      const party = partyOf(inv.customerId, inv.customer?.name, inv.customerName, 'Unknown customer');
      const key = party.key;
      if (!customerMap.has(key)) customerMap.set(key, { name: party.name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120p: 0 });
      const row = customerMap.get(key)!;

      if (days <= 0)        row.current  += outstanding;
      else if (days <= 30)  row.d1_30    += outstanding;
      else if (days <= 60)  row.d31_60   += outstanding;
      else if (days <= 90)  row.d61_90   += outstanding;
      else if (days <= 120) row.d91_120  += outstanding;
      else                  row.d120p    += outstanding;
    }

    const rows = Array.from(customerMap.values()).map(r => ({
      customerName: r.name,
      current: r.current, days1_30: r.d1_30, days31_60: r.d31_60,
      days61_90: r.d61_90, days91_120: r.d91_120, days120Plus: r.d120p,
      total: r.current + r.d1_30 + r.d31_60 + r.d61_90 + r.d91_120 + r.d120p,
    })).sort((a, b) => b.total - a.total);

    const sum = (f: keyof typeof rows[0]) => rows.reduce((s, r) => s + (r[f] as number), 0);
    return {
      asOfDate: asOfDate.toISOString(),
      totals: { current: sum('current'), days1_30: sum('days1_30'), days31_60: sum('days31_60'), days61_90: sum('days61_90'), days91_120: sum('days91_120'), days120Plus: sum('days120Plus'), total: sum('total') },
      rows,
    };
  }

  // ─── Customer Balances ────────────────────────────────────────────────────────

  async getCustomerBalances(entityId: string, startDate: Date, endDate: Date): Promise<CustomerBalancesDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, status: { not: 'Draft' as any } },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        paymentReceived: { select: { amount: true, paidAt: true } },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    type CustEntry = {
      name: string; email: string;
      preInvoiced: number; prePaid: number;
      periodInvoiced: number; periodPaid: number;
      lastDate: Date | null;
    };

    const map = new Map<string, CustEntry>();

    for (const inv of invoices) {
      const party = partyOf(inv.customerId, inv.customer?.name, inv.customerName, 'Unknown customer');
      const cid = party.key;
      if (!map.has(cid)) {
        map.set(cid, { name: party.name, email: inv.customer?.email ?? inv.customerEmail ?? '', preInvoiced: 0, prePaid: 0, periodInvoiced: 0, periodPaid: 0, lastDate: null });
      }
      const c = map.get(cid)!;
      const invDate = new Date(inv.invoiceDate);

      if (invDate < startDate) {
        c.preInvoiced += inv.total;
      } else if (invDate <= endDate) {
        c.periodInvoiced += inv.total;
        if (!c.lastDate || invDate > c.lastDate) c.lastDate = invDate;
      }

      for (const p of inv.paymentReceived) {
        const pDate = new Date(p.paidAt);
        if (pDate < startDate) {
          c.prePaid += p.amount;
        } else if (pDate <= endDate) {
          c.periodPaid += p.amount;
          if (!c.lastDate || pDate > c.lastDate) c.lastDate = pDate;
        }
      }
    }

    const rows = Array.from(map.entries())
      .map(([customerId, c]) => {
        const openingBalance = c.preInvoiced - c.prePaid;
        const closingBalance = openingBalance + c.periodInvoiced - c.periodPaid;
        const status: 'Debit' | 'Credit' | 'Zero' =
          closingBalance > 0 ? 'Debit' : closingBalance < 0 ? 'Credit' : 'Zero';
        return {
          customerId, customerName: c.name, email: c.email,
          openingBalance, invoiced: c.periodInvoiced, payments: c.periodPaid,
          closingBalance, status,
          lastTransactionDate: c.lastDate?.toISOString() ?? null,
        };
      })
      .filter(r => r.invoiced > 0 || r.openingBalance !== 0)
      .sort((a, b) => b.closingBalance - a.closingBalance);

    const totalDebit    = rows.filter(r => r.closingBalance > 0).reduce((s, r) => s + r.closingBalance, 0);
    const totalCredit   = rows.filter(r => r.closingBalance < 0).reduce((s, r) => s + Math.abs(r.closingBalance), 0);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalCustomers: rows.length,
      debitCount:  rows.filter(r => r.status === 'Debit').length,
      creditCount: rows.filter(r => r.status === 'Credit').length,
      zeroCount:   rows.filter(r => r.status === 'Zero').length,
      totalDebit, totalCredit,
      netBalance: totalDebit - totalCredit,
      totalOpeningBalance: rows.reduce((s, r) => s + r.openingBalance, 0),
      totalInvoiced:  rows.reduce((s, r) => s + r.invoiced, 0),
      totalPayments:  rows.reduce((s, r) => s + r.payments, 0),
      totalClosingBalance: rows.reduce((s, r) => s + r.closingBalance, 0),
      rows,
    };
  }

  // ─── Payment Method Summary ───────────────────────────────────────────────────

  async getPaymentMethodSummary(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PaymentMethodSummaryDto> {
    // Current period payments with invoice + customer joins
    const payments = await this.prisma.paymentReceived.findMany({
      where: { entityId, paidAt: { gte: startDate, lte: endDate } },
      include: {
        invoice: { select: { invoiceNumber: true, customerName: true, customer: { select: { name: true } } } },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Previous period (same duration) for growth comparison
    const durationMs = endDate.getTime() - startDate.getTime();
    const prevEnd   = new Date(startDate.getTime() - 1);
    const prevStart = new Date(startDate.getTime() - durationMs);
    const prevPayments = await this.prisma.paymentReceived.findMany({
      where: { entityId, paidAt: { gte: prevStart, lte: prevEnd } },
      select: { paymentMethod: true, amount: true },
    });

    const prevMap = new Map<string, number>();
    for (const p of prevPayments) {
      const key = p.paymentMethod || 'Unknown';
      prevMap.set(key, (prevMap.get(key) ?? 0) + p.amount);
    }
    const prevTotal = prevPayments.reduce((s, p) => s + p.amount, 0);

    // Aggregate by method
    const map = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const key = p.paymentMethod || 'Unknown';
      const existing = map.get(key);
      if (existing) { existing.total += p.amount; existing.count++; }
      else map.set(key, { total: p.amount, count: 1 });
    }

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);

    const rows = Array.from(map.entries())
      .map(([paymentMethod, d]) => {
        const prevAmount = prevMap.get(paymentMethod) ?? 0;
        const growthPercent = prevAmount > 0
          ? Math.round(((d.total - prevAmount) / prevAmount) * 1000) / 10
          : null;
        return {
          paymentMethod,
          totalAmount: d.total,
          transactionCount: d.count,
          percentOfTotal: totalReceived > 0 ? Math.round((d.total / totalReceived) * 10000) / 100 : 0,
          avgTransaction: d.count > 0 ? Math.round(d.total / d.count) : 0,
          growthPercent,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const methods = rows.map(r => r.paymentMethod);

    // Weekly trends: split period into 4 equal buckets
    const bucketMs = durationMs / 4;
    const trends: Record<string, number | string>[] = Array.from({ length: 4 }, (_, i) => {
      const bStart = new Date(startDate.getTime() + i * bucketMs);
      const bEnd   = new Date(startDate.getTime() + (i + 1) * bucketMs - 1);
      const point: Record<string, number | string> = { label: `Week ${i + 1}` };
      for (const m of methods) point[m] = 0;
      for (const p of payments) {
        const pDate = new Date(p.paidAt);
        if (pDate >= bStart && pDate <= bEnd) {
          const key = p.paymentMethod || 'Unknown';
          point[key] = ((point[key] as number) ?? 0) + p.amount;
        }
      }
      return point;
    });

    // Recent transactions (up to 20)
    const recentTransactions = payments.slice(0, 20).map(p => ({
      id: p.id,
      date: p.paidAt.toISOString(),
      customerName: p.invoice.customer?.name ?? p.invoice.customerName ?? '',
      invoiceNumber: p.invoice.invoiceNumber,
      paymentMethod: p.paymentMethod || 'Unknown',
      amount: p.amount,
      reference: p.reference,
    }));

    const totalGrowthPercent = prevTotal > 0
      ? Math.round(((totalReceived - prevTotal) / prevTotal) * 1000) / 10
      : null;

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalReceived,
      transactionCount: payments.length,
      totalGrowthPercent,
      methods,
      rows,
      trends,
      recentTransactions,
    };
  }

  // ─── Payable Summary ──────────────────────────────────────────────────────────

  async getPayableSummary(entityId: string, asOfDate: Date): Promise<PayableSummaryDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: asOfDate }, status: { not: 'draft' as any } },
      include: {
        vendor: { select: { id: true, name: true, paymentTerms: true } },
        paymentsMade: { where: { paymentDate: { lte: asOfDate } }, select: { amount: true, paymentDate: true } },
      },
    });

    type VendorEntry = {
      vendorId: string; vendorName: string; paymentTerms: string;
      current: number; overdue: number; billCount: number; lastPaymentDate: Date | null;
    };

    const vendorMap = new Map<string, VendorEntry>();

    for (const bill of bills) {
      const paid = bill.paymentsMade.reduce((s, p) => s + p.amount, 0);
      const outstanding = bill.total - paid;
      if (outstanding <= 0) continue;

      const isOverdue = bill.dueDate < asOfDate;
      const party = partyOf(bill.vendorId, bill.vendor?.name, bill.vendorName, 'Unknown vendor');
      const vid = party.key;

      if (!vendorMap.has(vid)) {
        vendorMap.set(vid, {
          vendorId: vid, vendorName: party.name, paymentTerms: bill.vendor?.paymentTerms ?? bill.paymentTerms,
          current: 0, overdue: 0, billCount: 0, lastPaymentDate: null,
        });
      }
      const v = vendorMap.get(vid)!;
      if (isOverdue) v.overdue += outstanding; else v.current += outstanding;
      v.billCount++;

      const lastPaid = bill.paymentsMade.reduce<Date | null>(
        (max, p) => (!max || p.paymentDate > max) ? p.paymentDate : max, null,
      );
      if (lastPaid && (!v.lastPaymentDate || lastPaid > v.lastPaymentDate)) v.lastPaymentDate = lastPaid;
    }

    const rows = Array.from(vendorMap.values())
      .map((v) => {
        const totalPayable = v.current + v.overdue;
        const overdueRatio = totalPayable > 0 ? v.overdue / totalPayable : 0;
        const status: 'Good' | 'Warning' | 'Critical' =
          v.overdue === 0 ? 'Good' : overdueRatio >= 0.5 ? 'Critical' : 'Warning';
        return {
          vendorId: v.vendorId, vendorName: v.vendorName, paymentTerms: v.paymentTerms,
          totalPayable, current: v.current, overdue: v.overdue,
          billCount: v.billCount, lastPaymentDate: v.lastPaymentDate?.toISOString() ?? null, status,
        };
      })
      .sort((a, b) => b.totalPayable - a.totalPayable);

    const totalPayable  = rows.reduce((s, r) => s + r.totalPayable, 0);
    const totalCurrent  = rows.reduce((s, r) => s + r.current, 0);
    const totalOverdue  = rows.reduce((s, r) => s + r.overdue, 0);

    return {
      asOfDate: asOfDate.toISOString(),
      vendorCount: rows.length,
      totalPayable, totalCurrent, totalOverdue,
      avgPayable: rows.length > 0 ? Math.round(totalPayable / rows.length) : 0,
      overdueVendorCount: rows.filter(r => r.overdue > 0).length,
      overduePercentage: totalPayable > 0 ? Math.round((totalOverdue / totalPayable) * 10000) / 100 : 0,
      goodCount:     rows.filter(r => r.status === 'Good').length,
      warningCount:  rows.filter(r => r.status === 'Warning').length,
      criticalCount: rows.filter(r => r.status === 'Critical').length,
      rows,
    };
  }

  // ─── Aged Payables ────────────────────────────────────────────────────────────

  async getAgedPayables(entityId: string, asOfDate: Date): Promise<AgedPayablesDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: asOfDate }, status: { not: 'draft' as any } },
      include: { vendor: { select: { name: true } }, paymentsMade: { where: { paymentDate: { lte: asOfDate } }, select: { amount: true } } },
    });

    const vendorMap = new Map<string, { name: string; current: number; d1_30: number; d31_60: number; d61_90: number; d91_120: number; d120p: number }>();

    for (const bill of bills) {
      const paid = bill.paymentsMade.reduce((s, p) => s + p.amount, 0);
      const outstanding = bill.total - paid;
      if (outstanding <= 0) continue;

      const days = Math.floor((asOfDate.getTime() - bill.dueDate.getTime()) / 86400000);
      const party = partyOf(bill.vendorId, bill.vendor?.name, bill.vendorName, 'Unknown vendor');
      const key = party.key;
      if (!vendorMap.has(key)) vendorMap.set(key, { name: party.name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120p: 0 });
      const row = vendorMap.get(key)!;

      if (days <= 0)        row.current  += outstanding;
      else if (days <= 30)  row.d1_30    += outstanding;
      else if (days <= 60)  row.d31_60   += outstanding;
      else if (days <= 90)  row.d61_90   += outstanding;
      else if (days <= 120) row.d91_120  += outstanding;
      else                  row.d120p    += outstanding;
    }

    const rows = Array.from(vendorMap.values()).map(r => ({
      vendorName: r.name,
      current: r.current, days1_30: r.d1_30, days31_60: r.d31_60,
      days61_90: r.d61_90, days91_120: r.d91_120, days120Plus: r.d120p,
      total: r.current + r.d1_30 + r.d31_60 + r.d61_90 + r.d91_120 + r.d120p,
    })).sort((a, b) => b.total - a.total);

    const sum = (f: keyof typeof rows[0]) => rows.reduce((s, r) => s + (r[f] as number), 0);
    return {
      asOfDate: asOfDate.toISOString(),
      totals: { current: sum('current'), days1_30: sum('days1_30'), days31_60: sum('days31_60'), days61_90: sum('days61_90'), days91_120: sum('days91_120'), days120Plus: sum('days120Plus'), total: sum('total') },
      rows,
    };
  }

  // ─── Vendor Balances ──────────────────────────────────────────────────────────

  async getVendorBalances(entityId: string, startDate: Date, endDate: Date): Promise<VendorBalancesDto> {
    // Bills up to end of period (for opening balance computation)
    const allBills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: endDate }, status: { not: 'draft' as any } },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        paymentsMade: { select: { amount: true, paymentDate: true } },
      },
    });

    type VendorAcc = {
      name: string; email: string;
      openingBilled: number; openingPaid: number;
      periodBilled: number; periodPaid: number;
      lastDate: Date | null;
    };
    const map = new Map<string, VendorAcc>();

    for (const bill of allBills) {
      const party = partyOf(bill.vendorId, bill.vendor?.name, bill.vendorName, 'Unknown vendor');
      const vid = party.key;
      if (!map.has(vid)) {
        map.set(vid, { name: party.name, email: bill.vendor?.email ?? '', openingBilled: 0, openingPaid: 0, periodBilled: 0, periodPaid: 0, lastDate: null });
      }
      const acc = map.get(vid)!;
      const billDate = new Date(bill.billDate);
      const inPeriod = billDate >= startDate && billDate <= endDate;

      if (inPeriod) {
        acc.periodBilled += bill.total;
        if (!acc.lastDate || billDate > acc.lastDate) acc.lastDate = billDate;
      } else {
        acc.openingBilled += bill.total;
      }

      for (const pay of bill.paymentsMade) {
        const payDate = new Date(pay.paymentDate);
        const payInPeriod = payDate >= startDate && payDate <= endDate;
        if (payInPeriod) {
          acc.periodPaid += pay.amount;
          if (!acc.lastDate || payDate > acc.lastDate) acc.lastDate = payDate;
        } else if (payDate < startDate) {
          acc.openingPaid += pay.amount;
        }
      }
    }

    const rows: VendorBalanceRowDto[] = Array.from(map.entries()).map(([vendorId, d]) => {
      const openingBalance = d.openingBilled - d.openingPaid;
      const closingBalance = openingBalance + d.periodBilled - d.periodPaid;
      const status: 'Debit' | 'Credit' | 'Zero' = closingBalance > 0 ? 'Debit' : closingBalance < 0 ? 'Credit' : 'Zero';
      return {
        vendorId,
        vendorName: d.name,
        email: d.email,
        openingBalance,
        totalBilled: d.periodBilled,
        totalPaid: d.periodPaid,
        debitNotes: 0,
        closingBalance,
        status,
        lastTransactionDate: d.lastDate ? d.lastDate.toISOString() : null,
      };
    }).sort((a, b) => b.closingBalance - a.closingBalance);

    const debitRows   = rows.filter(r => r.status === 'Debit');
    const creditRows  = rows.filter(r => r.status === 'Credit');
    const totalDebit  = debitRows.reduce((s, r) => s + r.closingBalance, 0);
    const totalCredit = Math.abs(creditRows.reduce((s, r) => s + r.closingBalance, 0));

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      vendorCount: rows.length,
      debitCount: debitRows.length,
      totalDebit,
      totalCredit,
      netBalance: totalDebit - totalCredit,
      totalBilled: rows.reduce((s, r) => s + r.totalBilled, 0),
      totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
      rows,
    };
  }

  // ─── Expense by Category ──────────────────────────────────────────────────────

  async getExpenseByCategory(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ExpenseByCategoryDto> {
    const txns = await this.prisma.accountTransaction.findMany({
      where: {
        entityId,
        date: { gte: startDate, lte: endDate },
        status: { not: 'Failed' as any },
        account: { subCategory: { category: { type: { code: '5000' } } } },
      },
      select: {
        debitAmount: true, creditAmount: true,
        account: {
          select: {
            id: true, name: true, code: true,
            subCategory: { select: { category: { select: { code: true, name: true } } } },
          },
        },
      },
    });

    const catMap = new Map<string, { name: string; total: number; accounts: Map<string, { name: string; code: string; amount: number }> }>();
    for (const tx of txns) {
      const catCode = tx.account.subCategory.category.code;
      const catName = tx.account.subCategory.category.name;
      const net = tx.debitAmount - tx.creditAmount;
      if (!catMap.has(catCode)) catMap.set(catCode, { name: catName, total: 0, accounts: new Map() });
      const cat = catMap.get(catCode)!;
      cat.total += net;
      const accExisting = cat.accounts.get(tx.account.id);
      if (accExisting) accExisting.amount += net;
      else cat.accounts.set(tx.account.id, { name: tx.account.name, code: tx.account.code, amount: net });
    }

    const totalExpenses = Array.from(catMap.values()).reduce((s, c) => s + c.total, 0);
    const rows = Array.from(catMap.entries()).map(([categoryCode, cat]) => ({
      categoryCode, categoryName: cat.name, total: cat.total,
      percentOfTotal: totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 10000) / 100 : 0,
      accounts: Array.from(cat.accounts.entries()).map(([accountId, acc]) => ({
        accountId, accountName: acc.name, accountCode: acc.code, amount: acc.amount,
        percentOfCategory: cat.total > 0 ? Math.round((acc.amount / cat.total) * 10000) / 100 : 0,
      })).sort((a, b) => b.amount - a.amount),
    })).sort((a, b) => b.total - a.total);

    return { period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, totalExpenses, rows };
  }

  // ─── Expense by Vendor ────────────────────────────────────────────────────────

  async getExpenseByVendor(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ExpenseByVendorDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { gte: startDate, lte: endDate }, status: { not: 'draft' as any } },
      select: { vendorId: true, vendorName: true, total: true, vendor: { select: { name: true } } },
    });

    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const bill of bills) {
      const party = partyOf(bill.vendorId, bill.vendor?.name, bill.vendorName, 'Unknown vendor');
      const existing = map.get(party.key);
      if (existing) { existing.total += bill.total; existing.count++; }
      else map.set(party.key, { name: party.name, total: bill.total, count: 1 });
    }

    const totalExpenses = bills.reduce((s, b) => s + b.total, 0);
    const rows = Array.from(map.entries()).map(([vendorId, d]) => ({
      vendorId, vendorName: d.name, totalBilled: d.total, billCount: d.count,
      percentOfTotal: totalExpenses > 0 ? Math.round((d.total / totalExpenses) * 10000) / 100 : 0,
    })).sort((a, b) => b.totalBilled - a.totalBilled);

    return { period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, totalExpenses, rows };
  }

  // ─── Bill Details ─────────────────────────────────────────────────────────────

  async getBillDetails(
    entityId: string,
    startDate: Date,
    endDate: Date,
    status?: string,
    vendorId?: string,
  ): Promise<BillDetailsDto> {
    const where: any = { entityId, billDate: { gte: startDate, lte: endDate } };
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const bills = await this.prisma.bills.findMany({
      where, include: { vendor: { select: { name: true } } },
      orderBy: { billDate: 'desc' },
    });

    const rows = bills.map((bill) => {
      const parsedItems = Array.isArray(bill.items) ? bill.items as any[] : [];
      return {
        billId: bill.id, billNumber: bill.billNumber,
        billDate: bill.billDate.toISOString(), dueDate: bill.dueDate.toISOString(),
        vendorName: bill.vendor?.name ?? bill.vendorName ?? '',
        subtotal: bill.subtotal, tax: bill.tax, total: bill.total, status: bill.status as string,
        items: parsedItems.map((item: any) => ({
          description: item.description || item.name || '',
          quantity: Number(item.quantity) || 0,
          rate: Number(item.rate) || 0,
          total: Number(item.total) || 0,
        })),
      };
    });

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { totalBills: rows.length, totalAmount: rows.reduce((s, r) => s + r.total, 0), totalTax: rows.reduce((s, r) => s + r.tax, 0) },
      rows,
    };
  }

  // ─── Bank Reconciliation Summary ─────────────────────────────────────────────

  async getBankReconciliationSummary(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BankReconciliationSummaryDto> {
    const recs = await this.prisma.bankReconciliation.findMany({
      where: { entityId, statementEndDate: { gte: startDate, lte: endDate } },
      include: {
        bankAccount: { select: { accountName: true } },
        reconciliationCompletedBy: { select: { firstName: true, lastName: true } },
        matches: { select: { id: true } },
      },
      orderBy: { statementEndDate: 'desc' },
    });

    const rows = recs.map((r) => ({
      reconciliationId: r.id,
      bankAccountName: r.bankAccount.accountName,
      statementEndDate: r.statementEndDate.toISOString(),
      statementEndingBalance: r.statementEndingBalance,
      status: r.status,
      completedAt: r.completedAt?.toISOString() ?? null,
      completedBy: r.reconciliationCompletedBy
        ? `${r.reconciliationCompletedBy.firstName} ${r.reconciliationCompletedBy.lastName}`.trim()
        : null,
      matchedCount: r.matches.length,
    }));

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalCompleted: rows.filter(r => r.status === 'COMPLETED').length,
      totalDraft: rows.filter(r => r.status === 'DRAFT').length,
      rows,
    };
  }

  // ─── Bank Account Transactions ────────────────────────────────────────────────

  async getBankAccountTransactions(
    entityId: string,
    startDate: Date,
    endDate: Date,
    bankAccountId?: string,
  ): Promise<BankAccountTransactionsDto> {
    // Find accounts linked to the bank subcat (1110) or specific bank account
    const accountWhere: any = { entityId };
    if (bankAccountId) {
      accountWhere.bankAccountId = bankAccountId;
    } else {
      accountWhere.subCategory = { code: '1110' };
    }

    const bankAccounts = await this.prisma.account.findMany({
      where: accountWhere,
      select: { id: true, name: true },
    });
    const bankAccountIds = new Set(bankAccounts.map(a => a.id));
    const accountNameMap = new Map(bankAccounts.map(a => [a.id, a.name]));

    if (bankAccountIds.size === 0) {
      return { period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, openingBalance: 0, closingBalance: 0, totalDebits: 0, totalCredits: 0, rows: [] };
    }

    const [preTxns, periodTxns] = await Promise.all([
      this.prisma.accountTransaction.findMany({
        where: { entityId, accountId: { in: Array.from(bankAccountIds) }, date: { lt: startDate }, status: { not: 'Failed' as any } },
        select: { debitAmount: true, creditAmount: true },
      }),
      this.prisma.accountTransaction.findMany({
        where: { entityId, accountId: { in: Array.from(bankAccountIds) }, date: { gte: startDate, lte: endDate }, status: { not: 'Failed' as any } },
        select: { id: true, accountId: true, debitAmount: true, creditAmount: true, date: true, description: true, reference: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const openingBalance = preTxns.reduce((s, t) => s + t.debitAmount - t.creditAmount, 0);
    let runningBalance = openingBalance;
    const rows = periodTxns.map((tx) => {
      runningBalance += tx.debitAmount - tx.creditAmount;
      return {
        id: tx.id, date: tx.date.toISOString(),
        description: (tx as any).description ?? '',
        reference: (tx as any).reference ?? null,
        debit: tx.debitAmount, credit: tx.creditAmount,
        runningBalance,
        accountName: accountNameMap.get(tx.accountId) ?? '',
      };
    });

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      openingBalance, closingBalance: runningBalance,
      totalDebits: rows.reduce((s, r) => s + r.debit, 0),
      totalCredits: rows.reduce((s, r) => s + r.credit, 0),
      rows,
    };
  }

  // ─── Supplies Inventory Report ────────────────────────────────────────────────

  async getSuppliesInventory(entityId: string): Promise<SuppliesInventoryReportDto> {
    const supplies = await this.prisma.storeSupply.findMany({
      where: { entityId },
      include: {
        supplyRestockHistory: { orderBy: { restockDate: 'desc' }, take: 1, select: { restockDate: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows = supplies.map((s) => {
      const status: 'OK' | 'Low Stock' | 'Out of Stock' =
        s.quantity === 0 ? 'Out of Stock' : s.quantity <= s.minQuantity ? 'Low Stock' : 'OK';
      return {
        supplyId: s.id, name: s.name, category: s.category, sku: s.sku ?? null,
        quantity: s.quantity, minQuantity: s.minQuantity, unitPrice: s.unitPrice,
        totalValue: s.quantity * s.unitPrice, status,
        lastRestockDate: s.supplyRestockHistory[0]?.restockDate?.toISOString() ?? null,
        supplier: s.supplier ?? null,
      };
    });

    return {
      summary: {
        totalItems: rows.length,
        totalValue: rows.reduce((s, r) => s + r.totalValue, 0),
        lowStockCount: rows.filter(r => r.status === 'Low Stock').length,
        outOfStockCount: rows.filter(r => r.status === 'Out of Stock').length,
      },
      rows,
    };
  }

  // ─── Supplies Consumption by Department ──────────────────────────────────────

  async getSuppliesConsumptionByDepartment(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SuppliesConsumptionByDeptDto> {
    const issues = await this.prisma.supplyIssueHistory.findMany({
      where: { entityId, issueDate: { gte: startDate, lte: endDate } },
      include: {
        supply: { select: { name: true, unitPrice: true } },
        department: { select: { name: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const deptMap = new Map<string, { name: string; totalQty: number; totalValue: number; items: Map<string, { name: string; qty: number; unitPrice: number }> }>();

    for (const issue of issues) {
      const key = issue.departmentId ?? '__unassigned__';
      const deptName = issue.department?.name ?? 'Unassigned';
      if (!deptMap.has(key)) deptMap.set(key, { name: deptName, totalQty: 0, totalValue: 0, items: new Map() });
      const dept = deptMap.get(key)!;
      dept.totalQty += issue.quantity;
      dept.totalValue += issue.quantity * issue.supply.unitPrice;
      const itemExisting = dept.items.get(issue.supplyId);
      if (itemExisting) { itemExisting.qty += issue.quantity; }
      else dept.items.set(issue.supplyId, { name: issue.supply.name, qty: issue.quantity, unitPrice: issue.supply.unitPrice });
    }

    const rows = Array.from(deptMap.entries()).map(([departmentId, d]) => ({
      departmentId: departmentId === '__unassigned__' ? null : departmentId,
      departmentName: d.name, totalQuantity: d.totalQty, totalValue: d.totalValue,
      items: Array.from(d.items.entries()).map(([supplyId, item]) => ({
        supplyId, supplyName: item.name, quantity: item.qty, unitPrice: item.unitPrice, totalValue: item.qty * item.unitPrice,
      })).sort((a, b) => b.totalValue - a.totalValue),
    })).sort((a, b) => b.totalValue - a.totalValue);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { totalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0), totalValue: rows.reduce((s, r) => s + r.totalValue, 0), departmentCount: rows.length },
      rows,
    };
  }

  // ─── Supplies Consumption by Project ─────────────────────────────────────────

  async getSuppliesConsumptionByProject(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SuppliesConsumptionByProjectDto> {
    const issues = await this.prisma.supplyIssueHistory.findMany({
      where: { entityId, issueDate: { gte: startDate, lte: endDate } },
      include: {
        supply: { select: { name: true, unitPrice: true } },
        project: { select: { name: true } },
      },
      orderBy: { issueDate: 'desc' },
    });

    const projMap = new Map<string, { name: string; totalQty: number; totalValue: number; items: Map<string, { name: string; qty: number; unitPrice: number }> }>();

    for (const issue of issues) {
      const key = issue.projectId ?? '__unassigned__';
      const projName = issue.project?.name ?? 'Unassigned';
      if (!projMap.has(key)) projMap.set(key, { name: projName, totalQty: 0, totalValue: 0, items: new Map() });
      const proj = projMap.get(key)!;
      proj.totalQty += issue.quantity;
      proj.totalValue += issue.quantity * issue.supply.unitPrice;
      const itemExisting = proj.items.get(issue.supplyId);
      if (itemExisting) { itemExisting.qty += issue.quantity; }
      else proj.items.set(issue.supplyId, { name: issue.supply.name, qty: issue.quantity, unitPrice: issue.supply.unitPrice });
    }

    const rows = Array.from(projMap.entries()).map(([projectId, d]) => ({
      projectId: projectId === '__unassigned__' ? null : projectId,
      projectName: d.name, totalQuantity: d.totalQty, totalValue: d.totalValue,
      items: Array.from(d.items.entries()).map(([supplyId, item]) => ({
        supplyId, supplyName: item.name, quantity: item.qty, unitPrice: item.unitPrice, totalValue: item.qty * item.unitPrice,
      })).sort((a, b) => b.totalValue - a.totalValue),
    })).sort((a, b) => b.totalValue - a.totalValue);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: { totalQuantity: rows.reduce((s, r) => s + r.totalQuantity, 0), totalValue: rows.reduce((s, r) => s + r.totalValue, 0), projectCount: rows.length },
      rows,
    };
  }

  // ─── Cash Flow Forecasting ───────────────────────────────────────────────────

  /**
   * Forward-looking cash forecast for one entity, in the entity's own currency.
   * Pure per-entity: group reporting calls this per entity and converts/sums.
   *
   * - Opening cash: ledger balance of the "Cash and Cash Equivalents" (1110)
   *   accounts as of `asOf` (same basis as the Balance Sheet).
   * - Known flows: outstanding invoices (inflow) / bills (outflow) bucketed by
   *   due date; anything already overdue is assumed settled in the first month;
   *   items due beyond the horizon are excluded.
   * - Recurring flows: average monthly cash receipts, approved expenses and
   *   payroll payments over the 3 full calendar months before `asOf`. The
   *   first (current) month gets only the remaining fraction of the month.
   */
  async getCashFlowForecast(entityId: string, months: number, asOf: Date): Promise<CashFlowForecastDto> {
    const horizon = Math.min(Math.max(Math.round(months) || 3, 1), 24);
    const LOOKBACK = 3;
    const round = (n: number) => Math.round(n * 100) / 100;

    const monthStart = (y: number, m: number) => new Date(y, m, 1);
    const firstMonth = monthStart(asOf.getFullYear(), asOf.getMonth());
    const horizonEnd = new Date(asOf.getFullYear(), asOf.getMonth() + horizon, 1); // exclusive
    const lookbackStart = monthStart(asOf.getFullYear(), asOf.getMonth() - LOOKBACK);
    const lookbackEnd = firstMonth; // exclusive

    const bucketIndex = (d: Date) => (d.getFullYear() - firstMonth.getFullYear()) * 12 + (d.getMonth() - firstMonth.getMonth());

    const cashAccounts = await this.prisma.account.findMany({
      where: { entityId, subCategory: { code: '1110' } },
      select: { id: true },
    });

    const [cashAgg, invoices, bills, receiptsAgg, expenses, payrollAgg] = await Promise.all([
      cashAccounts.length
        ? this.prisma.accountTransaction.aggregate({
            where: { entityId, accountId: { in: cashAccounts.map((a) => a.id) }, status: { not: 'Failed' as any }, date: { lte: asOf } },
            _sum: { debitAmount: true, creditAmount: true },
          })
        : Promise.resolve(null),
      this.prisma.invoice.findMany({
        where: { entityId, status: { notIn: ['Draft'] as any }, invoiceDate: { lte: asOf } },
        select: { total: true, dueDate: true, paymentReceived: { where: { paidAt: { lte: asOf } }, select: { amount: true } } },
      }),
      this.prisma.bills.findMany({
        where: { entityId, status: { not: 'draft' as any }, billDate: { lte: asOf } },
        select: { total: true, dueDate: true, paymentsMade: { where: { paymentDate: { lte: asOf } }, select: { amount: true } } },
      }),
      this.prisma.receipt.aggregate({
        where: { entityId, status: 'Completed' as any, date: { gte: lookbackStart, lt: lookbackEnd } },
        _sum: { total: true },
      }),
      this.prisma.expenses.findMany({
        where: { entityId, status: 'approved' as any, date: { gte: lookbackStart, lt: lookbackEnd } },
        select: { amount: true, tax: true },
      }),
      this.prisma.payrollPayment.aggregate({
        where: { entityId, paymentDate: { gte: lookbackStart, lt: lookbackEnd } },
        _sum: { amount: true },
      }),
    ]);

    const currentCash = (cashAgg?._sum.debitAmount ?? 0) - (cashAgg?._sum.creditAmount ?? 0);
    const avgMonthlyReceipts = (receiptsAgg._sum.total ?? 0) / LOOKBACK;
    const avgMonthlyExpenses = expenses.reduce((s, e) => s + e.amount + (parseInt(e.tax) || 0), 0) / LOOKBACK;
    const avgMonthlyPayroll = (payrollAgg._sum.amount ?? 0) / LOOKBACK;

    const receivables = new Array(horizon).fill(0);
    const payables = new Array(horizon).fill(0);
    let overdueReceivables = 0;
    let overduePayables = 0;

    for (const inv of invoices) {
      const outstanding = inv.total - inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      if (outstanding <= 0) continue;
      if (inv.dueDate < asOf) { overdueReceivables += outstanding; receivables[0] += outstanding; continue; }
      if (inv.dueDate >= horizonEnd) continue;
      receivables[Math.max(0, bucketIndex(inv.dueDate))] += outstanding;
    }
    for (const bill of bills) {
      const outstanding = bill.total - bill.paymentsMade.reduce((s, p) => s + p.amount, 0);
      if (outstanding <= 0) continue;
      if (bill.dueDate < asOf) { overduePayables += outstanding; payables[0] += outstanding; continue; }
      if (bill.dueDate >= horizonEnd) continue;
      payables[Math.max(0, bucketIndex(bill.dueDate))] += outstanding;
    }

    const daysInFirst = new Date(asOf.getFullYear(), asOf.getMonth() + 1, 0).getDate();
    const firstFraction = (daysInFirst - asOf.getDate() + 1) / daysInFirst;

    const buckets: CashFlowForecastBucketDto[] = [];
    let running = currentCash;
    let recurringExpensesTotal = 0;
    let recurringPayrollTotal = 0;
    for (let i = 0; i < horizon; i++) {
      const d = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
      const fraction = i === 0 ? firstFraction : 1;
      const recurringIn = avgMonthlyReceipts * fraction;
      const recurringExp = avgMonthlyExpenses * fraction;
      const recurringPay = avgMonthlyPayroll * fraction;
      recurringExpensesTotal += recurringExp;
      recurringPayrollTotal += recurringPay;
      const inTotal = receivables[i] + recurringIn;
      const outTotal = payables[i] + recurringExp + recurringPay;
      const opening = running;
      running = opening + inTotal - outTotal;
      buckets.push({
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        openingCash: round(opening),
        inflows: { receivables: round(receivables[i]), recurring: round(recurringIn), total: round(inTotal) },
        outflows: { payables: round(payables[i]), recurring: round(recurringExp + recurringPay), total: round(outTotal) },
        net: round(inTotal - outTotal),
        closingCash: round(running),
      });
    }

    const totalInflows = buckets.reduce((s, b) => s + b.inflows.total, 0);
    const totalOutflows = buckets.reduce((s, b) => s + b.outflows.total, 0);
    const lowest = buckets.reduce<CashFlowForecastBucketDto | null>((min, b) => (!min || b.closingCash < min.closingCash ? b : min), null);

    return {
      asOfDate: asOf.toISOString(),
      months: horizon,
      method: {
        lookbackMonths: LOOKBACK,
        lookbackStart: lookbackStart.toISOString(),
        lookbackEnd: new Date(lookbackEnd.getTime() - 1).toISOString(),
        avgMonthlyReceipts: round(avgMonthlyReceipts),
        avgMonthlyExpenses: round(avgMonthlyExpenses),
        avgMonthlyPayroll: round(avgMonthlyPayroll),
      },
      summary: {
        currentCash: round(currentCash),
        totalInflows: round(totalInflows),
        totalOutflows: round(totalOutflows),
        netChange: round(totalInflows - totalOutflows),
        endingCash: round(running),
        overdueReceivables: round(overdueReceivables),
        overduePayables: round(overduePayables),
        lowestCash: lowest ? lowest.closingCash : round(currentCash),
        lowestCashMonth: lowest?.label ?? null,
      },
      inflowBreakdown: {
        receivables: round(receivables.reduce((s, v) => s + v, 0)),
        recurring: round(buckets.reduce((s, b) => s + b.inflows.recurring, 0)),
      },
      outflowBreakdown: {
        payables: round(payables.reduce((s, v) => s + v, 0)),
        recurringExpenses: round(recurringExpensesTotal),
        recurringPayroll: round(recurringPayrollTotal),
      },
      buckets,
    };
  }

  // ─── Movement of Equity ──────────────────────────────────────────────────────

  /**
   * Statement of changes in equity, built on exactly the Balance Sheet basis
   * (ledger transactions, credit-normal equity, retained earnings = cumulative
   * revenue − expenses), so the closing total always equals the Balance
   * Sheet's total equity at endDate.
   */
  async getMovementOfEquity(entityId: string, startDate: Date, endDate: Date): Promise<MovementOfEquityDto> {
    const accounts = await this.prisma.account.findMany({
      where: { entityId, subCategory: { category: { type: { code: { in: ['3000', '4000', '5000'] } } } } },
      select: { id: true, subCategory: { select: { code: true, category: { select: { type: { select: { code: true } } } } } } },
    });

    const [preAggs, periodAggs, balanceSheet] = await Promise.all([
      this.prisma.accountTransaction.groupBy({
        by: ['accountId'],
        where: { entityId, status: { not: 'Failed' as any }, date: { lt: startDate } },
        _sum: { debitAmount: true, creditAmount: true },
      }),
      this.prisma.accountTransaction.groupBy({
        by: ['accountId'],
        where: { entityId, status: { not: 'Failed' as any }, date: { gte: startDate, lte: endDate } },
        _sum: { debitAmount: true, creditAmount: true },
      }),
      this.getBalanceSheet(entityId, endDate),
    ]);

    // Credit-normal net (credit − debit) per account
    const toMap = (aggs: typeof preAggs) => {
      const m = new Map<string, number>();
      for (const a of aggs) m.set(a.accountId, (a._sum.creditAmount ?? 0) - (a._sum.debitAmount ?? 0));
      return m;
    };
    const pre = toMap(preAggs);
    const period = toMap(periodAggs);

    const COMPONENT_OF_SUB: Record<string, string> = {
      '3110': 'shareCapital',
      '3120': 'retainedEarnings',
      '3130': 'retainedEarnings',
      '3140': 'openingBalanceEquity',
    };
    const componentFor = (subCode: string) => COMPONENT_OF_SUB[subCode] ?? 'otherReserves';

    const opening: Record<string, number> = { shareCapital: 0, retainedEarnings: 0, openingBalanceEquity: 0, otherReserves: 0 };
    const movement = {
      profit: { retainedEarnings: 0 } as Record<string, number>,
      dividends: { retainedEarnings: 0 } as Record<string, number>,
      capital: { shareCapital: 0 } as Record<string, number>,
      openingBalances: { openingBalanceEquity: 0 } as Record<string, number>,
      other: { retainedEarnings: 0, otherReserves: 0 } as Record<string, number>,
    };

    for (const acc of accounts) {
      const type = acc.subCategory.category.type.code;
      const preNet = pre.get(acc.id) ?? 0;
      const periodNet = period.get(acc.id) ?? 0;
      if (type === '4000' || type === '5000') {
        // Revenue (credit-normal) adds, expenses (debit-normal) subtract — credit−debit covers both
        opening.retainedEarnings += preNet;
        movement.profit.retainedEarnings += periodNet;
        continue;
      }
      const sub = acc.subCategory.code;
      const comp = componentFor(sub);
      opening[comp] += preNet;
      if (sub === '3110') movement.capital.shareCapital += periodNet;
      else if (sub === '3130') movement.dividends.retainedEarnings += periodNet;
      else if (sub === '3140') movement.openingBalances.openingBalanceEquity += periodNet;
      else if (sub === '3120') movement.other.retainedEarnings += periodNet;
      else movement.other.otherReserves += periodNet;
    }

    const allKeys = ['shareCapital', 'retainedEarnings', 'openingBalanceEquity', 'otherReserves'];
    const closing: Record<string, number> = {};
    for (const k of allKeys) {
      closing[k] = opening[k] + Object.values(movement).reduce((s, m) => s + (m[k] ?? 0), 0);
    }

    // Always show share capital + retained earnings; other columns only when used
    const LABELS: Record<string, string> = {
      shareCapital: 'Share Capital',
      retainedEarnings: 'Retained Earnings',
      openingBalanceEquity: 'Opening Balance Equity',
      otherReserves: 'Other Reserves',
    };
    const keys = allKeys.filter((k) => k === 'shareCapital' || k === 'retainedEarnings' || Math.abs(opening[k]) > 0.005 || Math.abs(closing[k]) > 0.005);

    const round = (n: number) => Math.round(n * 100) / 100;
    const row = (key: EquityMovementRowDto['key'], label: string, src: Record<string, number>): EquityMovementRowDto => {
      const amounts: Record<string, number> = {};
      let total = 0;
      for (const k of keys) { amounts[k] = round(src[k] ?? 0); total += src[k] ?? 0; }
      amounts.total = round(total);
      return { key, label, amounts };
    };

    const rows: EquityMovementRowDto[] = [
      row('opening', 'Balance at beginning of period', opening),
      row('profit', 'Profit / (loss) for the period', movement.profit),
      row('dividends', 'Dividends', movement.dividends),
      row('capital', 'Share capital issued / (withdrawn)', movement.capital),
      row('openingBalances', 'Opening balances brought forward', movement.openingBalances),
      row('other', 'Other movements', movement.other),
      row('closing', 'Balance at end of period', closing),
    ];

    const openingTotal = rows[0].amounts.total;
    const closingTotal = rows[rows.length - 1].amounts.total;
    const balanceSheetEquity = round(balanceSheet.equity.total);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      components: keys.map((k) => ({ key: k, label: LABELS[k] })),
      rows,
      summary: {
        openingTotal,
        closingTotal,
        netChange: round(closingTotal - openingTotal),
        profitForPeriod: rows[1].amounts.total,
      },
      balanceSheetEquity,
      isReconciled: Math.abs(closingTotal - balanceSheetEquity) < 1,
    };
  }

  // ─── Sales Tax Summary ───────────────────────────────────────────────────────

  /**
   * Output VAT (invoices + income receipts, at each document's own rate) vs
   * input VAT (bills + expenses, which record tax as an amount) for a period,
   * from the source documents. `ledgerNetMovement` is the posted movement on
   * the VAT account (2140) for cross-checking unposted documents.
   */
  async getSalesTaxSummary(entityId: string, startDate: Date, endDate: Date): Promise<SalesTaxSummaryDto> {
    const round = (n: number) => Math.round(n * 100) / 100;
    const trendStart = new Date(Math.min(startDate.getTime(), new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1).getTime()));

    const [invoices, receipts, bills, expenses, vatAccounts] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { entityId, status: { notIn: ['Draft'] as any }, invoiceDate: { gte: trendStart, lte: endDate } },
        select: { id: true, invoiceNumber: true, invoiceDate: true, subtotal: true, tax: true, taxRate: true, customerName: true, customer: { select: { name: true } } },
      }),
      this.prisma.receipt.findMany({
        where: { entityId, status: 'Completed' as any, date: { gte: trendStart, lte: endDate } },
        select: { id: true, receiptNumber: true, date: true, subtotal: true, tax: true, taxRate: true, customerName: true, customer: { select: { name: true } } },
      }),
      this.prisma.bills.findMany({
        where: { entityId, status: { not: 'draft' as any }, billDate: { gte: trendStart, lte: endDate } },
        select: { id: true, billNumber: true, billDate: true, subtotal: true, tax: true, vendorName: true, vendor: { select: { name: true } } },
      }),
      this.prisma.expenses.findMany({
        where: { entityId, status: 'approved' as any, date: { gte: trendStart, lte: endDate } },
        select: { id: true, reference: true, date: true, amount: true, tax: true, vendorName: true, vendor: { select: { name: true } } },
      }),
      this.prisma.account.findMany({ where: { entityId, subCategory: { code: '2140' } }, select: { id: true } }),
    ]);

    // Taxable base of rated documents: tax only applies to taxable lines, so derive it from tax ÷ rate
    const ratedBase = (tax: number, rate: number, subtotal: number) => (tax > 0 ? (rate > 0 ? (tax * 100) / rate : subtotal) : 0);

    type Doc = SalesTaxTransactionDto & { source: SalesTaxRateRowDto['source']; when: Date };
    const docs: Doc[] = [
      ...invoices.map((d) => ({
        id: d.id, when: d.invoiceDate, date: d.invoiceDate.toISOString(), type: 'Invoice' as const, direction: 'Output' as const,
        source: 'Invoices' as const, reference: d.invoiceNumber, party: d.customer?.name ?? d.customerName ?? '',
        rate: d.taxRate, taxableAmount: ratedBase(d.tax, d.taxRate, d.subtotal), tax: d.tax,
      })),
      ...receipts.map((d) => ({
        id: d.id, when: d.date, date: d.date.toISOString(), type: 'Income Receipt' as const, direction: 'Output' as const,
        source: 'Income Receipts' as const, reference: d.receiptNumber, party: d.customer?.name ?? d.customerName ?? '',
        rate: d.taxRate, taxableAmount: ratedBase(d.tax, d.taxRate, d.subtotal), tax: d.tax,
      })),
      ...bills.map((d) => ({
        id: d.id, when: d.billDate, date: d.billDate.toISOString(), type: 'Bill' as const, direction: 'Input' as const,
        source: 'Bills' as const, reference: d.billNumber, party: d.vendor?.name ?? d.vendorName ?? '',
        rate: null, taxableAmount: d.tax > 0 ? d.subtotal : 0, tax: d.tax,
      })),
      ...expenses.map((d) => {
        const tax = parseInt(d.tax) || 0;
        return {
          id: d.id, when: d.date, date: d.date.toISOString(), type: 'Expense' as const, direction: 'Input' as const,
          source: 'Expenses' as const, reference: d.reference, party: d.vendor?.name ?? d.vendorName ?? '',
          rate: null, taxableAmount: tax > 0 ? d.amount : 0, tax,
        };
      }),
    ];

    const inPeriod = docs.filter((d) => d.when >= startDate && d.when <= endDate && d.tax > 0);

    const rateMap = new Map<string, SalesTaxRateRowDto>();
    for (const d of inPeriod) {
      const key = `${d.source}|${d.rate ?? ''}`;
      if (!rateMap.has(key)) rateMap.set(key, { direction: d.direction, source: d.source, rate: d.rate, documentCount: 0, taxableAmount: 0, tax: 0 });
      const r = rateMap.get(key)!;
      r.documentCount++;
      r.taxableAmount += d.taxableAmount;
      r.tax += d.tax;
    }
    const byRate = Array.from(rateMap.values())
      .map((r) => ({ ...r, taxableAmount: round(r.taxableAmount), tax: round(r.tax) }))
      .sort((a, b) => (a.direction === b.direction ? (b.rate ?? 0) - (a.rate ?? 0) : a.direction === 'Output' ? -1 : 1));

    const outputTax = inPeriod.filter((d) => d.direction === 'Output').reduce((s, d) => s + d.tax, 0);
    const inputTax = inPeriod.filter((d) => d.direction === 'Input').reduce((s, d) => s + d.tax, 0);
    const taxableSales = inPeriod.filter((d) => d.direction === 'Output').reduce((s, d) => s + d.taxableAmount, 0);
    const taxablePurchases = inPeriod.filter((d) => d.direction === 'Input').reduce((s, d) => s + d.taxableAmount, 0);

    const trend: SalesTaxSummaryDto['trend'] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const me = new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 1);
      const monthDocs = docs.filter((d) => d.when >= ms && d.when < me);
      const out = monthDocs.filter((d) => d.direction === 'Output').reduce((s, d) => s + d.tax, 0);
      const inp = monthDocs.filter((d) => d.direction === 'Input').reduce((s, d) => s + d.tax, 0);
      trend.push({
        month: `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}`,
        label: ms.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        outputTax: round(out), inputTax: round(inp), net: round(out - inp),
      });
    }

    let ledgerNetMovement = 0;
    if (vatAccounts.length) {
      const agg = await this.prisma.accountTransaction.aggregate({
        where: { entityId, accountId: { in: vatAccounts.map((a) => a.id) }, status: { not: 'Failed' as any }, date: { gte: startDate, lte: endDate } },
        _sum: { debitAmount: true, creditAmount: true },
      });
      ledgerNetMovement = (agg._sum.creditAmount ?? 0) - (agg._sum.debitAmount ?? 0);
    }

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: {
        outputTax: round(outputTax),
        inputTax: round(inputTax),
        netTaxPayable: round(outputTax - inputTax),
        taxableSales: round(taxableSales),
        taxablePurchases: round(taxablePurchases),
        effectiveOutputRate: taxableSales > 0 ? round((outputTax / taxableSales) * 100) : 0,
        ledgerNetMovement: round(ledgerNetMovement),
      },
      byRate,
      trend,
      transactions: inPeriod
        .sort((a, b) => b.when.getTime() - a.when.getTime())
        .slice(0, 200)
        .map(({ when, source, ...t }) => ({ ...t, taxableAmount: round(t.taxableAmount) })),
    };
  }

  // ─── Tax Liability Report ────────────────────────────────────────────────────

  /**
   * Tax liabilities from ledger balances of the tax payable accounts. For each
   * tax: opening balance at startDate, accrued (credits) in the period, input
   * VAT offset (bill/expense debits — VAT only), paid (every other debit, i.e.
   * remittances), closing balance at endDate.
   */
  async getTaxLiabilityReport(entityId: string, startDate: Date, endDate: Date): Promise<TaxLiabilityReportDto> {
    const round = (n: number) => Math.round(n * 100) / 100;
    // dueDay: statutory remittance day of the following month (Nigeria: VAT 21st, PAYE 10th)
    const TAXES = [
      { key: 'vat', taxType: 'VAT (output less input)', authority: 'FIRS', sub: '2140', dueDay: 21 },
      { key: 'paye', taxType: 'PAYE', authority: 'State Internal Revenue Service', sub: '2160', dueDay: 10 },
      { key: 'pension', taxType: 'Pension (employee)', authority: 'Pension Fund Administrator', sub: '2170', dueDay: null },
      { key: 'nhf', taxType: 'NHF', authority: 'Federal Mortgage Bank of Nigeria', sub: '2180', dueDay: null },
      { key: 'nhis', taxType: 'NHIS', authority: 'NHIA', sub: '2190', dueDay: null },
      { key: 'otherDeductions', taxType: 'Other payroll deductions', authority: 'Various', sub: '2195', dueDay: null },
    ] as const;

    const accounts = await this.prisma.account.findMany({
      where: { entityId, subCategory: { code: { in: TAXES.map((t) => t.sub) } } },
      select: { id: true, code: true, subCategory: { select: { code: true } } },
    });
    const accountsBySub = new Map<string, { id: string; code: string }[]>();
    for (const a of accounts) {
      const list = accountsBySub.get(a.subCategory.code) ?? [];
      list.push({ id: a.id, code: a.code });
      accountsBySub.set(a.subCategory.code, list);
    }
    const subOfAccount = new Map(accounts.map((a) => [a.id, a.subCategory.code]));

    const trendStart = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);
    const txns = accounts.length
      ? await this.prisma.accountTransaction.findMany({
          where: { entityId, accountId: { in: accounts.map((a) => a.id) }, status: { not: 'Failed' as any }, date: { lte: endDate } },
          select: { accountId: true, date: true, type: true, debitAmount: true, creditAmount: true },
        })
      : [];

    const INPUT_TYPES = new Set(['BILL_POSTING', 'EXPENSE_POSTING']);
    const rows: TaxLiabilityRowDto[] = TAXES.filter((t) => accountsBySub.has(t.sub)).map((t) => {
      let opening = 0, accrued = 0, inputCredit = 0, paid = 0;
      for (const tx of txns) {
        if (subOfAccount.get(tx.accountId) !== t.sub) continue;
        if (tx.date < startDate) { opening += tx.creditAmount - tx.debitAmount; continue; }
        accrued += tx.creditAmount;
        if (INPUT_TYPES.has(tx.type as string)) inputCredit += tx.debitAmount;
        else paid += tx.debitAmount;
      }
      const closing = opening + accrued - inputCredit - paid;
      const status: TaxLiabilityRowDto['status'] = closing > 0.5 ? 'Outstanding' : closing < -0.5 ? 'Refundable' : 'Settled';
      return {
        key: t.key,
        taxType: t.taxType,
        authority: t.authority,
        accountCodes: (accountsBySub.get(t.sub) ?? []).map((a) => a.code),
        openingBalance: round(opening),
        accrued: round(accrued),
        inputCredit: round(inputCredit),
        paid: round(paid),
        closingBalance: round(closing),
        nextDueDate: t.dueDay && status === 'Outstanding'
          ? new Date(endDate.getFullYear(), endDate.getMonth() + 1, t.dueDay).toISOString()
          : null,
        status,
      };
    });

    const trend: TaxLiabilityReportDto['trend'] = [];
    for (let i = 5; i >= 0; i--) {
      const ms = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const monthEnd = i === 0 ? endDate : new Date(endDate.getFullYear(), endDate.getMonth() - i + 1, 0, 23, 59, 59, 999);
      if (monthEnd < trendStart) continue;
      const byType: Record<string, number> = {};
      for (const t of TAXES) {
        if (!accountsBySub.has(t.sub)) continue;
        byType[t.key] = round(
          txns
            .filter((tx) => subOfAccount.get(tx.accountId) === t.sub && tx.date <= monthEnd)
            .reduce((s, tx) => s + tx.creditAmount - tx.debitAmount, 0),
        );
      }
      trend.push({
        month: `${ms.getFullYear()}-${String(ms.getMonth() + 1).padStart(2, '0')}`,
        label: ms.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
        total: round(Object.values(byType).reduce((s, v) => s + v, 0)),
        byType,
      });
    }

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      summary: {
        totalLiability: round(rows.reduce((s, r) => s + Math.max(0, r.closingBalance), 0)),
        totalAccrued: round(rows.reduce((s, r) => s + r.accrued, 0)),
        totalPaid: round(rows.reduce((s, r) => s + r.paid, 0)),
        totalInputCredit: round(rows.reduce((s, r) => s + r.inputCredit, 0)),
        outstandingCount: rows.filter((r) => r.status === 'Outstanding').length,
      },
      rows,
      trend,
      missingAccounts: TAXES.filter((t) => !accountsBySub.has(t.sub)).map((t) => t.taxType),
    };
  }
}
