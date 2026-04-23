import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateStoreSupplyDto, UpdateStoreSupplyDto, CreateSupplyIssueDto, BulkCreateSupplyIssueDto } from './store-inventory.dto';

@Injectable()
export class StoreInventoryService {
  constructor(private prisma: PrismaService) {}

  private getSupplyStatus(quantity: number, minQuantity: number): string {
    if (quantity === 0) return 'out of stock';
    if (quantity <= minQuantity) return 'low stock';
    return 'in stock';
  }

  async create(createDto: CreateStoreSupplyDto, entityId: string, groupId: string) {
    try {
      const supply = await this.prisma.storeSupply.create({
        data: { ...createDto, entityId, groupId },
      });
      return supply;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(entityId: string, query: { page?: number; limit?: number; search?: string }) {
    try {
      const { page = 1, limit = 10, search } = query;
      const skip = (page - 1) * limit;

      const where: any = { entityId };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { supplier: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [supplies, total] = await Promise.all([
        this.prisma.storeSupply.findMany({
          where,
          skip: Number(skip),
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.storeSupply.count({ where }),
      ]);

      const suppliesWithStatus = supplies.map(supply => ({
        ...supply,
        status: this.getSupplyStatus(supply.quantity, supply.minQuantity),
      }));

      return {
        data: suppliesWithStatus,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, entityId: string) {
    try {
      const supply = await this.prisma.storeSupply.findFirst({ where: { id, entityId } });
      if (!supply) throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);
      return {
        ...supply,
        status: this.getSupplyStatus(supply.quantity, supply.minQuantity),
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, updateDto: UpdateStoreSupplyDto, entityId: string) {
    try {
      const supply = await this.prisma.storeSupply.findFirst({ where: { id, entityId } });
      if (!supply) throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);
      return await this.prisma.storeSupply.update({ where: { id }, data: updateDto });
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const supply = await this.prisma.storeSupply.findFirst({ where: { id, entityId } });
      if (!supply) throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);
      await this.prisma.storeSupply.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async stats(entityId: string) {
    try {
      const supplies = await this.prisma.storeSupply.findMany({ where: { entityId } });

      let total = supplies.length;
      let totalValue = 0;
      let inStock = 0;
      let lowStock = 0;
      let outOfStock = 0;

      for (const s of supplies) {
        totalValue += (s.unitPrice ?? 0) * (s.quantity ?? 0);
        if ((s.quantity ?? 0) === 0) {
          outOfStock++;
        } else if ((s.quantity ?? 0) <= (s.minQuantity ?? 0)) {
          lowStock++;
        } else {
          inStock++;
        }
      }

      return {
        total,
        totalValue,
        inStock,
        lowStock,
        outOfStock,
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 
}
