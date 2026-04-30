import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import {
  CreatePaymentReceivedDto,
  UpdatePaymentReceivedDto,
} from './dto/payment-received.dto';
import { InvoiceService } from '../invoice/invoice.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { generateRandomInvoiceNumber } from '@/auth/utils/helper';

@Injectable()
export class PaymentReceivedService {
  private readonly logger = new Logger(PaymentReceivedService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
    private bullmqService: BullmqService,
  ) {}

  private enrichPaymentRecords(payments: any[]) {
    return payments.map((payment) => ({
      ...payment,
      totalAmount: payment.total,
      paidAmount: payment.amount,
      outstanding: payment.total - payment.amount,
    }));
  }

  async createPaymentReceived(
    body: CreatePaymentReceivedDto,
    entityId: string,
    performedBy: string,
    groupId: string,
  ) {
    try {
      // Fetch invoice to get total amount, currency, and validate it exists
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: body.invoiceId },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      if (invoice.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to create payment for this invoice',
          HttpStatus.FORBIDDEN,
        );
      }

      // Validate account exists and belongs to the same entity
      const account = await this.prisma.account.findUnique({
        where: { id: body.depositTo },
      });

      if (!account) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      if (account.entityId !== entityId) {
        throw new HttpException(
          'Account does not belong to this entity',
          HttpStatus.FORBIDDEN,
        );
      }

      // Calculate total payments already made for this invoice
      const existingPayments = await this.prisma.paymentReceived.findMany({
        where: { invoiceId: body.invoiceId },
      });

