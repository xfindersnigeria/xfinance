import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  description: string;
}

interface PostingRuleResult {
  journalId: string;
  lines: JournalLine[];
  totalDebits: number;
  totalCredits: number;
}

@Injectable()
export class JournalPostingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * PHASE 1: Sales Invoice
   * Invoice total = T, Net = N, VAT = V
   * Dr Accounts Receivable (1120) = T
   * Cr Service Revenue (4120) = N or Cr Product Sales Revenue (4110) = N
   * Cr Tax Payable (2140) = V (if used)
   */
  async postInvoice(
    invoiceId: string,
    entityId: string,
    invoiceData: {
      total: number;
      subtotal: number;
      tax: number;
      type: 'product' | 'service';
    },
  ): Promise<PostingRuleResult> {
    // Get default accounts
    const arAccount = await this.getDefaultAccount(
      entityId,
      'Accounts Receivable',
    );
    const taxPayableAccount = await this.getDefaultAccount(
      entityId,
      'Tax Payable',
    );
    const revenueAccount = await this.getDefaultAccount(
      entityId,
      invoiceData.type === 'product'
        ? 'Product Sales Revenue'
        : 'Service Revenue',
    );

    if (!arAccount || !revenueAccount) {
      throw new NotFoundException('Required revenue accounts not found');
    }

    const lines: JournalLine[] = [
      {
        accountId: arAccount.id,
        debit: invoiceData.total,
        credit: 0,
        description: `Invoice #${invoiceId} - Accounts Receivable`,
      },
      {
        accountId: revenueAccount.id,
        debit: 0,
        credit: invoiceData.subtotal,
        description: `Invoice #${invoiceId} - ${invoiceData.type === 'product' ? 'Product Sales' : 'Service'} Revenue`,
      },
    ];

    // Add tax line if applicable
    if (invoiceData.tax > 0 && taxPayableAccount) {
      lines.push({
        accountId: taxPayableAccount.id,
        debit: 0,
        credit: invoiceData.tax,
        description: `Invoice #${invoiceId} - Tax Payable`,
      });
    }

    return this.createJournalEntry(
      entityId,
      `INV-${invoiceId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 2: Customer Payment (applied to invoice)
   * Payment amount = P
   * Dr Cash and Cash Equivalent = P
   * Cr Accounts Receivable (1120) = P
   */
  async postCustomerPayment(
    paymentId: string,
    entityId: string,
    paymentData: {
      amount: number;
      cashAccountId: string;
    },
  ): Promise<PostingRuleResult> {
    // Verify cash account exists
    const cashAccount = await this.prisma.account.findUnique({
      where: { id: paymentData.cashAccountId },
    });

    if (!cashAccount || cashAccount.entityId !== entityId) {
      throw new NotFoundException('Cash account not found for this entity');
    }

    const arAccount = await this.getDefaultAccount(
      entityId,
      'Accounts Receivable',
    );

    if (!arAccount) {
      throw new NotFoundException('Accounts Receivable account not found');
    }

    const lines: JournalLine[] = [
      {
        accountId: paymentData.cashAccountId,
        debit: paymentData.amount,
        credit: 0,
        description: `Customer Payment #${paymentId} - Cash Received`,
      },
      {
        accountId: arAccount.id,
        debit: 0,
        credit: paymentData.amount,
        description: `Customer Payment #${paymentId} - Accounts Receivable`,
      },
    ];

    return this.createJournalEntry(
      entityId,
      `PAY-RECV-${paymentId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 3: Cash Receipt (not tied to invoice) - Immediate sale
   * Dr Cash/Bank = amount received
   * Cr Service Revenue (4120) = N or Cr Product Sales Revenue (4110) = N
   * Cr Tax Payable (2140) = V (if used)
   */
  async postCashReceipt(
    receiptId: string,
    entityId: string,
    receiptData: {
      total: number;
      subtotal: number;
      tax: number;
      type: 'product' | 'service';
      cashAccountId: string;
    },
  ): Promise<PostingRuleResult> {
    // Verify cash account exists
    const cashAccount = await this.prisma.account.findUnique({
      where: { id: receiptData.cashAccountId },
    });

    if (!cashAccount || cashAccount.entityId !== entityId) {
      throw new NotFoundException('Cash account not found for this entity');
    }

    const revenueAccount = await this.getDefaultAccount(
      entityId,
      receiptData.type === 'product'
        ? 'Product Sales Revenue'
        : 'Service Revenue',
    );
    const taxPayableAccount = await this.getDefaultAccount(
      entityId,
      'Tax Payable',
    );

    if (!revenueAccount) {
      throw new NotFoundException('Revenue account not found');
    }

    const lines: JournalLine[] = [
      {
        accountId: receiptData.cashAccountId,
        debit: receiptData.total,
        credit: 0,
        description: `Cash Receipt #${receiptId} - Immediate Sale`,
      },
      {
        accountId: revenueAccount.id,
        debit: 0,
        credit: receiptData.subtotal,
        description: `Cash Receipt #${receiptId} - ${receiptData.type === 'product' ? 'Product Sales' : 'Service'} Revenue`,
      },
    ];

    if (receiptData.tax > 0 && taxPayableAccount) {
      lines.push({
        accountId: taxPayableAccount.id,
        debit: 0,
        credit: receiptData.tax,
        description: `Cash Receipt #${receiptId} - Tax Payable`,
      });
    }

    return this.createJournalEntry(
      entityId,
      `RCPT-${receiptId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 4: Vendor Bill (Expense bill)
   * Bill total = T, Net = N, VAT = V
   * Dr Expense account = N
   * Dr Tax Payable (2140) = V (if used)
   * Cr Accounts Payable (2110) = T
   */
  async postVendorBill(
    billId: string,
    entityId: string,
    billData: {
      total: number;
      subtotal: number;
      tax: number;
      expenseAccountId: string;
    },
  ): Promise<PostingRuleResult> {
    // Verify expense account exists
    const expenseAccount = await this.prisma.account.findUnique({
      where: { id: billData.expenseAccountId },
    });

    if (!expenseAccount || expenseAccount.entityId !== entityId) {
      throw new NotFoundException('Expense account not found for this entity');
    }

    const apAccount = await this.getDefaultAccount(
      entityId,
      'Accounts Payable',
    );
    const taxPayableAccount = await this.getDefaultAccount(
      entityId,
      'Tax Payable',
    );

    if (!apAccount) {
      throw new NotFoundException('Accounts Payable account not found');
    }

    const lines: JournalLine[] = [
      {
        accountId: billData.expenseAccountId,
        debit: billData.subtotal,
        credit: 0,
        description: `Bill #${billId} - Expense`,
      },
      {
        accountId: apAccount.id,
        debit: 0,
        credit: billData.total,
        description: `Bill #${billId} - Accounts Payable`,
      },
    ];

    if (billData.tax > 0 && taxPayableAccount) {
      // Tax is debit because it's recoverable (reduces tax payable)
      lines.push({
        accountId: taxPayableAccount.id,
        debit: billData.tax,
        credit: 0,
        description: `Bill #${billId} - Input Tax`,
      });
    }

    return this.createJournalEntry(
      entityId,
      `BILL-${billId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 4B: Vendor Bill with Multiple Items (Expense bill with per-item accounts)
   * Allows bills to have items charged to different expense accounts
   * Bill total = T, Net = N, VAT = V
   * Dr Expense account 1 = Item1 subtotal
   * Dr Expense account 2 = Item2 subtotal
   * ... (one line per unique expense account)
   * Dr Tax Payable (2140) = V (if used)
   * Cr Accounts Payable (2110) = T
   */
  async postVendorBillWithItems(
    billId: string,
    entityId: string,
    billData: {
      total: number;
      subtotal: number;
      tax: number;
      items: Array<{
        name: string;
        quantity: number;
        rate: number;
        total: number;
        expenseAccountId: string;
      }>;
    },
  ): Promise<PostingRuleResult> {
    // Verify all expense accounts exist and belong to entity
    const accountIds = [...new Set(billData.items.map(item => item.expenseAccountId))];
    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: accountIds },
        entityId,
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new NotFoundException(
        'One or more expense accounts not found for this entity',
      );
    }

    // Group items by expense account and sum amounts
    const accountTotals = new Map<string, number>();
    for (const item of billData.items) {
      const current = accountTotals.get(item.expenseAccountId) || 0;
      accountTotals.set(item.expenseAccountId, current + item.total);
    }

    // Get Accounts Payable account
    const apAccount = await this.getDefaultAccount(
      entityId,
      'Accounts Payable',
    );
    const taxPayableAccount = await this.getDefaultAccount(
      entityId,
      'Tax Payable',
    );

    if (!apAccount) {
      throw new NotFoundException('Accounts Payable account not found');
    }

    // Create debit lines for each expense account
    const lines: JournalLine[] = [];
    let totalDebits = 0;

    for (const [accountId, amount] of accountTotals.entries()) {
      const account = accounts.find(acc => acc.id === accountId);
      lines.push({
        accountId,
        debit: amount,
        credit: 0,
        description: `Bill #${billId} - ${account?.name || 'Expense'}`,
      });
      totalDebits += amount;
    }

    // Add tax line if applicable (input tax is debit, reduces tax liability)
    if (billData.tax > 0 && taxPayableAccount) {
      lines.push({
        accountId: taxPayableAccount.id,
        debit: billData.tax,
        credit: 0,
        description: `Bill #${billId} - Input Tax`,
      });
      totalDebits += billData.tax;
    }

    // Add Accounts Payable credit for total
    lines.push({
      accountId: apAccount.id,
      debit: 0,
      credit: billData.total,
      description: `Bill #${billId} - Accounts Payable`,
    });

    // Validate journal balances
    const totalCredits = billData.total;
    if (totalDebits !== totalCredits) {
      throw new Error(
        `Journal unbalanced: Debits (${totalDebits}) do not equal Credits (${totalCredits})`,
      );
    }

    return this.createJournalEntry(
      entityId,
      `BILL-${billId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 5: Bill Payment (settle A/P)
   * Payment amount = P
   * Dr Accounts Payable (2110) = P
   * Cr Cash/Bank = P
   */
  async postBillPayment(
    paymentId: string,
    billId: string,
    entityId: string,
    paymentData: {
      amount: number;
      cashAccountId: string;
    },
  ): Promise<PostingRuleResult> {
    // Verify cash account exists
    const cashAccount = await this.prisma.account.findUnique({
      where: { id: paymentData.cashAccountId },
    });

    if (!cashAccount || cashAccount.entityId !== entityId) {
      throw new NotFoundException('Cash account not found for this entity');
    }

    const apAccount = await this.getDefaultAccount(
      entityId,
      'Accounts Payable',
    );

    if (!apAccount) {
      throw new NotFoundException('Accounts Payable account not found');
    }

    const lines: JournalLine[] = [
      {
        accountId: apAccount.id,
        debit: paymentData.amount,
        credit: 0,
        description: `Bill Payment #${paymentId} - Accounts Payable`,
      },
      {
        accountId: paymentData.cashAccountId,
        debit: 0,
        credit: paymentData.amount,
        description: `Bill Payment #${paymentId} - Cash Paid`,
      },
    ];

    return this.createJournalEntry(
      entityId,
      `PAY-BILL-${paymentId}`,
      new Date(),
      lines,
    );
  }

  /**
   * PHASE 6: Expense (no bill) - Cash/Bank expense
   * Dr Expense account = net
   * Dr Tax Payable (2140) = VAT (if used)
   * Cr Bank/Cash = total
   */
  async postDirectExpense(
    expenseId: string,
    entityId: string,
    expenseData: {
      total: number;
      subtotal: number;
      tax: number;
      expenseAccountId: string;
      cashAccountId: string;
    },
  ): Promise<PostingRuleResult> {
    // Verify accounts exist
    const expenseAccount = await this.prisma.account.findUnique({
      where: { id: expenseData.expenseAccountId },
    });
    const cashAccount = await this.prisma.account.findUnique({
      where: { id: expenseData.cashAccountId },
    });

    if (
      !expenseAccount ||
      expenseAccount.entityId !== entityId ||
      !cashAccount ||
      cashAccount.entityId !== entityId
    ) {
      throw new NotFoundException('Required accounts not found for this entity');
    }

    const taxPayableAccount = await this.getDefaultAccount(
      entityId,
      'Tax Payable',
    );

    const lines: JournalLine[] = [
      {
        accountId: expenseData.expenseAccountId,
        debit: expenseData.subtotal,
        credit: 0,
        description: `Direct Expense #${expenseId} - Expense`,
      },
      {
        accountId: expenseData.cashAccountId,
        debit: 0,
        credit: expenseData.total,
        description: `Direct Expense #${expenseId} - Cash Paid`,
      },
    ];

    if (expenseData.tax > 0 && taxPayableAccount) {
      lines.push({
        accountId: taxPayableAccount.id,
        debit: expenseData.tax,
        credit: 0,
        description: `Direct Expense #${expenseId} - Input Tax`,
      });
    }

    return this.createJournalEntry(
      entityId,
      `EXP-${expenseId}`,
      new Date(),
      lines,
    );
  }

  /**
   * Create a journal entry with balanced debits and credits
   */
  private async createJournalEntry(
    entityId: string,
    reference: string,
    date: Date,
    lines: JournalLine[],
  ): Promise<PostingRuleResult> {
    // Validate lines balance
    const totalDebits = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredits = lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      throw new BadRequestException(
        `Journal entry not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`,
      );
    }

    const entityRecord = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: { groupId: true },
    });

    // Create journal entry
    const journal = await this.prisma.journal.create({
      data: {
        description: reference,
        date,
        reference,
        entityId,
        groupId: entityRecord!.groupId,
        lines: lines as any,
      },
    });

    // Update account balances
    for (const line of lines) {
      await this.updateAccountBalance(line.accountId, line.debit, line.credit);
    }

    return {
      journalId: journal.id,
      lines,
      totalDebits,
      totalCredits,
    };
  }

  /**
   * Update account balance based on account type
   */
  private async updateAccountBalance(
    accountId: string,
    debit: number,
    credit: number,
  ): Promise<void> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { subCategory: { include: { category: { include: { type: true } } } } },
    });

    if (!account) return;

    // Determine balance change based on account type
    const accountType = account.subCategory?.category?.type?.name;
    let balanceChange = 0;

    if (
      accountType === 'Asset' ||
      accountType === 'Expense'
    ) {
      // Assets/Expenses: Debit increases, Credit decreases
      balanceChange = debit - credit;
    } else {
      // Liabilities/Equity/Revenue: Credit increases, Debit decreases
      balanceChange = credit - debit;
    }

    // Update account balance
    const newBalance = account.balance + balanceChange;
    await this.prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }

  /**
   * Helper: Get default account by name
   */
  private async getDefaultAccount(
    entityId: string,
    accountName: string,
  ): Promise<any> {
    return this.prisma.account.findFirst({
      where: {
        entityId,
        subCategory: {
          name: accountName,
        },
      },
    });
  }
}
