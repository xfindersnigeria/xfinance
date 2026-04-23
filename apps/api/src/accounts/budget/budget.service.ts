import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateBulkBudgetDto } from './dto/budget.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async createBulkBudgets(entityId: string, dto: CreateBulkBudgetDto, groupId: string) {
    try {
      const created = [] as any[];

      // Common fields for ALL records in this bulk
      const commonData = {
        name: dto.name,
        periodType: dto.periodType,
        month: dto.month,
        fiscalYear: dto.fiscalYear,
        note: dto.note || null,
        entityId,
        groupId,
      };

      for (const line of dto.lines) {
        const { accountId, amount } = line;

        // Security check: account must exist and belong to this entity
        const accountExists = await this.prisma.account.findFirst({
          where: { id: accountId, entityId },
          select: { id: true }, // minimal select — we only need to know it exists
        });

        if (!accountExists) {
          throw new UnauthorizedException(
            `Account ${accountId} not found or access denied`,
          );
        }

        // Create one record per line
        const budget = await this.prisma.budget.create({
          data: {
            ...commonData,
            accountId,
            amount,
          },
        });

        created.push(budget);
      }

      return {
        message: `Created ${created.length} budget records successfully`,
        count: created.length,
        // Optional: budgets: created.map(b => b.id)  if you want to return IDs
      };
    } catch (error) {
      throw error;
    }
  }
}
