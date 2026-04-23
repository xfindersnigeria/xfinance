import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, HttpStatus, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { CreateReceiptDto, UpdateReceiptDto } from './dto/receipt.dto';
import { GetReceiptsQueryDto } from './dto/get-receipts-query.dto';
import { GetReceiptsResponseDto } from './dto/get-receipts-response.dto';
import { ReceiptStatus, PaymentMethod } from 'prisma/generated/enums';
import { generateRandomInvoiceNumber } from '@/auth/utils/helper';
import { BullmqService } from '@/bullmq/bullmq.service';

@Injectable()
export class ReceiptService {
  private readonly logger = new Logger(ReceiptService.name);

  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  async createReceipt(body: CreateReceiptDto, entityId: string, groupId: string) {
    try {
      const receiptNumber = generateRandomInvoiceNumber({ prefix: 'RCT' });
      const { items, depositTo, ...receiptData } = body;

      if (!depositTo) {
        throw new BadRequestException('depositTo (cash/bank account) is required');
      }

      // Fetch item details to check for taxable items and determine type
      const itemDetails =
        items && items.length > 0
          ? await this.prisma.items.findMany({
              where: {
                id: { in: items.map((i) => i.itemId) },
                entityId,
              },
              select: {
                id: true,
                isTaxable: true,
                type: true,
              },
            })
          : [];

      // Calculate item totals and receipt totals
      let subtotal = 0;
      let hasTaxableItems = false;
      const receiptItemsData = (items || []).map((item) => {
        const itemDetail = itemDetails.find((i) => i.id === item.itemId);
        const total = item.rate * item.quantity;
        subtotal += total;
        if (itemDetail?.isTaxable) {
          hasTaxableItems = true;
        }
        return {
          itemId: item.itemId,
          rate: item.rate,
          quantity: item.quantity,
          total,
        };
      });
      
      // Calculate tax only if there are taxable items (10% like invoices)
      const tax = hasTaxableItems ? Math.round(0.1 * subtotal) : 0;
      const total = subtotal + tax;

      // Create receipt and items in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const receipt = await tx.receipt.create({
          data: {
            ...receiptData,
            entityId,
            groupId,
            receiptNumber,
            subtotal,
            tax,
            total,
            depositTo,
          },
          include: {
            receiptItem: { include: { item: true } },
          },
        });

        // Create receipt items
        const receiptItems = await Promise.all(
          receiptItemsData.map((item) =>
            tx.receiptItem.create({
              data: {
                ...item,
                receiptId: receipt.id,
              },
              include: { item: true },
            })
          )
        );

