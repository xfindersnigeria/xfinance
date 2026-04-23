import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { CreateBillDto } from './dto/bill.dto';
import { GetBillsQueryDto } from './dto/get-bills-query.dto';
import { GetBillsResponseDto } from './dto/get-bills-response.dto';
import { BillStatus } from 'prisma/generated/enums';
import { generateBillReference, generateJournalReference } from '@/auth/utils/helper';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileuploadService: FileuploadService,
    private readonly bullmqService: BullmqService,
  ) {}

  async createBill(
    body: CreateBillDto,
    entityId: string,
    file?: Express.Multer.File,
    groupId?: string,
  ): Promise<any> {
    let attachment: { publicId: string; secureUrl: string } | undefined =
      undefined;

    if (file) {
      try {
        const folder = groupId
          ? this.fileuploadService.buildAssetPath(groupId, entityId, 'bills')
          : `bills/${entityId}`;
        const uploadResult = await this.fileuploadService.uploadFile(file, folder);
        attachment = {
          publicId: uploadResult.publicId,
          secureUrl: uploadResult.secureUrl,
        };
      } catch (error) {
        throw new BadRequestException(`File upload failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    const { items, status = 'draft', ...billData } = body;

    // Cast status to BillStatus enum
    const billStatus = (status || 'draft') as BillStatus;

    // Generate sequential bill reference within a transaction to prevent race conditions
    const billNumber = await this.prisma.$transaction(async (tx) => {
      // Lock and get the last bill for this entity
      const lastBill = await tx.bills.findFirst({
        where: { entityId },
        orderBy: { createdAt: 'desc' },
        select: { billNumber: true },
      });

      let nextSequence = 1;
      if (lastBill?.billNumber) {
        const match = lastBill.billNumber.match(/BILL-(\d+)/);
        if (match) {
          nextSequence = parseInt(match[1]) + 1;
        }
      }

      return generateBillReference(nextSequence);
    });

    // Parse and calculate item totals - NOW with expenseAccountId per item
    let subtotal = 0;
    const billItemsData = (JSON.parse(items as any) || []).map((item, index) => {
      // Validate required fields per item
      if (!item.name) {
        throw new BadRequestException(`Item ${index + 1}: name is required`);
      }
      if (!item.expenseAccountId) {
        throw new BadRequestException(
          `Item ${index + 1}: expenseAccountId is required`,
        );
      }

      const total = item.rate * item.quantity;
      subtotal += total;
      return {
        name: item.name,
        rate: item.rate,
        quantity: item.quantity,
        total,
        expenseAccountId: item.expenseAccountId, // Store per item
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Calculate tax and discount (default 0 if not provided)
    const tax = billData.tax ?? 0;
    const discount = billData.discount ?? 0;
    const total = subtotal + Number(tax) - Number(discount);
const { projectId, milestoneId, ...restBillData } = billData;
    // Create bill with JSON items (items now include expenseAccountId)
    const bill = await this.prisma.bills.create({
      data: {
        ...restBillData,
        projectId: projectId || undefined,
        milestoneId: milestoneId || undefined,
        status: billStatus,
        billNumber,
        accountsPayableId: billData.accountsPayableId ?? undefined,
        entityId,
        groupId: groupId ?? '',
        subtotal,
        tax: Number(tax),
        discount: Number(discount),
        total,
        items: billItemsData,
        attachment: attachment
          ? { publicId: attachment.publicId, secureUrl: attachment.secureUrl }
          : undefined,
      },
      include: {
        vendor: {
          select: {
            id: true,
            displayName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Queue posting job ONLY if status is unpaid
    if (billStatus === 'unpaid') {
      try {
        await this.bullmqService.addJob('post-bill-journal', {
          billId: bill.id,
          billData: {
            billNumber: bill.billNumber,
            entityId,
            groupId,
            subtotal: bill.subtotal,
            tax: bill.tax,
            discount: bill.discount,
            total: bill.total,
            accountsPayableId: bill.accountsPayableId,
            items: billItemsData, // Items with expenseAccountId
          },
        });
        this.logger.log(
          `Queued journal posting job for bill ${bill.billNumber}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue bill journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        // Don't throw - bill is already created, job will retry
      }
    }

    return bill;
  }

  async getBills(
    entityId: string,
    query: GetBillsQueryDto,
  ): Promise<GetBillsResponseDto & any> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      entityId,
    };

   

    if (search) {
      where.OR = [
        {
          billNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          poNumber: {
            contains: search,
            mode: 'insensitive',
          },
        },
        {
          vendor: {
            displayName: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const [bills, total] = await Promise.all([
      this.prisma.bills.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          billDate: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.bills.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Normalize nullable fields (Prisma may return null) and format createdAt
    const transformedBills = bills.map((b) => ({
      ...b,
      billNumber: b.billNumber ?? undefined,
      poNumber: b.poNumber ?? undefined,
      notes: b.notes ?? undefined,
      attachment:
        b.attachment === null
          ? undefined
          : (b.attachment as Record<string, any>),
      items: (b.items as any[]) || [], // Items stored as JSON array
      createdAt:
        b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
      postedAt: b.postedAt instanceof Date
        ? b.postedAt.toISOString()
        : b.postedAt,
    }));

    return {
      bills: transformedBills,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  async getBillById(entityId: string, billId: string) {
    const bill = await this.prisma.bills.findUnique({
      where: { id: billId },
      include: {
        vendor: {
          select: { id: true, displayName: true, email: true, phone: true },
        },
        paymentsMade: {
          include: {
            vendor: { select: { id: true, displayName: true } },
            account: { select: { id: true, code: true, name: true } },
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!bill || bill.entityId !== entityId) return null;

    // Calculate total paid
    const totalPaid = bill.paymentsMade.reduce(
      (sum, p) => sum + p.amount,
      0,
    );

    return {
      ...bill,
      billNumber: bill.billNumber ?? undefined,
      poNumber: bill.poNumber ?? undefined,
      notes: bill.notes ?? undefined,
      attachment:
        bill.attachment === null
          ? undefined
          : (bill.attachment as Record<string, any>),
      items: (bill.items as any[]) || [],
      createdAt:
        bill.createdAt instanceof Date
          ? bill.createdAt.toISOString()
          : bill.createdAt,
      postedAt: bill.postedAt instanceof Date
        ? bill.postedAt.toISOString()
        : bill.postedAt,
      paymentsMade: bill.paymentsMade.map((p) => ({
        ...p,
        paymentDate:
          p.paymentDate instanceof Date
            ? p.paymentDate.toISOString()
            : p.paymentDate,
        postedAt: p.postedAt instanceof Date
          ? p.postedAt.toISOString()
          : p.postedAt,
        note: p.note ?? undefined,
      })),
      totalPaid,
    };
  }

  async updateBill(
    billId: string,
    entityId: string,
    body: any,
    file?: Express.Multer.File,
    groupId?: string,
  ) {
    try {
      const bill = await this.prisma.bills.findUnique({
        where: { id: billId },
      });

      if (!bill || bill.entityId !== entityId) {
        throw new BadRequestException('Bill not found for this entity');
      }

      let attachment = bill.attachment as any;

      // Upload new file if provided
      if (file) {
        // Delete old attachment if exists
        if (attachment?.publicId) {
          await this.fileuploadService.deleteFile(attachment.publicId);
        }

        const folder = groupId
          ? this.fileuploadService.buildAssetPath(groupId, entityId, 'bills')
          : `bills/${entityId}`;
        const uploadedFile = await this.fileuploadService.uploadFile(file, folder);
        attachment = {
          publicId: uploadedFile.publicId,
          secureUrl: uploadedFile.secureUrl,
        };
      }

      const { items, ...billData } = body;

      // Calculate new bill items and totals - NOW with expenseAccountId per item
      let subtotal = 0;
      const billItemsData = (items || []).map((item, index) => {
        // Validate required fields per item
        if (!item.name) {
          throw new BadRequestException(`Item ${index + 1}: name is required`);
        }
        if (!item.expenseAccountId) {
          throw new BadRequestException(
            `Item ${index + 1}: expenseAccountId is required`,
          );
        }

        const total = item.rate * item.quantity;
        subtotal += total;
        return {
          name: item.name,
          rate: item.rate,
          quantity: item.quantity,
          total,
          expenseAccountId: item.expenseAccountId, // Store per item
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      const tax = billData.tax ?? 0;
      const discount = billData.discount ?? 0;
      const total = subtotal + tax - discount;

      // Update bill with new JSON items (including expenseAccountId)
      await this.prisma.bills.update({
        where: { id: billId },
        data: {
          ...billData,
          subtotal,
          tax,
          discount,
          total,
          items: billItemsData,
          ...(file && { attachment }),
        },
      });

      // Bill status is now updated automatically when payments are posted via PaymentMade
      // No manual status update needed here

      // Check if status changed to unpaid and queue posting if needed
      if (billData.status && billData.status !== bill.status && billData.status === 'unpaid') {
        try {
          const updatedBill = await this.prisma.bills.findUnique({
            where: { id: billId },
          });
          if (updatedBill) {
            await this.bullmqService.addJob('post-bill-journal', {
              billId: updatedBill.id,
              billData: {
                billNumber: updatedBill.billNumber,
                entityId,
                groupId,
                subtotal: updatedBill.subtotal,
                tax: updatedBill.tax,
                discount: updatedBill.discount,
                total: updatedBill.total,
                accountsPayableId: updatedBill.accountsPayableId,
                items: billItemsData,
              },
            });
            this.logger.log(
              `Queued journal posting job for bill ${updatedBill.billNumber}`,
            );
          }
        } catch (queueError) {
          this.logger.error(
            `Failed to queue bill journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
        }
      }

      return this.getBillById(entityId, billId);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Mark a draft bill as unpaid (triggers journal posting)
   */
  async markBillUnpaid(billId: string, entityId: string, groupId: string) {
    try {
      const bill = await this.prisma.bills.findUnique({
        where: { id: billId },
        include: { paymentRecord: true },
      });

      if (!bill || bill.entityId !== entityId) {
        throw new BadRequestException('Bill not found for this entity');
      }

      if (bill.status !== 'draft') {
        throw new BadRequestException(`Bill must be in draft status, current status is ${bill.status}`);
      }

      // Update bill to unpaid
      await this.prisma.bills.update({
        where: { id: billId },
        data: { status: 'unpaid' },
      });

      // Queue posting job
      try {
        const billItemsData = (bill.items as any[]) || [];
        await this.bullmqService.addJob('post-bill-journal', {
          billId: bill.id,
          billData: {
            billNumber: bill.billNumber,
            entityId,
            groupId,
            subtotal: bill.subtotal,
            tax: bill.tax,
            discount: bill.discount,
            total: bill.total,
            accountsPayableId: bill.accountsPayableId,
            items: billItemsData,
          },
        });
        this.logger.log(
          `Queued journal posting job for bill ${bill.billNumber}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue bill journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new BadRequestException(`Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`);
      }

      return this.getBillById(entityId, billId);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Mark unpaid failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteBill(billId: string, entityId: string) {
    try {
      const bill = await this.prisma.bills.findUnique({
        where: { id: billId },
      });

      if (!bill || bill.entityId !== entityId) {
        throw new BadRequestException('Bill not found for this entity');
      }

      // Delete attachment from Cloudinary if exists
      const attachment = bill.attachment as any;
      if (attachment?.publicId) {
        await this.fileuploadService.deleteFile(attachment.publicId);
      }

      await this.prisma.bills.delete({
        where: { id: billId },
      });

      return { message: 'Bill deleted successfully' };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get all failed bill postings for an entity
   */
  async getFailedBills(
    entityId: string,
    page = 1,
    limit = 10,
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      this.prisma.bills.findMany({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
        include: {
          vendor: {
            select: {
              id: true,
              displayName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: Number(limit),
      }),
      this.prisma.bills.count({
        where: {
          entityId,
          postingStatus: 'Failed',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const transformedBills = bills.map((b) => ({
      ...b,
      billNumber: b.billNumber ?? undefined,
      poNumber: b.poNumber ?? undefined,
      notes: b.notes ?? undefined,
      errorMessage: b.errorMessage ?? undefined,
      errorCode: b.errorCode ?? undefined,
      attachment:
        b.attachment === null
          ? undefined
          : (b.attachment as Record<string, any>),
      items: (b.items as any[]) || [],
      createdAt:
        b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
      updatedAt:
        b.updatedAt instanceof Date ? b.updatedAt.toISOString() : b.updatedAt,
    }));

    return {
      bills: transformedBills,
      total,
      currentPage: page,
      pageSize: limit,
      totalPages,
    };
  }

  /**
   * Retry failed bill journal posting
   */
  async retryFailedBillPosting(billId: string, entityId: string, groupId: string): Promise<any> {
    try {
      const bill = await this.prisma.bills.findUnique({
        where: { id: billId },
      });

      if (!bill || bill.entityId !== entityId) {
        throw new BadRequestException('Bill not found for this entity');
      }

      if (bill.postingStatus !== 'Failed') {
        throw new BadRequestException(
          `Bill posting status is ${bill.postingStatus}, only failed postings can be retried`,
        );
      }

      // Reset to Pending and queue the job
      await this.prisma.bills.update({
        where: { id: billId },
        data: {
          postingStatus: 'Pending',
          errorMessage: null,
          errorCode: null,
        },
      });

      // Queue posting job
      try {
        const billItemsData = (bill.items as any[]) || [];
        await this.bullmqService.addJob('post-bill-journal', {
          billId: bill.id,
          billData: {
            billNumber: bill.billNumber,
            entityId,
            groupId,
            subtotal: bill.subtotal,
            tax: bill.tax,
            discount: bill.discount,
            total: bill.total,
            accountsPayableId: bill.accountsPayableId,
            items: billItemsData,
          },
        });
        this.logger.log(
          `Requeued journal posting job for failed bill ${bill.billNumber}`,
        );
      } catch (queueError) {
        this.logger.error(
          `Failed to queue bill journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
        throw new BadRequestException(
          `Failed to queue journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
        );
      }

      return this.getBillById(entityId, billId);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        `Retry failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}