import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAssetDto, UpdateAssetDto } from './dto/asset.dto';
import { depreciateForYear } from './depreciation.util';
import { EntityFiscalYear, getEntityFiscalYear } from './asset-fiscal-year';

type AssetWithCategory = Awaited<ReturnType<AssetService['loadAssets']>>[number];

@Injectable()
export class AssetService {
  constructor(private prisma: PrismaService) {}

  private rethrow(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new HttpException(
      error instanceof Error ? error.message : String(error),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  private async getCategory(categoryId: string, entityId: string) {
    const category = await this.prisma.assetCategory.findFirst({
      where: { id: categoryId, entityId },
    });
    if (!category) throw new HttpException('Asset category not found', HttpStatus.BAD_REQUEST);
    return category;
  }

  /**
   * The carried-over accumulated depreciation only means something for an
   * asset bought before the current fiscal year, and can't exceed its cost.
   * Returns the columns to persist; `asOf` pins it to this fiscal year's start
   * so later years roll it forward by one charge each.
   */
  private openingAccumFields(
    value: number | null | undefined,
    purchaseDate: Date,
    purchaseCost: number,
    fy: EntityFiscalYear,
  ) {
    if (value == null || purchaseDate >= fy.start) {
      return { openingAccumulatedDepreciation: null, openingAccumAsOf: null };
    }
    if (value > purchaseCost) {
      throw new HttpException(
        'Opening accumulated depreciation cannot exceed the purchase cost',
        HttpStatus.BAD_REQUEST,
      );
    }
    return { openingAccumulatedDepreciation: value, openingAccumAsOf: fy.start };
  }

  /** Depreciation position of an asset for the current fiscal year. */
  private valuate(
    asset: {
      purchaseCost: number;
      purchaseDate: Date;
      openingAccumulatedDepreciation: number | null;
      openingAccumAsOf: Date | null;
    },
    ratePercent: number | null,
    fy: EntityFiscalYear,
  ) {
    const result = depreciateForYear({ ...asset, ratePercent }, fy, fy.yearEnd);
    // Bought after this fiscal year ends — nothing charged yet
    return (
      result ?? {
        isAddition: false,
        openingAccum: 0,
        chargeForYear: 0,
        totalAccum: 0,
        netBookValue: asset.purchaseCost,
        fullyDepreciated: false,
      }
    );
  }

  async create(dto: CreateAssetDto, entityId: string, userId: string, groupId: string) {
    try {
      const [category, fy] = await Promise.all([
        this.getCategory(dto.categoryId, entityId),
        getEntityFiscalYear(this.prisma, entityId),
      ]);

      const purchaseDate = new Date(dto.purchaseDate);
      const opening = this.openingAccumFields(
        dto.openingAccumulatedDepreciation,
        purchaseDate,
        dto.purchaseCost,
        fy,
      );
      const status = dto.status ?? (dto.activeAsset === false ? 'in_storage' : 'in_use');
      const { netBookValue } = this.valuate(
        { purchaseCost: dto.purchaseCost, purchaseDate, ...opening },
        category.depreciationRate,
        fy,
      );

      return await this.prisma.asset.create({
        data: {
          name: dto.name,
          type: category.name,
          categoryId: category.id,
          departmentId: dto.departmentId || undefined,
          assignedId: dto.assignedId || undefined,
          description: dto.description ?? '',
          purchaseDate,
          purchaseCost: dto.purchaseCost,
          // Snapshot only — the API always recomputes current value on read
          currentValue: netBookValue,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          trackDepreciation: true,
          depreciationMethod: 'Straight Line',
          years: 0,
          salvageValue: 0,
          ...opening,
          activeAsset: status === 'in_use',
          status,
          serialNumber: `ASSET${Date.now()}${Math.floor(Math.random() * 1000)}`,
          entityId,
          groupId,
        },
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  private loadAssets(entityId: string, filters: { search?: string; categoryId?: string } = {}) {
    const search = filters.search?.trim();
    return this.prisma.asset.findMany({
      where: {
        entityId,
        ...(filters.categoryId === 'uncategorised'
          ? { categoryId: null }
          : filters.categoryId
            ? { categoryId: filters.categoryId }
            : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { serialNumber: { contains: search, mode: 'insensitive' as const } },
                { category: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      include: { category: { select: { id: true, name: true, depreciationRate: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  private withValuation(asset: AssetWithCategory, fy: EntityFiscalYear) {
    const v = this.valuate(asset, asset.category?.depreciationRate ?? null, fy);
    return {
      ...asset,
      currentValue: v.netBookValue,
      accumulatedDepreciation: v.totalAccum,
      depreciationForYear: v.chargeForYear,
      fullyDepreciated: v.fullyDepreciated,
    };
  }

  async findAll(entityId: string, filters: { search?: string; categoryId?: string } = {}) {
    try {
      const isFiltered = !!(filters.search?.trim() || filters.categoryId);
      const [fy, all, filtered] = await Promise.all([
        getEntityFiscalYear(this.prisma, entityId),
        this.loadAssets(entityId),
        isFiltered ? this.loadAssets(entityId, filters) : Promise.resolve(null),
      ]);

      const valued = all.map((a) => this.withValuation(a, fy));
      const summary = {
        total: valued.length,
        inUse: valued.filter((a) => a.status === 'in_use').length,
        inStorage: valued.filter((a) => a.status === 'in_storage').length,
        totalCost: valued.reduce((s, a) => s + a.purchaseCost, 0),
        totalCurrentValue: valued.reduce((s, a) => s + a.currentValue, 0),
        // Net book value of assets that are actually being depreciated
        depreciableValue: valued
          .filter((a) => a.categoryId)
          .reduce((s, a) => s + a.currentValue, 0),
        uncategorised: valued.filter((a) => !a.categoryId).length,
        fullyDepreciated: valued.filter((a) => a.fullyDepreciated).length,
        fiscalYear: { start: fy.start, end: fy.end },
      };

      const assets = filtered ? filtered.map((a) => this.withValuation(a, fy)) : valued;
      return { success: true, data: { summary, assets } };
    } catch (error) {
      console.error('Asset overview failed:', error);
      this.rethrow(error);
    }
  }

  async update(id: string, dto: UpdateAssetDto, entityId: string) {
    try {
      const existing = await this.prisma.asset.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);

      const fy = await getEntityFiscalYear(this.prisma, entityId);
      const categoryId = dto.categoryId ?? existing.categoryId;
      const category = categoryId ? await this.getCategory(categoryId, entityId) : null;

      const purchaseDate = dto.purchaseDate ? new Date(dto.purchaseDate) : existing.purchaseDate;
      const purchaseCost = dto.purchaseCost ?? existing.purchaseCost;

      // Re-pin the carried-over figure only when it was actually changed, so
      // an untouched value keeps rolling forward from its original year.
      let opening: {
        openingAccumulatedDepreciation: number | null;
        openingAccumAsOf: Date | null;
      } = {
        openingAccumulatedDepreciation: existing.openingAccumulatedDepreciation,
        openingAccumAsOf: existing.openingAccumAsOf,
      };
      if (
        dto.openingAccumulatedDepreciation !== undefined &&
        dto.openingAccumulatedDepreciation !== existing.openingAccumulatedDepreciation
      ) {
        opening = this.openingAccumFields(dto.openingAccumulatedDepreciation, purchaseDate, purchaseCost, fy);
      } else if (purchaseDate >= fy.start) {
        opening = { openingAccumulatedDepreciation: null, openingAccumAsOf: null };
      } else if (opening.openingAccumulatedDepreciation != null && opening.openingAccumulatedDepreciation > purchaseCost) {
        throw new HttpException(
          'Opening accumulated depreciation cannot exceed the purchase cost',
          HttpStatus.BAD_REQUEST,
        );
      }

      const status =
        dto.status ??
        (dto.activeAsset !== undefined ? (dto.activeAsset ? 'in_use' : 'in_storage') : existing.status);
      const { netBookValue } = this.valuate(
        { purchaseCost, purchaseDate, ...opening },
        category?.depreciationRate ?? null,
        fy,
      );

      return await this.prisma.asset.update({
        where: { id },
        data: {
          name: dto.name,
          ...(category ? { categoryId: category.id, type: category.name, trackDepreciation: true } : {}),
          departmentId: dto.departmentId,
          assignedId: dto.assignedId,
          description: dto.description,
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
          purchaseDate,
          purchaseCost,
          currentValue: netBookValue,
          ...opening,
          status,
          activeAsset: status === 'in_use',
        },
      });
    } catch (error) {
      this.rethrow(error);
    }
  }

  async findOne(id: string, entityId: string) {
    try {
      const [asset, fy] = await Promise.all([
        this.prisma.asset.findFirst({
          where: { id, entityId },
          include: { category: { select: { id: true, name: true, depreciationRate: true } } },
        }),
        getEntityFiscalYear(this.prisma, entityId),
      ]);
      if (!asset) throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
      return this.withValuation(asset, fy);
    } catch (error) {
      this.rethrow(error);
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const asset = await this.prisma.asset.findFirst({ where: { id, entityId } });
      if (!asset) throw new HttpException('Asset not found', HttpStatus.NOT_FOUND);
      await this.prisma.asset.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      this.rethrow(error);
    }
  }
}
