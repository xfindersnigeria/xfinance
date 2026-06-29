import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateBulkForecastDto } from './dto/forecast.dto';

@Injectable()
export class ForecastService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Replace all group forecast lines for a period in a single transaction.
   */
  async createBulkForecasts(groupId: string, dto: CreateBulkForecastDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException('At least one forecast line is required');
    }

    const subCatLines = dto.lines.filter((l) => l.subCategoryId);
    const acctLines = dto.lines.filter((l) => !l.subCategoryId && l.accountId);

    if (subCatLines.length) {
      const ids = subCatLines.map((l) => l.subCategoryId!);
      const valid = await this.prisma.accountSubCategory.findMany({ where: { id: { in: ids }, groupId }, select: { id: true } });
      const validSet = new Set(valid.map((s) => s.id));
      const invalid = ids.filter((id) => !validSet.has(id));
      if (invalid.length) throw new BadRequestException(`Sub-categories not found: ${invalid.join(', ')}`);
    }

    if (acctLines.length) {
      const ids = acctLines.map((l) => l.accountId!);
      const valid = await this.prisma.account.findMany({ where: { id: { in: ids }, groupId }, select: { id: true } });
      const validSet = new Set(valid.map((a) => a.id));
      const invalid = ids.filter((id) => !validSet.has(id));
      if (invalid.length) throw new BadRequestException(`Accounts not found or access denied: ${invalid.join(', ')}`);
    }

    const period = dto.period ?? dto.fiscalYear;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.forecast.deleteMany({
        where: { groupId, periodType: dto.periodType, period, fiscalYear: dto.fiscalYear },
      });

      return tx.forecast.createMany({
        data: dto.lines.map((line) => ({
          name: dto.name,
          periodType: dto.periodType,
          period,
          fiscalYear: dto.fiscalYear,
          confidenceLevel: dto.confidenceLevel ?? 'Medium',
          forecastMethod: dto.forecastMethod ?? 'manual',
          growthRate: line.growthRate ?? null,
          note: dto.note ?? null,
          groupId,
          accountId: line.accountId ?? null,
          subCategoryId: line.subCategoryId ?? null,
          amount: line.amount,
        })),
      });
    });

    return {
      message: `Forecast set for ${dto.periodType} – ${period} ${dto.fiscalYear}`,
      count: result.count,
    };
  }

  /**
   * List group forecasts, grouped by period, with summary stats.
   */
  async findAll(
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
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [total, forecasts] = await Promise.all([
      this.prisma.forecast.count({ where }),
      this.prisma.forecast.findMany({
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
          subCategory: {
            select: {
              id: true,
              name: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Group lines by period key so the table shows one row per forecast period
    const periodMap = new Map<
      string,
      {
        key: string;
        name: string;
        periodType: string;
        period: string;
        fiscalYear: string;
        confidenceLevel: string;
        forecastMethod: string;
        note: string | null;
        totalRevenue: number;
        totalExpense: number;
        createdAt: Date;
      }
    >();

    const REVENUE_CATS = new Set(['Revenue', 'Income']);
    const EXPENSE_CATS = new Set(['Expense']);

    for (const f of forecasts) {
      const key = `${f.periodType}|${f.period}|${f.fiscalYear}|${f.name}`;
      const cat = f.subCategoryId
        ? (f.subCategory?.category?.name ?? '')
        : (f.account?.subCategory?.category?.name ?? '');
      const amountDollars = f.amount / 100;

      if (!periodMap.has(key)) {
        periodMap.set(key, {
          key,
          name: f.name,
          periodType: f.periodType,
          period: f.period,
          fiscalYear: f.fiscalYear,
          confidenceLevel: f.confidenceLevel,
          forecastMethod: f.forecastMethod,
          note: f.note,
          totalRevenue: 0,
          totalExpense: 0,
          createdAt: f.createdAt,
        });
      }

      const entry = periodMap.get(key)!;
      if (REVENUE_CATS.has(cat)) entry.totalRevenue += amountDollars;
      else if (EXPENSE_CATS.has(cat)) entry.totalExpense += amountDollars;
    }

    const grouped = [...periodMap.values()].map((e) => ({
      id: e.key,
      name: e.name,
      periodType: e.periodType,
      period: e.period,
      fiscalYear: e.fiscalYear,
      periodLabel: e.period
        ? `${e.period} ${e.fiscalYear}`
        : `FY ${e.fiscalYear}`,
      confidenceLevel: e.confidenceLevel,
      forecastMethod: e.forecastMethod,
      note: e.note,
      revenue: e.totalRevenue,
      expenses: e.totalExpense,
      netProfit: e.totalRevenue - e.totalExpense,
      marginPct:
        e.totalRevenue > 0
          ? parseFloat(
              (((e.totalRevenue - e.totalExpense) / e.totalRevenue) * 100).toFixed(1),
            )
          : 0,
      createdAt: e.createdAt,
    }));

    return {
      data: grouped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get all forecast lines for a specific period (for detail view).
   */
  async getForecastLines(
    groupId: string,
    params: { periodType: string; period: string; fiscalYear: string },
  ) {
    const { periodType, period, fiscalYear } = params;

    const lines = await this.prisma.forecast.findMany({
      where: { groupId, periodType, period, fiscalYear },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            subCategory: { select: { category: { select: { name: true } } } },
          },
        },
        subCategory: {
          select: { id: true, name: true, code: true, category: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      lines: lines.map((f) => ({
        id: f.id,
        accountId: f.subCategoryId ?? f.accountId,
        subCategoryId: f.subCategoryId,
        accountCode: f.subCategory?.code ?? f.account?.code ?? '',
        accountName: f.subCategory?.name ?? f.account?.name ?? '',
        accountCategory: f.subCategory?.category?.name ?? f.account?.subCategory?.category?.name ?? '',
        amount: f.amount / 100,
        growthRate: f.growthRate,
        forecastMethod: f.forecastMethod,
      })),
    };
  }

  /**
   * Delete all forecast lines for a period.
   */
  async deleteForecast(
    groupId: string,
    params: { periodType: string; period: string; fiscalYear: string },
  ) {
    const { periodType, period, fiscalYear } = params;

    const result = await this.prisma.forecast.deleteMany({
      where: { groupId, periodType, period, fiscalYear },
    });

    if (!result.count) throw new NotFoundException('Forecast not found');
    return { message: 'Forecast deleted' };
  }
}
