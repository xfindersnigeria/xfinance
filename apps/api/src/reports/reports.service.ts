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
}
