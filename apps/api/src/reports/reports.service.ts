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
  ExpenseByCategoryDto,
  ExpenseByVendorDto,
  BillDetailsDto,
  BankReconciliationSummaryDto,
  BankAccountTransactionsDto,
  SuppliesInventoryReportDto,
  SuppliesConsumptionByDeptDto,
  SuppliesConsumptionByProjectDto,
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
        select: { customerId: true, total: true, customer: { select: { name: true } } },
      }),
      this.prisma.invoice.findMany({
        where: { entityId, invoiceDate: { gte: prevStart, lte: prevEnd }, status: { not: 'Draft' as any } },
        select: { customerId: true, total: true },
      }),
    ]);

    const prevMap = new Map<string, number>();
    for (const inv of prevInvoices) {
      prevMap.set(inv.customerId, (prevMap.get(inv.customerId) ?? 0) + inv.total);
    }

    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const inv of invoices) {
      const existing = map.get(inv.customerId);
      if (existing) { existing.total += inv.total; existing.count++; }
      else map.set(inv.customerId, { name: inv.customer.name, total: inv.total, count: 1 });
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
        customerName: inv.customer.name,
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
      const key = inv.customerId;
      if (!custMap.has(key)) {
        custMap.set(key, {
          customerId: inv.customer.id, customerName: inv.customer.name,
          paymentTerms: inv.customer.paymentTerms, creditLimit: inv.customer.creditLimit,
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
      const key = inv.customerId;
      if (!customerMap.has(key)) customerMap.set(key, { name: inv.customer.name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120p: 0 });
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

  async getCustomerBalances(entityId: string, asOfDate: Date): Promise<CustomerBalancesDto> {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, invoiceDate: { lte: asOfDate }, status: { not: 'Draft' as any } },
      include: { customer: { select: { name: true } }, paymentReceived: { select: { amount: true } } },
    });

    const map = new Map<string, { name: string; invoiced: number; received: number }>();
    for (const inv of invoices) {
      const paid = inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      const existing = map.get(inv.customerId);
      if (existing) { existing.invoiced += inv.total; existing.received += paid; }
      else map.set(inv.customerId, { name: inv.customer.name, invoiced: inv.total, received: paid });
    }

    const rows = Array.from(map.entries()).map(([customerId, d]) => ({
      customerId, customerName: d.name,
      totalInvoiced: d.invoiced, totalReceived: d.received, balance: d.invoiced - d.received,
    })).sort((a, b) => b.balance - a.balance);

    return {
      asOfDate: asOfDate.toISOString(),
      totalInvoiced: rows.reduce((s, r) => s + r.totalInvoiced, 0),
      totalReceived: rows.reduce((s, r) => s + r.totalReceived, 0),
      totalBalance: rows.reduce((s, r) => s + r.balance, 0),
      rows,
    };
  }

  // ─── Payment Method Summary ───────────────────────────────────────────────────

  async getPaymentMethodSummary(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<PaymentMethodSummaryDto> {
    const payments = await this.prisma.paymentReceived.findMany({
      where: { entityId, paidAt: { gte: startDate, lte: endDate } },
      select: { paymentMethod: true, amount: true },
    });

    const map = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const key = p.paymentMethod || 'Unknown';
      const existing = map.get(key);
      if (existing) { existing.total += p.amount; existing.count++; }
      else map.set(key, { total: p.amount, count: 1 });
    }

    const totalReceived = payments.reduce((s, p) => s + p.amount, 0);
    const rows = Array.from(map.entries()).map(([paymentMethod, d]) => ({
      paymentMethod, totalAmount: d.total, transactionCount: d.count,
      percentOfTotal: totalReceived > 0 ? Math.round((d.total / totalReceived) * 10000) / 100 : 0,
    })).sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalReceived, transactionCount: payments.length, rows,
    };
  }

  // ─── Payable Summary ──────────────────────────────────────────────────────────

  async getPayableSummary(entityId: string, asOfDate: Date): Promise<PayableSummaryDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: asOfDate }, status: { not: 'draft' as any } },
      include: { vendor: { select: { name: true } }, paymentRecord: { select: { amount: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const rows = bills.map((bill) => {
      const paid = bill.paymentRecord.reduce((s, p) => s + p.amount, 0);
      const outstanding = bill.total - paid;
      const daysOverdue = outstanding > 0 ? Math.max(0, Math.floor((asOfDate.getTime() - bill.dueDate.getTime()) / 86400000)) : 0;
      return { billId: bill.id, billNumber: bill.billNumber, vendorName: bill.vendor.name, billDate: bill.billDate.toISOString(), dueDate: bill.dueDate.toISOString(), total: bill.total, paid, outstanding, daysOverdue, status: bill.status as string };
    }).filter(r => r.outstanding > 0);

    const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0);
    const totalCurrent = rows.filter(r => r.daysOverdue === 0).reduce((s, r) => s + r.outstanding, 0);
    const totalOverdue = rows.filter(r => r.daysOverdue > 0).reduce((s, r) => s + r.outstanding, 0);
    const totalBilled = bills.reduce((s, b) => s + b.total, 0);

    return {
      asOfDate: asOfDate.toISOString(),
      totalOutstanding, totalCurrent, totalOverdue, totalBilled,
      overduePercentage: totalOutstanding > 0 ? Math.round((totalOverdue / totalOutstanding) * 10000) / 100 : 0,
      rows,
    };
  }

  // ─── Aged Payables ────────────────────────────────────────────────────────────

  async getAgedPayables(entityId: string, asOfDate: Date): Promise<AgedPayablesDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: asOfDate }, status: { not: 'draft' as any } },
      include: { vendor: { select: { name: true } }, paymentRecord: { select: { amount: true } } },
    });

    const vendorMap = new Map<string, { name: string; current: number; d1_30: number; d31_60: number; d61_90: number; d91_120: number; d120p: number }>();

    for (const bill of bills) {
      const paid = bill.paymentRecord.reduce((s, p) => s + p.amount, 0);
      const outstanding = bill.total - paid;
      if (outstanding <= 0) continue;

      const days = Math.floor((asOfDate.getTime() - bill.dueDate.getTime()) / 86400000);
      const key = bill.vendorId;
      if (!vendorMap.has(key)) vendorMap.set(key, { name: bill.vendor.name, current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d91_120: 0, d120p: 0 });
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

  async getVendorBalances(entityId: string, asOfDate: Date): Promise<VendorBalancesDto> {
    const bills = await this.prisma.bills.findMany({
      where: { entityId, billDate: { lte: asOfDate }, status: { not: 'draft' as any } },
      include: { vendor: { select: { name: true } }, paymentRecord: { select: { amount: true } } },
    });

    const map = new Map<string, { name: string; billed: number; paid: number }>();
    for (const bill of bills) {
      const paid = bill.paymentRecord.reduce((s, p) => s + p.amount, 0);
      const existing = map.get(bill.vendorId);
      if (existing) { existing.billed += bill.total; existing.paid += paid; }
      else map.set(bill.vendorId, { name: bill.vendor.name, billed: bill.total, paid });
    }

    const rows = Array.from(map.entries()).map(([vendorId, d]) => ({
      vendorId, vendorName: d.name,
      totalBilled: d.billed, totalPaid: d.paid, balance: d.billed - d.paid,
    })).sort((a, b) => b.balance - a.balance);

    return {
      asOfDate: asOfDate.toISOString(),
      totalBilled: rows.reduce((s, r) => s + r.totalBilled, 0),
      totalPaid: rows.reduce((s, r) => s + r.totalPaid, 0),
      totalBalance: rows.reduce((s, r) => s + r.balance, 0),
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
      select: { vendorId: true, total: true, vendor: { select: { name: true } } },
    });

    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const bill of bills) {
      const existing = map.get(bill.vendorId);
      if (existing) { existing.total += bill.total; existing.count++; }
      else map.set(bill.vendorId, { name: bill.vendor.name, total: bill.total, count: 1 });
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
        vendorName: bill.vendor.name,
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
}
