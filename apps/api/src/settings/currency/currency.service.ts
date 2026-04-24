import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateCurrencyDto, UpdateCurrencyDto, ToggleCurrencyDto } from './dto/currency.dto';

@Injectable()
export class CurrencyService {
  constructor(private prisma: PrismaService) {}

  async findAll(groupId: string) {
    try {
      const currencies = await this.prisma.groupCurrency.findMany({
        where: { groupId },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return { data: currencies, message: 'Currencies fetched successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async findActive(groupId: string) {
    try {
      const currencies = await this.prisma.groupCurrency.findMany({
        where: { groupId, isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      });
      return { data: currencies, message: 'Active currencies fetched successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(body: CreateCurrencyDto, groupId: string) {
    try {
      const existing = await this.prisma.groupCurrency.findUnique({
        where: { groupId_code: { groupId, code: body.code.toUpperCase() } },
      });
      if (existing) throw new HttpException(`Currency ${body.code} already exists`, HttpStatus.CONFLICT);

      const hasPrimary = await this.prisma.groupCurrency.findFirst({ where: { groupId, isPrimary: true } });
      const isPrimary = body.isPrimary ?? !hasPrimary;

      if (isPrimary) {
        await this.prisma.groupCurrency.updateMany({ where: { groupId, isPrimary: true }, data: { isPrimary: false } });
      }

      const currency = await this.prisma.groupCurrency.create({
        data: {
          groupId,
          code: body.code.toUpperCase(),
          name: body.name,
          symbol: body.symbol,
          exchangeRate: isPrimary ? 1 : (body.exchangeRate ?? 1),
          isPrimary,
          isActive: true,
        },
      });
      return { data: currency, message: 'Currency added successfully', statusCode: 201 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async update(id: string, body: UpdateCurrencyDto, groupId: string) {
    try {
      const existing = await this.prisma.groupCurrency.findFirst({ where: { id, groupId } });
      if (!existing) throw new HttpException('Currency not found', HttpStatus.NOT_FOUND);

      const data: any = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.symbol !== undefined) data.symbol = body.symbol;
      // Primary currency always has rate 1
      if (body.exchangeRate !== undefined && !existing.isPrimary) data.exchangeRate = body.exchangeRate;

      const currency = await this.prisma.groupCurrency.update({ where: { id }, data });
      return { data: currency, message: 'Currency updated successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async toggleActive(id: string, body: ToggleCurrencyDto, groupId: string) {
    try {
      const existing = await this.prisma.groupCurrency.findFirst({ where: { id, groupId } });
      if (!existing) throw new HttpException('Currency not found', HttpStatus.NOT_FOUND);
      if (existing.isPrimary && !body.isActive) {
        throw new HttpException('Cannot deactivate the primary currency', HttpStatus.BAD_REQUEST);
      }

      const currency = await this.prisma.groupCurrency.update({ where: { id }, data: { isActive: body.isActive } });
      return { data: currency, message: 'Currency status updated', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async setPrimary(id: string, groupId: string) {
    try {
      const newPrimary = await this.prisma.groupCurrency.findFirst({ where: { id, groupId } });
      if (!newPrimary) throw new HttpException('Currency not found', HttpStatus.NOT_FOUND);
      if (!newPrimary.isActive) throw new HttpException('Cannot set an inactive currency as primary', HttpStatus.BAD_REQUEST);
      if (newPrimary.isPrimary) return { data: newPrimary, message: 'Already primary', statusCode: 200 };

      // Rate of new primary relative to old base (e.g. NGN = 1600 means 1 old_base = 1600 NGN)
      const newPrimaryOldRate = newPrimary.exchangeRate;

      // Fetch all other currencies in this group
      const others = await this.prisma.groupCurrency.findMany({
        where: { groupId, id: { not: id } },
      });

      // Recalculate each: newRate_C = oldRate_C / newPrimaryOldRate
      // (how many units of C equal 1 unit of the new primary)
      await Promise.all(
        others.map((c) =>
          this.prisma.groupCurrency.update({
            where: { id: c.id },
            data: {
              exchangeRate: parseFloat((c.exchangeRate / newPrimaryOldRate).toFixed(8)),
              isPrimary: false,
            },
          }),
        ),
      );

      const currency = await this.prisma.groupCurrency.update({
        where: { id },
        data: { isPrimary: true, exchangeRate: 1 },
      });

      return { data: currency, message: 'Primary currency updated and rates recalculated', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async remove(id: string, groupId: string) {
    try {
      const existing = await this.prisma.groupCurrency.findFirst({ where: { id, groupId } });
      if (!existing) throw new HttpException('Currency not found', HttpStatus.NOT_FOUND);
      if (existing.isPrimary) throw new HttpException('Cannot delete the primary currency', HttpStatus.BAD_REQUEST);

      await this.prisma.groupCurrency.delete({ where: { id } });
      return { data: null, message: 'Currency removed successfully', statusCode: 200 };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error instanceof Error ? error.message : String(error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
