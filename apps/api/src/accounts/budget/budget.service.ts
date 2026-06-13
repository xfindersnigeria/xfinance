import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateBulkBudgetDto, UpdateBulkBudgetDto } from './dto/budget.dto';
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

const ACCOUNT_SELECT = {
  id: true,
  name: true,
  code: true,
  subCategory: {
    select: {
      name: true,
      category: { select: { name: true } },
    },
  },
};

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Entity budget headers ──────────────────────────────────────────────────

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

    const month = dto.month ?? dto.fiscalYear;

    const result = await this.prisma.$transaction(async (tx) => {
      // Create the header
      const header = await tx.budgetHeader.create({
        data: {
          name: dto.name,
          periodType: dto.periodType,
          month,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          entityId,
          groupId,
        },
      });

      await tx.budget.createMany({
        data: dto.lines.map((line) => ({
          name: dto.name,
          periodType: dto.periodType,
          month,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          entityId,
          groupId,
          accountId: line.accountId,
          amount: line.amount,
          budgetHeaderId: header.id,
        })),
      });

      return header;
    });

    return {
      message: `Budget created: ${dto.name}`,
      id: result.id,
    };
  }

  async findAllHeaders(
    entityId: string,
    params: {
      periodType?: string;
      fiscalYear?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { periodType, fiscalYear, search } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = { entityId };
    if (periodType) where.periodType = periodType;
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, headers] = await Promise.all([
      this.prisma.budgetHeader.count({ where }),
      this.prisma.budgetHeader.findMany({
        where,
        include: {
          lines: { select: { amount: true, accountId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: headers.map((h) => ({
        id: h.id,
        name: h.name,
        periodType: h.periodType,
        period: h.month,
        fiscalYear: h.fiscalYear,
        note: h.note,
        totalAmount: h.lines.reduce((s, l) => s + l.amount / 100, 0),
        accountCount: new Set(h.lines.map((l) => l.accountId)).size,
        createdAt: h.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBudgetHeader(headerId: string, entityId: string) {
    const header = await this.prisma.budgetHeader.findFirst({
      where: { id: headerId, entityId },
      include: {
        lines: {
          include: { account: { select: ACCOUNT_SELECT } },
          orderBy: { account: { code: 'asc' } },
        },
      },
    });
    if (!header) throw new NotFoundException('Budget not found');

    return {
      id: header.id,
      name: header.name,
      periodType: header.periodType,
      period: header.month,
      fiscalYear: header.fiscalYear,
      note: header.note,
      createdAt: header.createdAt,
      lines: header.lines.map((l) => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: l.account.code,
        accountName: l.account.name,
        accountCategory: l.account.subCategory?.category?.name ?? '',
        amount: l.amount / 100,
      })),
    };
  }

  async updateBudgetHeader(
    headerId: string,
    dto: UpdateBulkBudgetDto,
    entityId: string,
    groupId: string,
  ) {
    const existing = await this.prisma.budgetHeader.findFirst({
      where: { id: headerId, entityId },
    });
    if (!existing) throw new NotFoundException('Budget not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.budgetHeader.update({
        where: { id: headerId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.periodType && { periodType: dto.periodType }),
          ...(dto.month !== undefined && { month: dto.month ?? dto.fiscalYear ?? existing.month }),
          ...(dto.fiscalYear && { fiscalYear: dto.fiscalYear }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      if (dto.lines?.length) {
        const month = dto.month ?? existing.month;
        const periodType = dto.periodType ?? existing.periodType;
        const fiscalYear = dto.fiscalYear ?? existing.fiscalYear;
        const name = dto.name ?? existing.name;

        // Validate accounts
        const accountIds = dto.lines.map((l) => l.accountId);
        const validAccounts = await tx.account.findMany({
          where: { id: { in: accountIds }, entityId },
          select: { id: true },
        });
        const validIds = new Set(validAccounts.map((a) => a.id));
        const invalid = accountIds.filter((id) => !validIds.has(id));
        if (invalid.length) {
          throw new BadRequestException(`Accounts not found: ${invalid.join(', ')}`);
        }

        // Replace all lines
        await tx.budget.deleteMany({ where: { budgetHeaderId: headerId } });
        await tx.budget.createMany({
          data: dto.lines.map((line) => ({
            name,
            periodType,
            month,
            fiscalYear,
            note: dto.note ?? existing.note ?? null,
            entityId,
            groupId,
            accountId: line.accountId,
            amount: line.amount,
            budgetHeaderId: headerId,
          })),
        });
      }
    });

    return { message: 'Budget updated' };
  }

  async deleteBudgetHeader(headerId: string, entityId: string) {
    const header = await this.prisma.budgetHeader.findFirst({
      where: { id: headerId, entityId },
    });
    if (!header) throw new NotFoundException('Budget not found');

    // Cascade handles lines deletion
    await this.prisma.budgetHeader.delete({ where: { id: headerId } });
    return { message: 'Budget deleted' };
  }

  // ── Budget vs Actual (unchanged — reads flat Budget rows) ─────────────────

  async getBudgetVsActual(
    entityId: string,
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
              select: { category: { select: { name: true } } },
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

    const budgetMap = new Map<string, {
      accountId: string;
      accountCode: string;
      accountName: string;
      categoryName: string;
      budgetedCents: number;
    }>();

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
        entityId,
        accountId: { in: [...budgetMap.keys()] },
        date: { gte: start, lte: end },
      },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const txMap = new Map(
      txGroups.map((g) => [g.accountId, { debit: g._sum.debitAmount ?? 0, credit: g._sum.creditAmount ?? 0 }]),
    );

    let totalBudgeted = 0;
    let totalActual = 0;

    const data = [...budgetMap.values()].map((b) => {
      const tx = txMap.get(b.accountId) ?? { debit: 0, credit: 0 };
      const isCreditNormal = CREDIT_NORMAL.has(b.categoryName);
      const actualCents = Math.max(0, isCreditNormal ? tx.credit - tx.debit : tx.debit - tx.credit);
      const budgeted = b.budgetedCents / 100;
      const actual = actualCents / 100;
      const variance = budgeted - actual;
      const variancePercentage = budgeted !== 0 ? parseFloat(((variance / budgeted) * 100).toFixed(2)) : 0;

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
      summary: { totalBudgeted, totalActual, totalVariance: totalBudgeted - totalActual },
      periodType,
      period,
      fiscalYear,
    };
  }

  async getPreviousPeriod(
    entityId: string,
    params: { periodType: string; period: string; fiscalYear: string },
  ) {
    const { periodType, period, fiscalYear } = params;
    const prev = getPreviousPeriodValues(periodType, period, fiscalYear);

    const budgets = await this.prisma.budget.findMany({
      where: { entityId, periodType, month: prev.period, fiscalYear: prev.fiscalYear },
      include: { account: { select: { id: true, name: true, code: true } } },
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
   * Resolve budget amounts per account for a given date range.
   * Used by the reports service — reads flat Budget rows, unaffected by header changes.
   */
  async resolveBudgetForDateRange(
    entityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Map<string, number>> {
    const fiscalYear = String(startDate.getFullYear());
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 31) {
      const monthName = MONTHS[startDate.getMonth()];
      const rows = await this.prisma.budget.findMany({
        where: { entityId, periodType: 'Monthly', month: monthName, fiscalYear },
        select: { accountId: true, amount: true },
      });
      return this.aggregateToCurrencyMap(rows);
    }

    if (diffDays <= 95) {
      const startMonth = startDate.getMonth();
      const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterStartMonths = [0, 3, 6, 9];
      const qi = quarterStartMonths.indexOf(startMonth);
      const quarter = qi >= 0 ? quarterLabels[qi] : null;

      if (quarter) {
        const qRows = await this.prisma.budget.findMany({
          where: { entityId, periodType: 'Quarterly', month: quarter, fiscalYear },
          select: { accountId: true, amount: true },
        });
        if (qRows.length) return this.aggregateToCurrencyMap(qRows);

        const range = QUARTER_RANGES[quarter];
        const months = MONTHS.slice(range.start, range.end + 1);
        const mRows = await this.prisma.budget.findMany({
          where: { entityId, periodType: 'Monthly', month: { in: months }, fiscalYear },
          select: { accountId: true, amount: true },
        });
        return this.aggregateToCurrencyMap(mRows);
      }
    }

    const yRows = await this.prisma.budget.findMany({
      where: { entityId, periodType: 'Yearly', fiscalYear },
      select: { accountId: true, amount: true },
    });
    if (yRows.length) return this.aggregateToCurrencyMap(yRows);

    const allRows = await this.prisma.budget.findMany({
      where: { entityId, fiscalYear },
      select: { accountId: true, amount: true },
    });
    return this.aggregateToCurrencyMap(allRows);
  }

  private aggregateToCurrencyMap(rows: { accountId: string; amount: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.accountId, (map.get(row.accountId) ?? 0) + row.amount / 100);
    }
    return map;
  }

  // ── Group budget headers ───────────────────────────────────────────────────

  async createGroupBulkBudgets(groupId: string, dto: CreateBulkBudgetDto) {
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
      throw new BadRequestException(`Accounts not found or access denied: ${invalid.join(', ')}`);
    }

    const period = dto.month ?? dto.fiscalYear;

    const result = await this.prisma.$transaction(async (tx) => {
      const header = await tx.groupBudgetHeader.create({
        data: {
          name: dto.name,
          periodType: dto.periodType,
          period,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          groupId,
        },
      });

      await tx.groupBudget.createMany({
        data: dto.lines.map((line) => ({
          name: dto.name,
          periodType: dto.periodType,
          period,
          fiscalYear: dto.fiscalYear,
          note: dto.note ?? null,
          groupId,
          accountId: line.accountId,
          amount: line.amount,
          groupBudgetHeaderId: header.id,
        })),
      });

      return header;
    });

    return { message: `Group budget created: ${dto.name}`, id: result.id };
  }

  async findAllGroupHeaders(
    groupId: string,
    params: { periodType?: string; fiscalYear?: string; search?: string; page?: number; limit?: number } = {},
  ) {
    const { periodType, fiscalYear, search } = params;
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(200, Math.max(1, params.limit ?? 50));
    const skip = (page - 1) * limit;

    const where: any = { groupId };
    if (periodType) where.periodType = periodType;
    if (fiscalYear) where.fiscalYear = fiscalYear;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, headers] = await Promise.all([
      this.prisma.groupBudgetHeader.count({ where }),
      this.prisma.groupBudgetHeader.findMany({
        where,
        include: { lines: { select: { amount: true, accountId: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: headers.map((h) => ({
        id: h.id,
        name: h.name,
        periodType: h.periodType,
        period: h.period,
        fiscalYear: h.fiscalYear,
        note: h.note,
        totalAmount: h.lines.reduce((s, l) => s + l.amount / 100, 0),
        accountCount: new Set(h.lines.map((l) => l.accountId)).size,
        createdAt: h.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getGroupBudgetHeader(headerId: string, groupId: string) {
    const header = await this.prisma.groupBudgetHeader.findFirst({
      where: { id: headerId, groupId },
      include: {
        lines: {
          include: { account: { select: ACCOUNT_SELECT } },
          orderBy: { account: { code: 'asc' } },
        },
      },
    });
    if (!header) throw new NotFoundException('Group budget not found');

    return {
      id: header.id,
      name: header.name,
      periodType: header.periodType,
      period: header.period,
      fiscalYear: header.fiscalYear,
      note: header.note,
      createdAt: header.createdAt,
      lines: header.lines.map((l) => ({
        id: l.id,
        accountId: l.accountId,
        accountCode: l.account.code,
        accountName: l.account.name,
        accountCategory: l.account.subCategory?.category?.name ?? '',
        amount: l.amount / 100,
      })),
    };
  }

  async updateGroupBudgetHeader(headerId: string, dto: UpdateBulkBudgetDto, groupId: string) {
    const existing = await this.prisma.groupBudgetHeader.findFirst({ where: { id: headerId, groupId } });
    if (!existing) throw new NotFoundException('Group budget not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.groupBudgetHeader.update({
        where: { id: headerId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.periodType && { periodType: dto.periodType }),
          ...(dto.month !== undefined && { period: dto.month ?? dto.fiscalYear ?? existing.period }),
          ...(dto.fiscalYear && { fiscalYear: dto.fiscalYear }),
          ...(dto.note !== undefined && { note: dto.note }),
        },
      });

      if (dto.lines?.length) {
        const period = dto.month ?? existing.period;
        const periodType = dto.periodType ?? existing.periodType;
        const fiscalYear = dto.fiscalYear ?? existing.fiscalYear;
        const name = dto.name ?? existing.name;

        const accountIds = dto.lines.map((l) => l.accountId);
        const validAccounts = await tx.account.findMany({
          where: { id: { in: accountIds }, groupId },
          select: { id: true },
        });
        const validIds = new Set(validAccounts.map((a) => a.id));
        const invalid = accountIds.filter((id) => !validIds.has(id));
        if (invalid.length) throw new BadRequestException(`Accounts not found: ${invalid.join(', ')}`);

        await tx.groupBudget.deleteMany({ where: { groupBudgetHeaderId: headerId } });
        await tx.groupBudget.createMany({
          data: dto.lines.map((line) => ({
            name,
            periodType,
            period,
            fiscalYear,
            note: dto.note ?? existing.note ?? null,
            groupId,
            accountId: line.accountId,
            amount: line.amount,
            groupBudgetHeaderId: headerId,
          })),
        });
      }
    });

    return { message: 'Group budget updated' };
  }

  async deleteGroupBudgetHeader(headerId: string, groupId: string) {
    const header = await this.prisma.groupBudgetHeader.findFirst({ where: { id: headerId, groupId } });
    if (!header) throw new NotFoundException('Group budget not found');

    await this.prisma.groupBudgetHeader.delete({ where: { id: headerId } });
    return { message: 'Group budget deleted' };
  }

  async getGroupBudgetVsActual(
    groupId: string,
    params: { periodType?: string; period?: string; fiscalYear?: string } = {},
  ) {
    const showAll = !params.periodType || params.periodType === 'All';
    const periodType = showAll ? 'All' : params.periodType!;
    const period = params.period ?? '';
    const fiscalYear = params.fiscalYear ?? String(new Date().getFullYear());

    const where: Record<string, any> = { groupId };
    if (!showAll) { where.periodType = periodType; where.period = period; }
    where.fiscalYear = fiscalYear;

    const budgets = await this.prisma.groupBudget.findMany({
      where,
      include: {
        account: {
          select: {
            id: true, name: true, code: true,
            subCategory: { select: { category: { select: { name: true } } } },
          },
        },
      },
    });

    if (!budgets.length) {
      return { data: [], summary: { totalBudgeted: 0, totalActual: 0, totalVariance: 0 }, periodType, period, fiscalYear };
    }

    const budgetMap = new Map<string, { accountId: string; accountCode: string; accountName: string; categoryName: string; budgetedCents: number }>();
    for (const b of budgets) {
      const cat = b.account.subCategory?.category?.name ?? '';
      const existing = budgetMap.get(b.accountId);
      if (existing) { existing.budgetedCents += b.amount; }
      else { budgetMap.set(b.accountId, { accountId: b.accountId, accountCode: b.account.code, accountName: b.account.name, categoryName: cat, budgetedCents: b.amount }); }
    }

    const { start, end } = showAll ? getDateRange('Yearly', '', fiscalYear) : getDateRange(periodType, period, fiscalYear);

    const txGroups = await this.prisma.accountTransaction.groupBy({
      by: ['accountId'],
      where: { groupId, accountId: { in: [...budgetMap.keys()] }, date: { gte: start, lte: end } },
      _sum: { debitAmount: true, creditAmount: true },
    });

    const txMap = new Map(txGroups.map((g) => [g.accountId, { debit: g._sum.debitAmount ?? 0, credit: g._sum.creditAmount ?? 0 }]));

    let totalBudgeted = 0;
    let totalActual = 0;

    const data = [...budgetMap.values()].map((b) => {
      const tx = txMap.get(b.accountId) ?? { debit: 0, credit: 0 };
      const isCreditNormal = CREDIT_NORMAL.has(b.categoryName);
      const actualCents = Math.max(0, isCreditNormal ? tx.credit - tx.debit : tx.debit - tx.credit);
      const budgeted = b.budgetedCents / 100;
      const actual = actualCents / 100;
      const variance = budgeted - actual;
      const variancePercentage = budgeted !== 0 ? parseFloat(((variance / budgeted) * 100).toFixed(2)) : 0;
      totalBudgeted += budgeted;
      totalActual += actual;
      return { accountId: b.accountId, account: `${b.accountCode} – ${b.accountName}`, accountCode: b.accountCode, accountName: b.accountName, accountCategory: b.categoryName, budgeted, actual, variance, variancePercentage };
    });

    return { data, summary: { totalBudgeted, totalActual, totalVariance: totalBudgeted - totalActual }, periodType, period, fiscalYear };
  }

  async getGroupPreviousPeriod(groupId: string, params: { periodType: string; period: string; fiscalYear: string }) {
    const { periodType, period, fiscalYear } = params;
    const prev = getPreviousPeriodValues(periodType, period, fiscalYear);

    const budgets = await this.prisma.groupBudget.findMany({
      where: { groupId, periodType, period: prev.period, fiscalYear: prev.fiscalYear },
      include: { account: { select: { id: true, name: true, code: true } } },
      orderBy: { account: { code: 'asc' } },
    });

    return {
      period: prev.period,
      fiscalYear: prev.fiscalYear,
      lines: budgets.map((b) => ({ accountId: b.accountId, accountCode: b.account.code, accountName: b.account.name, amount: b.amount / 100 })),
    };
  }

  /** Accounts scoped to a group (for group budget form) */
  async getGroupAccounts(groupId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { groupId },
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
      orderBy: { code: 'asc' },
    });

    return {
      data: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        categoryName: a.subCategory?.category?.name ?? '',
        subCategoryName: a.subCategory?.name ?? '',
      })),
    };
  }
}
