import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateAccountSubCategoryDto,
  UpdateAccountSubCategoryDto,
} from './dto/account-subcategory.dto';

@Injectable()
export class AccountSubCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next subcategory code based on category code
   * e.g., Category 1100 -> subcategories: 1110, 1120, 1130, ...
   * e.g., Category 1200 -> subcategories: 1210, 1220, 1230, ...
   */
  private async generateNextCode(categoryId: string): Promise<string> {
    try {
      // Get the category to extract base code
      const category = await this.prisma.accountCategory.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new BadRequestException('Account category not found');
      }

      const baseCode = parseInt(category.code);
      const nextSubCategoryBase = baseCode + 10; // e.g., 1100 -> 1110

      // Find the max subcategory code for this category
      const maxSubCategory = await this.prisma.accountSubCategory.findFirst({
        where: {
          categoryId,
          code: {
            gte: nextSubCategoryBase.toString(),
            lt: (baseCode + 100).toString(),
          },
        },
        orderBy: { code: 'desc' },
      });

      if (!maxSubCategory) {
        // First subcategory for this category
        return nextSubCategoryBase.toString();
      }

      const maxCode = parseInt(maxSubCategory.code);
      const nextCode = maxCode + 10;

      return nextCode.toString();
    } catch (error) {
      throw new HttpException(
        `Failed to generate subcategory code: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(dto: CreateAccountSubCategoryDto) {
    try {
      // Validate category exists
      const category = await this.prisma.accountCategory.findUnique({
        where: { id: dto.categoryId },
      });

      if (!category) {
        throw new BadRequestException('Account category not found');
      }

      // Generate code if not provided
      let code = dto.code;
      if (!code) {
        code = await this.generateNextCode(dto.categoryId);
      }

      // Check if code is unique within category
      const existing = await this.prisma.accountSubCategory.findFirst({
        where: {
          code,
          categoryId: dto.categoryId,
        },
      });

      if (existing) {
        throw new BadRequestException(
          `SubCategory code ${code} already exists in this category`,
        );
      }

      return await this.prisma.accountSubCategory.create({
        data: {
          ...dto,
          code,
          groupId: category.groupId ?? null,
        },
        include: {
          category: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to create account subcategory: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllByCategory(categoryId: string) {
    try {
      return await this.prisma.accountSubCategory.findMany({
        where: { categoryId },
        include: { category: true, accounts: true },
        orderBy: { code: 'asc' },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account subcategories: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string) {
    try {
      const subCategory = await this.prisma.accountSubCategory.findUnique({
        where: { id },
        include: { category: true, accounts: true },
      });

      if (!subCategory) {
        throw new HttpException(
          'Account subcategory not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return subCategory;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch account subcategory: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, dto: UpdateAccountSubCategoryDto) {
    try {
      return await this.prisma.accountSubCategory.update({
        where: { id },
        data: dto,
        include: { category: true },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to update account subcategory: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.accountSubCategory.delete({
        where: { id },
      });
    } catch (error) {
      throw new HttpException(
        `Failed to delete account subcategory: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
