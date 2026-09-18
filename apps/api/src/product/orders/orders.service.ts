import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { BullmqService } from '@/bullmq/bullmq.service';
import { CacheService } from '@/cache/cache.service';
import { DocumentEmailService } from '@/email/document-email.service';
import { EntityMailerService } from '@/email/entity-mailer.service';
import { renderEmailHtml } from '@/email/email-templates';
import { generateRandomInvoiceNumber } from '@/auth/utils/helper';
import { computeDocumentTotals, resolveDocumentTax, ResolvedTax } from '@/sales/sales-tax.util';
import { OrderSource, PaymentMethod, Prisma } from 'prisma/generated/client';
import {
  CancelOrderDto,
  CompleteOrderDto,
  GetOrdersQueryDto,
  OrderLineDto,
  PosCheckoutDto,
  PublicOrderDto,
  UpdateStoreSettingsDto,
} from './dto/orders.dto';

interface PricedLine {
  storeItemId: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  taxable: boolean;
  trackInventory: boolean;
  costPrice: number | null;
}

const ORDER_INCLUDE = {
  items: true,
  customer: { select: { id: true, name: true, email: true, phoneNumber: true } },
  receipt: { select: { id: true, receiptNumber: true, postingStatus: true, journalReference: true } },
} satisfies Prisma.OrderInclude;

