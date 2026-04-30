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

@Injectable()
export class BankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountService: AccountService,
    private readonly openingBalanceService: OpeningBalanceService,
    private readonly bullmqService: BullmqService,
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
      totalDeposits: transactions.reduce((sum, tx) => sum + tx.creditAmount, 0),
      totalWithdrawals: transactions.reduce((sum, tx) => sum + tx.debitAmount, 0),
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

    // Calculate new balance from linked account
    const balanceChange =
      transactionData.type === 'credit'
        ? transactionData.amount
        : -transactionData.amount;
    const newBalance = bankAccount.linkedAccount.balance + balanceChange;

    // Create account transaction and update linked account balance
    const [accountTransaction] = await Promise.all([
      this.prisma.accountTransaction.create({
        data: {
          date: transactionData.date,
          description: transactionData.description,
          reference: transactionData.reference,
          type: 'BANK',
          status: 'Success',
          accountId: bankAccount.linkedAccountId,
          debitAmount: transactionData.type === 'debit' ? transactionData.amount : 0,
          creditAmount: transactionData.type === 'credit' ? transactionData.amount : 0,
          runningBalance: newBalance,
          payee: transactionData.payee,
          method: transactionData.method,
          entityId: effectiveEntityId,
          groupId,
          metadata: transactionData.metadata || {},
        },
      }),
      this.prisma.account.update({
        where: { id: bankAccount.linkedAccountId },
        data: {
          balance: newBalance,
        },
      }),
    ]);

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
    });
    if (!account) throw new NotFoundException('Bank account not found');
    if (account.entityId !== entityId) throw new ForbiddenException('Access denied');
    return account;
  }

  async getActiveReconciliation(bankAccountId: string, entityId: string) {
    const bankAccount = await this.validateBankAccountAccess(bankAccountId, entityId);

    const draft = await this.prisma.bankReconciliation.findFirst({
      where: { bankAccountId, entityId, status: 'DRAFT' },
      include: {
        statementTransactions: { orderBy: { date: 'asc' } },
        matches: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Load book transactions: all uncleared BANK transactions for this GL account
    const bookTransactions = await this.prisma.accountTransaction.findMany({
      where: {
        accountId: bankAccount.linkedAccountId,
        entityId,
        status: 'Success',
        clearedInReconciliationId: null,
      },
      orderBy: { date: 'desc' },
    });

    const bookTxs = bookTransactions.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString().split('T')[0],
      description: tx.description,
      reference: tx.reference ?? '',
      amount: tx.creditAmount - tx.debitAmount,
      category: null as string | null,
      matched: draft ? draft.matches.some((m) => m.bookTransactionId === tx.id) : false,
      matchedStatementId: draft?.matches.find((m) => m.bookTransactionId === tx.id)?.statementTransactionId ?? null,
    }));

    if (!draft) {
      return {
        reconciliation: null,
        statementTransactions: [],
        bookTransactions: bookTxs,
        matches: [],
      };
    }

    return {
      reconciliation: {
        id: draft.id,
        statementEndDate: draft.statementEndDate.toISOString().split('T')[0],
        statementEndingBalance: draft.statementEndingBalance,
        status: draft.status,
        notes: draft.notes,
      },
      statementTransactions: draft.statementTransactions.map((st) => ({
        id: st.id,
        date: st.date.toISOString().split('T')[0],
        description: st.description,
        reference: st.reference ?? '',
        amount: st.amount,
        category: st.category,
        matched: draft.matches.some((m) => m.statementTransactionId === st.id),
        matchedBookId: draft.matches.find((m) => m.statementTransactionId === st.id)?.bookTransactionId ?? null,
      })),
      bookTransactions: bookTxs,
      matches: draft.matches.map((m) => ({
        statementTransactionId: m.statementTransactionId,
        bookTransactionId: m.bookTransactionId,
      })),
    };
  }

  async saveDraft(
    bankAccountId: string,
    entityId: string,
    groupId: string,
    userId: string,
    dto: { statementEndDate: string; statementEndingBalance: number; statementTransactions: any[]; matches: any[] },
  ) {
    await this.validateBankAccountAccess(bankAccountId, entityId);

    const existingDraft = await this.prisma.bankReconciliation.findFirst({
      where: { bankAccountId, entityId, status: 'DRAFT' },
    });

    const reconciliation = await this.prisma.$transaction(async (tx) => {
      let recon: any;

      if (existingDraft) {
        // Delete old statement txs and matches (cascade deletes matches too)
        await tx.bankStatementTransaction.deleteMany({ where: { reconciliationId: existingDraft.id } });

        recon = await tx.bankReconciliation.update({
          where: { id: existingDraft.id },
          data: {
            statementEndDate: new Date(dto.statementEndDate),
            statementEndingBalance: dto.statementEndingBalance,
          },
        });
      } else {
        recon = await tx.bankReconciliation.create({
          data: {
            bankAccountId,
            entityId,
            groupId,
            statementEndDate: new Date(dto.statementEndDate),
            statementEndingBalance: dto.statementEndingBalance,
            status: 'DRAFT',
            createdBy: userId,
          },
        });
      }

      // Re-create statement transactions
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

      // Re-create matches
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
    });

    return { message: 'Draft saved', reconciliationId: reconciliation.id };
  }

  async completeReconciliation(
    bankAccountId: string,
    entityId: string,
    groupId: string,
    userId: string,
    dto: { statementEndDate: string; statementEndingBalance: number; statementTransactions: any[]; matches: any[]; notes?: string },
  ) {
    await this.validateBankAccountAccess(bankAccountId, entityId);

    const existingDraft = await this.prisma.bankReconciliation.findFirst({
      where: { bankAccountId, entityId, status: 'DRAFT' },
    });

    await this.prisma.$transaction(async (tx) => {
      let recon: any;

      if (existingDraft) {
        await tx.bankStatementTransaction.deleteMany({ where: { reconciliationId: existingDraft.id } });
        recon = await tx.bankReconciliation.update({
          where: { id: existingDraft.id },
          data: {
            statementEndDate: new Date(dto.statementEndDate),
            statementEndingBalance: dto.statementEndingBalance,
            status: 'COMPLETED',
            notes: dto.notes || null,
            completedBy: userId,
            completedAt: new Date(),
          },
        });
      } else {
        recon = await tx.bankReconciliation.create({
          data: {
            bankAccountId,
            entityId,
            groupId,
            statementEndDate: new Date(dto.statementEndDate),
            statementEndingBalance: dto.statementEndingBalance,
            status: 'COMPLETED',
            notes: dto.notes || null,
            createdBy: userId,
            completedBy: userId,
            completedAt: new Date(),
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

        // Mark matched book transactions as cleared
        await tx.accountTransaction.updateMany({
          where: { id: { in: dto.matches.map((m) => m.bookTransactionId) } },
          data: { clearedInReconciliationId: recon.id },
        });
      }
    });

    return { message: 'Reconciliation completed' };
  }

  async getReconciliationHistory(bankAccountId: string, entityId: string) {
    await this.validateBankAccountAccess(bankAccountId, entityId);

    const records = await this.prisma.bankReconciliation.findMany({
      where: { bankAccountId, entityId, status: 'COMPLETED' },
      orderBy: { statementEndDate: 'desc' },
      select: {
        id: true,
        statementEndDate: true,
        statementEndingBalance: true,
        completedAt: true,
        completedBy: true,
        notes: true,
        _count: { select: { statementTransactions: true, matches: true } },
      },
    });

    return records.map((r) => ({
      id: r.id,
      statementEndDate: r.statementEndDate.toISOString().split('T')[0],
      statementEndingBalance: r.statementEndingBalance,
      completedAt: r.completedAt,
      completedBy: r.completedBy,
      notes: r.notes,
      statementTransactionCount: r._count.statementTransactions,
      matchedCount: r._count.matches,
    }));
  }

  parseImportedCSV(fileBuffer: Buffer): { date: string; description: string; reference: string; amount: number; category: string }[] {
    const content = fileBuffer.toString('utf-8').trim();
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    // Detect header row and column indices
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
    const dateIdx = headers.findIndex((h) => h.includes('date'));
    const descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('narr') || h.includes('detail'));
    const refIdx = headers.findIndex((h) => h.includes('ref') || h.includes('cheque') || h.includes('check'));
    const amtIdx = headers.findIndex((h) => h.includes('amount') || h.includes('amt'));
    const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('type'));
    const debitIdx = headers.findIndex((h) => h === 'debit' || h === 'withdrawal');
    const creditIdx = headers.findIndex((h) => h === 'credit' || h === 'deposit');

    if (dateIdx === -1 || descIdx === -1) return [];

    return lines.slice(1).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      const dateRaw = cols[dateIdx] || '';
      const desc = cols[descIdx] || '';
      const ref = refIdx >= 0 ? (cols[refIdx] || '') : '';
      const cat = catIdx >= 0 ? (cols[catIdx] || '') : '';

      let amount = 0;
      if (amtIdx >= 0) {
        const raw = cols[amtIdx].replace(/[₦,$, ]/g, '');
        amount = parseFloat(raw) || 0;
      } else if (debitIdx >= 0 || creditIdx >= 0) {
        const credit = creditIdx >= 0 ? parseFloat((cols[creditIdx] || '0').replace(/[₦,$, ]/g, '')) || 0 : 0;
        const debit = debitIdx >= 0 ? parseFloat((cols[debitIdx] || '0').replace(/[₦,$, ]/g, '')) || 0 : 0;
        amount = credit - debit;
      }

      // Parse date: support YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
      let parsedDate = dateRaw;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) {
        const [d, m, y] = dateRaw.split('/');
        parsedDate = `${y}-${m}-${d}`;
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateRaw)) {
        const [m, d, y] = dateRaw.split('/');
        parsedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      return { date: parsedDate, description: desc, reference: ref, amount, category: cat };
    }).filter((r) => r.description);
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
