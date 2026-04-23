import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateAccountTransactionDto,
  GetAccountTransactionsFilterDto,
} from './dto/account-transaction.dto';
import { AccountTransactionWhereInput } from 'prisma/generated/models';

@Injectable()
export class AccountTransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new account transaction record
   * This is called whenever an account is modified (posting, manual entry, etc.)
   */
  async createTransaction(createDto: CreateAccountTransactionDto) {
    // Validate account exists and belongs to entity
    const account = await this.prisma.account.findUnique({
      where: { id: createDto.accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.entityId !== createDto.entityId) {
      throw new BadRequestException('Account does not belong to this entity');
    }

    // Validate amounts
    if (createDto.debitAmount < 0 || createDto.creditAmount < 0) {
      throw new BadRequestException(
        'Debit and credit amounts must be positive',
      );
    }

    if (createDto.debitAmount > 0 && createDto.creditAmount > 0) {
      throw new BadRequestException(
        'A transaction cannot have both debit and credit amounts',
      );
    }

    if (createDto.debitAmount === 0 && createDto.creditAmount === 0) {
      throw new BadRequestException(
        'Transaction must have either debit or credit amount',
      );
    }

    // Create the transaction
    const transaction = await this.prisma.accountTransaction.create({
      data: {
        date: new Date(createDto.date),
        description: createDto.description,
        reference: createDto.reference,
        type: createDto.type,
        status: 'Success', // New transactions are immediately successful
        accountId: createDto.accountId,
        debitAmount: createDto.debitAmount,
        creditAmount: createDto.creditAmount,
        runningBalance: createDto.runningBalance,
        payee: createDto.payee,
        method: createDto.method,
        entityId: createDto.entityId,
        groupId: createDto.groupId,
        relatedEntityId: createDto.relatedEntityId,
        relatedEntityType: createDto.relatedEntityType,
        metadata: createDto.metadata,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return transaction;
  }

  /**
   * Get all account transactions with advanced filtering and search
   */
  async getTransactions(
    entityId: string,
    filters: GetAccountTransactionsFilterDto,
  ) {
    const {
      accountId,
      type,
      status,
      fromDate,
      toDate,
      search,
      page = 1,
      pageSize = 20,
      relatedEntityType,
      method,
    } = filters;

    console.log(type, "type")

    // Build where clause
    const where: AccountTransactionWhereInput = {
      entityId,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (relatedEntityType) {
      where.relatedEntityType = relatedEntityType;
    }

    if (method) {
      where.method = method;
    }

    // Date range filter
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = new Date(fromDate);
      }
      if (toDate) {
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Search in description, reference, and payee
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { payee: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (Math.max(1, page) - 1) * Math.max(1, pageSize);
    const take = Math.max(1, pageSize);

    // Fetch data in parallel
    const [transactions, total] = await Promise.all([
      this.prisma.accountTransaction.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
              subCategory: {
                select: {
                  name: true,
                  category: {
                    select: {
                      name: true,

                      type: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take,
      }),
      this.prisma.accountTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page: Math.max(1, page),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get transactions for a specific account
   */
  async getAccountTransactions(
    accountId: string,
    entityId: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
    // Validate account exists and belongs to entity
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.entityId !== entityId) {
      throw new BadRequestException('Access denied');
    }

    const skip = (Math.max(1, page) - 1) * pageSize;

    const [transactions, total] = await Promise.all([
      this.prisma.accountTransaction.findMany({
        where: {
          accountId,
          entityId,
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
              subCategory: {
                select: {
                  name: true,
                  category: {
                    select: {
                      name: true,
                      type: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.accountTransaction.count({
        where: {
          accountId,
          entityId,
        },
      }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get transactions for a specific bank account
   */
  // async getBankAccountTransactions(
  //   bankAccountId: string,
  //   entityId: string,
  //   page: number = 1,
  //   pageSize: number = 20,
  // ) {
  //   // Validate bank account exists and belongs to entity
  //   const bankAccount = await this.prisma.bankAccount.findUnique({
  //     where: { id: bankAccountId },
  //   });

  //   if (!bankAccount) {
  //     throw new NotFoundException('Bank account not found');
  //   }

  //   if (bankAccount.entityId !== entityId) {
  //     throw new BadRequestException('Access denied');
  //   }

  //   const skip = (Math.max(1, page) - 1) * pageSize;

  //   const [transactions, total] = await Promise.all([
  //     this.prisma.accountTransaction.findMany({
  //       where: {
  //         bankAccountId,
  //         entityId,
  //       },
  //       include: {
  //         account: {
  //           select: {
  //             id: true,
  //             name: true,
  //             code: true,
  //           },
  //         },
  //       },
  //       orderBy: {
  //         date: 'desc',
  //       },
  //       skip,
  //       take: pageSize,
  //     }),
  //     this.prisma.accountTransaction.count({
  //       where: {
  //         bankAccountId,
  //         entityId,
  //       },
  //     }),
  //   ]);

  //   return {
  //     data: transactions,
  //     pagination: {
  //       page,
  //       pageSize,
  //       total,
  //       totalPages: Math.ceil(total / pageSize),
  //     },
  //   };
  // }

  /**
   * Get transaction by ID
   */
  async getTransactionById(id: string, entityId: string) {
    const transaction = await this.prisma.accountTransaction.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
            subCategory: true,
          },
        },
       
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.entityId !== entityId) {
      throw new BadRequestException('Access denied');
    }

    return transaction;
  }

  /**
   * Get summary statistics for transactions
   */
  async getTransactionSummary(
    entityId: string,
    accountId?: string,
  ) {
    const where: AccountTransactionWhereInput = { entityId };

    if (accountId) {
      where.accountId = accountId;
    }

    

    // Get aggregates
    const [totalDebits, totalCredits, transactionCount, typeBreakdown] =
      await Promise.all([
        this.prisma.accountTransaction.aggregate({
          where,
          _sum: { debitAmount: true },
        }),
        this.prisma.accountTransaction.aggregate({
          where,
          _sum: { creditAmount: true },
        }),
        this.prisma.accountTransaction.count({ where }),
        this.getTransactionBreakdownByType(entityId, accountId),
      ]);

    return {
      totalDebits: totalDebits._sum.debitAmount || 0,
      totalCredits: totalCredits._sum.creditAmount || 0,
      transactionCount,
      typeBreakdown,
    };
  }

  /**
   * Get breakdown of transactions by type
   */
  private async getTransactionBreakdownByType(
    entityId: string,
    accountId?: string,
  ) {
    const where: AccountTransactionWhereInput = { entityId };

    if (accountId) {
      where.accountId = accountId;
    }

   

    const breakdown = await this.prisma.accountTransaction.groupBy({
      by: ['type'],
      where,
      _count: true,
      _sum: {
        debitAmount: true,
        creditAmount: true,
      },
    });

    return breakdown.map((item) => ({
      type: item.type,
      count: item._count,
      totalDebits: item._sum.debitAmount || 0,
      totalCredits: item._sum.creditAmount || 0,
    }));
  }
}