/**
 * Orders from the POS (Quick Sale) and the public online store.
 *
 * Money and stock follow one path, `fulfil()`, used when a POS sale is
 * charged and when an online order is marked paid:
 *   1. stock is taken from each tracked product (guarded decrement — a sale
 *      can never take stock below zero, even with two tills selling the last
 *      unit at once) and an InventoryMovement is recorded;
 *   2. a Completed income receipt is created with the order's lines;
 *   3. after commit, the receipt is posted to the ledger by the existing
 *      receipt posting job: Dr cash/bank, Cr product/service revenue, Cr VAT,
 *      and Dr Cost of Goods Sold / Cr Inventory at the items' cost price.
 * Online orders wait as Pending (no stock taken, nothing posted) until the
 * business has been paid and completes them — or cancels them.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bullmqService: BullmqService,
    private readonly cacheService: CacheService,
    private readonly documentEmail: DocumentEmailService,
    private readonly mailer: EntityMailerService,
  ) {}

  private rethrow(e: unknown): never {
    if (e instanceof HttpException) throw e;
    throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
  }

  // ─── Pricing ─────────────────────────────────────────────────────────────────

  /** Price the lines from the catalog (never from the client) and check stock. */
  private async priceLines(
    entityId: string,
    lines: OrderLineDto[],
    opts: { onlineOnly?: boolean } = {},
  ): Promise<PricedLine[]> {
    // Merge repeated items so stock checks see the full quantity
    const qty = new Map<string, number>();
    for (const l of lines) qty.set(l.storeItemId, (qty.get(l.storeItemId) ?? 0) + l.quantity);

    const items = await this.prisma.storeItems.findMany({
      where: { id: { in: [...qty.keys()] }, entityId },
    });
    return [...qty.entries()].map(([id, quantity]) => {
      const item = items.find((i) => i.id === id);
      if (!item || (opts.onlineOnly && !item.sellOnline)) {
        throw new HttpException('One or more items are no longer available', HttpStatus.BAD_REQUEST);
      }
      const trackInventory = item.type === 'product' && item.trackInventory;
      if (trackInventory && (item.currentStock ?? 0) < quantity) {
        throw new HttpException(
          `Not enough stock for ${item.name} (${item.currentStock ?? 0} left)`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const rate = item.sellingPrice ?? item.rate ?? 0;
      return {
        storeItemId: item.id,
        name: item.name,
        quantity,
        rate,
        total: rate * quantity,
        taxable: item.taxable,
        trackInventory,
        costPrice: item.costPrice ?? null,
      };
    });
  }

  private totals(lines: PricedLine[], tax: ResolvedTax) {
    return computeDocumentTotals(lines, tax.rate, tax.inclusive);
  }

  private async nextOrderNumber(entityId: string, source: OrderSource): Promise<string> {
    const prefix = source === 'POS' ? 'ORD' : 'WEB';
    const year = new Date().getFullYear();
    const last = await this.prisma.order.findFirst({
      where: { entityId, orderNumber: { startsWith: `${prefix}-${year}-` } },
      orderBy: { createdAt: 'desc' },
      select: { orderNumber: true },
    });
    const seq = last ? parseInt(last.orderNumber.split('-')[2], 10) + 1 : 1;
    return `${prefix}-${year}-${String(Number.isFinite(seq) ? seq : 1).padStart(4, '0')}`;
  }

  /** Create an order with a fresh number, retrying if two tills race for the same one */
  private async withOrderNumber<T>(entityId: string, source: OrderSource, fn: (n: string) => Promise<T>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNumber = await this.nextOrderNumber(entityId, source);
      try {
        return await fn(orderNumber);
      } catch (e) {
        const target = String((e as any)?.meta?.target ?? '');
        if ((e as any)?.code === 'P2002' && target.includes('orderNumber')) continue;
        throw e;
      }
    }
    throw new HttpException('Could not allocate an order number, please retry', HttpStatus.CONFLICT);
  }

  private async assertDepositAccount(entityId: string, accountId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, entityId },
      select: { id: true },
    });
    if (!account) throw new HttpException('Deposit account not found', HttpStatus.BAD_REQUEST);
  }

  // ─── Fulfilment (stock + receipt) ────────────────────────────────────────────

  private async fulfil(
    tx: Prisma.TransactionClient,
    p: {
      entityId: string;
      groupId: string;
      orderNumber: string;
      lines: PricedLine[];
      customerId: string | null;
      customerName: string | null;
      paymentMethod: PaymentMethod;
      depositTo: string;
      tax: ResolvedTax;
      totals: { subtotal: number; tax: number; total: number };
    },
  ) {
    for (const line of p.lines) {
      if (!line.trackInventory) continue;
      const taken = await tx.storeItems.updateMany({
        where: { id: line.storeItemId, entityId: p.entityId, currentStock: { gte: line.quantity } },
        data: { currentStock: { decrement: line.quantity } },
      });
      if (taken.count === 0) {
        throw new HttpException(`Not enough stock for ${line.name}`, HttpStatus.BAD_REQUEST);
      }
      const after = await tx.storeItems.findUnique({
        where: { id: line.storeItemId },
        select: { currentStock: true },
      });
      const newStock = after?.currentStock ?? 0;
      await tx.inventoryMovement.create({
        data: {
          itemId: line.storeItemId,
          type: 'remove',
          quantity: line.quantity,
          previousStock: newStock + line.quantity,
          newStock,
          reason: `Sale ${p.orderNumber}`,
          entityId: p.entityId,
          groupId: p.groupId,
        },
      });
    }

    return tx.receipt.create({
      data: {
        receiptNumber: generateRandomInvoiceNumber({ prefix: 'RCT' }),
        date: new Date(),
        entityId: p.entityId,
        groupId: p.groupId,
        customerId: p.customerId,
        customerName: p.customerId ? null : p.customerName,
        paymentMethod: p.paymentMethod,
        depositTo: p.depositTo,
        status: 'Completed',
        subtotal: p.totals.subtotal,
        tax: p.totals.tax,
        taxRate: p.tax.rate,
        taxName: p.tax.name,
        taxInclusive: p.tax.inclusive,
        total: p.totals.total,
        receiptItem: {
          create: p.lines.map((l) => ({
            storeItemId: l.storeItemId,
            itemName: l.name,
            costPrice: l.costPrice,
            quantity: l.quantity,
            rate: l.rate,
            total: l.total,
          })),
        },
      },
      include: { receiptItem: true },
    });
  }

  /** After commit: post the receipt to the ledger, refresh dashboards, email the receipt */
  private async afterFulfil(
    receipt: { id: string; receiptNumber: string; subtotal: number; tax: number; total: number; depositTo: string; receiptItem: any[] },
    entityId: string,
    groupId: string,
    emailTo?: string | null,
  ) {
    try {
      await this.bullmqService.addJob('post-receipt-journal', {
        receiptId: receipt.id,
        receiptData: {
          receiptNumber: receipt.receiptNumber,
          entityId,
          groupId,
          subtotal: receipt.subtotal,
          tax: receipt.tax,
          total: receipt.total,
          depositTo: receipt.depositTo,
          items: receipt.receiptItem.map((ri) => ({
            itemId: null,
            storeItemId: ri.storeItemId,
            costPrice: ri.costPrice,
            quantity: ri.quantity,
            rate: ri.rate,
            total: ri.total,
          })),
        },
      });
    } catch (e) {
      // The receipt shows postingStatus Pending; it can be re-posted from income receipts
      this.logger.error(`Failed to queue posting for ${receipt.receiptNumber}: ${e instanceof Error ? e.message : e}`);
    }
    await this.cacheService.invalidateEntityDashboardCache(entityId);
    void this.documentEmail.autoSendReceipt(receipt.id, entityId, emailTo);
  }

  // ─── POS ─────────────────────────────────────────────────────────────────────

  async posCheckout(entityId: string, groupId: string, userId: string | null, dto: PosCheckoutDto) {
    try {
      await this.assertDepositAccount(entityId, dto.depositTo);
      let customerId: string | null = null;
      let customerName: string | null = dto.customerName?.trim() || null;
      let customerEmail: string | null = dto.customerEmail?.trim() || null;
      if (dto.customerId) {
        const customer = await this.prisma.customer.findFirst({
          where: { id: dto.customerId, entityId },
          select: { id: true, name: true, email: true },
        });
        if (!customer) throw new HttpException('Customer not found', HttpStatus.BAD_REQUEST);
        customerId = customer.id;
        customerName = customer.name;
        customerEmail = customerEmail || customer.email;
      }

      const lines = await this.priceLines(entityId, dto.items);
      const tax = await resolveDocumentTax(this.prisma, entityId, {
        taxRate: dto.taxRate,
        taxName: dto.taxName,
      });
      const totals = this.totals(lines, tax);

      const { order, receipt } = await this.withOrderNumber(entityId, 'POS', (orderNumber) =>
        this.prisma.$transaction(async (tx) => {
          const receipt = await this.fulfil(tx, {
            entityId,
            groupId,
            orderNumber,
            lines,
            customerId,
            customerName: customerName || 'Walk-in customer',
            paymentMethod: dto.paymentMethod,
            depositTo: dto.depositTo,
            tax,
            totals,
          });
          const order = await tx.order.create({
            data: {
              orderNumber,
              source: 'POS',
              status: 'Completed',
              customerId,
              customerName: customerId ? null : customerName,
              customerEmail,
              notes: dto.notes,
              subtotal: totals.subtotal,
              tax: totals.tax,
              taxRate: tax.rate,
              taxName: tax.name,
              taxInclusive: tax.inclusive,
              total: totals.total,
              paymentMethod: dto.paymentMethod,
              receiptId: receipt.id,
              completedAt: new Date(),
              createdById: userId,
              entityId,
              groupId,
              items: {
                create: lines.map((l) => ({
                  storeItemId: l.storeItemId,
                  name: l.name,
                  quantity: l.quantity,
                  rate: l.rate,
                  total: l.total,
                  groupId,
                })),
              },
            },
            include: ORDER_INCLUDE,
          });
          return { order, receipt };
        }),
      );

      await this.afterFulfil(receipt, entityId, groupId, customerEmail);
      return { data: this.present(order), message: `Sale ${order.orderNumber} completed`, statusCode: 201 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  // ─── Admin: list / view / complete / cancel ──────────────────────────────────

  private present(order: any) {
    return {
      ...order,
      customerName: order.customer?.name ?? order.customerName ?? 'Walk-in customer',
      customerEmail: order.customerEmail ?? order.customer?.email ?? null,
      itemCount: (order.items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
    };
  }

  async list(entityId: string, q: GetOrdersQueryDto) {
    try {
      // Query params arrive as strings (the global ValidationPipe doesn't transform)
      const page = Math.max(1, Number(q.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
      const where: Prisma.OrderWhereInput = { entityId };
      if (q.source) where.source = q.source;
      if (q.status) where.status = q.status;
      if (q.search?.trim()) {
        const s = q.search.trim();
        where.OR = [
          { orderNumber: { contains: s, mode: 'insensitive' } },
          { customerName: { contains: s, mode: 'insensitive' } },
          { customerEmail: { contains: s, mode: 'insensitive' } },
          { customer: { name: { contains: s, mode: 'insensitive' } } },
        ];
      }

      const [orders, total, stats] = await Promise.all([
        this.prisma.order.findMany({
          where,
          include: ORDER_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.order.count({ where }),
        this.stats(entityId),
      ]);

      return {
        data: {
          orders: orders.map((o) => this.present(o)),
          stats,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
        message: 'Orders fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  /** Today's figures vs yesterday for the Orders page cards */
  private async stats(entityId: string) {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday.getTime() - 86_400_000);

    const [completedToday, completedYesterday, ordersToday, pending] = await Promise.all([
      this.prisma.order.aggregate({
        where: { entityId, status: 'Completed', completedAt: { gte: startToday } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.aggregate({
        where: { entityId, status: 'Completed', completedAt: { gte: startYesterday, lt: startToday } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.order.count({ where: { entityId, createdAt: { gte: startToday } } }),
      this.prisma.order.count({ where: { entityId, status: 'Pending' } }),
    ]);

    const salesToday = completedToday._sum.total ?? 0;
    const salesYesterday = completedYesterday._sum.total ?? 0;
    const avgToday = completedToday._count ? Math.round(salesToday / completedToday._count) : 0;
    const avgYesterday = completedYesterday._count ? Math.round(salesYesterday / completedYesterday._count) : 0;
    const change = (now: number, before: number) =>
      before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null;

    return {
      salesToday,
      salesChange: change(salesToday, salesYesterday),
      ordersToday,
      completedToday: completedToday._count,
      pendingOrders: pending,
      avgOrderValue: avgToday,
      avgOrderChange: change(avgToday, avgYesterday),
    };
  }

  async get(id: string, entityId: string) {
    try {
      const order = await this.prisma.order.findFirst({ where: { id, entityId }, include: ORDER_INCLUDE });
      if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      return { data: this.present(order), message: 'Order fetched', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async complete(id: string, entityId: string, groupId: string, dto: CompleteOrderDto) {
    try {
      const order = await this.prisma.order.findFirst({ where: { id, entityId }, include: { items: true } });
      if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
      if (order.status !== 'Pending') {
        throw new HttpException(`This order is already ${order.status.toLowerCase()}`, HttpStatus.BAD_REQUEST);
      }
      await this.assertDepositAccount(entityId, dto.depositTo);

      // Charge what the customer was quoted; re-check stock and flags now
      const catalog = await this.prisma.storeItems.findMany({
        where: { id: { in: order.items.map((i) => i.storeItemId).filter((x): x is string => !!x) } },
        select: { id: true, type: true, trackInventory: true, costPrice: true, currentStock: true, name: true },
      });
      const lines: PricedLine[] = order.items.map((i) => {
        const item = catalog.find((c) => c.id === i.storeItemId);
        if (!item) throw new HttpException(`${i.name} no longer exists in the catalog`, HttpStatus.BAD_REQUEST);
        const trackInventory = item.type === 'product' && item.trackInventory;
        if (trackInventory && (item.currentStock ?? 0) < i.quantity) {
          throw new HttpException(
            `Not enough stock for ${item.name} (${item.currentStock ?? 0} left)`,
            HttpStatus.BAD_REQUEST,
          );
        }
        return {
          storeItemId: item.id,
          name: i.name,
          quantity: i.quantity,
          rate: i.rate,
          total: i.total,
          taxable: true,
          trackInventory,
          costPrice: item.costPrice ?? null,
        };
      });
      const tax: ResolvedTax = { rate: order.taxRate, name: order.taxName, inclusive: order.taxInclusive };

      const { updated, receipt } = await this.prisma.$transaction(async (tx) => {
        // Claim the order first so a double click can't complete it twice
        const claimed = await tx.order.updateMany({
          where: { id, status: 'Pending' },
          data: { status: 'Completed', completedAt: new Date(), paymentMethod: dto.paymentMethod },
        });
        if (claimed.count === 0) throw new HttpException('This order was already processed', HttpStatus.CONFLICT);
        const receipt = await this.fulfil(tx, {
          entityId,
          groupId,
          orderNumber: order.orderNumber,
          lines,
          customerId: order.customerId,
          customerName: order.customerName,
          paymentMethod: dto.paymentMethod,
          depositTo: dto.depositTo,
          tax,
          totals: { subtotal: order.subtotal, tax: order.tax, total: order.total },
        });
        const updated = await tx.order.update({
          where: { id },
          data: { receiptId: receipt.id },
          include: ORDER_INCLUDE,
        });
        return { updated, receipt };
      });

      await this.afterFulfil(receipt, entityId, groupId, order.customerEmail);
      return { data: this.present(updated), message: `Order ${order.orderNumber} completed`, statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async cancel(id: string, entityId: string, dto: CancelOrderDto) {
    try {
      const cancelled = await this.prisma.order.updateMany({
        where: { id, entityId, status: 'Pending' },
        data: { status: 'Cancelled', cancelledAt: new Date(), cancelReason: dto.reason?.trim() || null },
      });
      if (cancelled.count === 0) {
        throw new HttpException('Only pending orders can be cancelled', HttpStatus.BAD_REQUEST);
      }
      return this.get(id, entityId).then((r) => ({ ...r, message: 'Order cancelled' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  // ─── Online store settings ───────────────────────────────────────────────────

  private slugify(name: string) {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 50) || 'store'
    );
  }

  private async uniqueSlug(base: string, entityId: string) {
    for (let i = 0; i < 50; i++) {
      const candidate = i === 0 ? base : `${base}-${i + 1}`;
      const taken = await this.prisma.entity.findFirst({
        where: { storeSlug: candidate, NOT: { id: entityId } },
        select: { id: true },
      });
      if (!taken) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }

  async getStoreSettings(entityId: string) {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { storeSlug: true, onlineStoreEnabled: true, name: true },
      });
      if (!entity) throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
      const onlineItems = await this.prisma.storeItems.count({ where: { entityId, sellOnline: true } });
      return {
        data: {
          enabled: entity.onlineStoreEnabled,
          slug: entity.storeSlug,
          suggestedSlug: entity.storeSlug ?? this.slugify(entity.name),
          path: entity.storeSlug ? `/store/${entity.storeSlug}` : null,
          onlineItems,
        },
        message: 'Store settings fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async updateStoreSettings(entityId: string, dto: UpdateStoreSettingsDto) {
    try {
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        select: { storeSlug: true, name: true },
      });
      if (!entity) throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
      let slug = dto.slug ?? entity.storeSlug;
      if (dto.slug && dto.slug !== entity.storeSlug) {
        const taken = await this.prisma.entity.findFirst({
          where: { storeSlug: dto.slug, NOT: { id: entityId } },
          select: { id: true },
        });
        if (taken) throw new HttpException('That store link is already taken', HttpStatus.CONFLICT);
      }
      if (!slug && dto.enabled) slug = await this.uniqueSlug(this.slugify(entity.name), entityId);
      await this.prisma.entity.update({
        where: { id: entityId },
        data: {
          storeSlug: slug ?? null,
          ...(dto.enabled !== undefined ? { onlineStoreEnabled: dto.enabled } : {}),
        },
      });
      return this.getStoreSettings(entityId).then((r) => ({ ...r, message: 'Online store updated' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  // ─── Public online store ─────────────────────────────────────────────────────

  /**
   * A published store by its link. On a group's subdomain (or in standalone
   * mode) only that group's stores resolve.
   */
  private async publicEntity(slug: string, tenantGroupId?: string | null) {
    const entity = await this.prisma.entity.findFirst({
      where: { storeSlug: slug, onlineStoreEnabled: true, ...(tenantGroupId ? { groupId: tenantGroupId } : {}) },
      select: {
        id: true,
        groupId: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        country: true,
        logo: true,
        currency: true,
        settings: { select: { baseCurrency: true, taxInclusive: true }, take: 1 },
      },
    });
    if (!entity) throw new HttpException('Store not found', HttpStatus.NOT_FOUND);
    return entity;
  }

  async getPublicStore(slug: string, tenantGroupId?: string | null) {
    try {
      const entity = await this.publicEntity(slug, tenantGroupId);
      const [items, tax] = await Promise.all([
        this.prisma.storeItems.findMany({
          where: { entityId: entity.id, sellOnline: true },
          include: { category: { select: { id: true, name: true } } },
          orderBy: { name: 'asc' },
        }),
        resolveDocumentTax(this.prisma, entity.id, {}),
      ]);
      const settings = entity.settings[0];
      return {
        data: {
          store: {
            name: entity.name,
            logoUrl: (entity.logo as any)?.secureUrl ?? null,
            email: entity.email,
            phone: entity.phoneNumber,
            address: [entity.address, entity.city, entity.country].filter(Boolean).join(', '),
            currency: settings?.baseCurrency || entity.currency || 'NGN',
          },
          tax: { rate: tax.rate, name: tax.name, inclusive: tax.inclusive },
          items: items.map((i) => {
            const tracked = i.type === 'product' && i.trackInventory;
            return {
              id: i.id,
              name: i.name,
              description: i.description,
              type: i.type,
              category: i.category?.name ?? null,
              price: i.sellingPrice ?? i.rate ?? 0,
              taxable: i.taxable,
              imageUrl: (i.image as any)?.secureUrl ?? null,
              inStock: !tracked || (i.currentStock ?? 0) > 0,
              // Cart cap for tracked products; null = no limit
              available: tracked ? Math.max(0, i.currentStock ?? 0) : null,
            };
          }),
        },
        message: 'Store fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async placePublicOrder(slug: string, dto: PublicOrderDto, tenantGroupId?: string | null) {
    try {
      const entity = await this.publicEntity(slug, tenantGroupId);
      const lines = await this.priceLines(entity.id, dto.items, { onlineOnly: true });
      const tax = await resolveDocumentTax(this.prisma, entity.id, {});
      const totals = this.totals(lines, tax);
      const currency = entity.settings[0]?.baseCurrency || entity.currency || 'NGN';

      // Link to a saved customer of this entity with the same email
      const customer = await this.prisma.customer.findFirst({
        where: { entityId: entity.id, email: { equals: dto.customerEmail.trim(), mode: 'insensitive' } },
        select: { id: true },
      });

      const order = await this.withOrderNumber(entity.id, 'ONLINE', (orderNumber) =>
        this.prisma.order.create({
          data: {
            orderNumber,
            source: 'ONLINE',
            status: 'Pending',
            customerId: customer?.id ?? null,
            customerName: dto.customerName.trim(),
            customerEmail: dto.customerEmail.trim(),
            customerPhone: dto.customerPhone.trim(),
            deliveryAddress: dto.deliveryAddress?.trim() || null,
            notes: dto.notes?.trim() || null,
            subtotal: totals.subtotal,
            tax: totals.tax,
            taxRate: tax.rate,
            taxName: tax.name,
            taxInclusive: tax.inclusive,
            total: totals.total,
            entityId: entity.id,
            groupId: entity.groupId,
            items: {
              create: lines.map((l) => ({
                storeItemId: l.storeItemId,
                name: l.name,
                quantity: l.quantity,
                rate: l.rate,
                total: l.total,
                groupId: entity.groupId,
              })),
            },
          },
          include: { items: true },
        }),
      );

      void this.notifyNewOnlineOrder(entity, order, currency);

      return {
        data: {
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          tax: order.tax,
          total: order.total,
          currency,
          store: { name: entity.name, email: entity.email, phone: entity.phoneNumber },
        },
        message: 'Order placed',
        statusCode: 201,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  /** Confirmation to the customer + a heads-up to the business (payment is arranged directly) */
  private async notifyNewOnlineOrder(
    entity: { id: string; name: string; email: string | null; phoneNumber: string | null },
    order: { orderNumber: string; total: number; customerName: string | null; customerEmail: string | null; customerPhone: string | null; items: Array<{ name: string; quantity: number; total: number }> },
    currency: string,
  ) {
    const m = (n: number) => this.documentEmail.money(n, currency);
    const itemsList = order.items.map((i) => `${i.quantity} × ${i.name} — ${m(i.total)}`).join('\n');
    try {
      const ctx = await this.documentEmail.entityContext(entity.id);
      const brand = { entityName: ctx.name, logoUrl: ctx.logoUrl, primaryColor: ctx.primaryColor };
      if (order.customerEmail) {
        await this.mailer.send(entity.id, {
          to: order.customerEmail,
          toName: order.customerName,
          subject: `We received your order ${order.orderNumber}`,
          html: renderEmailHtml({
            ...brand,
            body: `Dear {{name}},

Thank you for your order! We have received it and will contact you shortly to arrange payment and delivery.

Order Number: {{order}}
{{items}}
Total: {{total}}

{{company}}
{{phone}}
{{email}}`,
            vars: {
              name: order.customerName,
              order: order.orderNumber,
              items: itemsList,
              total: m(order.total),
              company: ctx.name,
              phone: ctx.phone,
              email: ctx.email,
            },
          }),
        });
      }
      const staffEmail = ctx.email || entity.email;
      if (staffEmail) {
        await this.mailer.send(entity.id, {
          to: staffEmail,
          subject: `New online order ${order.orderNumber} — ${m(order.total)}`,
          html: renderEmailHtml({
            ...brand,
            body: `A new order was placed on your online store.

Order Number: {{order}}
Customer: {{name}}
Email: {{email}}
Phone: {{phone}}

{{items}}
Total: {{total}}

Contact the customer to arrange payment, then open Products → Orders and mark the order as paid.`,
            vars: {
              order: order.orderNumber,
              name: order.customerName,
              email: order.customerEmail,
              phone: order.customerPhone,
              items: itemsList,
              total: m(order.total),
            },
          }),
        });
      }
    } catch (e) {
      this.logger.warn(`Online order ${order.orderNumber} notification failed: ${e instanceof Error ? e.message : e}`);
    }
  }
}
