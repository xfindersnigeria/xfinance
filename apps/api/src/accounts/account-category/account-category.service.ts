import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateAccountCategoryDto,
  UpdateAccountCategoryDto,
} from './dto/account-category.dto';

@Injectable()
export class AccountCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next category code based on type code
   * e.g., Type 1000 -> categories: 1100, 1200, 1300, ...
   * e.g., Type 2000 -> categories: 2100, 2200, 2300, ...
   */
  private async generateNextCode(typeId: string, groupId: string): Promise<string> {
    try {
      // Get the type to extract base code
      const type = await this.prisma.accountType.findUnique({
        where: { id: typeId },
      });

      if (!type) {
        throw new BadRequestException('Account type not found');
      }

      const baseCode = parseInt(type.code);
      const nextCategoryBase = baseCode + 100; // e.g., 1000 -> 1100

      // Find the max category code for this type in this group
      const maxCategory = await this.prisma.accountCategory.findFirst({
        where: {
          typeId,
          groupId,
          code: {
            gte: nextCategoryBase.toString(),
            lt: (baseCode + 1000).toString(),
          },
        },
        orderBy: { code: 'desc' },
      });

      if (!maxCategory) {
        // First category for this type
        return nextCategoryBase.toString();
      }

      const maxCode = parseInt(maxCategory.code);
      const nextCode = maxCode + 100;

      return nextCode.toString();
    } catch (error) {
      throw new HttpException(
        `Failed to generate category code: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(dto: CreateAccountCategoryDto, groupId: string) {
    try {
      // Validate type exists
      const type = await this.prisma.accountType.findUnique({
        where: { id: dto.typeId },
      });

      if (!type) {
        throw new BadRequestException('Account type not found');
      }

      // Generate code if not provided
      let code = dto.code;
      if (!code) {
        code = await this.generateNextCode(dto.typeId, groupId);
      }

      // Check if code is unique within group
      const existing = await this.prisma.accountCategory.findFirst({
        where: {
          code,
          groupId,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `Category code ${code} already exists in this group`,
        );
      }

      return await this.prisma.accountCategory.create({
        data: {
          ...dto,
          code,
          groupId,
        },
        include: {
          type: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to create account category: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByGroup(groupId: string) {
    try {
      return await this.prisma.accountCategory.findMany({
        where: { groupId },
        include: { type: true, subCategories: { include: { accounts: { include: { entity: { select: { id: true, name: true } } } } } } },
        orderBy: [{ typeId: 'asc' }, { code: 'asc' }],
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account categories: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByType(groupId: string, typeId: string) {
    try {
      return await this.prisma.accountCategory.findMany({
        where: { groupId, typeId },
        include: { type: true, subCategories: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account categories: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string) {
    try {
      const category = await this.prisma.accountCategory.findUnique({
        where: { id },
        include: { type: true, subCategories: true },
      });

      if (!category) {
        throw new HttpException(
          'Account category not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return category;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account category: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, dto: UpdateAccountCategoryDto, groupId: string) {
    try {
      // Verify category belongs to group
      const category = await this.prisma.accountCategory.findFirst({
        where: { id, groupId },
      });

      if (!category) {
        throw new HttpException(
          'Account category not found or access denied',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.prisma.accountCategory.update({
        where: { id },
        data: dto,
        include: { type: true },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to update account category: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string, groupId: string) {
    try {
      // Verify category belongs to group
      const category = await this.prisma.accountCategory.findFirst({
        where: { id, groupId },
      });

      if (!category) {
        throw new HttpException(
          'Account category not found or access denied',
          HttpStatus.FORBIDDEN,
        );
      }

      return await this.prisma.accountCategory.delete({
        where: { id },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to delete account category: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