      const totalPaidSoFar = existingPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );
      const outstanding = invoice.total - totalPaidSoFar;

      // VALIDATION: Reject overpayment
      if (body.amount > outstanding) {
        throw new HttpException(
          `Payment amount (${body.amount}) exceeds outstanding balance (${outstanding}). Overpayments not allowed.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Generate unique payment number
      const paymentNumber = generateRandomInvoiceNumber({ prefix: 'PAY' });

      // Check for uniqueness with entity constraint
      let isUnique = false;
      let attempts = 0;
      let finalPaymentNumber = paymentNumber;

      while (!isUnique && attempts < 5) {
        const existing = await this.prisma.paymentReceived.findFirst({
          where: {
            paymentNumber: finalPaymentNumber,
            entityId,
          },
        });

        if (!existing) {
          isUnique = true;
        } else {
          finalPaymentNumber = generateRandomInvoiceNumber({ prefix: 'PAY' });
          attempts++;
        }
      }

      if (!isUnique) {
        throw new HttpException(
          'Failed to generate unique payment number',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      // Create payment record with invoice total and currency
      const { projectId, milestoneId, ...paymentData } = body;
      const paymentReceived = await this.prisma.paymentReceived.create({
        data: {
          ...paymentData,
          projectId: projectId || null,
          milestoneId: milestoneId || null,
          paymentNumber: finalPaymentNumber,
          total: invoice.total,
          currency: invoice.currency, // Inherit from invoice
          entityId,
          groupId,
          postingStatus: 'Pending', // Will be updated by BullMQ after posting
        },
        include: {
          invoice: { include: { customer: true } },
          account: true,
        },
      });

      // Queue journal posting job IMMEDIATELY
      try {
        await this.bullmqService.addJob('post-payment-journal', {
          paymentId: paymentReceived.id,
          paymentData: {
            amount: paymentReceived.amount,
            paymentNumber: finalPaymentNumber,
            bankAccountId: body.depositTo,
            entityId,
            groupId,
          },
        });

        this.logger.log(
          `Queued journal posting job for payment ${finalPaymentNumber}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue payment journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        // Don't throw - payment is already created, job will retry
      }

      // Log payment received activity
      await this.invoiceService.logPaymentReceived(
        body.invoiceId,
        paymentReceived.amount,
        body.reference,
        performedBy,
      );

      // Update invoice status based on total payments
      await this.updateInvoicePaymentStatus(body.invoiceId);

      return this.enrichPaymentRecords([paymentReceived])[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update invoice status based on total payments received
   * Paid: If total payments == invoice.total
   * Partial: If 0 < total payments < invoice.total
   */
  private async updateInvoicePaymentStatus(invoiceId: string) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) return;

      const payments = await this.prisma.paymentReceived.findMany({
        where: { invoiceId },
      });

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

      if (totalPaid >= invoice.total) {
        // Full payment received
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'Paid' },
        });
      } else if (totalPaid > 0) {
        // Partial payment received
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'Partial' },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to update invoice payment status: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - already created payment, this is secondary
    }
  }

  async getPaymentReceivedById(paymentId: string, entityId: string) {
    try {
      const payment = await this.prisma.paymentReceived.findUnique({
        where: { id: paymentId },
        include: {
          invoice: { include: { customer: true } },
          account: true,
        },
      });

      if (!payment) {
        throw new HttpException(
          'Payment record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (payment.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this payment record',
          HttpStatus.FORBIDDEN,
        );
      }

      return this.enrichPaymentRecords([payment])[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async getEntityPaymentRecords(
    entityId: string,
    page: number = 1,
    limit: number = 10,
    filters: {
      search?: string;
    } = {},
  ) {
    try {
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      const { search } = filters || {};

      // Note: status field was removed from PaymentReceived
      // Status tracking is now on Invoice (Paid/Partial/etc)

      if (search) {
        where.OR = [
          { reference: { contains: search, mode: 'insensitive' } },
          { paymentMethod: { contains: search, mode: 'insensitive' } },
          {
            account: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            account: {
              code: { contains: search, mode: 'insensitive' },
            },
          },
          {
            invoice: {
              invoiceNumber: { contains: search, mode: 'insensitive' },
            },
          },
          {
            invoice: {
              customer: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ];
      }

      const [payments, totalCount] = await Promise.all([
        this.prisma.paymentReceived.findMany({
          where,
          include: {
            invoice: { include: { customer: true } },
            account: true,
          },
          skip,
          take: Number(limit),
          orderBy: { paidAt: 'desc' },
        }),
        this.prisma.paymentReceived.count({ where }),
      ]);

      // Calculate total paid this current month (across all payments)
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const currentMonthPayments = await this.prisma.paymentReceived.findMany({
        where: {
          entityId,
          paidAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        select: { amount: true },
      });

      const currentMonthPaidTotal = currentMonthPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      // Calculate total partially paid invoices
      // Query invoices with 'Partial' status (auto-updated when payments created)
      const partiallyPaidInvoicesCount = await this.prisma.invoice.count({
        where: {
          entityId,
          status: 'Partial',
        },
      });

      // Enrich payments with outstanding balance
      const enrichedPayments = this.enrichPaymentRecords(payments);
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        payments: enrichedPayments,
        stats: {
          totalRecords: totalCount,
          totalAmount,
          averageAmount:
            totalCount > 0 ? Math.round(totalAmount / totalCount) : 0,
          currentMonthPaidTotal,
          totalPartiallyPaidInvoices: partiallyPaidInvoicesCount,
        },
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async updatePaymentReceived(
    paymentId: string,
    entityId: string,
    body: UpdatePaymentReceivedDto,
  ) {
    try {
      const payment = await this.prisma.paymentReceived.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new HttpException(
          'Payment record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (payment.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this payment record',
          HttpStatus.FORBIDDEN,
        );
      }

      // LOCK: Cannot edit if posting has started or completed
      if (payment.postingStatus !== 'Pending') {
        throw new HttpException(
          `Cannot update payment - posting in progress or already completed (status: ${payment.postingStatus})`,
          HttpStatus.LOCKED,
        );
      }

      // Validate new account if depositTo is being changed
      if (body.depositTo && body.depositTo !== payment.depositTo) {
        const account = await this.prisma.account.findUnique({
          where: { id: body.depositTo },
        });

        if (!account) {
          throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
        }

        if (account.entityId !== entityId) {
          throw new HttpException(
            'Account does not belong to this entity',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      const updatedPayment = await this.prisma.paymentReceived.update({
        where: { id: paymentId },
        data: { ...body },
        include: {
          invoice: { include: { customer: true } },
          account: true,
        },
      });

      return this.enrichPaymentRecords([updatedPayment])[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async deletePaymentReceived(paymentId: string, entityId: string) {
    try {
      const payment = await this.prisma.paymentReceived.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new HttpException(
          'Payment record not found',
          HttpStatus.NOT_FOUND,
        );
      }

      if (payment.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this payment record',
          HttpStatus.FORBIDDEN,
        );
      }

      // LOCK: Cannot delete if posting has started or completed
      if (payment.postingStatus !== 'Pending') {
        throw new HttpException(
          `Cannot delete payment - posting in progress or already completed (status: ${payment.postingStatus}). Create a reversal payment instead.`,
          HttpStatus.LOCKED,
        );
      }

      await this.prisma.paymentReceived.delete({
        where: { id: paymentId },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  async getAllPaymentReceivedWithStats(
    entityId: string,
    page: number = 1,
    limit: number = 10,
    filters: {
      search?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    try {
      const skip = (page - 1) * limit;
      // const now = new Date();
      // const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const where: any = { entityId };
      const { search, from, to } = filters || {};

      // Note: status field was removed from PaymentReceived
      // Status tracking is now on Invoice (Paid/Partial/etc)
      
      if (from || to) {
        where.paidAt = {};
        if (from) where.paidAt.gte = new Date(from);
        if (to) where.paidAt.lte = new Date(to);
      }

      if (search) {
        where.OR = [
          { reference: { contains: search, mode: 'insensitive' } },
          { paymentMethod: { contains: search, mode: 'insensitive' } },
          {
            account: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            account: {
              code: { contains: search, mode: 'insensitive' },
            },
          },
          {
            invoice: {
              invoiceNumber: { contains: search, mode: 'insensitive' },
            },
          },
          {
            invoice: {
              customer: { name: { contains: search, mode: 'insensitive' } },
            },
          },
        ];
      }

      const [payments, totalCount] = await Promise.all([
        this.prisma.paymentReceived.findMany({
          where,
          include: {
            invoice: { include: { customer: true } },
            account: true,
          },
          skip,
          take: Number(limit),
          orderBy: { paidAt: 'desc' },
        }),
        this.prisma.paymentReceived.count({ where }),
      ]);

      // Calculate total paid invoices (invoices with status = 'Paid')
      const paidInvoices = await this.prisma.invoice.count({
        where: {
          entityId,
          status: 'Paid',
        },
      });

      // Calculate current month paid total
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const currentMonthPayments = await this.prisma.paymentReceived.findMany({
        where: {
          entityId,
          paidAt: {
            gte: currentMonthStart,
            lt: new Date(
              currentMonthStart.getTime() + 32 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      });

      const currentMonthPaidTotal = currentMonthPayments.reduce(
        (sum, p) => sum + p.amount,
        0,
      );

      // Calculate total partially paid invoices (invoices with status = 'Partial')
      const partiallyPaidInvoicesCount = await this.prisma.invoice.count({
        where: {
          entityId,
          status: 'Partial',
        },
      });

      // Enrich payments with outstanding balance
      const enrichedPayments = this.enrichPaymentRecords(payments);
      const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        payments: enrichedPayments,
        stats: {
          totalRecords: totalCount,
          totalAmount,
          averageAmount:
            totalCount > 0 ? Math.round(totalAmount / totalCount) : 0,
          totalPaidInvoices: paidInvoices,
          currentMonthPaidTotal,
          totalPartiallyPaidInvoices: partiallyPaidInvoicesCount,
        },
        pagination: {
          totalCount,
          totalPages,
          currentPage: page,
          limit,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
