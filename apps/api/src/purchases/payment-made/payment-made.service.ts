import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { CreatePaymentMade } from './dto/paymet-made';
import { BullmqService } from '@/bullmq/bullmq.service';

@Injectable()
export class PaymentMadeService {
  private readonly logger = new Logger(PaymentMadeService.name);

  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  async addPaymentMade(body: CreatePaymentMade, entityId: string, groupId: string) {
    const {
      accountId,
      amount,
      billId,
      paymentDate,
      vendorId,
      note,
      reference,
      paymentMethod,
    } = body;
    try {
      // 1. VALIDATE BILL EXISTS AND BELONGS TO ENTITY
      const bill = await this.prisma.bills.findUnique({
        where: { id: billId },
      });

      if (!bill || bill.entityId !== entityId) {
        throw new HttpException(
          'Bill not found for this entity',
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. VALIDATE OVERPAY - Check if payment exceeds remaining balance
      const totalAlreadyPaid = await this.prisma.paymentMade.aggregate({
        where: { billId },
        _sum: { amount: true },
      });

      const alreadyPaid = totalAlreadyPaid._sum?.amount || 0;
      const newAmount = body.amount;

      if (alreadyPaid + newAmount > bill.total) {
        const remaining = bill.total - alreadyPaid;
        throw new HttpException(
          `Cannot pay ${newAmount}. Bill total is ${bill.total}, already paid ${alreadyPaid}, remaining balance is ${remaining}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. FIND ACCOUNTS PAYABLE ACCOUNT
      const apAccount = await this.prisma.account.findFirst({
        where: {
          code: '2110-01', // Accounts Payable
          entityId,
        },
        select: { id: true },
      });

      if (!apAccount) {
        throw new HttpException(
          'Accounts Payable account (2110-01) not found for this entity',
          HttpStatus.NOT_FOUND,
        );
      }

      // 4. CREATE PAYMENT MADE RECORD
      const paymentMade = await this.prisma.paymentMade.create({
        data: {
          accountId,
          amount,
          billId,
          paymentDate,
          vendorId,
          entityId,
          groupId,
          note,
          reference,
          paymentMethod,
        },
        include: {
          vendor: true,
          account: true,
          bill: true,
        },
      });

      // 5. QUEUE POSTING JOB
      try {
        await this.bullmqService.addJob('post-payment-made-journal', {
          paymentMadeId: paymentMade.id,
          paymentData: {
            reference: paymentMade.reference || paymentMade.id,
            entityId,
            billId: paymentMade.billId,
            amount: newAmount,
            paymentAccountId: paymentMade.accountId,
            apAccountId: apAccount.id,
          },
        });
        this.logger.log(
          `Queued journal posting job for payment made ${paymentMade.reference}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue payment made journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new HttpException(
          `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return paymentMade;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentMade(entityId: string) {
    try {
      const entityPaymentmade = await this.prisma.paymentMade.findMany({
        where: { entityId },
        include: { vendor: true },
      });
      return entityPaymentmade;
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all failed payment made postings for an entity
   */
  async getFailedPayments(entityId: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.paymentMade.findMany({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
        include: {
          vendor: true,
          account: true,
        },
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.paymentMade.count({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Get all payments for entity with pagination
   */
  async getAllPayments(entityId: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.paymentMade.findMany({
        where: { entityId },
        include: {
          vendor: true,
          account: true,
          bill: { select: { id: true, billNumber: true } },
        },
        orderBy: {
          paymentDate: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.paymentMade.count({
        where: { entityId },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Get a single payment made by ID
   */
  async getPaymentMadeById(paymentMadeId: string, entityId: string): Promise<any> {
    try {
      const paymentMade = await this.prisma.paymentMade.findUnique({
        where: { id: paymentMadeId },
        include: {
          vendor: true,
          account: true,
          bill: { select: { id: true, billNumber: true } },
      }});

      if (!paymentMade) {
        throw new HttpException('Payment Made not found', HttpStatus.NOT_FOUND);
      }

      if (paymentMade.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this payment',
          HttpStatus.FORBIDDEN,
        );
      }

      return paymentMade;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update a payment made
   */
  async updatePaymentMade(
    paymentMadeId: string,
    entityId: string,
    body: any,
  ): Promise<any> {
    try {
      const paymentMade = await this.prisma.paymentMade.findUnique({
        where: { id: paymentMadeId },
      });

      if (!paymentMade) {
        throw new HttpException('Payment Made not found', HttpStatus.NOT_FOUND);
      }

      if (paymentMade.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this payment',
          HttpStatus.FORBIDDEN,
        );
      }

      // Validate vendor if provided
      if (body.vendorId && body.vendorId !== paymentMade.vendorId) {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: body.vendorId },
        });

        if (!vendor) {
          throw new HttpException('Vendor not found', HttpStatus.NOT_FOUND);
        }

        if (vendor.entityId !== entityId) {
          throw new HttpException(
            'Vendor does not belong to this entity',
            HttpStatus.FORBIDDEN,
          );
        }
      }

      // Validate account if provided
      if (body.accountId && body.accountId !== paymentMade.accountId) {
        const account = await this.prisma.account.findUnique({
          where: { id: body.accountId },
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

      const updatedPayment = await this.prisma.paymentMade.update({
        where: { id: paymentMadeId },
        data: {
          ...(body.vendorId && { vendorId: body.vendorId }),
          ...(body.accountId && { accountId: body.accountId }),
          ...(body.amount && { amount: body.amount }),
          ...(body.paymentDate && { paymentDate: body.paymentDate }),
          ...(body.paymentMethod && { paymentMethod: body.paymentMethod }),
          ...(body.reference !== undefined && { reference: body.reference }),
          ...(body.note !== undefined && { note: body.note }),
          ...(body.billNumber !== undefined && { billNumber: body.billNumber }),
        },
        include: {
          vendor: true,
          account: true,
        },
      });

      return updatedPayment;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Delete a payment made
   */
  async deletePaymentMade(paymentMadeId: string, entityId: string): Promise<any> {
    try {
      const paymentMade = await this.prisma.paymentMade.findUnique({
        where: { id: paymentMadeId },
      });

      if (!paymentMade) {
        throw new HttpException('Payment Made not found', HttpStatus.NOT_FOUND);
      }

      if (paymentMade.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this payment',
          HttpStatus.FORBIDDEN,
        );
      }

      // Don't allow deletion if posting was successful
      if (paymentMade.postingStatus === 'Success') {
        throw new HttpException(
          'Cannot delete payment that has been successfully posted. Please reverse the posting first.',
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.paymentMade.delete({
        where: { id: paymentMadeId },
      });

      return { message: 'Payment made deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Retry failed payment made journal posting
   */
  async retryFailedPayment(paymentMadeId: string, entityId: string): Promise<any> {
    try {
      const paymentMade = await this.prisma.paymentMade.findUnique({
        where: { id: paymentMadeId },
      });

      if (!paymentMade || paymentMade.entityId !== entityId) {
        throw new HttpException(
          'Payment Made not found for this entity',
          HttpStatus.NOT_FOUND,
        );
      }

      if (paymentMade.postingStatus !== 'Failed') {
        throw new HttpException(
          `Payment Made posting status is ${paymentMade.postingStatus}, only failed postings can be retried`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Find Accounts Payable account
      const apAccount = await this.prisma.account.findFirst({
        where: {
          code: '2000', // Accounts Payable
          entityId,
        },
        select: { id: true },
      });

      if (!apAccount) {
        throw new HttpException(
          'Accounts Payable account (2000) not found for this entity',
          HttpStatus.NOT_FOUND,
        );
      }

      // Reset to Pending and queue the job
      await this.prisma.paymentMade.update({
        where: { id: paymentMadeId },
        data: {
          postingStatus: 'Pending',
          errorMessage: null,
          errorCode: null,
        },
      });

      // Queue posting job
      try {
        await this.bullmqService.addJob('post-payment-made-journal', {
          paymentMadeId: paymentMade.id,
          paymentData: {
            reference: paymentMade.reference || paymentMade.id,
            entityId,
            amount: paymentMade.amount,
            paymentAccountId: paymentMade.accountId,
            apAccountId: apAccount.id,
          },
        });
        this.logger.log(
          `Requeued journal posting job for failed payment made ${paymentMade.reference}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue payment made journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new HttpException(
          `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.prisma.paymentMade.findUnique({
        where: { id: paymentMadeId },
        include: {
          vendor: true,
          account: true,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Retry failed: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
