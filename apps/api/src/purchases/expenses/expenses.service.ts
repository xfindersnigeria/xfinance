import { ExpenseStatus } from './../../../prisma/generated/enums';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateExpenseDto } from './dto/expense.dto';
import { GetExpensesQueryDto } from './dto/get-expenses-query.dto';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { generateRandomInvoiceNumber } from '@/auth/utils/helper';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    private prisma: PrismaService,
    private fileuploadService: FileuploadService,
    private bullmqService: BullmqService,
  ) {}

  async createExpense(
    body: CreateExpenseDto,
    entityId: string,
    file?: Express.Multer.File,
    groupId?: string,
  ) {
    try {
      let attachment: any = undefined;

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

      const expenseAccountId = body.expenseAccountId;
      if (!expenseAccountId) {
        throw new HttpException(
          'Expense account is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate account exists and belongs to the same entity
      const account = await this.prisma.account.findUnique({
        where: { id: expenseAccountId },
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

      const paymentAccountId = body.paymentAccountId;
      if (!paymentAccountId) {
        throw new HttpException(
          'Payment account is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate account exists and belongs to the same entity
      const paymentAccount = await this.prisma.account.findUnique({
        where: { id: paymentAccountId },
      });

      if (!paymentAccount) {
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      }

      if (paymentAccount.entityId !== entityId) {
        throw new HttpException(
          'Account does not belong to this entity',
          HttpStatus.FORBIDDEN,
        );
      }

      // Upload file to Cloudinary if provided
      if (file) {
        const folder = groupId
          ? this.fileuploadService.buildAssetPath(groupId, entityId, 'expenses')
          : `expenses/${entityId}`;
        attachment = await this.fileuploadService.uploadFile(file, folder);
      }

      const reference = generateRandomInvoiceNumber({ prefix: 'EXP' });
      const status = body.status || 'draft' as any;

      const {projectId, milestoneId, ...expenseData} = body;

      const expense = await this.prisma.expenses.create({
        data: {
          ...expenseData,
          projectId: projectId || null,
          milestoneId: milestoneId || null,
          status,
          expenseAccountId,
          paymentAccountId,
          reference,
          entityId,
          groupId: groupId ?? '',
          vendorId: body.vendorId,
          attachment: attachment
            ? { publicId: attachment.publicId, secureUrl: attachment.secureUrl }
            : undefined,
        },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
      });

      // Queue posting job ONLY if status is approved
      if (status === 'approved') {
        try {
          await this.bullmqService.addJob('post-expense-journal', {
            expenseId: expense.id,
            expenseData: {
              reference: expense.reference,
              entityId,
              groupId,
              amount: expense.amount,
              tax: parseInt(expense.tax) || 0,
              expenseAccountId: expense.expenseAccountId,
              paymentAccountId: expense.paymentAccountId,
            },
          });
          this.logger.log(
            `Queued journal posting job for expense ${expense.reference}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue expense journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          throw new HttpException(
            `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return expense;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getExpenses(entityId: string, query: GetExpensesQueryDto) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const where: any = { entityId };
      if (query.search) {
        where.OR = [
          { reference: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      const [expenses, totalCount] = await Promise.all([
        this.prisma.expenses.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { date: 'desc' },
          include: {
            expenseAccount: {
              select: { id: true, name: true, code: true },
            },
            paymentAccount: {
              select: { id: true, name: true, code: true },
            },
            vendor: {
              select: { id: true, name: true },
            },
          },
        }),
        this.prisma.expenses.count({ where }),
      ]);

      const totalPages = Math.ceil(totalCount / limit);

      const transformed = expenses.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        date: e.date.toISOString(),
      }));

      return {
        expenses: transformed,
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async approveExpense(expenseId: string, entityId: string) {
    try {
      const expense = await this.prisma.expenses.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        throw new HttpException('Expense not found', HttpStatus.NOT_FOUND);
      }

      if (expense.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to approve this expense',
          HttpStatus.FORBIDDEN,
        );
      }

      if (expense.status !== 'draft') {
        throw new HttpException(
          `Cannot approve expense with status: ${expense.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedExpense = await this.prisma.expenses.update({
        where: { id: expenseId },
        data: { status: 'approved' },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
      });

      // Queue posting job
      try {
        await this.bullmqService.addJob('post-expense-journal', {
          expenseId: updatedExpense.id,
          expenseData: {
            reference: updatedExpense.reference,
            entityId,
            groupId: updatedExpense.groupId,
            amount: updatedExpense.amount,
            tax: parseInt(updatedExpense.tax) || 0,
            expenseAccountId: updatedExpense.expenseAccountId,
            paymentAccountId: updatedExpense.paymentAccountId,
          },
        });
        this.logger.log(
          `Queued journal posting job for expense ${updatedExpense.reference}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue expense journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new HttpException(
          `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return updatedExpense;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async updateExpense(
    expenseId: string,
    entityId: string,
    body: any,
    file?: Express.Multer.File,
    groupId?: string,
  ) {
    try {
      const expense = await this.prisma.expenses.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        throw new HttpException('Expense not found', HttpStatus.NOT_FOUND);
      }

      if (expense.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this expense',
          HttpStatus.FORBIDDEN,
        );
      }


      if (body.vendorId) {
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

      //   if (!body.accountId) {
      //     resolvedAccountId = vendor.expenseAccountId ?? resolvedAccountId;
      //   }
      }

      if (!body.expenseAccountId) {
        throw new HttpException(
          'Expense account is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate account if changed or resolved from vendor
      if (body.expenseAccountId !== expense.expenseAccountId) {
        const account = await this.prisma.account.findUnique({
          where: { id: body.expenseAccountId },
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

      let attachment = expense.attachment as any;

      // Upload new file if provided
      if (file) {
        // Delete old attachment if exists
        if (attachment?.publicId) {
          await this.fileuploadService.deleteFile(attachment.publicId);
        }

        const folder = groupId
          ? this.fileuploadService.buildAssetPath(groupId, entityId, 'expenses')
          : `expenses/${entityId}`;
        const uploadedFile = await this.fileuploadService.uploadFile(file, folder);
        attachment = {
          publicId: uploadedFile.publicId,
          secureUrl: uploadedFile.secureUrl,
        };
      }

      const updatedExpense = await this.prisma.expenses.update({
        where: { id: expenseId },
        data: {
          ...body,
          expenseAccountId: body.expenseAccountId,
          paymentAccountId: body.paymentAccountId,
          ...(file && { attachment }),
        },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
      });

      // Check if status changed to approved and queue posting
      if (body.status && body.status !== expense.status && body.status === 'approved') {
        try {
          await this.bullmqService.addJob('post-expense-journal', {
            expenseId: updatedExpense.id,
            expenseData: {
              reference: updatedExpense.reference,
              entityId,
              groupId: updatedExpense.groupId,
              amount: updatedExpense.amount,
              tax: parseInt(updatedExpense.tax) || 0,
              expenseAccountId: updatedExpense.expenseAccountId,
              paymentAccountId: updatedExpense.paymentAccountId,
            },
          });
          this.logger.log(
            `Queued journal posting job for expense ${updatedExpense.reference}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue expense journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
        }
      }

      return updatedExpense;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async deleteExpense(expenseId: string, entityId: string) {
    try {
      const expense = await this.prisma.expenses.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        throw new HttpException('Expense not found', HttpStatus.NOT_FOUND);
      }

      if (expense.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this expense',
          HttpStatus.FORBIDDEN,
        );
      }

      // Delete attachment from Cloudinary if exists
      const attachment = expense.attachment as any;
      if (attachment?.publicId) {
        await this.fileuploadService.deleteFile(attachment.publicId);
      }

      await this.prisma.expenses.delete({
        where: { id: expenseId },
      });

      return { message: 'Expense deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Update expense status with validation and posting logic
   */
  async updateExpenseStatus(expenseId: string, entityId: string, newStatus: string) {
    try {
      const expense = await this.prisma.expenses.findUnique({
        where: { id: expenseId },
      });

      if (!expense) {
        throw new HttpException('Expense not found', HttpStatus.NOT_FOUND);
      }

      if (expense.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this expense',
          HttpStatus.FORBIDDEN,
        );
      }

      // Validate status transitions
      if (newStatus === 'approved' && expense.status !== 'draft') {
        throw new HttpException(
          `Cannot approve expense with status: ${expense.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (newStatus === 'rejected' && expense.status !== 'draft') {
        throw new HttpException(
          `Cannot reject expense with status: ${expense.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const updatedExpense = await this.prisma.expenses.update({
        where: { id: expenseId },
        data: { status: newStatus as any },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
      });

      // Queue posting if status is now approved
      if (newStatus === 'approved') {
        try {
          await this.bullmqService.addJob('post-expense-journal', {
            expenseId: updatedExpense.id,
            expenseData: {
              reference: updatedExpense.reference,
              entityId,
              groupId: updatedExpense.groupId,
              amount: updatedExpense.amount,
              tax: parseInt(updatedExpense.tax) || 0,
              expenseAccountId: updatedExpense.expenseAccountId,
              paymentAccountId: updatedExpense.paymentAccountId,
            },
          });
          this.logger.log(
            `Queued journal posting job for expense ${updatedExpense.reference}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue expense journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          throw new HttpException(
            `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      return updatedExpense;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Update status failed: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get all failed expense postings for an entity
   */
  async getFailedExpenses(entityId: string, page = 1, limit = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const [expenses, total] = await Promise.all([
      this.prisma.expenses.findMany({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.expenses.count({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      expenses,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Retry failed expense journal posting
   */
  async retryFailedExpense(expenseId: string, entityId: string): Promise<any> {
    try {
      const expense = await this.prisma.expenses.findUnique({
        where: { id: expenseId },
      });

      if (!expense || expense.entityId !== entityId) {
        throw new HttpException('Expense not found for this entity', HttpStatus.NOT_FOUND);
      }

      if (expense.postingStatus !== 'Failed') {
        throw new HttpException(
          `Expense posting status is ${expense.postingStatus}, only failed postings can be retried`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Reset to Pending and queue the job
      await this.prisma.expenses.update({
        where: { id: expenseId },
        data: {
          postingStatus: 'Pending',
          errorMessage: null,
          errorCode: null,
        },
      });

      // Queue posting job
      try {
        await this.bullmqService.addJob('post-expense-journal', {
          expenseId: expense.id,
          expenseData: {
            reference: expense.reference,
            entityId,
            groupId: expense.groupId,
            amount: expense.amount,
            tax: parseInt(expense.tax) || 0,
            expenseAccountId: expense.expenseAccountId,
            paymentAccountId: expense.paymentAccountId,
          },
        });
        this.logger.log(
          `Requeued journal posting job for failed expense ${expense.reference}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue expense journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new HttpException(
          `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      return this.prisma.expenses.findUnique({
        where: { id: expenseId },
        include: {
          expenseAccount: {
            select: { id: true, name: true, code: true },
          },
          paymentAccount: {
            select: { id: true, name: true, code: true },
          },
          vendor: {
            select: { id: true, name: true },
          },
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
