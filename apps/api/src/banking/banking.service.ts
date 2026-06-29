import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountService } from '../accounts/account/account.service';
import { OpeningBalanceService } from '../accounts/opening-balance/opening-balance.service';
import { BullmqService } from '../bullmq/bullmq.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class BankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
    private readonly openingBalanceService: OpeningBalanceService,
    private readonly bullmqService: BullmqService,
    private readonly cacheService: CacheService,
  ) {}

  async createBankAccount(
    createBankAccountDto: CreateBankAccountDto,
    effectiveEntityId: any,
    groupId: string,
  ) {
    // Check if account number already exists for this entity
    const existingAccount = await this.prisma.bankAccount.findFirst({
      where: {
        accountNumber: createBankAccountDto.accountNumber,
        entityId: effectiveEntityId,
      },
    });

    if (existingAccount) {
      throw new BadRequestException('Account number already exists');
    }

    // Find Cash and Cash Equivalents subcategory
    let cashSubCategory = await this.prisma.accountSubCategory.findFirst({
      where: {
        name: 'Cash and Cash Equivalents',
        category: {
          group: {
            entities: {
              some: {
                id: effectiveEntityId,
              },
            },
          },
        },
      },
    });

    if (!cashSubCategory) {
      throw new BadRequestException(
        'Cash and Cash Equivalents subcategory not found',
      );
    }

    // Auto-create linked account with unique code per entity
    const accountCode = await this.generateAccountCode(
      cashSubCategory.code,
      createBankAccountDto.accountName,
      effectiveEntityId,
    );

    const linkedAccount = await this.prisma.account.create({
      data: {
        name: createBankAccountDto.accountName,
        code: accountCode,
        description: `Bank account: ${createBankAccountDto.bankName} (${createBankAccountDto.accountNumber})`,
        entityId: effectiveEntityId,
        groupId,
        subCategoryId: cashSubCategory.id,
        linkedType: 'BANK', // Mark this account as linked to a bank
        balance: 0, // Start at 0, will be updated via opening balance posting
      },
    });

    // Create bank account (metadata only, balance managed through linked Account)
    const bankAccount = await this.prisma.bankAccount.create({
      data: {
        accountName: createBankAccountDto.accountName,
        bankName: createBankAccountDto.bankName,
        accountType: createBankAccountDto.accountType,
        currency: createBankAccountDto.currency,
        accountNumber: createBankAccountDto.accountNumber,
        routingNumber: createBankAccountDto.routingNumber,
        linkedAccountId: linkedAccount.id,
        entityId: effectiveEntityId,
        groupId,
      },
      include: {
        linkedAccount: true,
      },
    });

    // If opening balance is provided, set Account balance and post to journal
    if (createBankAccountDto.openingBalance > 0) {
      // Update linked account balance
      await this.prisma.account.update({
        where: { id: linkedAccount.id },
        data: { balance: createBankAccountDto.openingBalance },
      });

      // Create opening balance record with single item (this bank account)
      const openingBalanceRecord = await this.prisma.openingBalance.create({
        data: {
          entityId: effectiveEntityId,
          groupId,
          date: new Date(),
          // fiscalYear: new Date().getFullYear().toString(),
          totalDebit: createBankAccountDto.openingBalance,
          totalCredit: 0,
          difference: createBankAccountDto.openingBalance,
          status: 'Draft',
          note: `Opening balance for bank account: ${createBankAccountDto.accountName}`,
        },
      });

      // Create opening balance item
      const openingBalanceItem = await this.prisma.openingBalanceItem.create({
        data: {
          openingBalanceId: openingBalanceRecord.id,
          accountId: linkedAccount.id,
          debit: createBankAccountDto.openingBalance,
          credit: 0,
        },
      });

      // Queue opening balance posting to journal (async via BullMQ)
      const accounts = await this.prisma.account.findMany({
        where: {
          id: linkedAccount.id,
          entityId: effectiveEntityId,
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

      await this.bullmqService.addJob('post-opening-balance-journal', {
        openingBalanceId: openingBalanceRecord.id,
        entityId: effectiveEntityId,
        groupId,
        items: [openingBalanceItem],
        validItems: [openingBalanceItem],
        accountMap: Array.from(accountMap.entries()).map(([id, acc]) => ({
          id,
          account: acc,
        })),
      });
    }

    // Fetch fresh bankAccount with updated linkedAccount data
    await this.cacheService.invalidateEntityDashboardCache(effectiveEntityId);
    return await this.prisma.bankAccount.findUnique({
      where: { id: bankAccount.id },
      include: {
        linkedAccount: true,
      },
    });
  }

  async getBankAccounts(
    effectiveEntityId: any,
    page: number = 1,
    pageSize: number = 10,
  ) {
    const skip = (page - 1) * pageSize;

    const [bankAccounts, total] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: {
          entityId: effectiveEntityId,
        },
        include: {
          linkedAccount: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.bankAccount.count({
        where: {
          entityId: effectiveEntityId,
        },
      }),
    ]);

    return {
      data: bankAccounts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getBankAccountById(id: string, effectiveEntityId: any) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        linkedAccount: true,
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.entityId !== effectiveEntityId) {
      throw new ForbiddenException('Access denied');
    }

    // Get transaction statistics
    const transactions = await this.prisma.accountTransaction.findMany({
      where: {
        accountId: bankAccount.linkedAccountId,
        entityId: effectiveEntityId,
      },
      select: {
        creditAmount: true,
        debitAmount: true,
        status: true,
      },
    });

    const stats = {
      totalDeposits: transactions.reduce((sum, tx) => sum + tx.debitAmount, 0),
      totalWithdrawals: transactions.reduce((sum, tx) => sum + tx.creditAmount, 0),
      pendingCount: transactions.filter((tx) => tx.status === 'Pending').length,
      transactionsCount: transactions.length,
    };

    return {
      ...bankAccount,
      stats,
    };
  }

  async updateBankAccount(
    id: string,
    updateBankAccountDto: UpdateBankAccountDto,
    effectiveEntityId: any,
  ) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.entityId !== effectiveEntityId) {
      throw new ForbiddenException('Access denied');
    }

    // Check if trying to change account number to one that already exists for this entity
    if (
      updateBankAccountDto.accountNumber &&
      updateBankAccountDto.accountNumber !== bankAccount.accountNumber
    ) {
      const existingAccount = await this.prisma.bankAccount.findFirst({
        where: {
          accountNumber: updateBankAccountDto.accountNumber,
          entityId: effectiveEntityId,
          NOT: { id }, // Exclude current account from check
        },
      });

      if (existingAccount) {
        throw new BadRequestException('Account number already exists');
      }
    }

    const updatedAccount = await this.prisma.bankAccount.update({
      where: { id },
      data: updateBankAccountDto,
      include: {
        linkedAccount: true,
      },
    });

    await this.cacheService.invalidateEntityDashboardCache(effectiveEntityId);
    return updatedAccount;
  }

  async deleteBankAccount(id: string, effectiveEntityId: any) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: {
        linkedAccount: {
          include: {
            accountTransactions: true,
          },
        },
      },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.entityId !== effectiveEntityId) {
      throw new ForbiddenException('Access denied');
    }

    if (bankAccount.linkedAccount.accountTransactions.length > 0) {
      throw new BadRequestException(
        'Cannot delete bank account with existing transactions',
      );
    }

    // Delete linked account if exists
    if (bankAccount.linkedAccountId) {
      await this.prisma.account.delete({
        where: { id: bankAccount.linkedAccountId },
      });
    }

    // Delete bank account
    await this.prisma.bankAccount.delete({
      where: { id },
    });

    await this.cacheService.invalidateEntityDashboardCache(effectiveEntityId);
    return { message: 'Bank account deleted successfully' };
  }

  async addTransaction(
    bankAccountId: string,
    transactionData: {
      date: Date;
      description: string;
      category?: string;
      amount: number;
      type: 'credit' | 'debit';
      reference?: string;
      payee?: string;
      method?: string;
      metadata?: any;
      offsetAccountId?: string;
    },
    effectiveEntityId: any,
    groupId: string,
  ) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { linkedAccount: true },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.entityId !== effectiveEntityId) {
      throw new ForbiddenException('Access denied');
    }

    const balanceChange =
      transactionData.type === 'credit'
        ? transactionData.amount
        : -transactionData.amount;
    const newBankBalance = bankAccount.linkedAccount.balance + balanceChange;

    const commonFields = {
      date: transactionData.date,
      description: transactionData.description,
      reference: transactionData.reference,
      type: 'BANK' as const,
      status: 'Success' as const,
      payee: transactionData.payee,
      method: transactionData.method,
      entityId: effectiveEntityId,
      groupId,
      metadata: transactionData.metadata || {},
    };

    if (transactionData.offsetAccountId) {
      // Double-entry: bank side + offset account side in one transaction
      const offsetAccount = await this.prisma.account.findUnique({
        where: { id: transactionData.offsetAccountId },
        select: { id: true, balance: true, entityId: true },
      });
      if (!offsetAccount) throw new NotFoundException('Offset account not found');
      if (offsetAccount.entityId !== effectiveEntityId) throw new ForbiddenException('Offset account does not belong to this entity');

      // Offset is always the MIRROR of the bank side
      // Withdrawal (type=credit): CR bank → DR offset (expense)
      // Deposit    (type=debit):  DR bank → CR offset (income/liability)
      const offsetDebit  = transactionData.type === 'credit' ? transactionData.amount : 0;
      const offsetCredit = transactionData.type === 'debit'  ? transactionData.amount : 0;
      const offsetBalanceChange = offsetDebit - offsetCredit;
      const newOffsetBalance = offsetAccount.balance + offsetBalanceChange;

      const [bankTx] = await this.prisma.$transaction([
        this.prisma.accountTransaction.create({
          data: {
            ...commonFields,
            accountId: bankAccount.linkedAccountId,
            debitAmount: transactionData.type === 'debit' ? transactionData.amount : 0,
            creditAmount: transactionData.type === 'credit' ? transactionData.amount : 0,
            runningBalance: newBankBalance,
          },
        }),
        this.prisma.account.update({
          where: { id: bankAccount.linkedAccountId },
          data: { balance: newBankBalance },
        }),
        this.prisma.accountTransaction.create({
          data: {
            ...commonFields,
            accountId: transactionData.offsetAccountId,
            debitAmount: offsetDebit,
            creditAmount: offsetCredit,
            runningBalance: newOffsetBalance,
          },
        }),
        this.prisma.account.update({
          where: { id: transactionData.offsetAccountId },
          data: { balance: newOffsetBalance },
        }),
      ]);

      await this.cacheService.invalidateEntityDashboardCache(effectiveEntityId);
      return bankTx;
    }

    // Single-sided entry (no offset account — legacy behaviour)
    const [accountTransaction] = await Promise.all([
      this.prisma.accountTransaction.create({
        data: {
          ...commonFields,
          accountId: bankAccount.linkedAccountId,
          debitAmount: transactionData.type === 'debit' ? transactionData.amount : 0,
          creditAmount: transactionData.type === 'credit' ? transactionData.amount : 0,
          runningBalance: newBankBalance,
        },
      }),
      this.prisma.account.update({
        where: { id: bankAccount.linkedAccountId },
        data: { balance: newBankBalance },
      }),
    ]);

    await this.cacheService.invalidateEntityDashboardCache(effectiveEntityId);
    return accountTransaction;
  }

  async getTransactions(
    bankAccountId: string,
    effectiveEntityId: any,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
    });

    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    if (bankAccount.entityId !== effectiveEntityId) {
      throw new ForbiddenException('Access denied');
    }

    const skip = (page - 1) * pageSize;

    // Query transactions via the linked account
    const [transactions, total] = await Promise.all([
      this.prisma.accountTransaction.findMany({
        where: {
          accountId: bankAccount.linkedAccountId,
          entityId: effectiveEntityId,
        },
        skip,
        take: pageSize,
        orderBy: { date: 'desc' },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),
      this.prisma.accountTransaction.count({
        where: {
          accountId: bankAccount.linkedAccountId,
          entityId: effectiveEntityId,
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

  // ─── Reconciliation ──────────────────────────────────────────────────────────

  async validateBankAccountAccess(bankAccountId: string, entityId: string) {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      include: { linkedAccount: { select: { id: true, balance: true } } },
    });
    if (!account) throw new NotFoundException('Bank account not found');
    if (account.entityId !== entityId) throw new ForbiddenException('Access denied');
    return account;
  }

  private buildBookTxs(transactions: any[], matches: { bookTransactionId: string; statementTransactionId: string }[]) {
    return transactions.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString().split('T')[0],
      description: tx.description,
      reference: tx.reference ?? '',
      // debitAmount > 0 = money IN (DR bank account in books = deposit/received)
      // creditAmount > 0 = money OUT (CR bank account in books = withdrawal/paid)
      amount: tx.debitAmount - tx.creditAmount,
      category: null as string | null,
      matched: matches.some((m) => m.bookTransactionId === tx.id),
      matchedStatementId: matches.find((m) => m.bookTransactionId === tx.id)?.statementTransactionId ?? null,
    }));
  }

  async listReconciliations(bankAccountId: string, entityId: string, page = 1, pageSize = 20) {
    await this.validateBankAccountAccess(bankAccountId, entityId);
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.prisma.bankReconciliation.findMany({
        where: { bankAccountId, entityId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          statementStartDate: true,
          statementEndDate: true,
          statementEndingBalance: true,
          status: true,
          completedAt: true,
          reconciliationCompletedBy: { select: { firstName: true, lastName: true } },
          notes: true,
          _count: { select: { statementTransactions: true, matches: true } },
        },
      }),
      this.prisma.bankReconciliation.count({ where: { bankAccountId, entityId } }),
    ]);

    return {
      data: records.map((r) => ({
        id: r.id,
        statementStartDate: r.statementStartDate ? r.statementStartDate.toISOString().split('T')[0] : null,
        statementEndDate: r.statementEndDate.toISOString().split('T')[0],
        statementEndingBalance: r.statementEndingBalance,
        status: r.status,
        completedAt: r.completedAt,
        completedBy: r.reconciliationCompletedBy ? `${r.reconciliationCompletedBy.firstName} ${r.reconciliationCompletedBy.lastName}` : null,
        notes: r.notes,
        statementTransactionCount: r._count.statementTransactions,
        matchedCount: r._count.matches,
      })),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getReconciliationById(bankAccountId: string, reconcileId: string, entityId: string) {
    const bankAccount = await this.validateBankAccountAccess(bankAccountId, entityId);

    const recon = await this.prisma.bankReconciliation.findUnique({
      where: { id: reconcileId },
      include: {
        statementTransactions: { orderBy: { date: 'asc' } },
        matches: true,
      },
    });

    if (!recon) {
      // No record yet — return empty state so the frontend treats it as a new form
      const bookTxs = await this.prisma.accountTransaction.findMany({
        where: { accountId: bankAccount.linkedAccountId, entityId, status: 'Success', clearedInReconciliationId: null },
        orderBy: { date: 'desc' },
      });
      return {
        reconciliation: null,
        statementTransactions: [],
        bookTransactions: this.buildBookTxs(bookTxs, []),
        matches: [],
        glBalance: bankAccount.linkedAccount?.balance ?? 0,
      };
    }

    if (recon.bankAccountId !== bankAccountId || recon.entityId !== entityId) {
      throw new ForbiddenException('Access denied');
    }

    // Load book transactions filtered to statement date range (if start date present)
    const dateFilter: any = { accountId: bankAccount.linkedAccountId, entityId, status: 'Success' };
    if (recon.status === 'DRAFT') {
      // For drafts: show uncleared + already matched in this reconciliation
      const matchedBookIds = recon.matches.map((m) => m.bookTransactionId);
      dateFilter.OR = [
        { clearedInReconciliationId: null },
        { id: { in: matchedBookIds } },
      ];
    } else {
      // For completed: show only the matched transactions
      const matchedBookIds = recon.matches.map((m) => m.bookTransactionId);
      dateFilter.id = { in: matchedBookIds };
    }

    if (recon.statementStartDate) {
      dateFilter.date = { gte: recon.statementStartDate, lte: recon.statementEndDate };
    } else if (recon.status === 'DRAFT') {
      dateFilter.date = { lte: recon.statementEndDate };
    }

    const bookTransactions = await this.prisma.accountTransaction.findMany({
      where: dateFilter,
      orderBy: { date: 'desc' },
    });

    const matchList = recon.matches.map((m) => ({ bookTransactionId: m.bookTransactionId, statementTransactionId: m.statementTransactionId }));

    return {
      reconciliation: {
        id: recon.id,
        statementStartDate: recon.statementStartDate ? recon.statementStartDate.toISOString().split('T')[0] : null,
        statementEndDate: recon.statementEndDate.toISOString().split('T')[0],
        statementEndingBalance: recon.statementEndingBalance,
        status: recon.status,
        notes: recon.notes,
      },
      statementTransactions: recon.statementTransactions.map((st) => ({
        id: st.id,
        date: st.date.toISOString().split('T')[0],
        description: st.description,
        reference: st.reference ?? '',
        amount: st.amount,
        category: st.category,
        matched: matchList.some((m) => m.statementTransactionId === st.id),
        matchedBookId: matchList.find((m) => m.statementTransactionId === st.id)?.bookTransactionId ?? null,
      })),
      bookTransactions: this.buildBookTxs(bookTransactions, matchList),
      matches: matchList,
      glBalance: bankAccount.linkedAccount?.balance ?? 0,
    };
  }

  private async upsertReconciliationInTransaction(
    tx: any,
    {
      reconcileId,
      bankAccountId,
      entityId,
      groupId,
      userId,
      dto,
      complete,
    }: {
      reconcileId: string;
      bankAccountId: string;
      entityId: string;
      groupId: string;
      userId: string;
      dto: { id?: string; statementStartDate?: string; statementEndDate: string; statementEndingBalance: number; statementTransactions: any[]; matches: any[]; notes?: string };
      complete: boolean;
    },
  ) {
    const existing = await tx.bankReconciliation.findUnique({ where: { id: reconcileId } });

    if (existing && existing.status === 'COMPLETED' && !complete) {
      throw new ForbiddenException('Cannot modify a completed reconciliation');
    }

    const sharedData = {
      statementStartDate: dto.statementStartDate ? new Date(dto.statementStartDate) : null,
      statementEndDate: new Date(dto.statementEndDate),
      statementEndingBalance: dto.statementEndingBalance,
    };

    let recon: any;
    if (existing) {
      await tx.bankStatementTransaction.deleteMany({ where: { reconciliationId: reconcileId } });
      recon = await tx.bankReconciliation.update({
        where: { id: reconcileId },
        data: {
          ...sharedData,
          ...(complete ? { status: 'COMPLETED', notes: dto.notes || null, completedBy: userId, completedAt: new Date() } : {}),
        },
      });
    } else {
      recon = await tx.bankReconciliation.create({
        data: {
          id: reconcileId,
          bankAccountId,
          entityId,
          groupId,
          ...sharedData,
          status: complete ? 'COMPLETED' : 'DRAFT',
          notes: dto.notes || null,
          createdBy: userId,
          ...(complete ? { completedBy: userId, completedAt: new Date() } : {}),
        },
      });
    }

    if (dto.statementTransactions.length > 0) {
      await tx.bankStatementTransaction.createMany({
        data: dto.statementTransactions.map((st) => ({
          id: st.id,
          reconciliationId: recon.id,
          entityId,
          groupId,
          date: new Date(st.date),
          description: st.description,
          reference: st.reference || null,
          amount: st.amount,
          category: st.category || null,
        })),
      });
    }

    if (dto.matches.length > 0) {
      await tx.bankReconciliationMatch.createMany({
        data: dto.matches.map((m) => ({
          reconciliationId: recon.id,
          statementTransactionId: m.statementTransactionId,
          bookTransactionId: m.bookTransactionId,
          entityId,
          groupId,
        })),
      });
    }

    return recon;
  }

  async saveDraft(
    bankAccountId: string,
    reconcileId: string,
    entityId: string,
    groupId: string,
    userId: string,
    dto: { id?: string; statementStartDate?: string; statementEndDate: string; statementEndingBalance: number; statementTransactions: any[]; matches: any[] },
  ) {
    await this.validateBankAccountAccess(bankAccountId, entityId);

    const reconciliation = await this.prisma.$transaction(async (tx) => {
      return this.upsertReconciliationInTransaction(tx, {
        reconcileId,
        bankAccountId,
        entityId,
        groupId,
        userId,
        dto,
        complete: false,
      });
    });

    return { message: 'Draft saved', reconciliationId: reconciliation.id };
  }

  async completeReconciliation(
    bankAccountId: string,
    reconcileId: string,
    entityId: string,
    groupId: string,
    userId: string,
    dto: { id?: string; statementStartDate?: string; statementEndDate: string; statementEndingBalance: number; statementTransactions: any[]; matches: any[]; notes?: string },
  ) {
    await this.validateBankAccountAccess(bankAccountId, entityId);

    await this.prisma.$transaction(async (tx) => {
      const recon = await this.upsertReconciliationInTransaction(tx, {
        reconcileId,
        bankAccountId,
        entityId,
        groupId,
        userId,
        dto,
        complete: true,
      });

      if (dto.matches.length > 0) {
        await tx.accountTransaction.updateMany({
          where: { id: { in: dto.matches.map((m) => m.bookTransactionId) } },
          data: { clearedInReconciliationId: recon.id },
        });
      }
    });

    return { message: 'Reconciliation completed' };
  }

  async getBookTransactions(
    bankAccountId: string,
    entityId: string,
    startDate?: string,
    endDate?: string,
    reconcileId?: string,
  ) {
    const bankAccount = await this.validateBankAccountAccess(bankAccountId, entityId);

    // Collect book IDs already matched in this reconciliation session so they
    // stay visible even if they fall outside the new date range.
    let alreadyMatchedIds: string[] = [];
    if (reconcileId) {
      const matches = await this.prisma.bankReconciliationMatch.findMany({
        where: { reconciliationId: reconcileId },
        select: { bookTransactionId: true },
      });
      alreadyMatchedIds = matches.map((m) => m.bookTransactionId);
    }

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (endDate) {
      dateFilter.date = { lte: new Date(endDate) };
    }

    const where: any = {
      accountId: bankAccount.linkedAccountId,
      entityId,
      status: 'Success',
    };

    // Include uncleared transactions in range OR already-matched ones for this reconciliation
    if (alreadyMatchedIds.length > 0) {
      where.OR = [
        { clearedInReconciliationId: null, ...dateFilter },
        { id: { in: alreadyMatchedIds } },
      ];
    } else {
      where.clearedInReconciliationId = null;
      if (dateFilter.date) where.date = dateFilter.date;
    }

    const txs = await this.prisma.accountTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return {
      data: this.buildBookTxs(txs, alreadyMatchedIds.map((id) => ({ bookTransactionId: id, statementTransactionId: '' }))),
      glBalance: bankAccount.linkedAccount?.balance ?? 0,
    };
  }

  // Kept for legacy compatibility — returns first DRAFT or null
  async getActiveReconciliation(bankAccountId: string, entityId: string) {
    const bankAccount = await this.validateBankAccountAccess(bankAccountId, entityId);
    const draft = await this.prisma.bankReconciliation.findFirst({
      where: { bankAccountId, entityId, status: 'DRAFT' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    return { draftId: draft?.id ?? null };
  }

  async getReconciliationHistory(bankAccountId: string, entityId: string) {
    return this.listReconciliations(bankAccountId, entityId, 1, 100);
  }

  private async generateAccountCode(
    subCategoryCode: string,
    accountName: string,
    entityId: string,
  ): Promise<string> {
    const sanitizedName = accountName
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();

    let sequence = 1;
    let codeToCheck = `${subCategoryCode}-${sanitizedName}-${String(sequence).padStart(2, '0')}`;

    // Keep incrementing sequence until we find an unused code for this entity
    while (true) {
      const existingAccount = await this.prisma.account.findUnique({
        where: {
          entityId_code: {
            entityId,
            code: codeToCheck,
          },
        },
      });

      if (!existingAccount) {
        // Code is unique for this entity
        return codeToCheck;
      }

      // Code exists, try next sequence
      sequence++;
      codeToCheck = `${subCategoryCode}-${sanitizedName}-${String(sequence).padStart(2, '0')}`;
    }
  }
}
