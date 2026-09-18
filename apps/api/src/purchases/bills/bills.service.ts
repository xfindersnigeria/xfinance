import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { FileuploadService } from '@/fileupload/fileupload.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { CreateBillDto } from './dto/bill.dto';
import { GetBillsQueryDto } from './dto/get-bills-query.dto';
import { GetBillsResponseDto } from './dto/get-bills-response.dto';
import { BillStatus } from 'prisma/generated/enums';
import { generateBillReference, generateJournalReference } from '@/auth/utils/helper';
import { CacheService } from '@/cache/cache.service';
import { getEntityTaxSettings, resolveDocumentTax } from '@/sales/sales-tax.util';
import { resolveBillVendor, withBillParty } from '@/sales/party.util';

@Injectable()
export class BillsService {
  private readonly logger = new Logger(BillsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fileuploadService: FileuploadService,
    private readonly bullmqService: BullmqService,
    private readonly cacheService: CacheService,
  ) {}

  private static num(v: unknown): number | undefined {
    if (v === undefined || v === null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  /**
   * Discount, tax and total for a bill. Tax is a rate (%) on (subtotal −
   * discount): the one picked on the bill, else the bill's existing rate, else
   * the entity default (Settings → Tax). `tax` is the legacy field the bill form
   * sent that percentage in. A reverse-charge bill (only when Reverse Charge VAT
   * is on) records its tax but doesn't add it to what is owed to the vendor.
   */
  private async computeBillTotals(
    entityId: string,
    subtotal: number,
    input: any,
    existing?: { discount: number; taxRate: number; taxName: string | null; reverseCharge: boolean },
  ) {
    const settings = await getEntityTaxSettings(this.prisma, entityId);
    const discount = Math.max(
      0,
      Math.round(BillsService.num(input.discount) ?? existing?.discount ?? 0),
    );

    const requested = BillsService.num(input.taxRate) ?? BillsService.num(input.tax);
    let taxRate: number;
    let taxName: string | null;
    if (requested !== undefined) {
      taxRate = requested;
      taxName = (typeof input.taxName === 'string' && input.taxName.trim()) || null;
    } else if (existing) {
      taxRate = existing.taxRate;
      taxName = existing.taxName;
    } else {
      const def = await resolveDocumentTax(this.prisma, entityId, {});
      taxRate = def.rate;
      taxName = def.name;
    }
    if (taxRate < 0 || taxRate > 100) {
      throw new BadRequestException('Tax rate must be between 0 and 100');
    }

    const reverseRequested =
      input.reverseCharge === undefined
        ? (existing?.reverseCharge ?? false)
        : input.reverseCharge === true || input.reverseCharge === 'true';
    const reverseCharge = settings.reverseChargeVat && reverseRequested;

    const taxBase = Math.max(0, subtotal - discount);
    const tax = Math.round((taxBase * taxRate) / 100);
    const total = taxBase + (reverseCharge ? 0 : tax);
    return { discount, tax, taxRate, taxName, reverseCharge, total };
  }

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

    const {
      items,
      status = 'draft',
      vendorId,
      vendorName,
      tax: _legacyTax,
      taxRate: _taxRate,
      taxName: _taxName,
      reverseCharge: _reverseCharge,
      discount: _discount,
      ...billData
    } = body as any;

    // A saved vendor, or a typed-in name
    const party = await resolveBillVendor(this.prisma, entityId, { vendorId, vendorName });

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

    // Discount, tax (rate on subtotal − discount) and total
    const totals = await this.computeBillTotals(entityId, subtotal, body);
    const { projectId, milestoneId, ...restBillData } = billData;
    // Create bill with JSON items (items now include expenseAccountId)
    const created = await this.prisma.bills.create({
      data: {
        ...restBillData,
        ...party,
        projectId: projectId || undefined,
        milestoneId: milestoneId || undefined,
        status: billStatus,
        billNumber,
        accountsPayableId: billData.accountsPayableId ?? undefined,
        entityId,
        groupId: groupId ?? '',
        subtotal,
        tax: totals.tax,
        taxRate: totals.taxRate,
        taxName: totals.taxName,
        reverseCharge: totals.reverseCharge,
        discount: totals.discount,
        total: totals.total,
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
    const bill = withBillParty(created);

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
            tax: bill.reverseCharge ? 0 : bill.tax, // reverse charge: tax is self-accounted, not owed to the vendor
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

    await this.cacheService.invalidateEntityDashboardCache(entityId);
    return bill;
  }

  async getBills(
    entityId: string,
    query: GetBillsQueryDto,
  ): Promise<GetBillsResponseDto & any> {
    const { page = 1, limit = 10, search, vendorId } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      entityId,
      // Previously accepted from the client but ignored — every vendor's bills came back
      ...(vendorId ? { vendorId: vendorId === 'none' ? null : vendorId } : {}),
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
        { vendorName: { contains: search, mode: 'insensitive' } },
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
          paymentsMade: {
            select: { amount: true },
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
    const transformedBills = bills.map((b) => {
      const paidAmount = b.paymentsMade.reduce((sum, p) => sum + p.amount, 0);
      const { paymentsMade: _, ...rest } = withBillParty(b) as any;
      return {
        ...rest,
        billNumber: b.billNumber ?? undefined,
        poNumber: b.poNumber ?? undefined,
        notes: b.notes ?? undefined,
        attachment:
          b.attachment === null
            ? undefined
            : (b.attachment as Record<string, any>),
        items: (b.items as any[]) || [],
        createdAt:
          b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
        postedAt: b.postedAt instanceof Date
          ? b.postedAt.toISOString()
          : b.postedAt,
        paidAmount,
        outstandingBalance: Math.max(0, b.total - paidAmount),
      };
    });

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
      ...withBillParty(bill),
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

      const {
        items: rawItems,
        vendorId,
        vendorName,
        tax: _legacyTax,
        taxRate: _taxRate,
        taxName: _taxName,
        reverseCharge: _reverseCharge,
        discount: _discount,
        removeItemIds: _removeItemIds,
        ...billData
      } = body;

      // Vendor change: switch between a saved vendor and a typed-in name
      const party =
        vendorId !== undefined || vendorName !== undefined
          ? await resolveBillVendor(this.prisma, entityId, { vendorId, vendorName })
          : {};

      // Items arrive as a JSON string on multipart requests; keep the
      // existing lines when none are sent
      const items =
        rawItems === undefined
          ? (bill.items as any[]) || []
          : typeof rawItems === 'string'
            ? JSON.parse(rawItems)
            : rawItems;

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

      const totals = await this.computeBillTotals(entityId, subtotal, body, bill);

      // Update bill with new JSON items (including expenseAccountId)
      await this.prisma.bills.update({
        where: { id: billId },
        data: {
          ...billData,
          ...party,
          subtotal,
          tax: totals.tax,
          taxRate: totals.taxRate,
          taxName: totals.taxName,
          reverseCharge: totals.reverseCharge,
          discount: totals.discount,
          total: totals.total,
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
                tax: updatedBill.reverseCharge ? 0 : updatedBill.tax,
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

      await this.cacheService.invalidateEntityDashboardCache(entityId);
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
            tax: bill.reverseCharge ? 0 : bill.tax, // reverse charge: tax is self-accounted, not owed to the vendor
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

      await this.cacheService.invalidateEntityDashboardCache(entityId);
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

      await this.cacheService.invalidateEntityDashboardCache(entityId);
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
            tax: bill.reverseCharge ? 0 : bill.tax, // reverse charge: tax is self-accounted, not owed to the vendor
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