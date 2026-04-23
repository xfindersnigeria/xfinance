import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStoreItemDto } from './dto/create-store-item.dto';
import { GetStoreItemsQueryDto } from './dto/get-store-items-query.dto';
import { GetStoreItemsResponseDto } from './dto/get-store-items-response.dto';

@Injectable()
export class StoreItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createItem(
    entityId: string,
    body: CreateStoreItemDto,
    groupId: string,
  ) {
    // console.log(entityId, groupId, body)
    const item = await this.prisma.storeItems.create({
      data: {
        ...body,
        entityId,
        groupId,
      },
    });

    return this.mapItemToDto(item);
  }

  async getItems(
    entityId: string,
    query: GetStoreItemsQueryDto,
  ): Promise<GetStoreItemsResponseDto> {
    const { page = 1, limit = 10, category, search, type } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      entityId,
    };

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive',
      };
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Entity-wide stats query (independent of pagination/search filters)
    const entityWhere = { entityId };
    const [items, total, allForStats] = await Promise.all([
      this.prisma.storeItems.findMany({
        where,
        include: { category: true, unit: true },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.storeItems.count({ where }),
      this.prisma.storeItems.findMany({
        where: entityWhere,
        select: { currentStock: true, lowStock: true, costPrice: true },
      }),
    ]);

    const mappedItems = items.map((item) => this.mapItemToDto(item));

    // Accurate entity-wide stats (not page-limited)
    const totalInStock = allForStats.filter((i) => {
      const s = i.currentStock ?? 0;
      return s > 0 && s > (i.lowStock ?? 0);
    }).length;
    const totalOutOfStock = allForStats.filter((i) => (i.currentStock ?? 0) === 0).length;
    const totalValue = allForStats.reduce(
      (sum, i) => sum + (i.currentStock ?? 0) * (i.costPrice ?? 0),
      0,
    );

    return {
      items: mappedItems,
      total,
      totalInStock,
      totalOutOfStock,
      totalValue,
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private mapItemToDto(item: any) {
    const currentStock = item.currentStock ?? 0;
    const lowStock = item.lowStock ?? 0;

    // Status: in_stock if currentStock > lowStock, else out_of_stock. If currentStock is 0, then low_stock
    const status =
      currentStock === 0
        ? 'out_of_stock'
        : currentStock > 0 && currentStock > lowStock
          ? 'in_stock'
          : 'low_stock';

    return {
      ...item,
      status,
      unitPrice: item.sellingPrice,
    };
  }
}
