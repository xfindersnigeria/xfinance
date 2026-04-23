import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { GetItemsQueryDto } from './dto/get-items-query.dto';
import { GetItemsResponseDto } from './dto/get-items-response.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async createItem(entityId: string, body: CreateItemDto, groupId: string) {
    const item = await this.prisma.items.create({
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
    query: GetItemsQueryDto,
  ): Promise<GetItemsResponseDto> {
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

    const [items, total] = await Promise.all([
      this.prisma.items.findMany({
        where,
        include:{
          incomeAccount: { select: { id: true, name: true, code: true } },
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      this.prisma.items.count({ where }),
    ]);

    const mappedItems = items.map((item) => this.mapItemToDto(item));

  
    const totalPages = Math.ceil(total / limit);

    const activeItems = mappedItems.filter((i) => i.isActive).length;
    const serviceItems = mappedItems.filter((i) => i.type === 'service').length;
    const goodsItems = mappedItems.filter((i) => i.type === 'goods').length;
    const prices = mappedItems
      .map((i) => Number(i.unitPrice ?? 0))
      .filter((price) => price > 0);
    const avgPrice = prices.length
      ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
      : 0;

    return {
      items: mappedItems,
      total,
      // totalInStock,
      // totalOutOfStock,
      totalItems: activeItems,
      serviceItems,
      goodsItems,
      avgPrice,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  private mapItemToDto(item: any) {
    // const currentStock = item.currentStock ?? 0;
    // const lowStock = item.lowStock ?? 0;

    // Status: in_stock if currentStock > lowStock, else out_of_stock. If currentStock is 0, then low_stock
    // const status =
    //   currentStock === 0
    //     ? 'out_of_stock'
    //     : currentStock > 0 && currentStock > lowStock
    //       ? 'in_stock'
    //       : 'low_stock';

    return {
      ...item,
      unitPrice: item.unitPrice,
    };
  }
}
