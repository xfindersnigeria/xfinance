import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

function getStatus(currentStock: number, lowStock: number): string {
  if (currentStock <= 0) return 'critical';
  if (currentStock <= lowStock) return 'low_stock';
  return 'normal';
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventory(
    entityId: string,
    query: { page?: number; limit?: number; search?: string; status?: string },
  ) {
    try {
      const { page = 1, limit = 10, search, status } = query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { entityId, trackInventory: true };
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [items, total] = await Promise.all([
        this.prisma.storeItems.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { updatedAt: 'desc' },
          include: {
            unit: { select: { id: true, name: true, abbreviation: true } },
            category: { select: { id: true, name: true } },
            inventoryMovements: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        }),
        this.prisma.storeItems.count({ where }),
      ]);

      const itemsWithStatus = items
        .map((item) => ({
          ...item,
          status: getStatus(item.currentStock ?? 0, item.lowStock ?? 0),
          lastRestocked: item.inventoryMovements[0]?.createdAt ?? item.createdAt,
        }))
        .filter((item) => !status || status === 'All Status' || item.status === status);

      // Stats across all tracked items (not just this page)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [allTracked, monthlyMovements] = await Promise.all([
        this.prisma.storeItems.findMany({
          where: { entityId, trackInventory: true },
          select: { currentStock: true, lowStock: true, costPrice: true },
        }),
        this.prisma.inventoryMovement.aggregate({
          where: { entityId, createdAt: { gte: startOfMonth } },
          _sum: { quantity: true },
        }),
      ]);

      const totalStockValue = allTracked.reduce(
        (sum, i) => sum + (i.currentStock ?? 0) * (i.costPrice ?? 0),
        0,
      );

      const stats = {
        totalItems: allTracked.length,
        normal: allTracked.filter((i) => getStatus(i.currentStock ?? 0, i.lowStock ?? 0) === 'normal').length,
        lowStock: allTracked.filter((i) => getStatus(i.currentStock ?? 0, i.lowStock ?? 0) === 'low_stock').length,
        critical: allTracked.filter((i) => getStatus(i.currentStock ?? 0, i.lowStock ?? 0) === 'critical').length,
        totalStockValue,
        monthlyMovements: monthlyMovements._sum.quantity ?? 0,
      };

      return {
        data: itemsWithStatus,
        stats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async adjustStock(
    dto: { itemId: string; type: 'add' | 'remove' | 'set'; quantity: number; reason: string; notes?: string },
    entityId: string,
    groupId: string,
  ) {
    try {
      const item = await this.prisma.storeItems.findFirst({ where: { id: dto.itemId, entityId } });
      if (!item) throw new HttpException('Item not found', HttpStatus.NOT_FOUND);
      if (!item.trackInventory)
        throw new HttpException('Item is not tracked in inventory', HttpStatus.BAD_REQUEST);

      const previousStock = item.currentStock ?? 0;
      let newStock: number;

      if (dto.type === 'add') {
        newStock = previousStock + dto.quantity;
      } else if (dto.type === 'remove') {
        if (dto.quantity > previousStock)
          throw new HttpException(
            `Cannot remove ${dto.quantity} units — only ${previousStock} in stock`,
            HttpStatus.BAD_REQUEST,
          );
        newStock = previousStock - dto.quantity;
      } else {
        newStock = dto.quantity;
      }

      const [updatedItem, movement] = await this.prisma.$transaction([
        this.prisma.storeItems.update({
          where: { id: dto.itemId },
          data: { currentStock: newStock },
        }),
        this.prisma.inventoryMovement.create({
          data: {
            itemId: dto.itemId,
            type: dto.type,
            quantity: dto.quantity,
            previousStock,
            newStock,
            reason: dto.reason,
            notes: dto.notes,
            entityId,
            groupId,
          },
        }),
      ]);

      return {
        data: { ...updatedItem, status: getStatus(newStock, item.lowStock ?? 0), movement },
        message: 'Stock adjusted successfully',
        statusCode: 200,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getMovements(
    entityId: string,
    query: { page?: number; limit?: number; itemId?: string },
  ) {
    try {
      const { page = 1, limit = 10, itemId } = query;
      const skip = (Number(page) - 1) * Number(limit);
      const where: any = { entityId };
      if (itemId) where.itemId = itemId;

      const [data, total] = await Promise.all([
        this.prisma.inventoryMovement.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: { item: { select: { id: true, name: true, sku: true } } },
        }),
        this.prisma.inventoryMovement.count({ where }),
      ]);

      return {
        data,
        pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getLowStockItems(entityId: string) {
    try {
      const items = await this.prisma.storeItems.findMany({
        where: { entityId, trackInventory: true, currentStock: { not: null }, lowStock: { not: null } },
      });
      const lowStock = items
        .filter((i) => (i.currentStock ?? 0) <= (i.lowStock ?? 0))
        .map((i) => ({ ...i, status: getStatus(i.currentStock ?? 0, i.lowStock ?? 0) }));
      return { data: lowStock, total: lowStock.length };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