        return { ...receipt, receiptItem: receiptItems };
      });

      // Queue posting job if status is Completed
      if (receiptData.status === ReceiptStatus.Completed) {
        try {
          await this.bullmqService.addJob('post-receipt-journal', {
            receiptId: result.id,
            receiptData: {
              receiptNumber: result.receiptNumber,
              entityId,
              subtotal,
              tax,
              total,
              depositTo,
              items: receiptItemsData,
            },
          });
          this.logger.log(
            `Queued journal posting job for receipt ${result.receiptNumber}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue receipt journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          // Don't throw - receipt is already created, job will retry
        }
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async getEntityReceipts(
    entityId: string,
    query: GetReceiptsQueryDto,
  ): Promise<any> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const whereClause: any = { entityId };
      if (query.status) whereClause.status = query.status;
      if (query.paymentMethod) whereClause.paymentMethod = query.paymentMethod;
      if (query.search) {
        whereClause.customer = {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        };
      }

      // Paginated receipts
      const [receipts, totalCount] = await Promise.all([
        this.prisma.receipt.findMany({
          where: whereClause,
          include: {
            customer: true,
            receiptItem: { include: { item: true } },
          },
          skip,
          take: Number(limit),
          orderBy: { date: 'desc' },
        }),
        this.prisma.receipt.count({ where: whereClause }),
      ]);

      // Aggregates for filtered set
      const aggregate = await this.prisma.receipt.aggregate({
        _sum: { total: true },
        _count: { _all: true },
        where: whereClause,
      });

      const totalSales = aggregate._sum.total ?? 0;
      const totalReceipts = aggregate._count._all ?? 0;

      // Today's sales
      const now = new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0,
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
      );

      const todaysWhere = {
        ...whereClause,
        date: { gte: startOfDay, lte: endOfDay },
      };
      const todaysAggregate = await this.prisma.receipt.aggregate({
        _sum: { total: true },
        where: todaysWhere,
      });
      const todaysSales = todaysAggregate._sum.total ?? 0;

      const averageReceiptValue =
        totalReceipts > 0 ? Math.round(totalSales / totalReceipts) : 0;

      const transformed = receipts.map((r) => ({
        ...r,
        id: r.id,
        customerId: r.customerId,
        customerName: r.customer?.name,
        date: r.date.toISOString(),
        items: r.receiptItem, // Return structured items
        createdAt: r.createdAt.toISOString(),
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return {
        receipts: transformed,
        stats: {
          totalReceipts,
          totalSales,
          todaysSales,
          averageReceiptValue,
        },
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async getReceiptById(receiptId: string, entityId: string) {
    try {
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
          customer: true,
          receiptItem: { include: { item: true } },
        },
      });

      if (!receipt) {
        throw new HttpException('Receipt not found', HttpStatus.NOT_FOUND);
      }

      if (receipt.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this receipt',
          HttpStatus.FORBIDDEN,
        );
      }

      return receipt;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async updateReceipt(
    receiptId: string,
    entityId: string,
    body: UpdateReceiptDto,
  ) {
    try {
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: receiptId },
      });

      if (!receipt) {
        throw new HttpException('Receipt not found', HttpStatus.NOT_FOUND);
      }

      if (receipt.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this receipt',
          HttpStatus.FORBIDDEN,
        );
      }

      const { items, ...receiptData } = body;

      // Calculate new receipt items and totals
      let subtotal = 0;
      const receiptItemsData = (items || []).map((item) => {
        const total = item.rate * item.quantity;
        subtotal += total;
        return {
          itemId: item.itemId,
          rate: item.rate,
          quantity: item.quantity,
          total,
        };
      });
      const tax = 0;
      const total = subtotal + tax;

      // Replace all receipt items and update receipt in a transaction
      const updatedReceipt = await this.prisma.$transaction(async (tx) => {
        // Delete all existing items for this receipt
        await tx.receiptItem.deleteMany({ where: { receiptId } });

        // Create new items
        await Promise.all(
          receiptItemsData.map((item) =>
            tx.receiptItem.create({
              data: {
                ...item,
                receiptId,
              },
            })
          )
        );

        // Update receipt
        const updated = await tx.receipt.update({
          where: { id: receiptId },
          data: {
            ...receiptData,
            subtotal,
            tax,
            total,
          },
          include: {
            customer: true,
            receiptItem: { include: { item: true } },
          },
        });

        return updated;
      });
      return updatedReceipt;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.BAD_REQUEST);
    }
  }

  async toggleReceiptStatus(receiptId: string, entityId: string) {
    try {
      const receipt = await this.prisma.receipt.findUnique({
        where: { id: receiptId },
        include: { receiptItem: { include: { item: true } } },
      });

      if (!receipt) {
        throw new HttpException('Receipt not found', HttpStatus.NOT_FOUND);
      }

      if (receipt.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this receipt',
          HttpStatus.FORBIDDEN,
        );
      }

      // Toggle status between Void and Completed
      const newStatus =
        receipt.status === ReceiptStatus.Void
          ? ReceiptStatus.Completed
          : ReceiptStatus.Void;

      const updatedReceipt = await this.prisma.receipt.update({
        where: { id: receiptId },
        data: { status: newStatus },
        include: {
          customer: true,
          receiptItem: { include: { item: true } },
        },
      });

      // Queue posting job if transitioning to Completed
      if (receipt.status !== ReceiptStatus.Completed && newStatus === ReceiptStatus.Completed) {
        try {
          const itemsForPosting = receipt.receiptItem.map((ri) => ({
            itemId: ri.itemId,
            quantity: ri.quantity,
            rate: ri.rate,
            total: ri.total,
          }));

          await this.bullmqService.addJob('post-receipt-journal', {
            receiptId,
            receiptData: {
              receiptNumber: receipt.receiptNumber,
              entityId,
              subtotal: receipt.subtotal,
              tax: receipt.tax,
              total: receipt.total,
              depositTo: receipt.depositTo,
              items: itemsForPosting,
            },
          });
          this.logger.log(
            `Queued journal posting job for receipt ${receipt.receiptNumber}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue receipt journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          // Don't throw - receipt status is already updated, job will retry
        }
      }

      return updatedReceipt;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
