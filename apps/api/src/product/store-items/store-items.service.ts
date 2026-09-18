import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { Prisma } from 'prisma/generated/client';
import { CreateStoreItemDto } from './dto/create-store-item.dto';
import { GetStoreItemsQueryDto } from './dto/get-store-items-query.dto';
import { GetStoreItemsResponseDto } from './dto/get-store-items-response.dto';

@Injectable()
export class StoreItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fileuploadService: FileuploadService,
  ) {}

  /**
   * Services carry their price in `rate`; products in `sellingPrice`. Keep
   * both in step so POS, the online store and the list read one price.
   */
  private normalisePrice<T extends { sellingPrice?: number | null; rate?: number | null; type?: string }>(
    body: T,
  ): T {
    if (body.type === 'service' && body.rate !== undefined && body.sellingPrice === undefined) {
      return { ...body, sellingPrice: body.rate };
    }
    return body;
  }

  async createItem(
    entityId: string,
    body: CreateStoreItemDto,
    groupId: string,
  ) {
    const data = this.normalisePrice(body);
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.storeItems.create({
        data: {
          ...data,
          entityId,
          groupId,
        },
      });
      // Opening stock shows in the item's stock history
      if (created.trackInventory && (created.currentStock ?? 0) > 0) {
        await tx.inventoryMovement.create({
          data: {
            itemId: created.id,
            type: 'add',
            quantity: created.currentStock!,
            previousStock: 0,
            newStock: created.currentStock!,
            reason: 'Opening stock',
            entityId,
            groupId,
          },
        });
      }
      return created;
    });

    return this.mapItemToDto(item);
  }

  private async findOwned(id: string, entityId: string) {
    const item = await this.prisma.storeItems.findFirst({
      where: { id, entityId },
      include: { category: true, unit: true },
    });
    if (!item) throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
    return item;
  }

  async getItem(id: string, entityId: string) {
    return this.mapItemToDto(await this.findOwned(id, entityId));
  }

  /**
   * Stock is only changed through inventory adjustments and sales (so every
   * change has a movement record) — currentStock is ignored here once set.
   */
  async updateItem(id: string, entityId: string, body: Partial<CreateStoreItemDto>) {
    const existing = await this.findOwned(id, entityId);
    const { currentStock: _ignored, ...rest } = this.normalisePrice({
      ...body,
      type: body.type ?? existing.type,
    });
    const item = await this.prisma.storeItems.update({
      where: { id },
      data: rest,
      include: { category: true, unit: true },
    });
    return this.mapItemToDto(item);
  }

  async deleteItem(id: string, entityId: string) {
    const existing = await this.findOwned(id, entityId);
    const image = existing.image as { publicId?: string } | null;
    // Sales history keeps its lines (receipt/order items fall back to their stored name)
    await this.prisma.storeItems.delete({ where: { id } });
    if (image?.publicId) {
      await this.fileuploadService.deleteFile(image.publicId).catch(() => undefined);
    }
    return { success: true };
  }

  async setImage(id: string, entityId: string, groupId: string, file: Express.Multer.File) {
    const existing = await this.findOwned(id, entityId);
    if (!file?.mimetype?.startsWith('image/')) {
      throw new HttpException('Upload an image file', HttpStatus.BAD_REQUEST);
    }
    const folder = this.fileuploadService.buildAssetPath(groupId, entityId, 'products');
    const uploaded = await this.fileuploadService.uploadFile(file, folder);
    const old = existing.image as { publicId?: string } | null;
    const item = await this.prisma.storeItems.update({
      where: { id },
      data: { image: { publicId: uploaded.publicId, secureUrl: uploaded.secureUrl } },
      include: { category: true, unit: true },
    });
    if (old?.publicId) await this.fileuploadService.deleteFile(old.publicId).catch(() => undefined);
    return this.mapItemToDto(item);
  }

  async removeImage(id: string, entityId: string) {
    const existing = await this.findOwned(id, entityId);
    const old = existing.image as { publicId?: string } | null;
    const item = await this.prisma.storeItems.update({
      where: { id },
      data: { image: Prisma.DbNull },
      include: { category: true, unit: true },
    });
    if (old?.publicId) await this.fileuploadService.deleteFile(old.publicId).catch(() => undefined);
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

    // category is a relation — match by id or by name
    const and: any[] = [];
    if (category) {
      and.push({
        OR: [
          { categoryId: category },
          { category: { name: { contains: category, mode: 'insensitive' } } },
        ],
      });
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      and.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (and.length) where.AND = and;

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
      unitPrice: item.sellingPrice ?? item.rate ?? 0,
      imageUrl: (item.image as { secureUrl?: string } | null)?.secureUrl ?? null,
    };
  }
}
