import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  PLAccountLineDto,
  PLSectionDto,
  PLKPIEntryDto,
  ProfitAndLossDto,
  CFEntryDto,
  CashFlowStatementDto,
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

  constructor(private readonly prisma: PrismaService) {}

  async getProfitAndLoss(
    entityId: string,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): Promise<ProfitAndLossDto> {
    const [actual, comparison] = await Promise.all([
      this.fetchPLSections(entityId, startDate, endDate),
      compareStartDate && compareEndDate
        ? this.fetchPLSections(entityId, compareStartDate, compareEndDate)
        : Promise.resolve(null),
    ]);

    return this.buildResponse(
      actual,
      comparison,
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
  ): PLSectionDto {
    const merged = new Map<string, PLAccountLineDto>();

    for (const acc of actualSection.accounts.values()) {
      merged.set(acc.id, {
        id: acc.id,
        name: acc.name,
        code: acc.code,
        actual: (acc as any).net ?? 0,
        comparison: 0,
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
          });
        }
      }
    }

    return {
      actual: actualSection.total,
      comparison: compSection?.total ?? 0,
      accounts: Array.from(merged.values()).sort((a, b) => b.actual - a.actual),
    };
  }

  private buildResponse(
    actual: SectionMap,
    comparison: SectionMap | null,
    startDate: Date,
    endDate: Date,
    compareStartDate?: Date,
    compareEndDate?: Date,
  ): ProfitAndLossDto {
    const revenue = this.buildSection(
      actual[CATEGORY_CODES.OPERATING_REVENUE],
      comparison?.[CATEGORY_CODES.OPERATING_REVENUE],
    );
    const otherIncome = this.buildSection(
      actual[CATEGORY_CODES.OTHER_INCOME],
      comparison?.[CATEGORY_CODES.OTHER_INCOME],
    );
    const cogs = this.buildSection(
      actual[CATEGORY_CODES.COGS],
      comparison?.[CATEGORY_CODES.COGS],
    );
    const operatingExpenses = this.buildSection(
      actual[CATEGORY_CODES.OPERATING_EXPENSES],
      comparison?.[CATEGORY_CODES.OPERATING_EXPENSES],
    );
    const otherExpenses = this.buildSection(
      actual[CATEGORY_CODES.OTHER_EXPENSES],
      comparison?.[CATEGORY_CODES.OTHER_EXPENSES],
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
}
