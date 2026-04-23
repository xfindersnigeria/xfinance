import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateOtherDeductionDto, UpdateOtherDeductionDto } from './dto/other-deduction.dto';

@Injectable()
export class OtherDeductionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOtherDeductionDto, entityId: string, groupId: string) {
    try {
      const deduction = await this.prisma.otherDeduction.create({
        data: {
          name: dto.name,
          type: dto.type,
          rate: dto.rate,
          description: dto.description,
          status: dto.status ?? 'active',
          entityId,
          groupId,
        },
      });
      return { data: deduction, message: 'Deduction created successfully', statusCode: 201 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findAll(entityId: string, groupId: string) {
    try {
      const deductions = await this.prisma.otherDeduction.findMany({
        where: { entityId, groupId },
        orderBy: { createdAt: 'desc' },
      });
      return { data: deductions, message: 'Deductions fetched', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(id: string, dto: UpdateOtherDeductionDto, entityId: string) {
    try {
      const existing = await this.prisma.otherDeduction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Deduction not found', HttpStatus.NOT_FOUND);

      const deduction = await this.prisma.otherDeduction.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.rate !== undefined && { rate: dto.rate }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
      });
      return { data: deduction, message: 'Deduction updated', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: string, entityId: string) {
    try {
      const existing = await this.prisma.otherDeduction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Deduction not found', HttpStatus.NOT_FOUND);
      await this.prisma.otherDeduction.delete({ where: { id } });
      return { data: null, message: 'Deduction deleted', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
