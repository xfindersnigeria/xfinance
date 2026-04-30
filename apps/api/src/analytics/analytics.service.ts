import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  KPIDto,
  MonthlyDataPointDto,
  CashFlowDataPointDto,
  ExpenseCategoryDto,
  AgingBucketDto,
  RecentTransactionDto,
  DashboardResponseDto,
  GroupKPIDto,
  MonthlyDataPointWithProfitDto,
  EntityPerformanceDto,
  GroupDashboardResponseDto,
} from './dto/analytics-response.dto';
import { DateFilterEnum, DateFilterHelper, DateRange } from './dto/date-filter.dto';
import { CacheService } from '@/cache/cache.service';
import { CacheInvalidationService } from '@/cache/cache-invalidation.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  /**
   * Get unified dashboard data with all metrics
   * @param entityId The entity ID
   * @param monthlyFilter Date filter for monthly breakdown chart
   * @param cashFlowFilter Date filter for cash flow chart
   * @param expensesFilter Date filter for top expenses pie chart
   */
  async getDashboardData(
    entityId: string,
    monthlyFilter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
    cashFlowFilter: DateFilterEnum = DateFilterEnum.LAST_12_MONTHS,
    expensesFilter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
  ): Promise<DashboardResponseDto> {
    try {
      // Build cache key
      const cacheKey = `dashboard:${entityId}:${monthlyFilter}:${cashFlowFilter}:${expensesFilter}`;
      
      // Check cache first
      const cached = await this.cacheService.get<DashboardResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`[Analytics] Dashboard cache HIT for entity: ${entityId}`);
        return cached;
      }

      this.logger.debug(
        `[Analytics] Fetching dashboard data for entity: ${entityId} with filters - monthly=${monthlyFilter}, cashFlow=${cashFlowFilter}, expenses=${expensesFilter}`,
      );

      const [
        kpis,
        monthlyBreakdown,
        cashFlow,
        topExpenses,
        receivableAging,
        payableAging,
        recentTransactions,
      ] = await Promise.all([
        this.getKPIs(entityId),
        this.getMonthlyBreakdown(entityId, monthlyFilter),
        this.getCashFlow(entityId, cashFlowFilter),
        this.getTopExpenses(entityId, expensesFilter),
        this.getReceivableAging(entityId),
        this.getPayableAging(entityId),
        this.getRecentTransactions(entityId, 5),
      ]);

      const result: DashboardResponseDto = {
        kpis,
        monthlyBreakdown,
        cashFlow,
        topExpenses,
        receivableAging,
        payableAging,
        recentTransactions,
      };

      // Store in cache with 5-minute TTL
      await this.cacheService.set(cacheKey, result, { ttl: 300 });
      this.logger.debug(`[Analytics] Dashboard cached for entity: ${entityId}`);

      return result;
    } catch (error) {
      this.logger.error(
        `[Analytics] Error fetching dashboard data: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get KPIs: Revenue (MTD), Bank Balance, Current Liabilities, Active Customers
   */
  async getKPIs(entityId: string): Promise<KPIDto> {
    try {
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Revenue (MTD) - Sum of paid invoices + payments received for partial/overdue invoices + receipts
      const currentMTDPaidInvoices = await this.prisma.invoice.aggregate({
        where: {
          entityId,
          status: 'Paid',
          invoiceDate: { gte: currentMonth, lte: now },
        },
        _sum: { total: true },
      });

      // Payments received for Partial invoices in current MTD
      const currentMTDPartialPayments = await this.prisma.paymentReceived.aggregate({
        where: {
          entityId,
          invoice: { status: 'Partial', invoiceDate: { gte: currentMonth, lte: now } },
        },
        _sum: { amount: true },
      });

      // Payments received for Overdue invoices in current MTD
      const currentMTDOverduePayments = await this.prisma.paymentReceived.aggregate({
        where: {
          entityId,
          invoice: { status: 'Overdue', invoiceDate: { gte: currentMonth, lte: now } },
        },
        _sum: { amount: true },
      });

      // Receipts (direct revenue) in current MTD
      const currentMTDReceipts = await this.prisma.receipt.aggregate({
        where: {
          entityId,
          status: 'Completed',
          date: { gte: currentMonth, lte: now },
        },
        _sum: { total: true },
      });

      const revenueMTD =
        (currentMTDPaidInvoices._sum.total || 0) +
        (currentMTDPartialPayments._sum.amount || 0) +
        (currentMTDOverduePayments._sum.amount || 0) +
        (currentMTDReceipts._sum.total || 0);

      // Previous month revenue
      const previousMTDPaidInvoices = await this.prisma.invoice.aggregate({
        where: {
          entityId,
          status: 'Paid',
          invoiceDate: { gte: previousMonth, lte: previousMonthEnd },
        },
        _sum: { total: true },
      });

      // Payments received for Partial invoices in previous month
      const previousMTDPartialPayments = await this.prisma.paymentReceived.aggregate({
        where: {
          entityId,
          invoice: { status: 'Partial', invoiceDate: { gte: previousMonth, lte: previousMonthEnd } },
        },
        _sum: { amount: true },
      });

      // Payments received for Overdue invoices in previous month
      const previousMTDOverduePayments = await this.prisma.paymentReceived.aggregate({
        where: {
          entityId,
          invoice: { status: 'Overdue', invoiceDate: { gte: previousMonth, lte: previousMonthEnd } },
        },
        _sum: { amount: true },
      });

      // Receipts (direct revenue) in previous month
      const previousMTDReceipts = await this.prisma.receipt.aggregate({
        where: {
          entityId,
          status: 'Completed',
          date: { gte: previousMonth, lte: previousMonthEnd },
        },
        _sum: { total: true },
      });

      const revenuePrevious =
        (previousMTDPaidInvoices._sum.total || 0) +
        (previousMTDPartialPayments._sum.amount || 0) +
        (previousMTDOverduePayments._sum.amount || 0) +
        (previousMTDReceipts._sum.total || 0);

      const revenueChange = revenueMTD - revenuePrevious;
      const revenueChangePercent =
        revenuePrevious > 0 ? (revenueChange / revenuePrevious) * 100 : 100;

      // Bank Balance (Total across all linked bank accounts)
      const bankAccounts = await this.prisma.bankAccount.findMany({
        where: { entityId },
        include: { linkedAccount: { select: { balance: true } } },
      });

      const currentBankBalance = bankAccounts.reduce((sum, a) => sum + a.linkedAccount.balance, 0);

      // Get previous month-end balance from the last transaction on or before previous month end
      const lastTransactionPreviousMonth = await this.prisma.accountTransaction.findFirst({
        where: {
          entityId,
          type: 'BANK',
          date: { lte: previousMonthEnd },
        },
        orderBy: { date: 'desc' },
        select: { runningBalance: true },
      });

      // If no transactions exist, use 0; otherwise use the running balance from last transaction
      const previousBankBalance = lastTransactionPreviousMonth?.runningBalance || 0;

      const bankBalanceChange = currentBankBalance - previousBankBalance;
      const bankBalanceChangePercent =
        previousBankBalance > 0 ? (bankBalanceChange / previousBankBalance) * 100 : 100;

      // Current Liabilities (Unpaid Bills)
      const unpaidBills = await this.prisma.bills.aggregate({
        where: {
          entityId,
          status: { in: ['unpaid', 'partial'] },
        },
        _sum: { total: true },
      });

      const currentLiabilities = unpaidBills._sum.total || 0;

      // Get all unpaid/partial bills as of previous period for consistent comparison
      const previousUnpaidBills = await this.prisma.bills.aggregate({
        where: {
          entityId,
          status: { in: ['unpaid', 'partial'] },
        },
        _sum: { total: true },
      });

      const previousLiabilities = previousUnpaidBills._sum.total || 0;
      const liabilitiesChange = currentLiabilities - previousLiabilities;
      const liabilitiesChangePercent =
        previousLiabilities > 0 ? (liabilitiesChange / previousLiabilities) * 100 : 0;

      // Outstanding Receivables (total unpaid invoice amounts)
      const [currentOutstandingAgg, previousOutstandingAgg] = await Promise.all([
        this.prisma.invoice.aggregate({
          where: { entityId, status: { in: ['Sent', 'Overdue', 'Partial'] } },
          _sum: { total: true },
        }),
        this.prisma.invoice.aggregate({
          where: {
            entityId,
            status: { in: ['Sent', 'Overdue', 'Partial'] },
            invoiceDate: { lte: previousMonthEnd },
          },
          _sum: { total: true },
        }),
      ]);

      const currentReceivables = currentOutstandingAgg._sum.total || 0;
      const previousReceivables = previousOutstandingAgg._sum.total || 0;
      const receivablesChange = currentReceivables - previousReceivables;
      const receivablesChangePercent =
        previousReceivables > 0 ? (receivablesChange / previousReceivables) * 100 : currentReceivables > 0 ? 100 : 0;

      return {
        revenue: {
          mtd: Number(revenueMTD.toFixed(2)),
          change: Number(revenueChange.toFixed(2)),
          changePercent: Number(revenueChangePercent.toFixed(2)),
        },
        bankBalance: {
          total: Number(currentBankBalance.toFixed(2)),
          change: Number(bankBalanceChange.toFixed(2)),
          changePercent: Number(bankBalanceChangePercent.toFixed(2)),
        },
        liabilities: {
          total: Number(currentLiabilities.toFixed(2)),
          change: Number(liabilitiesChange.toFixed(2)),
          changePercent: Number(liabilitiesChangePercent.toFixed(2)),
        },
        outstandingReceivables: {
          total: Number(currentReceivables.toFixed(2)),
          change: Number(receivablesChange.toFixed(2)),
          changePercent: Number(receivablesChangePercent.toFixed(2)),
        },
      };
    } catch (error) {
      this.logger.error(`[Analytics] Error calculating KPIs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get monthly revenue and expenses breakdown with date filtering
   * @param entityId The entity ID
   * @param filter Date filter type (THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS)
   */
  async getMonthlyBreakdown(
    entityId: string,
    filter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
  ): Promise<MonthlyDataPointDto[]> {
    try {
      const dateRange = DateFilterHelper.getDateRange(filter);
      const monthlyData: MonthlyDataPointDto[] = [];

      // Calculate months between start and end date
      let current = new Date(dateRange.startDate);
      current.setDate(1); // Start from first day of month

      while (current <= dateRange.endDate) {
        const start = new Date(current);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);

        // Don't include months beyond the filter's end date
        if (start > dateRange.endDate) break;

        const month = start.toLocaleString('default', { month: 'short' });
        const year = start.getFullYear();
        const monthLabel = `${month} '${year.toString().slice(-2)}`;

        // Revenue: Sum of paid invoices + payments received for partial/overdue invoices + receipts
        const endDate = end > dateRange.endDate ? dateRange.endDate : end;
        const [paidInvoices, partialPayments, overduePayments, receipts] = await Promise.all([
          this.prisma.invoice.aggregate({
            where: {
              entityId,
              status: 'Paid',
              invoiceDate: { gte: start, lte: endDate },
            },
            _sum: { total: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: {
              entityId,
              invoice: { status: 'Partial', invoiceDate: { gte: start, lte: endDate } },
            },
            _sum: { amount: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: {
              entityId,
              invoice: { status: 'Overdue', invoiceDate: { gte: start, lte: endDate } },
            },
            _sum: { amount: true },
          }),
          this.prisma.receipt.aggregate({
            where: {
              entityId,
              status: 'Completed',
              date: { gte: start, lte: endDate },
            },
            _sum: { total: true },
          }),
        ]);

        const revenue =
          (paidInvoices._sum.total || 0) +
          (partialPayments._sum.amount || 0) +
          (overduePayments._sum.amount || 0) +
          (receipts._sum.total || 0);

        // Expenses: Sum of approved expenses + paid bills
        const [expenses, bills] = await Promise.all([
          this.prisma.expenses.aggregate({
            where: {
              entityId,
              status: 'approved',
              createdAt: { gte: start, lte: endDate },
            },
            _sum: { amount: true },
          }),
          this.prisma.paymentMade.aggregate({
            where: {
              entityId,
              paymentDate: { gte: start, lte: endDate },
            },
            _sum: { amount: true },
          }),
        ]);

        monthlyData.push({
          month: monthLabel,
          revenue,
          expenses: (expenses._sum?.amount || 0) + (bills._sum?.amount || 0),
        });

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }

      return monthlyData;
    } catch (error) {
      this.logger.error(
        `[Analytics] Error calculating monthly breakdown: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get cash flow: Inflow vs Outflow by month with date filtering
   * @param entityId The entity ID
   * @param filter Date filter type (THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS)
   */
  async getCashFlow(
    entityId: string,
    filter: DateFilterEnum = DateFilterEnum.LAST_12_MONTHS,
  ): Promise<CashFlowDataPointDto[]> {
    try {
      const dateRange = DateFilterHelper.getDateRange(filter);
      const cashFlowData: CashFlowDataPointDto[] = [];

      // Calculate months between start and end date
      let current = new Date(dateRange.startDate);
      current.setDate(1); // Start from first day of month

      while (current <= dateRange.endDate) {
        const start = new Date(current);
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);

        // Don't include months beyond the filter's end date
        if (start > dateRange.endDate) break;

        const month = start.toLocaleString('default', { month: 'short' });
        const year = start.getFullYear();
        const monthLabel = `${month} '${year.toString().slice(-2)}`;

        // Inflow: Paid invoices + Payment received for Partial/Overdue invoices + Completed receipts
        const endDateInflow = end > dateRange.endDate ? dateRange.endDate : end;
        const [invoicesInflow, partialPaymentsInflow, overduePaymentsInflow, receiptsInflow] = await Promise.all([
          this.prisma.invoice.aggregate({
            where: {
              entityId,
              status: 'Paid',
              invoiceDate: { gte: start, lte: endDateInflow },
            },
            _sum: { total: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: {
              entityId,
              invoice: { status: 'Partial', invoiceDate: { gte: start, lte: endDateInflow } },
            },
            _sum: { amount: true },
          }),
          this.prisma.paymentReceived.aggregate({
            where: {
              entityId,
              invoice: { status: 'Overdue', invoiceDate: { gte: start, lte: endDateInflow } },
            },
            _sum: { amount: true },
          }),
          this.prisma.receipt.aggregate({
            where: {
              entityId,
              status: 'Completed',
              date: { gte: start, lte: endDateInflow },
            },
            _sum: { total: true },
          }),
        ]);

        const inflow =
          (invoicesInflow._sum.total || 0) +
          (partialPaymentsInflow._sum.amount || 0) +
          (overduePaymentsInflow._sum.amount || 0) +
          (receiptsInflow._sum.total || 0);

        // Outflow: Approved expenses + Bill payments
        const endDateOutflow = end > dateRange.endDate ? dateRange.endDate : end;
        const [expensesOutflow, billPayments] = await Promise.all([
          this.prisma.expenses.aggregate({
            where: {
              entityId,
              status: 'approved',
              createdAt: { gte: start, lte: endDateOutflow },
            },
            _sum: { amount: true },
          }),
          this.prisma.paymentMade.aggregate({
            where: {
              entityId,
              paymentDate: { gte: start, lte: endDateOutflow },
            },
            _sum: { amount: true },
          }),
        ]);

        const outflow =
          (expensesOutflow._sum?.amount || 0) +
          (billPayments._sum?.amount || 0);

        cashFlowData.push({ month: monthLabel, inflow, outflow });

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }

      return cashFlowData;
    } catch (error) {
      this.logger.error(
        `[Analytics] Error calculating cash flow: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get top expenses by category with date filtering
   * Includes both approved expenses and bill payments categorized by their expense accounts
   * @param entityId The entity ID
   * @param filter Date filter type (THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS)
   * @param limit Maximum number of categories to return
   */
  async getTopExpenses(
    entityId: string,
    filter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
    limit: number = 10,
  ): Promise<ExpenseCategoryDto[]> {
    try {
      const dateRange = DateFilterHelper.getDateRange(filter);

      // Fetch expenses with their linked account info
      const allExpenses = await this.prisma.expenses.findMany({
        where: {
          entityId,
          status: 'approved',
          createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      // Fetch bills with their items to extract expense account breakdown
      const allBillPayments = await this.prisma.paymentMade.findMany({
        where: {
          entityId,
          paymentDate: { gte: dateRange.startDate, lte: dateRange.endDate },
        },
        include: {
          bill: {
            select: { items: true },
          },
        },
      });

      // Group by expense account and sum amounts
      const expensesByAccount = new Map<string, { name: string; accountId: string; total: number }>();

      // Add approved expenses
      allExpenses.forEach((exp) => {
        const accountKey = exp.expenseAccountId;
        const accountName = exp.expenseAccount?.name || 'Uncategorized';
        const existing = expensesByAccount.get(accountKey);
        expensesByAccount.set(accountKey, {
          name: accountName,
          accountId: accountKey,
          total: (existing?.total || 0) + exp.amount,
        });
      });

      // Add bill payments by their line item expense accounts
      allBillPayments.forEach((payment) => {
        if (payment.bill?.items && Array.isArray(payment.bill.items)) {
          // Parse bill items to distribute payment across expense accounts
          const items = payment.bill.items as Array<{
            expenseAccountId?: string;
            accountId?: string;
            name?: string;
            total?: number;
          }>;

          // Calculate total amount in bill items for proportional distribution
          const totalItemAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

          if (totalItemAmount > 0) {
            // Distribute payment proportionally across items
            items.forEach((item) => {
              const expenseAccountId = item.expenseAccountId || item.accountId;
              if (expenseAccountId) {
                const proportion = (item.total || 0) / totalItemAmount;
                const allocatedAmount = Math.round(payment.amount * proportion);
                const accountKey = expenseAccountId;
                const accountName = item.name || 'Uncategorized';
                const existing = expensesByAccount.get(accountKey);
                expensesByAccount.set(accountKey, {
                  name: accountName,
                  accountId: accountKey,
                  total: (existing?.total || 0) + allocatedAmount,
                });
              }
            });
          }
        }
      });

      // Sort by amount descending and take limit
      const sorted = Array.from(expensesByAccount.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit);

      const totalExpenses = sorted.reduce((sum, e) => sum + e.total, 0);

      return sorted.map((exp) => ({
        category: exp.name,
        categoryId: exp.accountId,
        amount: exp.total,
        percentage: totalExpenses > 0 ? (exp.total / totalExpenses) * 100 : 0,
      }));
    } catch (error) {
      this.logger.error(
        `[Analytics] Error calculating top expenses: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get accounts receivable aging (based on invoice aging)
   * Includes Sent, Overdue, and Partial invoices
   */
  async getReceivableAging(entityId: string): Promise<AgingBucketDto> {
    try {
      const now = new Date();

      const unpaidInvoices = await this.prisma.invoice.findMany({
        where: {
          entityId,
          status: { in: ['Sent', 'Overdue', 'Partial'] },
        },
        select: {
          total: true,
          dueDate: true,
        },
      });

      const aging: AgingBucketDto = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };

      unpaidInvoices.forEach((invoice) => {
        const ageInMs = now.getTime() - new Date(invoice.dueDate).getTime();
        const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

        if (ageInDays <= 30) {
          aging['0-30'] += invoice.total;
        } else if (ageInDays <= 60) {
          aging['31-60'] += invoice.total;
        } else if (ageInDays <= 90) {
          aging['61-90'] += invoice.total;
        } else {
          aging['90+'] += invoice.total;
        }
      });

      return aging;
    } catch (error) {
      this.logger.error(
        `[Analytics] Error calculating receivable aging: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get accounts payable aging (based on bill due dates)
   */
  async getPayableAging(entityId: string): Promise<AgingBucketDto> {
    try {
      const now = new Date();

      const unpaidBills = await this.prisma.bills.findMany({
        where: {
          entityId,
          status: { in: ['unpaid', 'partial'] },
        },
        select: {
          total: true,
          dueDate: true,
        },
      });

      const aging: AgingBucketDto = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };

      unpaidBills.forEach((bill) => {
        const ageInMs = now.getTime() - new Date(bill.dueDate).getTime();
        const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

        if (ageInDays <= 30) {
          aging['0-30'] += bill.total;
        } else if (ageInDays <= 60) {
          aging['31-60'] += bill.total;
        } else if (ageInDays <= 90) {
          aging['61-90'] += bill.total;
        } else {
          aging['90+'] += bill.total;
        }
      });

      return aging;
    } catch (error) {
      this.logger.error(
        `[Analytics] Error calculating payable aging: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get recent transactions (latest activity)
   */
  async getRecentTransactions(
    entityId: string,
    limit: number = 10,
  ): Promise<RecentTransactionDto[]> {
    try {
      const transactions = await this.prisma.accountTransaction.findMany({
        where: { entityId, type: 'BANK' },
        include: {
          account: { select: { code: true, name: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
      });

      return transactions.map((tx) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        reference: tx.reference || '',
        type: tx.type,
        debit: tx.debitAmount,
        credit: tx.creditAmount,
        amount: Math.max(tx.debitAmount, tx.creditAmount),
        status: tx.status,
      }));
    } catch (error) {
      this.logger.error(
        `[Analytics] Error fetching recent transactions: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Get banking summary: total bank cash and number of accounts
   */
  async getBankingSummary(entityId: string) {
    try {
      const bankAccounts = await this.prisma.bankAccount.findMany({
        where: { entityId },
        select: {
          id: true,
          accountName: true,
          bankName: true,
          accountType: true,
          currency: true,
          status: true,
          linkedAccount: {
            select: {
              balance: true,
            },
          },
        },
        orderBy: { accountName: 'asc' },
      });

      const totalBankCash = bankAccounts.reduce(
        (sum, account) => sum + account.linkedAccount.balance,
        0,
      );
      const numberOfBankAccounts = bankAccounts.length;

      return {
        totalBankCash,
        numberOfBankAccounts,
        accounts: bankAccounts,
      };
    } catch (error) {
      this.logger.error(
        `[Analytics] Error fetching banking summary: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Invalidate all dashboard caches for an entity
   * Called when any financial data changes (invoices, payments, expenses, bills, etc.)
   * 
   * Supported filter combinations are invalidated:
   * - getKPIs: Daily basis
   * - getMonthlyBreakdown: THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS
   * - getCashFlow: THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS
   * - getTopExpenses: THIS_YEAR, THIS_FISCAL_YEAR, LAST_FISCAL_YEAR, LAST_12_MONTHS
   * - getReceivableAging: Daily basis
   * - getPayableAging: Daily basis
   * - getRecentTransactions: Static
   */
  async invalidateDashboardCache(entityId: string): Promise<void> {
    try {
      // Invalidate all possible dashboard filter combinations
      const filterCombinations = [
        // monthlyFilter, cashFlowFilter, expensesFilter
        [DateFilterEnum.THIS_YEAR, DateFilterEnum.LAST_12_MONTHS, DateFilterEnum.THIS_YEAR],
        [DateFilterEnum.THIS_YEAR, DateFilterEnum.THIS_YEAR, DateFilterEnum.THIS_YEAR],
        [DateFilterEnum.THIS_FISCAL_YEAR, DateFilterEnum.THIS_FISCAL_YEAR, DateFilterEnum.THIS_FISCAL_YEAR],
        [DateFilterEnum.LAST_FISCAL_YEAR, DateFilterEnum.LAST_FISCAL_YEAR, DateFilterEnum.LAST_FISCAL_YEAR],
        [DateFilterEnum.LAST_12_MONTHS, DateFilterEnum.LAST_12_MONTHS, DateFilterEnum.LAST_12_MONTHS],
      ];

      const cacheKeys = filterCombinations.map(
        ([monthly, cashFlow, expenses]) =>
          `dashboard:${entityId}:${monthly}:${cashFlow}:${expenses}`,
      );

      // Delete all dashboard cache keys
      for (const key of cacheKeys) {
        await this.cacheService.delete(key);
      }

      this.logger.log(`✓ Dashboard cache invalidated for entity: ${entityId}`);
    } catch (error) {
      this.logger.error(
        `[Analytics] Error invalidating dashboard cache: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }


  // ─── Group-scoped (admin dashboard) ─────────────────────────────────────────

  async getGroupDashboard(
    groupId: string,
    filter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
  ): Promise<GroupDashboardResponseDto> {
    const cacheKey = `group-dashboard:${groupId}:${filter}`;
    const cached = await this.cacheService.get<GroupDashboardResponseDto>(cacheKey);
    if (cached) {
      this.logger.debug(`[Analytics] Group dashboard cache HIT for group: ${groupId}`);
      return cached;
    }

    const [kpis, monthlyBreakdown, entityPerformance] = await Promise.all([
      this.getGroupKPIs(groupId),
      this.getGroupMonthlyBreakdown(groupId, filter),
      this.getGroupEntityPerformance(groupId, filter),
    ]);

    const result: GroupDashboardResponseDto = { kpis, monthlyBreakdown, entityPerformance };
    await this.cacheService.set(cacheKey, result, { ttl: 300 });
    this.logger.debug(`[Analytics] Group dashboard cached for group: ${groupId}`);
    return result;
  }

  async getGroupKPIs(groupId: string): Promise<GroupKPIDto> {
    try {
      const entities = await this.prisma.entity.findMany({
        where: { groupId },
        select: { id: true },
      });
      const entityIds = entities.map((e) => e.id);

      if (entityIds.length === 0) {
        return {
          consolidatedRevenue: { mtd: 0, change: 0, changePercent: 0 },
          netProfit: { mtd: 0, change: 0, changePercent: 0 },
          bankBalance: { total: 0, change: 0, changePercent: 0 },
          liabilities: { total: 0, change: 0, changePercent: 0 },
        };
      }

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const [
        paidInv, partialPay, overduePay, receipts,
        prevPaidInv, prevPartialPay, prevOverduePay, prevReceipts,
        expensesMTD, billPaysMTD,
        prevExpenses, prevBillPays,
        bankAccounts,
        lastTxPrev,
        unpaidBills,
      ] = await Promise.all([
        this.prisma.invoice.aggregate({ where: { entityId: { in: entityIds }, status: 'Paid', invoiceDate: { gte: currentMonth, lte: now } }, _sum: { total: true } }),
        this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Partial', invoiceDate: { gte: currentMonth, lte: now } } }, _sum: { amount: true } }),
        this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Overdue', invoiceDate: { gte: currentMonth, lte: now } } }, _sum: { amount: true } }),
        this.prisma.receipt.aggregate({ where: { entityId: { in: entityIds }, status: 'Completed', date: { gte: currentMonth, lte: now } }, _sum: { total: true } }),
        this.prisma.invoice.aggregate({ where: { entityId: { in: entityIds }, status: 'Paid', invoiceDate: { gte: previousMonth, lte: previousMonthEnd } }, _sum: { total: true } }),
        this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Partial', invoiceDate: { gte: previousMonth, lte: previousMonthEnd } } }, _sum: { amount: true } }),
        this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Overdue', invoiceDate: { gte: previousMonth, lte: previousMonthEnd } } }, _sum: { amount: true } }),
        this.prisma.receipt.aggregate({ where: { entityId: { in: entityIds }, status: 'Completed', date: { gte: previousMonth, lte: previousMonthEnd } }, _sum: { total: true } }),
        this.prisma.expenses.aggregate({ where: { entityId: { in: entityIds }, status: 'approved', createdAt: { gte: currentMonth, lte: now } }, _sum: { amount: true } }),
        this.prisma.paymentMade.aggregate({ where: { entityId: { in: entityIds }, paymentDate: { gte: currentMonth, lte: now } }, _sum: { amount: true } }),
        this.prisma.expenses.aggregate({ where: { entityId: { in: entityIds }, status: 'approved', createdAt: { gte: previousMonth, lte: previousMonthEnd } }, _sum: { amount: true } }),
        this.prisma.paymentMade.aggregate({ where: { entityId: { in: entityIds }, paymentDate: { gte: previousMonth, lte: previousMonthEnd } }, _sum: { amount: true } }),
        this.prisma.bankAccount.findMany({ where: { entityId: { in: entityIds } }, include: { linkedAccount: { select: { balance: true } } } }),
        this.prisma.accountTransaction.findFirst({ where: { entityId: { in: entityIds }, type: 'BANK', date: { lte: previousMonthEnd } }, orderBy: { date: 'desc' }, select: { runningBalance: true } }),
        this.prisma.bills.aggregate({ where: { entityId: { in: entityIds }, status: { in: ['unpaid', 'partial'] } }, _sum: { total: true } }),
      ]);

      const revenueMTD = (paidInv._sum.total || 0) + (partialPay._sum.amount || 0) + (overduePay._sum.amount || 0) + (receipts._sum.total || 0);
      const revenuePrev = (prevPaidInv._sum.total || 0) + (prevPartialPay._sum.amount || 0) + (prevOverduePay._sum.amount || 0) + (prevReceipts._sum.total || 0);

      const expTotal = (expensesMTD._sum.amount || 0) + (billPaysMTD._sum.amount || 0);
      const prevExpTotal = (prevExpenses._sum.amount || 0) + (prevBillPays._sum.amount || 0);

      const netProfitMTD = revenueMTD - expTotal;
      const prevNetProfit = revenuePrev - prevExpTotal;

      const bankBalance = bankAccounts.reduce((sum, a) => sum + a.linkedAccount.balance, 0);
      const prevBankBalance = lastTxPrev?.runningBalance || 0;

      const liabilities = unpaidBills._sum.total || 0;

      const revenueChange = revenueMTD - revenuePrev;
      const revenueChangePercent = revenuePrev > 0 ? (revenueChange / revenuePrev) * 100 : 0;

      const netProfitChange = netProfitMTD - prevNetProfit;
      const netProfitChangePercent = prevNetProfit !== 0 ? (netProfitChange / Math.abs(prevNetProfit)) * 100 : 0;

      const bankBalanceChange = bankBalance - prevBankBalance;
      const bankBalanceChangePercent = prevBankBalance > 0 ? (bankBalanceChange / prevBankBalance) * 100 : 0;

      return {
        consolidatedRevenue: { mtd: Number(revenueMTD.toFixed(2)), change: Number(revenueChange.toFixed(2)), changePercent: Number(revenueChangePercent.toFixed(2)) },
        netProfit: { mtd: Number(netProfitMTD.toFixed(2)), change: Number(netProfitChange.toFixed(2)), changePercent: Number(netProfitChangePercent.toFixed(2)) },
        bankBalance: { total: Number(bankBalance.toFixed(2)), change: Number(bankBalanceChange.toFixed(2)), changePercent: Number(bankBalanceChangePercent.toFixed(2)) },
        liabilities: { total: Number(liabilities.toFixed(2)), change: 0, changePercent: 0 },
      };
    } catch (error) {
      this.logger.error(`[Analytics] Error calculating group KPIs: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getGroupMonthlyBreakdown(
    groupId: string,
    filter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
  ): Promise<MonthlyDataPointWithProfitDto[]> {
    try {
      const entities = await this.prisma.entity.findMany({ where: { groupId }, select: { id: true } });
      const entityIds = entities.map((e) => e.id);
      if (entityIds.length === 0) return [];

      const dateRange = DateFilterHelper.getDateRange(filter);
      const monthlyData: MonthlyDataPointWithProfitDto[] = [];

      let current = new Date(dateRange.startDate);
      current.setDate(1);

      while (current <= dateRange.endDate) {
        const start = new Date(current);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        if (start > dateRange.endDate) break;

        const month = start.toLocaleString('default', { month: 'short' });
        const year = start.getFullYear();
        const monthLabel = `${month} '${year.toString().slice(-2)}`;
        const endDate = end > dateRange.endDate ? dateRange.endDate : end;

        const [paidInv, partialPay, overduePay, receipts, expenses, billPays] = await Promise.all([
          this.prisma.invoice.aggregate({ where: { entityId: { in: entityIds }, status: 'Paid', invoiceDate: { gte: start, lte: endDate } }, _sum: { total: true } }),
          this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Partial', invoiceDate: { gte: start, lte: endDate } } }, _sum: { amount: true } }),
          this.prisma.paymentReceived.aggregate({ where: { entityId: { in: entityIds }, invoice: { status: 'Overdue', invoiceDate: { gte: start, lte: endDate } } }, _sum: { amount: true } }),
          this.prisma.receipt.aggregate({ where: { entityId: { in: entityIds }, status: 'Completed', date: { gte: start, lte: endDate } }, _sum: { total: true } }),
          this.prisma.expenses.aggregate({ where: { entityId: { in: entityIds }, status: 'approved', createdAt: { gte: start, lte: endDate } }, _sum: { amount: true } }),
          this.prisma.paymentMade.aggregate({ where: { entityId: { in: entityIds }, paymentDate: { gte: start, lte: endDate } }, _sum: { amount: true } }),
        ]);

        const revenue = (paidInv._sum.total || 0) + (partialPay._sum.amount || 0) + (overduePay._sum.amount || 0) + (receipts._sum.total || 0);
        const expensesTotal = (expenses._sum?.amount || 0) + (billPays._sum?.amount || 0);

        monthlyData.push({ month: monthLabel, revenue, expenses: expensesTotal, profit: revenue - expensesTotal });
        current.setMonth(current.getMonth() + 1);
      }

      return monthlyData;
    } catch (error) {
      this.logger.error(`[Analytics] Error calculating group monthly breakdown: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async getGroupEntityPerformance(
    groupId: string,
    filter: DateFilterEnum = DateFilterEnum.THIS_YEAR,
  ): Promise<EntityPerformanceDto[]> {
    try {
      const entities = await this.prisma.entity.findMany({ where: { groupId }, select: { id: true, name: true } });
      if (entities.length === 0) return [];

      const dateRange = DateFilterHelper.getDateRange(filter);

      const results = await Promise.all(
        entities.map(async (entity) => {
          const [paidInv, partialPay, overduePay, receipts] = await Promise.all([
            this.prisma.invoice.aggregate({ where: { entityId: entity.id, status: 'Paid', invoiceDate: { gte: dateRange.startDate, lte: dateRange.endDate } }, _sum: { total: true } }),
            this.prisma.paymentReceived.aggregate({ where: { entityId: entity.id, invoice: { status: 'Partial', invoiceDate: { gte: dateRange.startDate, lte: dateRange.endDate } } }, _sum: { amount: true } }),
            this.prisma.paymentReceived.aggregate({ where: { entityId: entity.id, invoice: { status: 'Overdue', invoiceDate: { gte: dateRange.startDate, lte: dateRange.endDate } } }, _sum: { amount: true } }),
            this.prisma.receipt.aggregate({ where: { entityId: entity.id, status: 'Completed', date: { gte: dateRange.startDate, lte: dateRange.endDate } }, _sum: { total: true } }),
          ]);
          const revenue = (paidInv._sum.total || 0) + (partialPay._sum.amount || 0) + (overduePay._sum.amount || 0) + (receipts._sum.total || 0);
          return { entityId: entity.id, entityName: entity.name, revenue: Number(revenue.toFixed(2)) };
        }),
      );

      return results.sort((a, b) => b.revenue - a.revenue);
    } catch (error) {
      this.logger.error(`[Analytics] Error calculating group entity performance: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async invalidateGroupDashboardCache(groupId: string): Promise<void> {
    try {
      const keys = Object.values(DateFilterEnum).map((f) => `group-dashboard:${groupId}:${f}`);
      for (const key of keys) {
        await this.cacheService.delete(key);
      }
      this.logger.log(`✓ Group dashboard cache invalidated for group: ${groupId}`);
    } catch (error) {
      this.logger.error(`[Analytics] Error invalidating group dashboard cache: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

   /**
   * Get comprehensive superadmin dashboard stats
   * Returns all metrics for dashboard cards and graphs
   * Includes: Total companies, Active users, MRR, Churn, Growth, Plan distribution, Recent signups
   * Cached for 30 minutes
   */
  async getDashboardStats() {
    const cacheKey = 'dashboard:superadmin:stats';

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Parallel queries for all metrics
      const [
        totalGroupsData,
        activeUsersData,
        totalMRRData,
        planDistributionData,
        recentSignupsData,
        groupsLast30DaysData,
        groupsLast60DaysData,
        churned30DaysData,
      ] = await Promise.all([
        // Total companies
        this.prisma.group.count(),

        // Active users across all groups
        this.prisma.user.count({
          where: { isActive: true },
        }),

        // Total MRR (sum of all subscription tier prices) - fetch with tier then sum manually
        this.prisma.subscription.findMany({
          where: { isActive: true },
          select: {
            tier: {
              select: { monthlyPrice: true },
            },
          },
        }),

        // Plan distribution (count by subscription tier)
        (this.prisma as any).subscription.groupBy({
          by: ['subscriptionTierId'],
          where: { isActive: true },
          _count: true,
        }),

        // Recent signups (last 7 days)
        this.prisma.group.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: {
              select: { users: true },
            },
            subscription: {
              select: {
                isActive: true,
                tier: {
                  select: {
                    name: true,
                    monthlyPrice: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),

        // Groups created in last 30 days
        this.prisma.group.count({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
        }),

        // Groups created in last 60 days
        this.prisma.group.count({
          where: {
            createdAt: { gte: sixtyDaysAgo },
          },
        }),

        // Churned groups (were active, now inactive) in last 30 days
        (this.prisma as any).subscriptionHistory.findMany({
          where: {
            createdAt: { gte: thirtyDaysAgo },
          },
          select: {
            id: true,
            previousTierName: true,
            newTierName: true,
            createdAt: true,
          },
        }),
      ]);

      // Calculate MRR from fetched subscription data (convert from cents to currency)
      const totalMRR = totalMRRData.reduce((sum: number, sub: any) => {
        return sum + (sub.tier?.monthlyPrice || 0);
      }, 0);

      // Get tier information with names
      const tiersWithNames = await Promise.all(
        planDistributionData.map(async (plan: any) => {
          const tier = await this.prisma.subscriptionTier.findUnique({
            where: { id: plan.subscriptionTierId },
            select: { name: true },
          });
          return {
            name: tier?.name || 'Unknown',
            count: plan._count,
          };
        }),
      );

      // Calculate growth metrics
      const prevMonthGroups = await this.prisma.group.count({
        where: {
          createdAt: {
            gte: startOfLastMonth,
            lt: startOfMonth,
          },
        },
      });

      const currentMonthGroups = await this.prisma.group.count({
        where: {
          createdAt: {
            gte: startOfMonth,
          },
        },
      });

      const groupsGrowth =
        prevMonthGroups > 0
          ? Math.round(((currentMonthGroups - prevMonthGroups) / prevMonthGroups) * 100)
          : 0;

      const usersGrowth30Days =
        groupsLast60DaysData > 0
          ? Math.round(
              ((groupsLast30DaysData - (groupsLast60DaysData - groupsLast30DaysData)) /
                (groupsLast60DaysData - groupsLast30DaysData)) *
                100,
            )
          : 0;

      // Calculate churn rate (churned / total active)
      const totalActive = await this.prisma.subscription.count({
        where: { isActive: true },
      });
      // Count only subscription history records where previousTierName exists (meaning they were active before)
      const churnedCount = churned30DaysData.filter((record: any) => record.previousTierName).length;
      const churnRate = totalActive > 0 ? Math.round((churnedCount / totalActive) * 100 * 10) / 10 : 0;

      // Revenue growth - fetch previous month subscriptions and sum their tier prices
      const prevMonthSubscriptions = await this.prisma.subscription.findMany({
        where: {
          isActive: true,
          startDate: {
            gte: startOfLastMonth,
            lt: startOfMonth,
          },
        },
        select: {
          tier: {
            select: { monthlyPrice: true },
          },
        },
      });

      const prevMonthMRR = prevMonthSubscriptions.reduce((sum: number, sub: any) => {
        return sum + (sub.tier?.monthlyPrice || 0);
      }, 0);

      const revenueGrowth =
        prevMonthMRR > 0
          ? Math.round(
              (((totalMRR / 100 - prevMonthMRR / 100) /
                (prevMonthMRR / 100)) *
                100),
            )
          : 0;

      // Get monthly revenue trend for last 12 months
      const monthlyRevenueTrend: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthSubscriptions = await this.prisma.subscription.findMany({
          where: {
            isActive: true,
            startDate: { lte: monthEnd },
          },
          select: {
            tier: { select: { monthlyPrice: true } },
          },
        });

        const monthMRR = monthSubscriptions.reduce(
          (sum: number, sub: any) => sum + (sub.tier?.monthlyPrice || 0),
          0,
        );

        const month = monthStart.toLocaleString('default', { month: 'short' });
        const year = monthStart.getFullYear();
        monthlyRevenueTrend.push({
          month: `${month} '${year.toString().slice(-2)}`,
          revenue: Math.floor(monthMRR / 100),
        });
      }

      // Get monthly subscription growth for last 12 months
      const monthlySubcriptionGrowth: { month: string; count: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() - i);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const activeSubCount = await this.prisma.subscription.count({
          where: {
            isActive: true,
            startDate: { lte: monthEnd },
          },
        });

        const month = monthDate.toLocaleString('default', { month: 'short' });
        const year = monthDate.getFullYear();
        monthlySubcriptionGrowth.push({
          month: `${month} '${year.toString().slice(-2)}`,
          count: activeSubCount,
        });
      }

      const dashboardStats = {
        cards: {
          totalCompanies: {
            value: totalGroupsData,
            growth: groupsGrowth,
            icon: 'building',
          },
          activeUsers: {
            value: activeUsersData,
            growth: usersGrowth30Days,
            icon: 'users',
          },
          monthlyRevenue: {
            value: Math.floor(totalMRR / 100), // Convert from cents
            growth: revenueGrowth,
            icon: 'dollar',
            currency: '₦',
          },
          churnRate: {
            value: churnRate,
            growth: churnRate > 2.5 ? -10 : 0, // Negative if high churn
            icon: 'trending-down',
            unit: '%',
          },
        },
        planDistribution: tiersWithNames.map((tier: any) => ({
          name: tier.name,
          value: tier.count,
        })),
        revenueGrowth: monthlyRevenueTrend,
        subscriptionGrowth: monthlySubcriptionGrowth,
        recentSignups: recentSignupsData.map((group: any) => ({
          id: group.id,
          name: group.name,
          createdAt: group.createdAt,
          userCount: group._count.users,
          mrr: group.subscription?.tier?.monthlyPrice
            ? Math.floor(group.subscription.tier.monthlyPrice / 100)
            : 0,
          plan: group.subscription?.tier?.name || 'Free',
          status: group.subscription?.isActive ? 'Active' : 'Trial',
        })),
        timestamp: new Date(),
      };

      // Cache for 30 minutes
      await this.cacheService.set(cacheKey, dashboardStats, { ttl: 1800 });

      console.log(`📊 Dashboard stats generated`);
      return dashboardStats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error generating dashboard stats: ${errorMsg}`);
      throw new HttpException(
        `Failed to generate dashboard statistics: ${errorMsg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
