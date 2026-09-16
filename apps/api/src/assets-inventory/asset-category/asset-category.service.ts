import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateAssetCategoryDto, UpdateAssetCategoryDto } from './dto/asset-category.dto';
import { depreciateForYear } from '../asset/depreciation.util';
import { getEntityFiscalYear } from '../asset/asset-fiscal-year';

export interface ScheduleRow {
  categoryId: string | null;
  name: string;
  depreciationRate: number | null;
  assetCount: number;
  openingBalance: number;
  additions: number;
  totalCost: number;
  depreciationForYear: number;
  openingAccumulated: number;
  totalAccumulated: number;
  netBookValue: number;
}

const emptyTotals = () => ({
  openingBalance: 0,
  additions: 0,
  totalCost: 0,
  depreciationForYear: 0,
  openingAccumulated: 0,
  totalAccumulated: 0,
  netBookValue: 0,
});

@Injectable()
export class AssetCategoryService {
  constructor(private prisma: PrismaService) {}

  private rethrow(e: unknown): never {
    if (e instanceof HttpException) throw e;
    if ((e as any)?.code === 'P2002') {
      throw new HttpException('An asset category with this name already exists', HttpStatus.CONFLICT);
    }
    throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
  }

  async create(dto: CreateAssetCategoryDto, entityId: string, groupId: string) {
    try {
      const data = await this.prisma.assetCategory.create({
        data: {
          name: dto.name.trim(),
          depreciationRate: dto.depreciationRate,
          description: dto.description,
          entityId,
          groupId,
        },
      });
      return { data, message: 'Asset category created successfully', statusCode: 201 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async findAll(entityId: string) {
    try {
      const categories = await this.prisma.assetCategory.findMany({
        where: { entityId },
        include: { _count: { select: { assets: true } } },
        orderBy: [{ createdAt: 'asc' }, { depreciationRate: 'desc' }, { name: 'asc' }],
      });
      const data = categories.map(({ _count, ...c }) => ({ ...c, assetCount: _count.assets }));
      return { data, message: 'Asset categories fetched', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async update(id: string, dto: UpdateAssetCategoryDto, entityId: string) {
    try {
      const existing = await this.prisma.assetCategory.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Asset category not found', HttpStatus.NOT_FOUND);
      const data = await this.prisma.assetCategory.update({
        where: { id },
        data: { ...dto, name: dto.name?.trim() },
      });
      // Asset.type mirrors the category name for anything still reading it
      if (dto.name && dto.name.trim() !== existing.name) {
        await this.prisma.asset.updateMany({ where: { categoryId: id, entityId }, data: { type: data.name } });
      }
      return { data, message: 'Asset category updated', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const existing = await this.prisma.assetCategory.findFirst({
        where: { id, entityId },
        include: { _count: { select: { assets: true } } },
      });
      if (!existing) throw new HttpException('Asset category not found', HttpStatus.NOT_FOUND);
      if (existing._count.assets > 0) {
        throw new HttpException(
          `Cannot delete "${existing.name}" — ${existing._count.assets} asset(s) still use it. Move them to another category first.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      await this.prisma.assetCategory.delete({ where: { id } });
      return { data: null, message: 'Asset category deleted', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  /**
   * Depreciation schedule per category for the entity's current fiscal year.
   * Assets without a category are grouped into a trailing "Uncategorised" row
   * (no depreciation) so the totals reconcile with the asset register.
   */
  async schedule(entityId: string) {
    try {
      const [fy, categories, assets] = await Promise.all([
        getEntityFiscalYear(this.prisma, entityId),
        this.prisma.assetCategory.findMany({
          where: { entityId },
          orderBy: [{ createdAt: 'asc' }, { depreciationRate: 'desc' }, { name: 'asc' }],
        }),
        this.prisma.asset.findMany({
          where: { entityId },
          select: {
            categoryId: true,
            purchaseCost: true,
            purchaseDate: true,
            openingAccumulatedDepreciation: true,
            openingAccumAsOf: true,
          },
        }),
      ]);

      const rows = new Map<string | null, ScheduleRow>();
      for (const c of categories) {
        rows.set(c.id, {
          categoryId: c.id,
          name: c.name,
          depreciationRate: c.depreciationRate,
          assetCount: 0,
          ...emptyTotals(),
        });
      }
      const rateById = new Map(categories.map((c) => [c.id, c.depreciationRate]));

      for (const asset of assets) {
        const key = asset.categoryId && rows.has(asset.categoryId) ? asset.categoryId : null;
        const result = depreciateForYear(
          { ...asset, ratePercent: key ? rateById.get(key)! : null },
          fy,
          fy.yearEnd,
        );
        if (!result) continue; // bought after this fiscal year ends

        if (!rows.has(key)) {
          rows.set(key, {
            categoryId: null,
            name: 'Uncategorised',
            depreciationRate: null,
            assetCount: 0,
            ...emptyTotals(),
          });
        }
        const row = rows.get(key)!;
        row.assetCount += 1;
        if (result.isAddition) row.additions += asset.purchaseCost;
        else row.openingBalance += asset.purchaseCost;
        row.totalCost += asset.purchaseCost;
        row.depreciationForYear += result.chargeForYear;
        row.openingAccumulated += result.openingAccum;
        row.totalAccumulated += result.totalAccum;
        row.netBookValue += result.netBookValue;
      }

      // Map insertion order keeps categories first, "Uncategorised" last
      const data = [...rows.values()];
      const totals = data.reduce((t, r) => {
        (Object.keys(t) as (keyof typeof t)[]).forEach((k) => (t[k] += r[k]));
        return t;
      }, emptyTotals());

      return {
        data: {
          fiscalYear: { start: fy.start, end: fy.end },
          rows: data,
          totals,
        },
        message: 'Depreciation schedule fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }
}
