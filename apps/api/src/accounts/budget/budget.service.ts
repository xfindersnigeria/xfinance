import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBulkBudgetDto } from './dto/budget.dto';
import { PrismaService } from '@/prisma/prisma.service';

// ── Period helpers ────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTER_RANGES: Record<string, { start: number; end: number }> = {
  Q1: { start: 0, end: 2 },
  Q2: { start: 3, end: 5 },
  Q3: { start: 6, end: 8 },
  Q4: { start: 9, end: 11 },
};

// Categories where credit represents positive activity (revenue / inflows)
const CREDIT_NORMAL = new Set(['Revenue', 'Liability', 'Equity', 'Income']);

function getDateRange(
  periodType: string,
  period: string,
  fiscalYear: string,
): { start: Date; end: Date } {
  const year = parseInt(fiscalYear, 10);
  if (isNaN(year)) return { start: new Date(0), end: new Date() };

  if (periodType === 'Monthly') {
    const idx = MONTHS.findIndex(
      (m) => m.toLowerCase() === (period ?? '').toLowerCase(),
    );
    if (idx === -1) return { start: new Date(0), end: new Date() };
    return {
      start: new Date(year, idx, 1),
      end: new Date(year, idx + 1, 0, 23, 59, 59, 999),
    };
  }

  if (periodType === 'Quarterly') {
    const range = QUARTER_RANGES[(period ?? '').toUpperCase()];
    if (!range) return { start: new Date(0), end: new Date() };
    return {
      start: new Date(year, range.start, 1),
      end: new Date(year, range.end + 1, 0, 23, 59, 59, 999),
    };
  }

  // Yearly
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

function getPreviousPeriodValues(
  periodType: string,
  period: string,
  fiscalYear: string,
): { period: string; fiscalYear: string } {
  const year = parseInt(fiscalYear, 10);

  if (periodType === 'Monthly') {
    const idx = MONTHS.findIndex(
      (m) => m.toLowerCase() === (period ?? '').toLowerCase(),
    );
    if (idx <= 0) return { period: MONTHS[11], fiscalYear: String(year - 1) };
    return { period: MONTHS[idx - 1], fiscalYear };
  }

  if (periodType === 'Quarterly') {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const qi = quarters.indexOf((period ?? '').toUpperCase());
    if (qi <= 0) return { period: 'Q4', fiscalYear: String(year - 1) };
    return { period: quarters[qi - 1], fiscalYear };
  }

  // Yearly
  return { period: String(year - 1), fiscalYear: String(year - 1) };
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve budget amounts per account for a given date range.
   * Used by the reports service to populate the "budget" column on P&L lines.
   *
   * Strategy:
   *  1. Detect the period type from the date range length.
   *  2. Try exact match (e.g. Quarterly "Q1 2026").
   *  3. If no quarterly budget exists, sum the constituent monthly budgets.
   *  4. For a full-year range, try Yearly; fall back to summing all monthly/quarterly.
   *
   * Returns: Map<accountId, budgetAmountInCurrency> (amounts already divided by 100)
   */
  async resolveBudgetForDateRange(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, number>> {
    const fiscalYear = String(startDate.getFullYear());
    const diffDays = Math.round(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // ── Monthly (up to 31 days) ──────────────────────────────────────────────
    if (diffDays <= 31) {
      const monthName = MONTHS[startDate.getMonth()];
      const rows = await this.prisma.budget.findMany({
        where: { entityId, periodType: 'Monthly', month: monthName, fiscalYear },
        select: { accountId: true, amount: true },
      });
      return this.aggregateToCurrencyMap(rows);
    }

    // ── Quarterly (32–95 days) ───────────────────────────────────────────────
    if (diffDays <= 95) {
      const startMonth = startDate.getMonth();
      const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterStartMonths = [0, 3, 6, 9];
      const qi = quarterStartMonths.indexOf(startMonth);
      const quarter = qi >= 0 ? quarterLabels[qi] : null;

      if (quarter) {
        // Try exact quarterly budget first
        const qRows = await this.prisma.budget.findMany({
          where: { entityId, periodType: 'Quarterly', month: quarter, fiscalYear },
          select: { accountId: true, amount: true },
        });
        if (qRows.length) return this.aggregateToCurrencyMap(qRows);

        // Fall back: sum the three monthly budgets that make up this quarter
        const range = QUARTER_RANGES[quarter];
        const months = MONTHS.slice(range.start, range.end + 1);
        const mRows = await this.prisma.budget.findMany({
          where: { entityId, periodType: 'Monthly', month: { in: months }, fiscalYear },
          select: { accountId: true, amount: true },
        });
        return this.aggregateToCurrencyMap(mRows);
      }
    }

    // ── Yearly (96+ days) ────────────────────────────────────────────────────
    const yRows = await this.prisma.budget.findMany({
      where: { entityId, periodType: 'Yearly', fiscalYear },
      select: { accountId: true, amount: true },
    });
    if (yRows.length) return this.aggregateToCurrencyMap(yRows);

    // Last resort: sum everything for the fiscal year across all period types
    const allRows = await this.prisma.budget.findMany({
      where: { entityId, fiscalYear },
      select: { accountId: true, amount: true },
    });
    return this.aggregateToCurrencyMap(allRows);
  }

  private aggregateToCurrencyMap(
    rows: { accountId: string; amount: number }[],
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.accountId, (map.get(row.accountId) ?? 0) + row.amount / 100);
    }
    return map;
  }

  /**
   * Replace all budget lines for an entity+period in a single transaction.
   * Validates that every accountId belongs to this entity before writing.
   */
  async createBulkBudgets(
    entityId: string,
    dto: CreateBulkBudgetDto,
    groupId: string,
  ) {
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one budget line is required');
    }

    const accountIds = dto.lines.map((l) => l.accountId);
    const validAccounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, entityId },
      select: { id: true },
    });

    const validIds = new Set(validAccounts.map((a) => a.id));
    const invalid = accountIds.filter((id) => !validIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `Accounts not found or access denied: ${invalid.join(', ')}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.budget.deleteMany({
        where: {
          entityId,
          periodType: dto.periodType,
          month: dto.month,
          fiscalYear: dto.fiscalYear,
        },
      });

      return tx.budget.createMany({
        data: dto.lines.map((line) => ({
          name: dto.name,
          periodType: dto.periodType,
          month: dto.month ?? dto.fiscalYear,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          entityId,
          groupId,
          accountId: line.accountId,
          amount: line.amount,
        })),
      });
    });

    return {
      message: `Budget set for ${dto.periodType} – ${dto.month ?? dto.fiscalYear} ${dto.fiscalYear}`,
      count: result.count,
    };
  }

  /**
   * List budgets for an entity with optional filters and pagination.
   */
  async findAll(
    entityId: string,
    params: {
      periodType?: string;
      period?: string;
      fiscalYear?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { periodType, period, fiscalYear, search } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { entityId };
    if (periodType) where.periodType = periodType;
    if (period) where.month = period;
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { account: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, budgets] = await Promise.all([
      this.prisma.budget.count({ where }),
      this.prisma.budget.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
              subCategory: {
                select: {
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        periodType: b.periodType,
        period: b.month,
        fiscalYear: b.fiscalYear,
        note: b.note,
        amount: b.amount / 100,
        accountId: b.accountId,
        accountCode: b.account.code,
        accountName: b.account.name,
        accountCategory: b.account.subCategory?.category?.name ?? '',
        createdAt: b.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Budget vs Actual for a given period.
   * Actual = net movement in the account's normal balance direction.
   */
  async getBudgetVsActual(
    entityId: string,
    params: {
      periodType?: string;
      period?: string;
      fiscalYear?: string;
    } = {},
  ) {
    // 'All' (or no periodType) → aggregate all budgets for the fiscal year
    const showAll = !params.periodType || params.periodType === 'All';
    const periodType = showAll ? 'All' : params.periodType!;
    const period = params.period ?? '';
    const fiscalYear = params.fiscalYear ?? String(new Date().getFullYear());

    const where: Record<string, any> = { entityId };
    if (!showAll) {
      where.periodType = periodType;
      where.month = period;
    }
    where.fiscalYear = fiscalYear;

    const budgets = await this.prisma.budget.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            subCategory: {
              select: {
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!budgets.length) {
      return {
        data: [],
        summary: { totalBudgeted: 0, totalActual: 0, totalVariance: 0 },
        periodType,
        period,
        fiscalYear,
      };
    }

    // Aggregate budgeted amounts per account (sum in case of duplicates)
    const budgetMap = new Map<
      string,
      {
        accountId: string;
        accountCode: string;
        accountName: string;
        categoryName: string;
        budgetedCents: number;
      }
    >();

    for (const b of budgets) {
      const cat = b.account.subCategory?.category?.name ?? '';
      const existing = budgetMap.get(b.accountId);
      if (existing) {
        existing.budgetedCents += b.amount;
      } else {
        budgetMap.set(b.accountId, {
          accountId: b.accountId,
          accountCode: b.account.code,
          accountName: b.account.name,
          categoryName: cat,
          budgetedCents: b.amount,
        });
      }
    }

    const { start, end } = showAll
      ? getDateRange('Yearly', '', fiscalYear)
      : getDateRange(periodType, period, fiscalYear);

    // Aggregate account transactions for the period
    const txGroups = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: {
        entityId,
        accountId: { in: [...budgetMap.keys()] },
        date: { gte: start, lte: end },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const txMap = new Map(
      txGroups.map((g) => [
        g.accountId,
        {
          debit: g._sum.debitAmount ?? 0,
          credit: g._sum.creditAmount ?? 0,
        },
      ]),
    );

    let totalBudgeted = 0;
    let totalActual = 0;

    const data = [...budgetMap.values()].map((b) => {
      const tx = txMap.get(b.accountId) ?? { debit: 0, credit: 0 };
      const isCreditNormal = CREDIT_NORMAL.has(b.categoryName);

      // Net movement in the expected direction — clamp to 0 for display
      const actualCents = Math.max(
        0,
        isCreditNormal
          ? tx.credit - tx.debit
          : tx.debit - tx.credit,
      );

      const budgeted = b.budgetedCents / 100;
      const actual = actualCents / 100;
      const variance = budgeted - actual;
      const variancePercentage =
        budgeted !== 0
          ? parseFloat(((variance / budgeted) * 100).toFixed(2))
          : 0;

      totalBudgeted += budgeted;
      totalActual += actual;

      return {
        accountId: b.accountId,
        account: `${b.accountCode} – ${b.accountName}`,
        accountCode: b.accountCode,
        accountName: b.accountName,
        accountCategory: b.categoryName,
        budgeted,
        actual,
        variance,
        variancePercentage,
      };
    });

    return {
      data,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance: totalBudgeted - totalActual,
      },
      periodType,
      period,
      fiscalYear,
    };
  }

  /**
   * Return budget lines from the previous period to support "Copy from Previous".
   */
  async getPreviousPeriod(
    entityId: string,
    params: { periodType: string; period: string; fiscalYear: string },
  ) {
    const { periodType, period, fiscalYear } = params;
    const prev = getPreviousPeriodValues(periodType, period, fiscalYear);

    const budgets = await this.prisma.budget.findMany({
      where: {
        entityId,
        periodType,
        month: prev.period,
        fiscalYear: prev.fiscalYear,
      },
      include: {
        account: { select: { id: true, name: true, code: true } },
      },
      orderBy: { account: { code: 'asc' } },
    });

    return {
      period: prev.period,
      fiscalYear: prev.fiscalYear,
      lines: budgets.map((b) => ({
        accountId: b.accountId,
        accountCode: b.account.code,
        accountName: b.account.name,
        amount: b.amount / 100,
      })),
    };
  }

  /**
   * Delete a single budget line by id, scoped to the entity.
   */
  async deleteBudget(id: string, entityId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, entityId },
    });
    if (!budget) throw new NotFoundException('Budget line not found');

    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Budget line deleted' };
  }

  // ── Group-scoped budget methods ────────────────────────────────────────────

  /**
   * Replace all group budget lines for a period in a single transaction.
   */
  async createGroupBulkBudgets(
    groupId: string,
    dto: CreateBulkBudgetDto,
  ) {
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one budget line is required');
    }

    const accountIds = dto.lines.map((l) => l.accountId);
    const validAccounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, groupId },
      select: { id: true },
    });

    const validIds = new Set(validAccounts.map((a) => a.id));
    const invalid = accountIds.filter((id) => !validIds.has(id));
    if (invalid.length) {
      throw new BadRequestException(
        `Accounts not found or access denied: ${invalid.join(', ')}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.groupBudget.deleteMany({
        where: {
          groupId,
          periodType: dto.periodType,
          period: dto.month ?? dto.fiscalYear,
          fiscalYear: dto.fiscalYear,
        },
      });

      return tx.groupBudget.createMany({
        data: dto.lines.map((line) => ({
          name: dto.name,
          periodType: dto.periodType,
          period: dto.month ?? dto.fiscalYear,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          groupId,
          accountId: line.accountId,
          amount: line.amount,
        })),
      });
    });

    return {
      message: `Group budget set for ${dto.periodType} – ${dto.month ?? dto.fiscalYear} ${dto.fiscalYear}`,
      count: result.count,
    };
  }

  /**
   * List group budgets with optional filters and pagination.
   */
  async findAllGroup(
    groupId: string,
    params: {
      periodType?: string;
      period?: string;
      fiscalYear?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { periodType, period, fiscalYear, search } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { groupId };
    if (periodType) where.periodType = periodType;
    if (period) where.period = period;
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { account: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, budgets] = await Promise.all([
      this.prisma.groupBudget.count({ where }),
      this.prisma.groupBudget.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
              subCategory: {
                select: {
                  name: true,
                  category: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: budgets.map((b) => ({
        id: b.id,
        name: b.name,
        periodType: b.periodType,
        period: b.period,
        fiscalYear: b.fiscalYear,
        note: b.note,
        amount: b.amount / 100,
        accountId: b.accountId,
        accountCode: b.account.code,
        accountName: b.account.name,
        accountCategory: b.account.subCategory?.category?.name ?? '',
        createdAt: b.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Group Budget vs Actual for a given period.
   */
  async getGroupBudgetVsActual(
    groupId: string,
    params: {
      periodType?: string;
      period?: string;
      fiscalYear?: string;
    } = {},
  ) {
    const showAll = !params.periodType || params.periodType === 'All';
    const periodType = showAll ? 'All' : params.periodType!;
    const period = params.period ?? '';
    const fiscalYear = params.fiscalYear ?? String(new Date().getFullYear());

    const where: Record<string, any> = { groupId };
    if (!showAll) {
      where.periodType = periodType;
      where.period = period;
    }
    where.fiscalYear = fiscalYear;

    const budgets = await this.prisma.groupBudget.findMany({
      where,
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            subCategory: {
              select: {
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!budgets.length) {
      return {
        data: [],
        summary: { totalBudgeted: 0, totalActual: 0, totalVariance: 0 },
        periodType,
        period,
        fiscalYear,
      };
    }

    const budgetMap = new Map<
      string,
      {
        accountId: string;
        accountCode: string;
        accountName: string;
        categoryName: string;
        budgetedCents: number;
      }
    >();

    for (const b of budgets) {
      const cat = b.account.subCategory?.category?.name ?? '';
      const existing = budgetMap.get(b.accountId);
      if (existing) {
        existing.budgetedCents += b.amount;
      } else {
        budgetMap.set(b.accountId, {
          accountId: b.accountId,
          accountCode: b.account.code,
          accountName: b.account.name,
          categoryName: cat,
          budgetedCents: b.amount,
        });
      }
    }

    const { start, end } = showAll
      ? getDateRange('Yearly', '', fiscalYear)
      : getDateRange(periodType, period, fiscalYear);

    const txGroups = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: {
        groupId,
        accountId: { in: [...budgetMap.keys()] },
        date: { gte: start, lte: end },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const txMap = new Map(
      txGroups.map((g) => [
        g.accountId,
        {
          debit: g._sum.debitAmount ?? 0,
          credit: g._sum.creditAmount ?? 0,
        },
      ]),
    );

    let totalBudgeted = 0;
    let totalActual = 0;

    const data = [...budgetMap.values()].map((b) => {
      const tx = txMap.get(b.accountId) ?? { debit: 0, credit: 0 };
      const isCreditNormal = CREDIT_NORMAL.has(b.categoryName);

      const actualCents = Math.max(
        0,
        isCreditNormal
          ? tx.credit - tx.debit
          : tx.debit - tx.credit,
      );

      const budgeted = b.budgetedCents / 100;
      const actual = actualCents / 100;
      const variance = budgeted - actual;
      const variancePercentage =
        budgeted !== 0
          ? parseFloat(((variance / budgeted) * 100).toFixed(2))
          : 0;

      totalBudgeted += budgeted;
      totalActual += actual;

      return {
        accountId: b.accountId,
        account: `${b.accountCode} – ${b.accountName}`,
        accountCode: b.accountCode,
        accountName: b.accountName,
        accountCategory: b.categoryName,
        budgeted,
        actual,
        variance,
        variancePercentage,
      };
    });

    return {
      data,
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance: totalBudgeted - totalActual,
      },
      periodType,
      period,
      fiscalYear,
    };
  }

  /**
   * Return group budget lines from the previous period.
   */
  async getGroupPreviousPeriod(
    groupId: string,
    params: { periodType: string; period: string; fiscalYear: string },
  ) {
    const { periodType, period, fiscalYear } = params;
    const prev = getPreviousPeriodValues(periodType, period, fiscalYear);

    const budgets = await this.prisma.groupBudget.findMany({
      where: {
        groupId,
        periodType,
        period: prev.period,
        fiscalYear: prev.fiscalYear,
      },
      include: {
        account: { select: { id: true, name: true, code: true } },
      },
      orderBy: { account: { code: 'asc' } },
    });

    return {
      period: prev.period,
      fiscalYear: prev.fiscalYear,
      lines: budgets.map((b) => ({
        accountId: b.accountId,
        accountCode: b.account.code,
        accountName: b.account.name,
        amount: b.amount / 100,
      })),
    };
  }

  /**
   * Delete a single group budget line by id.
   */
  async deleteGroupBudget(id: string, groupId: string) {
    const budget = await this.prisma.groupBudget.findFirst({
      where: { id, groupId },
    });
    if (!budget) throw new NotFoundException('Group budget line not found');

    await this.prisma.groupBudget.delete({ where: { id } });
    return { message: 'Group budget line deleted' };
  }
}
