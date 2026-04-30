import { PrismaService } from '@/prisma/prisma.service';
import {
  HttpException,
  HttpStatus,
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CreateInvoiceDto, UpdateInvoiceDto } from './dto/invoice.dto';
import {
  generateRandomInvoiceNumber,
  generateJournalReference,
} from '@/auth/utils/helper';
import { GetInvoicesQueryDto } from './dto/get-invoices-query.dto';
import { GetEntityInvoicesResponseDto } from './dto/get-entity-invoices-response.dto';
import { GetPaidInvoicesResponseDto } from './dto/get-paid-invoices-response.dto';
import { GetPaidInvoicesQueryDto } from './dto/get-paid-invoices-query.dto';
import {
  InvoiceStatus,
  InvoiceActivityType,
  ItemsType,
} from 'prisma/generated/enums';
import { BullmqService } from '@/bullmq/bullmq.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private prisma: PrismaService,
    private bullmqService: BullmqService,
  ) {}

  /**
   * Log an activity for an invoice
   */
  private async logActivity(
    invoiceId: string,
    activityType: InvoiceActivityType,
    description: string,
    performedBy: string,
    metadata?: any,
    groupId?: string,
  ) {
    try {
      let resolvedGroupId = groupId;
      if (!resolvedGroupId) {
        const inv = await this.prisma.invoice.findUnique({
          where: { id: invoiceId },
          select: { groupId: true },
        });
        resolvedGroupId = inv!.groupId;
      }
      await this.prisma.invoiceActivity.create({
        data: {
          invoiceId,
          activityType,
          description,
          performedBy,
          metadata,
          groupId: resolvedGroupId,
        },
      });
    } catch (error) {
      console.error(
        'Error logging invoice activity:',
        error instanceof Error ? error.message : String(error),
      );
      // Don't throw, as this shouldn't fail the main operation
    }
  }

  /**
   * Post invoice to journal following accounting rules
   *
   * Rules:
   * Dr Accounts Receivable (1100)           = Total
   *   Cr Product Sales Revenue (4110)       = Net (if product)
   *   OR Cr Service Revenue (4120)          = Net (if service)
   *   Cr VAT Payable (2100)                 = Tax (if tax > 0)
   *
   * IF inventory + COGS enabled:
   *   Dr COGS (5000)                        = Sum(costPrice × qty)
   *   Cr Inventory (1200)                   = Same amount
   */
  // private async postInvoiceToJournal(
  //   invoiceId: string,
  //   invoiceData: {
  //     invoiceNumber: string;
  //     entityId: string;
  //     subtotal: number;
  //     tax: number;
  //     total: number;
  //     items: Array<{
  //       itemId: string;
  //       quantity: number;
  //       rate: number;
  //       total: number;
  //     }>;
  //   },
  // ) {
  //   try {
  //     // Fetch item details to determine type and COGS
  //     const itemDetails = await this.prisma.items.findMany({
  //       where: {
  //         id: { in: invoiceData.items.map((i) => i.itemId) },
  //       },
  //       select: {
  //         id: true,
  //         type: true,
  //         trackInventory: true,
  //         costPrice: true,
  //       },
  //     });

  //     // Separate items by type
  //     let productNetTotal = 0;
  //     let serviceNetTotal = 0;
  //     let cogsTotal = 0;

  //     for (const item of invoiceData.items) {
  //       const itemDetail = itemDetails.find((i) => i.id === item.itemId);
  //       if (!itemDetail) continue;

  //       const netAmount = item.total; // Already calculated as rate × quantity

  //       if (itemDetail.type === ItemsType.product) {
  //         productNetTotal += netAmount;

  //         // Calculate COGS if inventory tracking enabled
  //         if (itemDetail.trackInventory && itemDetail.costPrice) {
  //           const itemCogs = itemDetail.costPrice * item.quantity;
  //           cogsTotal += itemCogs;
  //         }
  //       } else if (itemDetail.type === ItemsType.service) {
  //         serviceNetTotal += netAmount;
  //       }
  //     }

  //     // Find account codes from AccountSubCategory
  //     const [
  //       arAccount,
  //       productRevenueAccount,
  //       serviceRevenueAccount,
  //       vatAccount,
  //       cogsAccount,
  //       inventoryAccount,
  //     ] = await Promise.all([
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '1120-01', // Accounts Receivable
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '4110-01', // Product Sales Revenue
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '4120-01', // Service Revenue
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '2140-01', // VAT Payable
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '5110-01', // COGS
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //       this.prisma.account.findFirst({
  //         where: {
  //           code: '1130-01', // Inventory
  //           entityId: invoiceData.entityId,
  //         },
  //         select: { id: true },
  //       }),
  //     ]);

  //     if (!arAccount) {
  //       throw new BadRequestException(
  //         'Accounts Receivable account (1120-01) not found for entity',
  //       );
  //     }

  //     // Build journal lines
  //     const journalLines: Array<{
  //       accountId: string;
  //       debit: number;
  //       credit: number;
  //     }> = [];

  //     // Dr Accounts Receivable
  //     journalLines.push({
  //       accountId: arAccount.id,
  //       debit: invoiceData.total,
  //       credit: 0,
  //     });

  //     // Cr Product Sales Revenue (if any products)
  //     if (productNetTotal > 0 && productRevenueAccount) {
  //       journalLines.push({
  //         accountId: productRevenueAccount.id,
  //         debit: 0,
  //         credit: productNetTotal,
  //       });
  //     }

  //     // Cr Service Revenue (if any services)
  //     if (serviceNetTotal > 0 && serviceRevenueAccount) {
  //       journalLines.push({
  //         accountId: serviceRevenueAccount.id,
  //         debit: 0,
  //         credit: serviceNetTotal,
  //       });
  //     }

  //     // Cr VAT Payable (if tax > 0)
  //     if (invoiceData.tax > 0 && vatAccount) {
  //       journalLines.push({
  //         accountId: vatAccount.id,
  //         debit: 0,
  //         credit: invoiceData.tax,
  //       });
  //     }

  //     // Dr COGS and Cr Inventory (if applicable)
  //     if (cogsTotal > 0 && cogsAccount && inventoryAccount) {
  //       journalLines.push({
  //         accountId: cogsAccount.id,
  //         debit: cogsTotal,
  //         credit: 0,
  //       });

  //       journalLines.push({
  //         accountId: inventoryAccount.id,
  //         debit: 0,
  //         credit: cogsTotal,
  //       });
  //     }

  //     // Validate journal balances
  //     const totalDebit = journalLines.reduce(
  //       (sum, line) => sum + line.debit,
  //       0,
  //     );
  //     const totalCredit = journalLines.reduce(
  //       (sum, line) => sum + line.credit,
  //       0,
  //     );

  //     if (totalDebit !== totalCredit) {
  //       throw new BadRequestException(
  //         `Journal entry does not balance. Debit: ${totalDebit}, Credit: ${totalCredit}`,
  //       );
  //     }

  //     // Create journal entry
  //     const journalRef = generateJournalReference('INV');
  //     await this.prisma.journal.create({
  //       data: {
  //         description: `Invoice ${invoiceData.invoiceNumber} posted`,
  //         date: new Date(),
  //         reference: journalRef,
  //         entityId: invoiceData.entityId,
  //         lines: journalLines,
  //       },
  //     });

  //     // Update account balances for all accounts in the journal entry
  //     // Debit increases balance, Credit decreases balance
  //     await Promise.all(
  //       journalLines.map((line) =>
  //         this.prisma.account.update({
  //           where: { id: line.accountId },
  //           data: {
  //             balance: {
  //               increment: line.debit - line.credit, // Debit = +, Credit = -
  //             },
  //           },
  //         }),
  //       ),
  //     );

  //     console.log(
  //       `Invoice ${invoiceData.invoiceNumber} posted to journal with reference ${journalRef}`,
  //     );
  //   } catch (error) {
  //     console.error(
  //       'Error posting invoice to journal:',
  //       error instanceof Error ? error.message : String(error),
  //     );
  //     throw error;
  //   }
  // }

  // async createInvoice(body: CreateInvoiceDto, entityId: string) {
  //   try {
  //     const invoiceNumber = generateRandomInvoiceNumber();
  //     const invoice = await this.prisma.invoice.create({
  //       data: {
  //         ...body,
  //         invoiceNumber,
  //         entityId,
  //       },
  //     });
  //     return invoice;
  //   } catch (error) {
  //     throw new HttpException(`${error instanceof Error ? error.message : String(error)}`, HttpStatus.CONFLICT);
  //   }
  // }

  async createInvoice(
    body: CreateInvoiceDto,
    entityId: string,
    performedBy: string,
    groupId: string,
  ) {
    try {
      const invoiceNumber = generateRandomInvoiceNumber({ prefix: 'INV' });

      // Extract items and status from body
      const { items, status = InvoiceStatus.Draft, ...invoiceData } = body;

      // Fetch item details to check for taxable items
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
                // costPrice: true,
                type: true,
                // trackInventory: true,
              },
            })
          : [];

      // Calculate item totals and invoice totals
      let subtotal = 0;
      let hasTaxableItems = false;
      const invoiceItemsData = (items || []).map((item) => {
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

      // Calculate tax only if there are taxable items
      const tax = hasTaxableItems ? Math.round(0.1 * subtotal) : 0; // 10% tax on taxable items
      const total = subtotal + tax;

      // Create invoice and items in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
          data: {
            ...invoiceData,
            invoiceNumber,
            entityId,
            groupId,
            subtotal,
            tax,
            total,
            status,
          },
          include: {
            customer: { select: { name: true, id: true } },
            invoiceItem: true,
            activities: true,
          },
        });

        // Log activity: Invoice Created
        await tx.invoiceActivity.create({
          data: {
            invoiceId: invoice.id,
            activityType: InvoiceActivityType.Created,
            description: `Invoice created with status: ${status}`,
            performedBy,
            metadata: { invoiceNumber, status },
            groupId,
          },
        });

        // Create invoice items
        const invoiceItems = await Promise.all(
          invoiceItemsData.map((item) =>
            tx.invoiceItem.create({
              data: {
                ...item,
                invoiceId: invoice.id,
              },
              include: { item: true },
            }),
          ),
        );

        // If status is Sent, mark as sent in the same transaction
        if (status === InvoiceStatus.Sent) {
          await tx.invoiceActivity.create({
            data: {
              invoiceId: invoice.id,
              activityType: InvoiceActivityType.Sent,
              description: 'Invoice sent',
              performedBy,
              metadata: { invoiceNumber },
              groupId,
            },
          });
        }

        return { ...invoice, invoiceItem: invoiceItems };
      });

      // Post to journal if status is Sent (AFTER transaction commits)
      if (status === InvoiceStatus.Sent) {
        try {
          // Queue the journal posting job instead of doing it synchronously
          await this.bullmqService.addJob('post-invoice-journal', {
            invoiceId: result.id,
            invoiceData: {
              invoiceNumber: result.invoiceNumber,
              entityId,
              groupId,
              subtotal,
              tax,
              total,
              items: invoiceItemsData,
            },
          });

          this.logger.log(
            `Queued journal posting job for invoice ${result.invoiceNumber}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue invoice journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          // Don't throw - invoice is already created, job will retry
        }
      }

      return result;
    } catch (error) {
      throw new HttpException(
        `Failed to create invoice: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.CONFLICT,
      );
    }
  }

  async getEntityInvoice(
    entityId: string,
    query: GetInvoicesQueryDto,
  ): Promise<any> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause: any = { entityId };
      if (query.status) {
        if (query.status === 'Sent' as any) {
          // Active means all invoices except Draft
          whereClause.status = { not: InvoiceStatus.Draft };
        } else {
          whereClause.status = query.status;
        }
      }

      if (query.customerId) {
        whereClause.customerId = query.customerId;
      }
      if (query.search) {
        whereClause.OR = [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          {
            customer: { name: { contains: query.search, mode: 'insensitive' } },
          },
        ];
      }

      // Fetch paginated invoices with ALL related data
      const invoices = await this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, id: true } },
          invoiceItem: {
            include: {
              item: true,
            },
          },
          paymentReceived: { select: { amount: true } },
        },
        skip,
        take: Number(limit),
        orderBy: { invoiceDate: 'desc' },
      });

      // Get total count for pagination
      const totalCount = await this.prisma.invoice.count({
        where: whereClause,
      });

      // Fetch stats for all statuses (regardless of filter)
      const [sentStats, paidStats, draftStats, overdueStats] =
        await Promise.all([
          this.getStatusStats(entityId, 'Sent'),
          this.getStatusStats(entityId, 'Paid'),
          this.getStatusStats(entityId, 'Draft'),
          this.getStatusStats(entityId, 'Overdue'),
        ]);

      const totalPages = Math.ceil(totalCount / limit);

      const enrichedInvoices = invoices.map(({ paymentReceived, ...inv }) => {
        const totalPaid = paymentReceived.reduce((s, p) => s + p.amount, 0);
        return { ...inv, outstandingBalance: inv.total - totalPaid };
      });

      return {
        invoices: enrichedInvoices,
        stats: {
          sent: sentStats,
          paid: paidStats,
          draft: draftStats,
          overdue: overdueStats,
        },
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async getStatusStats(entityId: string, status: InvoiceStatus) {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, status: status as any },
      select: { total: true },
    });

    const count = invoices.length;
    const total = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return { count, total };
  }

  async getPaidInvoices(
    entityId: string,
    query: GetPaidInvoicesQueryDto,
  ): Promise<GetPaidInvoicesResponseDto> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const whereClause: any = { entityId, status: 'Paid' };

      if (query.search) {
        whereClause.OR = [
          { invoiceNumber: { contains: query.search, mode: 'insensitive' } },
          {
            customer: { name: { contains: query.search, mode: 'insensitive' } },
          },
        ];
      }

      // Fetch paginated paid invoices
      const paidInvoices = await this.prisma.invoice.findMany({
        where: whereClause,
        include: {
          customer: { select: { name: true, id: true } },
          invoiceItem: {
            include: { item: true },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { invoiceDate: 'desc' },
      });

      // Get total count for pagination
      const totalCountFiltered = await this.prisma.invoice.count({
        where: whereClause,
      });

      // Get all paid invoices (without pagination) for stats calculation
      const allPaidInvoices = await this.prisma.invoice.findMany({
        where: { entityId, status: 'Paid' },
        select: { total: true, invoiceDate: true },
      });

      // Calculate total amount and count (all paid invoices)
      const totalPaidAmount = allPaidInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      );
      const totalPaidCount = allPaidInvoices.length;

      // Get current month stats
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth() + 1;
      const currentMonth = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;

      const monthStartDate = new Date(currentYear, currentMonthNum - 1, 1);
      const monthEndDate = new Date(
        currentYear,
        currentMonthNum,
        0,
        23,
        59,
        59,
      );

      const currentMonthInvoices = allPaidInvoices.filter((invoice) => {
        return (
          invoice.invoiceDate >= monthStartDate &&
          invoice.invoiceDate <= monthEndDate
        );
      });

      const currentMonthTotal = currentMonthInvoices.reduce(
        (sum, inv) => sum + inv.total,
        0,
      );
      const currentMonthCount = currentMonthInvoices.length;

      // Transform invoices for response
      const transformedInvoices = paidInvoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        customerId: invoice.customer.id,
        total: invoice.total,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
      }));

      const totalPages = Math.ceil(totalCountFiltered / limit);

      return {
        paidInvoices: transformedInvoices,
        totalPaidAmount,
        totalPaidCount,
        currentMonthStats: {
          month: currentMonth,
          total: currentMonthTotal,
          count: currentMonthCount,
        },
        currentMonth,
        totalCountFiltered,
        totalPages,
        currentPage: page,
        limit,
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getInvoiceById(invoiceId: string, entityId: string) {
    try {
      const invoice = await this.prisma.invoice.findFirst({
        where: { OR: [{ id: invoiceId }, { invoiceNumber: invoiceId }] },
        include: {
          customer: true,
          entity: true,
          invoiceItem: {
            include: { item: true },
          },
          paymentReceived: true,
          activities: {
            include: { user: { select: { id:true, firstName: true, lastName: true}} },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      if (invoice.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to access this invoice',
          HttpStatus.FORBIDDEN,
        );
      }

      return invoice;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateInvoice(
    invoiceId: string,
    entityId: string,
    groupId: string,
    body: UpdateInvoiceDto,
    performedBy: string,
  ) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { invoiceItem: { include: { item: true } } },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      if (invoice.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this invoice',
          HttpStatus.FORBIDDEN,
        );
      }

      // Check if invoice is Sent - prevent editing unless only changing status
      const newStatus = body.status || invoice.status;
      const statusChanged = newStatus !== invoice.status;

      if (invoice.status === InvoiceStatus.Sent && statusChanged === false) {
        // Trying to edit a Sent invoice without changing status
        throw new BadRequestException(
          'Cannot edit a sent invoice. Create a new invoice instead.',
        );
      }

      // Extract items and status from body
      const { items, status = invoice.status, ...invoiceData } = body;

      // For Draft invoices, allow editing. For Sent invoices, only allow status changes
      let subtotal = invoice.subtotal;
      let tax = invoice.tax;
      let total = invoice.total;
      let invoiceItemsData: any[] = [];
      let hasItems = false;

      if (items && items.length > 0) {
        if (status === InvoiceStatus.Sent) {
          throw new BadRequestException(
            'Cannot modify items on a sent invoice',
          );
        }

        // Fetch item details to check for taxable items
        const itemDetails = await this.prisma.items.findMany({
          where: {
            id: { in: items.map((i) => i.itemId) },
            entityId,
          },
          select: {
            id: true,
            isTaxable: true,
            // costPrice: true,
            type: true,
            // trackInventory: true,
          },
        });

        // Calculate new invoice items and totals
        subtotal = 0;
        let hasTaxableItems = false;
        invoiceItemsData = items.map((item) => {
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
        tax = hasTaxableItems ? Math.round(0.1 * subtotal) : 0;
        total = subtotal + tax;
        hasItems = true;
      }

      // Replace all invoice items and update invoice in a transaction
      const updatedInvoice = await this.prisma.$transaction(async (tx) => {
        // Delete and recreate items only if items were provided
        if (hasItems) {
          await tx.invoiceItem.deleteMany({ where: { invoiceId } });

          await Promise.all(
            invoiceItemsData.map((item) =>
              tx.invoiceItem.create({
                data: {
                  ...item,
                  invoiceId,
                },
              }),
            ),
          );
        }

        // Update invoice
        const updated = await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            ...invoiceData,
            status,
            subtotal,
            tax,
            total,
          },
          include: {
            customer: { select: { name: true, id: true } },
            invoiceItem: { include: { item: true } },
            activities: { orderBy: { createdAt: 'desc' } },
          },
        });

        // Log activity: Invoice Updated
        const activityDesc = statusChanged
          ? `Invoice status changed from ${invoice.status} to ${status}`
          : 'Invoice updated';

        await tx.invoiceActivity.create({
          data: {
            invoiceId,
            activityType: statusChanged
              ? InvoiceActivityType.Updated
              : InvoiceActivityType.Updated,
            description: activityDesc,
            performedBy,
            metadata: { previousStatus: invoice.status, newStatus: status },
            groupId: invoice.groupId,
          },
        });

        return updated;
      });

      // Post to journal if transitioning to Sent
      if (
        invoice.status !== InvoiceStatus.Sent &&
        status === InvoiceStatus.Sent
      ) {
        try {
          const itemsForPosting = hasItems
            ? invoiceItemsData
            : invoice.invoiceItem.map((ii) => ({
                itemId: ii.itemId,
                quantity: ii.quantity,
                rate: ii.rate,
                total: ii.total,
              }));

          // Queue the journal posting job
          await this.bullmqService.addJob('post-invoice-journal', {
            invoiceId,
            invoiceData: {
              invoiceNumber: invoice.invoiceNumber,
              entityId,
              groupId,
              subtotal: hasItems ? subtotal : invoice.subtotal,
              tax: hasItems ? tax : invoice.tax,
              total: hasItems ? total : invoice.total,
              items: itemsForPosting,
            },
          });

          this.logger.log(
            `Queued journal posting job for invoice ${invoice.invoiceNumber}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue invoice journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          // Don't throw - invoice is already updated, job will retry
        }
      }

      return updatedInvoice;
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new HttpException(
        `Failed to update invoice: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteInvoice(
    invoiceId: string,
    entityId: string,
    performedBy: string,
  ) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      if (invoice.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to delete this invoice',
          HttpStatus.FORBIDDEN,
        );
      }

      // Delete invoice and its items in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete invoice items first
        await tx.invoiceItem.deleteMany({
          where: { invoiceId },
        });

        // Delete invoice
        await tx.invoice.delete({
          where: { id: invoiceId },
        });
      });

      // Log activity: Invoice Cancelled
      await this.logInvoiceCancelled(invoiceId, 'Invoice deleted', performedBy);

      return { success: true };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Log invoice sent activity
   */
  async logInvoiceSent(invoiceId: string, sentTo: string, performedBy: string) {
    return this.logActivity(
      invoiceId,
      InvoiceActivityType.Sent,
      `Invoice sent to customer${sentTo ? ` (${sentTo})` : ''}`,
      performedBy,
      { sentTo },
    );
  }

  /**
   * Log payment received activity
   */
  async logPaymentReceived(
    invoiceId: string,
    amount: number,
    reference: string,
    performedBy: string,
  ) {
    return this.logActivity(
      invoiceId,
      InvoiceActivityType.PaymentReceived,
      `Payment received - ${amount}`,
      performedBy,
      { amount, reference },
    );
  }

  /**
   * Log invoice viewed activity
   */
  async logInvoiceViewed(invoiceId: string, viewedBy: string) {
    return this.logActivity(
      invoiceId,
      InvoiceActivityType.Viewed,
      'Invoice viewed',
      viewedBy,
    );
  }

  /**
   * Log invoice updated activity
   */
  async logInvoiceUpdated(
    invoiceId: string,
    changes: any,
    performedBy: string,
  ) {
    return this.logActivity(
      invoiceId,
      InvoiceActivityType.Updated,
      'Invoice updated',
      performedBy,
      { changes },
    );
  }

  /**
   * Log invoice overdue activity
   */
  // async logInvoiceOverdue(invoiceId: string) {
  //   return this.logActivity(
  //     invoiceId,
  //     InvoiceActivityType.Overdue,
  //     'Invoice marked as overdue',
  //   );
  // }

  /**
   * Log invoice cancelled activity
   */
  async logInvoiceCancelled(
    invoiceId: string,
    performedBy: string,
    reason?: string,
  ) {
    return this.logActivity(
      invoiceId,
      InvoiceActivityType.Cancelled,
      `Invoice cancelled${reason ? ` - ${reason}` : ''}`,
      performedBy,
      { reason },
    );
  }

  /**
   * Get invoice analytics (Aging & Revenue)
   */
  async getInvoiceAnalytics(entityId: string) {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      sixMonthsAgo.setDate(1); // Start of the month 6 months ago

      // 1. Calculate Accounts Receivable Aging
      // Fetch all unpaid invoices (Sent, Overdue)
      const unpaidInvoices = await this.prisma.invoice.findMany({
        where: {
          entityId,
          status: { in: ['Sent', 'Overdue'] },
        },
        select: {
          total: true,
          invoiceDate: true,
          status: true,
        },
      });

      const aging = {
        '0-30': 0,
        '31-60': 0,
        '61-90': 0,
        '90+': 0,
      };

      unpaidInvoices.forEach((invoice) => {
        const ageInMs = now.getTime() - new Date(invoice.invoiceDate).getTime();
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

      // 2. Calculate Monthly Invoice Revenue
      // Fetch paid invoices from the last 6 months
      const paidInvoices = await this.prisma.invoice.findMany({
        where: {
          entityId,
          status: 'Paid',
          invoiceDate: { gte: sixMonthsAgo },
        },
        select: {
          total: true,
          invoiceDate: true,
        },
        orderBy: {
          invoiceDate: 'asc',
        },
      });

      const revenueByMonth: Record<string, number> = {};
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];

      paidInvoices.forEach((invoice) => {
        const month = monthNames[new Date(invoice.invoiceDate).getMonth()];
        if (!revenueByMonth[month]) {
          revenueByMonth[month] = 0;
        }
        revenueByMonth[month] += invoice.total;
      });

      // Format revenue for frontend graph (Array of { month, amount })
      // We want strictly the last 6 months in chronological order
      const monthlyRevenue = [] as any;
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = monthNames[d.getMonth()];
        monthlyRevenue.push({
          month: monthName,
          revenue: revenueByMonth[monthName] || 0,
        });
      }

      return {
        aging: aging || {},
        monthlyRevenue: monthlyRevenue || [],
      };
    } catch (error) {
      throw new HttpException(
        `${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Update invoice status with automatic posting to journal if transitioning to Sent
   */
  async updateInvoiceStatus(
    invoiceId: string,
    entityId: string,
    groupId: string,
    newStatus: InvoiceStatus,
    performedBy: string,
  ) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          invoiceItem: { include: { item: true } },
        },
      });

      if (!invoice) {
        throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);
      }

      if (invoice.entityId !== entityId) {
        throw new HttpException(
          'You do not have permission to update this invoice',
          HttpStatus.FORBIDDEN,
        );
      }

      // Prevent status downgrade (e.g., Sent -> Draft)
      const statusPriority: Record<InvoiceStatus, number> = {
        [InvoiceStatus.Draft]: 1,
        [InvoiceStatus.Sent]: 2,
        [InvoiceStatus.Paid]: 3,
        [InvoiceStatus.Partial]: 2,
        [InvoiceStatus.Overdue]: 3,
      };

      if (statusPriority[newStatus] < statusPriority[invoice.status]) {
        throw new BadRequestException(
          `Cannot downgrade invoice status from ${invoice.status} to ${newStatus}`,
        );
      }

      // If status hasn't changed, return current invoice
      if (invoice.status === newStatus) {
        return invoice;
      }

      // Update status
      const updated = await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
        include: {
          customer: { select: { name: true, id: true } },
          invoiceItem: { include: { item: true } },
          activities: { orderBy: { createdAt: 'desc' } },
        },
      });

      // Log activity
      await this.logActivity(
        invoiceId,
        newStatus === InvoiceStatus.Sent
          ? InvoiceActivityType.Sent
          : InvoiceActivityType.Updated,
        `Invoice status changed from ${invoice.status} to ${newStatus}`,
        performedBy,
        { previousStatus: invoice.status, newStatus },
      );

      // Post to journal if transitioning to Sent
      if (
        invoice.status !== InvoiceStatus.Sent &&
        newStatus === InvoiceStatus.Sent
      ) {
        try {
          const itemsForPosting = invoice.invoiceItem.map((ii) => ({
            itemId: ii.itemId,
            quantity: ii.quantity,
            rate: ii.rate,
            total: ii.total,
          }));

          // Queue the journal posting job via BullMQ (async)
          await this.bullmqService.addJob('post-invoice-journal', {
            invoiceId,
            invoiceData: {
              invoiceNumber: invoice.invoiceNumber,
              entityId,
              groupId,
              subtotal: invoice.subtotal,
              tax: invoice.tax,
              total: invoice.total,
              items: itemsForPosting,
            },
          });

          this.logger.log(
            `Queued journal posting job for invoice ${invoice.invoiceNumber}`,
          );
        } catch (queueError) {
          this.logger.error(
            `Failed to queue invoice journal posting: ${queueError instanceof Error ? queueError.message : String(queueError)}`,
          );
          // Don't throw - invoice status is already updated, job will retry
        }
      }

      return updated;
    } catch (error) {
      if (
        error instanceof HttpException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new HttpException(
        `Failed to update invoice status: ${error instanceof Error ? error.message : String(error)}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Cron job to update invoices to Overdue status if due date has passed
   * Runs daily at 2:00 AM
   */
  @Cron('0 2 * * *') // 2:00 AM daily
  async updateOverdueInvoices() {
    try {
      this.logger.debug('Running cron job: updateOverdueInvoices');

      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset to start of day for comparison

      // Find all invoices that should be marked as Overdue
      // Conditions: dueDate < today AND (status is Sent OR Partial)
      const overdueInvoices = await this.prisma.invoice.updateMany({
        where: {
          dueDate: { lt: today },
          status: { in: ['Sent', 'Partial'] },
        },
        data: {
          status: 'Overdue',
        },
      });

      if (overdueInvoices.count > 0) {
        this.logger.log(
          `Updated ${overdueInvoices.count} invoice(s) to Overdue status`,
        );
      } else {
        this.logger.debug('No invoices to mark as Overdue');
      }

      return overdueInvoices;
    } catch (error) {
      this.logger.error(
        `Error in updateOverdueInvoices cron job: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't throw - cron jobs should fail gracefully
    }
  }
}
