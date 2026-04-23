import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateRestockHistoryDto,
  UpdateRestockHistoryDto,
} from './restock-history.dto';

@Injectable()
export class RestockHistoryService {
  constructor(private prisma: PrismaService) {}

  async create(
    createDto: CreateRestockHistoryDto,
    entityId: string,
    groupId: string,
    restockedBy: string,
  ) {
    try {
      const supply = await this.prisma.storeSupply.findFirst({
        where: { id: createDto.supplyId, entityId },
      });
      if (!supply)
        throw new HttpException('Supply not found', HttpStatus.NOT_FOUND);

      const totalCost = createDto.quantity * createDto.unitPrice;
      const restockDate = createDto.restockDate ?? new Date();

      const restock = await this.prisma.$transaction(async (tx) => {
        const record = await tx.supplyRestockHistory.create({
          data: {
            supplyId: createDto.supplyId,
            quantity: createDto.quantity,
            unitPrice: createDto.unitPrice,
            totalCost,
            supplier: createDto.supplier,
            restockedById: restockedBy,
            notes: createDto.notes,
            restockDate,
            entityId,
            groupId,
          },
        });

        await tx.storeSupply.update({
          where: { id: createDto.supplyId },
          data: { quantity: supply.quantity + createDto.quantity },
        });

        return record;
      });

      return {
        data: restock,
        message: 'Restock recorded successfully',
        statusCode: 201,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    entityId: string,
    query: { page?: number; limit?: number; search?: string },
  ) {
    try {
      const { page = 1, limit = 10, search } = query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = { entityId };
      if (search) {
        where.OR = [
          { supplier: { contains: search, mode: 'insensitive' } },
          { restockedBy: { contains: search, mode: 'insensitive' } },
          { notes: { contains: search, mode: 'insensitive' } },
          { supply: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.supplyRestockHistory.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { restockDate: 'desc' },
          include: { supply: true },
        }),
        this.prisma.supplyRestockHistory.count({ where }),
      ]);

      return {
        data,
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
      const restock = await this.prisma.supplyRestockHistory.findFirst({
        where: { id, entityId },
        include: { supply: true },
      });
      if (!restock)
        throw new HttpException('Restock not found', HttpStatus.NOT_FOUND);
      return restock;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(
    id: string,
    updateDto: UpdateRestockHistoryDto,
    entityId: string,
  ) {
    try {
      const restock = await this.prisma.supplyRestockHistory.findFirst({
        where: { id, entityId },
      });
      if (!restock)
        throw new HttpException('Restock not found', HttpStatus.NOT_FOUND);
      const updated = await this.prisma.supplyRestockHistory.update({
        where: { id },
        data: { ...updateDto },
      });
      return { data: updated, message: 'Restock updated', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const restock = await this.prisma.supplyRestockHistory.findFirst({
        where: { id, entityId },
      });
      if (!restock)
        throw new HttpException('Restock not found', HttpStatus.NOT_FOUND);
      await this.prisma.supplyRestockHistory.delete({ where: { id } });
      return { data: null, message: 'Restock deleted', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
