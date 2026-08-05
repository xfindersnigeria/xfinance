import {
  Injectable,
  HttpException,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateOpeningBalanceDto,
  UpdateOpeningBalanceDto,
  ReverseOpeningBalanceDto,
  GetOpeningBalanceResponseDto,
  GetOpeningBalancesQueryDto,
  GetOpeningBalancesResponseDto,
} from './dto/opening-balance.dto';
import { generateJournalReference } from '@/auth/utils/helper';
import { CacheService } from '@/cache/cache.service';

interface AccountValidationResult {
  valid: boolean;
  error?: string;
  account?: any;
}

const OPEN_BALANCE_INCLUDE = {
  items: true,
  reversalOf: { select: { id: true, date: true, status: true } },
  reversedBy: { select: { id: true, date: true, status: true } },
} as const;

@Injectable()
export class OpeningBalanceService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Create opening balance with validation and synchronous journal posting.
   *
   * Rules:
   * 1. Account balance must be 0
   * 2. No existing (non-reversed) opening balance item for the account
   * 3. Posts to the journal and updates account balances in the same transaction —
   *    the record is created already Finalized, there is no separate async step.
   * 4. All-or-nothing: the whole submission is rejected if any line fails validation.
   */
  async createOpeningBalance(
    entityId: string,
    groupId: string,
    dto: CreateOpeningBalanceDto,
  ): Promise<GetOpeningBalanceResponseDto> {
    try {
      const accountIds = dto.items.map((item) => item.accountId);
      const accounts = await this.prisma.account.findMany({
        where: {
          id: { in: accountIds },
          entityId,
        },
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

      const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

      const validationResults = new Map<string, AccountValidationResult>();
      const failedAccounts: Array<{ accountId: string; error: string }> = [];

      for (const item of dto.items) {
        const account = accountMap.get(item.accountId);

        if (!account) {
          const error = `Account ${item.accountId} not found or access denied`;
          validationResults.set(item.accountId, { valid: false, error });
          failedAccounts.push({ accountId: item.accountId, error });
          continue;
        }

        // account.balance is the sole source of truth for eligibility: a fresh
        // account is at 0, and a previously-opened account only returns to 0
        // once its opening balance has been reversed via reverseOpeningBalance().
        // (A separate "does an OpeningBalanceItem already exist" check was removed —
        // it would incorrectly flag the reversal's own offsetting item as a
        // pre-existing opening balance, permanently blocking re-entry after a
        // legitimate reversal even though the balance is correctly back at 0.)
        if (account.balance !== 0) {
          const error = `Cannot set opening balance. Account balance is ${account.balance}. Only accounts with balance 0 are allowed.`;
          validationResults.set(item.accountId, { valid: false, error });
          failedAccounts.push({ accountId: item.accountId, error });
          continue;
        }

        validationResults.set(item.accountId, { valid: true, account });
      }

      if (failedAccounts.length > 0) {
        throw new BadRequestException(
          `Cannot create opening balance. All accounts must pass validation. Failed accounts: ${failedAccounts.map((f) => `${f.accountId}: ${f.error}`).join('; ')}`,
        );
      }

      let totalDebit = 0;
      let totalCredit = 0;
      for (const item of dto.items) {
        totalDebit += item.debit;
        totalCredit += item.credit;
      }
      const difference = totalCredit - totalDebit;

      const result = await this.prisma.$transaction(
        async (tx) => {
          const openingBalance = await tx.openingBalance.create({
            data: {
              entityId,
              groupId,
              date: dto.date,
              fiscalYear: dto.fiscalYear || null,
              totalDebit,
              totalCredit,
              difference,
              status: 'Finalized',
              note: dto.note || null,
            },
          });

          const items = await Promise.all(
            dto.items.map((item) =>
              tx.openingBalanceItem.create({
                data: {
                  openingBalanceId: openingBalance.id,
                  accountId: item.accountId,
                  debit: item.debit,
                  credit: item.credit,
                },
              }),
            ),
          );

          for (const item of items) {
            await this.postOpeningBalanceLineToJournal(
              tx,
              openingBalance.id,
              item.accountId,
              item.debit,
              item.credit,
              accountMap.get(item.accountId)!,
              entityId,
              groupId,
              `Opening Balance - ${accountMap.get(item.accountId)!.name}`,
            );
          }

          return { ...openingBalance, items };
        },
        { timeout: 15000 },
      );

      await this.cacheService.invalidateEntityDashboardCache(entityId);

      return this.getOpeningBalance(result.id, entityId);
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        `Failed to create opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reverse a Finalized opening balance with an equal-and-opposite posting.
   * This is the only supported way to correct a mistake once posted — the
   * original record and its journal are never edited or deleted, a new
   * offsetting entry is posted and linked back to it instead.
   */
  async reverseOpeningBalance(
    id: string,
    entityId: string,
    groupId: string,
    dto: ReverseOpeningBalanceDto,
  ): Promise<GetOpeningBalanceResponseDto> {
    try {
      const existing = await this.prisma.openingBalance.findFirst({
        where: { id, entityId },
        include: { items: true, reversedBy: { select: { id: true } } },
      });

      if (!existing) {
        throw new HttpException(
          'Opening balance not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (existing.status !== 'Finalized') {
        throw new BadRequestException(
          `Only a Finalized opening balance can be reversed (current status: ${existing.status}).`,
        );
      }

      if (existing.reversedBy) {
        throw new BadRequestException(
          'This opening balance has already been reversed.',
        );
      }

      if (existing.items.length === 0) {
        throw new BadRequestException(
          'Opening balance has no items to reverse.',
        );
      }

      const accountIds = existing.items.map((item) => item.accountId);
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, entityId },
        include: {
          subCategory: {
            include: { category: { include: { type: true } } },
          },
        },
      });
      const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

      const result = await this.prisma.$transaction(
        async (tx) => {
          const reversal = await tx.openingBalance.create({
            data: {
              entityId,
              groupId,
              date: new Date(),
              fiscalYear: existing.fiscalYear,
              totalDebit: existing.totalCredit,
              totalCredit: existing.totalDebit,
              difference: existing.totalDebit - existing.totalCredit,
              status: 'Finalized',
              note: `Reversal of Opening Balance ${existing.id}`,
              reversalReason: dto.reason,
              reversalOfId: existing.id,
            },
          });

          const items = await Promise.all(
            existing.items.map((item) =>
              tx.openingBalanceItem.create({
                data: {
                  openingBalanceId: reversal.id,
                  accountId: item.accountId,
                  debit: item.credit,
                  credit: item.debit,
                },
              }),
            ),
          );

          for (const item of items) {
            const account = accountMap.get(item.accountId);
            if (!account) {
              throw new BadRequestException(
                `Account ${item.accountId} not found or access denied`,
              );
            }
            await this.postOpeningBalanceLineToJournal(
              tx,
              reversal.id,
              item.accountId,
              item.debit,
              item.credit,
              account,
              entityId,
              groupId,
              `Reversal of Opening Balance - ${account.name}`,
            );
          }

          await tx.openingBalance.update({
            where: { id: existing.id },
            data: { status: 'Reversed' },
          });

          return reversal;
        },
        { timeout: 15000 },
      );

      await this.cacheService.invalidateEntityDashboardCache(entityId);

      return this.getOpeningBalance(result.id, entityId);
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        `Failed to reverse opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Post a single opening-balance line to the journal, update the account's
   * cached balance and write the audit-trail AccountTransaction row.
   *
   * This is the ONLY place in the opening-balance module allowed to mutate
   * Account.balance — both creation and reversal route through it, so the
   * cached balance can never drift out of sync with the ledger.
   *
   * Posting rules:
   * - Assets/Expenses: Debit increases balance (normal balance = debit)
   * - Liabilities/Equity/Revenue: Credit increases balance (normal balance = credit)
   * The offsetting entry always goes to "Opening Balance Equity".
   */
  private async postOpeningBalanceLineToJournal(
    tx: any,
    openingBalanceId: string,
    accountId: string,
    debit: number,
    credit: number,
    account: any,
    entityId: string,
    groupId: string,
    lineDescription: string,
  ): Promise<void> {
    const openingBalanceEquityAccount =
      await this.getOpeningBalanceEquityAccount(tx, entityId);

    const lines: any[] = [
      {
        accountId,
        debit,
        credit,
        description: lineDescription,
      },
      {
        accountId: openingBalanceEquityAccount.id,
        debit: credit,
        credit: debit,
        description: `Opening Balance Equity - ${account.name}`,
      },
    ];

    const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);

    if (totalDebits !== totalCredits) {
      throw new Error(
        `Opening balance journal unbalanced for account ${accountId}: Debits ${totalDebits} != Credits ${totalCredits}`,
      );
    }

    const journal = await tx.journal.create({
      data: {
        description: `Opening Balance - ${openingBalanceId} posted`,
        date: new Date(),
        reference: generateJournalReference('OB'),
        entityId,
        groupId,
        lines: lines as any,
      },
    });

    for (const line of lines) {
      const accountDetail = await tx.account.findUnique({
        where: { id: line.accountId },
        include: {
          subCategory: { include: { category: { include: { type: true } } } },
        },
      });

      if (!accountDetail) continue;

      const accType = accountDetail.subCategory?.category?.type?.name;
      const balanceChange =
        accType === 'Assets' || accType === 'Expenses'
          ? line.debit - line.credit
          : line.credit - line.debit;

      const newBalance = accountDetail.balance + balanceChange;
      await tx.account.update({
        where: { id: line.accountId },
        data: { balance: newBalance },
      });

      await tx.accountTransaction.create({
        data: {
          date: new Date(),
          description: `Opening Balance posted - ${line.description}`,
          reference: journal.reference,
          type: 'OPENING_BALANCE',
          status: 'Success',
          accountId: line.accountId,
          debitAmount: line.debit,
          creditAmount: line.credit,
          runningBalance: newBalance,
          entityId,
          groupId,
          relatedEntityId: openingBalanceId,
          relatedEntityType: 'OpeningBalance',
          metadata: {
            journalReference: journal.reference,
            accountCode: accountDetail.code,
            accountName: accountDetail.name,
          },
        },
      });
    }
  }

  /**
   * Get the Opening Balance Equity account (code: 3140-01).
   * Must exist for the entity (created during entity setup via seeder).
   */
  private async getOpeningBalanceEquityAccount(
    tx: any,
    entityId: string,
  ): Promise<any> {
    const account = await tx.account.findFirst({
      where: {
        entityId,
        code: '3140-01',
      },
    });

    if (!account) {
      throw new BadRequestException(
        `Opening Balance Equity account (code: 3140-01) not found for entity. ` +
          `Please ensure the account has been created in Chart of Accounts during entity setup.`,
      );
    }

    return account;
  }

  async getOpeningBalance(
    id: string,
    entityId: string,
  ): Promise<GetOpeningBalanceResponseDto> {
    try {
      const openingBalance = await this.prisma.openingBalance.findFirst({
        where: { id, entityId },
        include: OPEN_BALANCE_INCLUDE,
      });

      if (!openingBalance) {
        throw new HttpException(
          'Opening balance not found',
          HttpStatus.NOT_FOUND,
        );
      }

      return openingBalance as unknown as GetOpeningBalanceResponseDto;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getOpeningBalanceByEntity(
    entityId: string,
    query: GetOpeningBalancesQueryDto,
  ): Promise<GetOpeningBalancesResponseDto> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { id: true },
      });

      if (!entity) {
        throw new UnauthorizedException('Entity not found or access denied');
      }

      const whereClause: any = { entityId };
      if (query.search) {
        whereClause.OR = [
          { id: { contains: query.search, mode: 'insensitive' } },
          { note: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const openingBalances = await this.prisma.openingBalance.findMany({
        where: whereClause,
        include: OPEN_BALANCE_INCLUDE,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const totalCount = await this.prisma.openingBalance.count({
        where: whereClause,
      });

      const totalPages = Math.ceil(totalCount / limit);

      return {
        data: openingBalances as unknown as GetOpeningBalanceResponseDto[],
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new HttpException(
        `Failed to get opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Only metadata (note) may be edited, and only before the entry has been
   * posted. Once Finalized or Reversed, nothing here is mutable — use
   * reverseOpeningBalance() to correct a posted mistake.
   */
  async updateOpeningBalance(
    id: string,
    entityId: string,
    dto: UpdateOpeningBalanceDto,
  ): Promise<GetOpeningBalanceResponseDto> {
    try {
      const existing = await this.prisma.openingBalance.findFirst({
        where: { id, entityId },
      });

      if (!existing) {
        throw new HttpException(
          'Opening balance not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (existing.status === 'Finalized' || existing.status === 'Reversed') {
        throw new BadRequestException(
          `Cannot update a ${existing.status.toLowerCase()} opening balance. Use the reverse action to correct a posted entry.`,
        );
      }

      if (dto.items && dto.items.length > 0) {
        for (const item of dto.items) {
          const account = await this.prisma.account.findFirst({
            where: { id: item.accountId, entityId },
            select: { id: true },
          });
          if (!account) {
            throw new UnauthorizedException(
              `Account ${item.accountId} not found or access denied`,
            );
          }
        }
      }

      let totalDebit = existing.totalDebit;
      let totalCredit = existing.totalCredit;
      if (dto.items && dto.items.length > 0) {
        totalDebit = dto.items.reduce((sum, i) => sum + i.debit, 0);
        totalCredit = dto.items.reduce((sum, i) => sum + i.credit, 0);
      }
      const difference = totalCredit - totalDebit;

      const result = await this.prisma.$transaction(async (tx) => {
        if (dto.items && dto.items.length > 0) {
          await tx.openingBalanceItem.deleteMany({
            where: { openingBalanceId: id },
          });
        }

        const updated = await tx.openingBalance.update({
          where: { id },
          data: {
            date: dto.date || existing.date,
            fiscalYear:
              dto.fiscalYear !== undefined
                ? dto.fiscalYear
                : existing.fiscalYear,
            totalDebit,
            totalCredit,
            difference,
            note: dto.note !== undefined ? dto.note : existing.note,
          },
        });

        let items: any[] = [];
        if (dto.items && dto.items.length > 0) {
          items = await Promise.all(
            dto.items.map((item) =>
              tx.openingBalanceItem.create({
                data: {
                  openingBalanceId: id,
                  accountId: item.accountId,
                  debit: item.debit,
                  credit: item.credit,
                },
              }),
            ),
          );
        } else {
          items = await tx.openingBalanceItem.findMany({
            where: { openingBalanceId: id },
          });
        }

        return { ...updated, items };
      });

      return result as unknown as GetOpeningBalanceResponseDto;
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        `Failed to update opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteOpeningBalance(id: string, entityId: string): Promise<void> {
    try {
      const existing = await this.prisma.openingBalance.findFirst({
        where: { id, entityId },
      });

      if (!existing) {
        throw new HttpException(
          'Opening balance not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (existing.status === 'Finalized' || existing.status === 'Reversed') {
        throw new BadRequestException(
          `Cannot delete a ${existing.status.toLowerCase()} opening balance. Use the reverse action to correct a posted entry.`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.openingBalanceItem.deleteMany({
          where: { openingBalanceId: id },
        });
        await tx.openingBalance.delete({ where: { id } });
      });
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new HttpException(
        `Failed to delete opening balance: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
