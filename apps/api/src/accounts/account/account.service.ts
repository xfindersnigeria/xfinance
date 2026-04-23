import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AccountResponseDto,
  CreateAccountDto,
  OpeningBalanceDto,
  UpdateAccountDto,
} from './dto/account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next account code based on subcategory code
   * Can be overridden by providing code in dto
   */
  private async generateNextCode(
    subCategoryId: string,
    entityId: string,
  ): Promise<string> {
    try {
      const subCategory = await this.prisma.accountSubCategory.findUnique({
        where: { id: subCategoryId },
      });

      if (!subCategory) {
        throw new BadRequestException('Account subcategory not found');
      }

      // E.g., SubCategory 1110 -> accounts: 1110-01, 1110-02, etc.
      const baseCode = subCategory.code;
      const maxAccount = await this.prisma.account.findFirst({
        where: {
          subCategoryId,
          entityId,
          code: {
            startsWith: baseCode,
          },
        },
        orderBy: { code: 'desc' },
      });

      if (!maxAccount) {
        return `${baseCode}-01`;
      }

      // Extract number from existing code and increment
      const match = maxAccount.code.match(/-(\d+)$/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return `${baseCode}-${String(nextNum).padStart(2, '0')}`;
      }

      return `${baseCode}-01`;
    } catch (error) {
      throw new HttpException(
        `Failed to generate account code: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(accounts: CreateAccountDto, entityId: string) {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { id: true, groupId: true },
      });
      if (!entity) throw new UnauthorizedException('Access denied!');

      // Validate subcategory exists
      const subCategory = await this.prisma.accountSubCategory.findUnique({
        where: { id: accounts.subCategoryId },
      });
      if (!subCategory) {
        throw new BadRequestException('Account subcategory not found');
      }

      // Generate code if not provided
      // let code = accounts.code;
      let code = '';
      if (!code) {
        code = await this.generateNextCode(accounts.subCategoryId, entityId);
      }

      const account = await this.prisma.account.create({
        data: {
          name: accounts.name,
          code,
          description: accounts.description,
          subCategoryId: accounts.subCategoryId,
          balance: accounts.balance || 0,
          entityId,
          groupId: entity.groupId ?? null,
        },
      });
      return account;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(
    entityId: string,
    subCategory?: string,
    type?: string,
    search?: string,
    groupId?: string,
    page?: number,
    pageSize?: number,
    
  ): Promise<any> {
    try {
      const where: any = { entityId };
console.log(subCategory, entityId, groupId)
      // Filter by subCategory name if provided
      if (subCategory) {
        // Get entity to find its group
        // const entity = await this.prisma.entity.findUnique({
        //   where: { id: entityId },
        // });

        // if (entity) {
          // Find subcategory by name within the entity's group
          const subCategoryRecord =
            await this.prisma.accountSubCategory.findFirst({
              where: {
                name: subCategory,
                category: {
                  groupId,
                },
              },
            });

          if (subCategoryRecord) {
            where.subCategoryId = subCategoryRecord.id;
          } else {
            // Return empty result with pagination for not found
            return {
              data: [],
              pagination: {
                page,
                pageSize,
                total: 0,
                totalPages: 0,
              },
            };
          }
        // }
      }

      // Filter by type name if provided
      if (type) {
        // const entity = await this.prisma.entity.findUnique({
        //   where: { id: entityId },
        // });

        // if (entity) {
          const typeRecord = await this.prisma.accountType.findFirst({
            where: {
              name: type,
            },
          });

          if (typeRecord) {
            where.subCategoryId = {
              in: await this.prisma.accountSubCategory
                .findMany({
                  where: { category: { typeId: typeRecord.id } },
                  select: { id: true },
                })
                .then((subCategories) => subCategories.map((sc) => sc.id)),
            };
          } else {
            return {
              data: [],
              pagination: {
                page: page ?? 1,
                pageSize: pageSize ?? 1000,
                total: 0,
                totalPages: 0,
              },
            };
          }
        // }
      }

      // Filter by search query (name, code, or description)
      if (search && search.trim()) {
        where.OR = [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { code: { contains: search.trim(), mode: 'insensitive' } },
          { description: { contains: search.trim(), mode: 'insensitive' } },
        ];
      }

      let skip = 0;
      let take = 1000; // default large number to return all if pagination not specified
      // Calculate pagination parameters
      if (page !== undefined && pageSize !== undefined) {
        skip = (page - 1) * pageSize;
        take = pageSize;
      }

      // Get total count
      const total = await this.prisma.account.count({ where });

      const accounts = await this.prisma.account.findMany({
        where,
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });

      // Map accounts to include type, category, and subcategory names
      const data = accounts.map((account) => ({
        ...account,
        typeName: account.subCategory?.category?.type?.name,
        categoryName: account.subCategory?.category?.name,
        subCategoryName: account.subCategory?.name,
      }));

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / (pageSize ?? 1)),
        },
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async setOpeningBalances(entityId: string, dto: OpeningBalanceDto) {
    try {
      // Validate all accounts belong to this entity
      const accountIds = dto.lines.map((line) => line.accountId);
      const accounts = await this.prisma.account.findMany({
        where: {
          id: { in: accountIds },
          entityId,
        },
      });

      if (accounts.length !== accountIds.length) {
        throw new UnauthorizedException(
          'One or more accounts do not exist or do not belong to this entity',
        );
      }

      // Update each account with its balance
      for (const line of dto.lines) {
        const { accountId, debit = 0, credit = 0 } = line;
        const balance = credit - debit;

        await this.prisma.account.update({
          where: { id: accountId },
          data: { balance },
        });
      }

      return {
        message: 'Opening balances set successfully for all provided accounts.',
      };
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string, entityId?: string) {
    try {
      const account = await this.prisma.account.findUnique({
        where: { id },
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!account) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      // Verify ownership if entityId provided
      if (entityId && account.entityId !== entityId) {
        throw new UnauthorizedException('Access denied to this account');
      }

      // Add type, category, and subcategory names to response
      return {
        ...account,
        typeName: account.subCategory?.category?.type?.name,
        categoryName: account.subCategory?.category?.name,
        subCategoryName: account.subCategory?.name,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            `${error instanceof Error ? error.message : String(error)}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async update(id: string, account: UpdateAccountDto, entityId: string) {
    try {
      // Verify account belongs to entity
      const existing = await this.findOne(id, entityId);

      // Validate new subcategory if provided
      if (
        account.subCategoryId &&
        account.subCategoryId !== existing.subCategoryId
      ) {
        const newSubCategory = await this.prisma.accountSubCategory.findUnique({
          where: { id: account.subCategoryId },
        });
        if (!newSubCategory) {
          throw new BadRequestException('Account subcategory not found');
        }
      }

      const updateData: any = {};
      if (account.name !== undefined) updateData.name = account.name;
      if (account.description !== undefined)
        updateData.description = account.description;
      if (account.subCategoryId !== undefined)
        updateData.subCategoryId = account.subCategoryId;
      if (account.balance !== undefined) updateData.balance = account.balance;
      if (account.code !== undefined) updateData.code = account.code;

      const updated = await this.prisma.account.update({
        where: { id },
        data: updateData,
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      // Add type, category, and subcategory names to response
      return {
        ...updated,
        typeName: updated.subCategory?.category?.type?.name,
        categoryName: updated.subCategory?.category?.name,
        subCategoryName: updated.subCategory?.name,
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            `${error instanceof Error ? error.message : String(error)}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async delete(id: string, entityId: string) {
    try {
      // Verify account belongs to entity
      await this.findOne(id, entityId);

      const deleted = await this.prisma.account.delete({
        where: { id },
        include: {
          subCategory: {
            include: {
              category: {
                include: {
                  type: true,
                },
              },
            },
          },
        },
      });

      return {
        message: 'Account deleted successfully',
        deletedAccount: {
          ...deleted,
          typeName: deleted.subCategory?.category?.type?.name,
          categoryName: deleted.subCategory?.category?.name,
          subCategoryName: deleted.subCategory?.name,
        },
      };
    } catch (error) {
      throw error instanceof HttpException
        ? error
        : new HttpException(
            `${error instanceof Error ? error.message : String(error)}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }
}
