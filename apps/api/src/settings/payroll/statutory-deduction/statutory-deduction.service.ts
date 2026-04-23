import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateStatutoryDeductionDto,
  UpdateStatutoryDeductionDto,
  StatutoryDeductionType,
} from './dto/statutory-deduction.dto';

const include = { account: { select: { id: true, name: true } }, tiers: true };

@Injectable()
export class StatutoryDeductionService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateStatutoryDeductionDto, entityId: string, groupId: string) {
    try {
      const deduction = await this.prisma.statutoryDeduction.create({
        data: {
          name: dto.name,
          type: dto.type,
          rate: dto.type === StatutoryDeductionType.PERCENTAGE ? (dto.rate ?? null) : null,
          fixedAmount: dto.type === StatutoryDeductionType.FIXED_AMOUNT ? (dto.fixedAmount ?? null) : null,
          minAmount: dto.type === StatutoryDeductionType.FIXED_AMOUNT ? (dto.minAmount ?? null) : null,
          description: dto.description,
          accountId: dto.accountId || null,
          status: dto.status ?? 'active',
          entityId,
          groupId,
          ...(dto.type === StatutoryDeductionType.TIERED && dto.tiers?.length
            ? {
                tiers: {
                  create: dto.tiers.map((t) => ({
                    from: t.from,
                    to: t.to ?? null,
                    rate: t.rate,
                  })),
                },
              }
            : {}),
        },
        include,
      });
      return { data: deduction, message: 'Statutory deduction created successfully', statusCode: 201 };
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
      const deductions = await this.prisma.statutoryDeduction.findMany({
        where: { entityId, groupId },
        include,
        orderBy: { createdAt: 'desc' },
      });
      return { data: deductions, message: 'Statutory deductions fetched', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(id: string, dto: UpdateStatutoryDeductionDto, entityId: string) {
    try {
      const existing = await this.prisma.statutoryDeduction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Deduction not found', HttpStatus.NOT_FOUND);

      const effectiveType = dto.type ?? existing.type;

      const deduction = await this.prisma.$transaction(async (tx) => {
        // Replace tiers when updating a TIERED deduction
        if (effectiveType === StatutoryDeductionType.TIERED && dto.tiers !== undefined) {
          await tx.taxTier.deleteMany({ where: { statutoryDeductionId: id } });
        }

        return tx.statutoryDeduction.update({
          where: { id },
          data: {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.type !== undefined && { type: dto.type }),
            rate: effectiveType === StatutoryDeductionType.PERCENTAGE ? (dto.rate ?? existing.rate) : null,
            fixedAmount: effectiveType === StatutoryDeductionType.FIXED_AMOUNT ? (dto.fixedAmount ?? (existing as any).fixedAmount) : null,
            minAmount: effectiveType === StatutoryDeductionType.FIXED_AMOUNT ? (dto.minAmount ?? (existing as any).minAmount) : null,
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.accountId !== undefined && { accountId: dto.accountId || null }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(effectiveType === StatutoryDeductionType.TIERED && dto.tiers?.length
              ? {
                  tiers: {
                    create: dto.tiers.map((t) => ({
                      from: t.from,
                      to: t.to ?? null,
                      rate: t.rate,
                    })),
                  },
                }
              : {}),
          },
          include,
        });
      });

      return { data: deduction, message: 'Statutory deduction updated', statusCode: 200 };
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
      const existing = await this.prisma.statutoryDeduction.findFirst({ where: { id, entityId } });
      if (!existing) throw new HttpException('Deduction not found', HttpStatus.NOT_FOUND);
      await this.prisma.statutoryDeduction.delete({ where: { id } });
      return { data: null, message: 'Statutory deduction deleted', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
