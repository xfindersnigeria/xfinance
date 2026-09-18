import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfService } from '@/pdf/pdf.service';
import { EntityMailerService } from './entity-mailer.service';
import {
  EMAIL_TEMPLATES,
  EmailTemplateType,
  fillTemplate,
  renderEmailHtml,
} from './email-templates';

type Vars = Record<string, string | number | null | undefined>;

interface EntityContext {
  entityId: string;
  groupId: string;
  name: string;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  currency: string;
  signature: string | null;
  automation: {
    invoiceEmails: boolean;
    paymentConfirmation: boolean;
    receiptEmails: boolean;
    monthlyStatements: boolean;
    paymentReminders: boolean;
    reminderSchedule: number[];
  };
}

export const OVERDUE_REMINDER_DAYS = [1, 7, 14, 30];

export function parseReminderSchedule(schedule: string | null | undefined): number[] {
  const days = (schedule || '')
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => Number.isFinite(d) && d > 0 && d <= 90);
  return [...new Set(days)].sort((a, b) => b - a);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  Cash: 'Cash',
  Card: 'Card',
  Bank_Transfer: 'Bank Transfer',
  Mobile_Money: 'Mobile Money',
  Check: 'Cheque',
  Debit_Card: 'Debit Card',
  Credit_Card: 'Credit Card',
  ACH: 'ACH',
  Wire_Transfer: 'Wire Transfer',
};

/**
 * Builds and sends the customer-facing document emails from the entity's
 * templates (Settings → Email), through the entity's mailer (own SMTP or the
 * platform mailer — see EntityMailerService).
 *
 * `send*` methods send unconditionally (explicit user action, e.g. "Send
 * invoice"). `auto*` methods first check the entity's Automated Email
 * Settings and silently skip when the switch is off or there's no address.
 */
@Injectable()
export class DocumentEmailService {
  private readonly logger = new Logger(DocumentEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly mailer: EntityMailerService,
  ) {}

  // ─── Shared helpers ──────────────────────────────────────────────────────────

  async entityContext(entityId: string): Promise<EntityContext> {
    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        groupId: true,
        name: true,
        email: true,
        phoneNumber: true,
        logo: true,
        currency: true,
        emailSettings: true,
        settings: { select: { baseCurrency: true, paymentReminders: true }, take: 1 },
      },
    });
    if (!entity) throw new HttpException('Entity not found', HttpStatus.NOT_FOUND);
    const customization = await this.prisma.groupCustomization.findUnique({
      where: { groupId: entity.groupId },
      select: { primaryColor: true, logoUrl: true },
    });
    const es = entity.emailSettings;
    const settings = entity.settings[0];
    return {
      entityId: entity.id,
      groupId: entity.groupId,
      name: entity.name,
      email: es?.fromEmail || entity.email,
      phone: entity.phoneNumber,
      logoUrl: (entity.logo as any)?.secureUrl || customization?.logoUrl || null,
      primaryColor: customization?.primaryColor ?? null,
      currency: settings?.baseCurrency || entity.currency || 'NGN',
      signature: es?.signature ?? null,
      automation: {
        invoiceEmails: es?.invoiceEmails ?? false,
        paymentConfirmation: es?.paymentConfirmation ?? false,
        receiptEmails: es?.receiptEmails ?? false,
        monthlyStatements: es?.monthlyStatements ?? false,
        paymentReminders: settings?.paymentReminders ?? false,
        reminderSchedule: parseReminderSchedule(es?.reminderSchedule ?? '3,7,14'),
      },
    };
  }

  money(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    }
  }

  date(d: Date | string | null | undefined): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private companyVars(ctx: EntityContext): Vars {
    return { company_name: ctx.name, company_phone: ctx.phone ?? '', company_email: ctx.email ?? '' };
  }

  /** Subject + HTML from the entity's template (or the default) */
  async render(ctx: EntityContext, type: EmailTemplateType, vars: Vars) {
    const custom = await this.prisma.emailTemplate.findUnique({
      where: { entityId_type: { entityId: ctx.entityId, type } },
    });
    const def = EMAIL_TEMPLATES[type];
    const allVars = { ...this.companyVars(ctx), ...vars };
    return {
      subject: fillTemplate(custom?.subject ?? def.subject, allVars).trim(),
      html: renderEmailHtml({
        body: custom?.body ?? def.body,
        vars: allVars,
        signature: ctx.signature,
        entityName: ctx.name,
        logoUrl: ctx.logoUrl,
        primaryColor: ctx.primaryColor,
      }),
    };
  }

  /** Preview with sample data (Settings → Email → template Preview) */
  async preview(entityId: string, type: EmailTemplateType, subject: string, body: string) {
    const ctx = await this.entityContext(entityId);
    const vars = { ...EMAIL_TEMPLATES[type].sample, ...this.companyVars(ctx) };
    return {
      subject: fillTemplate(subject, vars).trim(),
      html: renderEmailHtml({
        body,
        vars,
        signature: ctx.signature,
        entityName: ctx.name,
        logoUrl: ctx.logoUrl,
        primaryColor: ctx.primaryColor,
      }),
    };
  }

  // ─── Invoice ─────────────────────────────────────────────────────────────────

  private async invoicePdf(invoice: any, ctx: EntityContext): Promise<Buffer> {
    const settings = await this.prisma.settings.findFirst({ where: { entityId: ctx.entityId } });
    const bankAccount = settings
      ? {
          bankName: settings.bankName,
          accountName: settings.bankAccountName,
          accountNumber: settings.bankAccountNumber,
          routingNumber: settings.bankRoutingNumber,
          bankSwiftCode: settings.bankSwiftCode,
        }
      : null;
    return this.pdfService.generate('invoice', {
      invoice: { ...invoice, notes: settings?.invoiceNotes || '' },
      customer: invoice.customer ?? { name: invoice.customerName, email: invoice.customerEmail },
      entity: invoice.entity,
      bankAccount,
      primaryColor: ctx.primaryColor ?? '#4152B6',
    });
  }

  /**
   * Email an invoice (PDF attached) to its customer — the saved customer's
   * email, the invoice's typed-in customerEmail, or `to` when given.
   */
  async sendInvoiceEmail(invoiceId: string, entityId: string, to?: string | null) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, entityId },
      include: {
        customer: true,
        entity: true,
        invoiceItem: { include: { item: true } },
        paymentReceived: { select: { amount: true } },
      },
    });
    if (!invoice) throw new HttpException('Invoice not found', HttpStatus.NOT_FOUND);

    const recipient = to?.trim() || invoice.customer?.email || invoice.customerEmail;
    if (!recipient) {
      throw new HttpException(
        'This customer has no email address — enter one to send the invoice',
        HttpStatus.BAD_REQUEST,
      );
    }

    const ctx = await this.entityContext(entityId);
    const currency = invoice.currency || ctx.currency;
    const paid = invoice.paymentReceived.reduce((s, p) => s + p.amount, 0);
    const customerName = invoice.customer?.name || invoice.customerName || 'Customer';
    const { subject, html } = await this.render(ctx, 'invoice', {
      customer_name: customerName,
      invoice_number: invoice.invoiceNumber,
      invoice_date: this.date(invoice.invoiceDate),
      due_date: this.date(invoice.dueDate),
      amount_due: this.money(invoice.total - paid, currency),
    });
    const pdf = await this.invoicePdf(invoice, ctx);
    const result = await this.mailer.send(entityId, {
      to: recipient,
      toName: customerName,
      subject,
      html,
      attachments: [
        { filename: `invoice-${invoice.invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' },
      ],
    });
    return { to: recipient, ...result };
  }

  /** "Invoice Emails" switch: email a newly sent invoice automatically */
  async autoSendInvoice(invoiceId: string, entityId: string): Promise<string | null> {
    const ctx = await this.entityContext(entityId);
    if (!ctx.automation.invoiceEmails) return null;
    try {
      const { to } = await this.sendInvoiceEmail(invoiceId, entityId);
      return to;
    } catch (e) {
      this.logger.warn(`Auto invoice email skipped for ${invoiceId}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  }

  // ─── Payment confirmation ────────────────────────────────────────────────────

  /** "Payment Received Confirmation" switch */
  async autoSendPaymentConfirmation(paymentId: string, entityId: string) {
    try {
      const ctx = await this.entityContext(entityId);
      if (!ctx.automation.paymentConfirmation) return;
      const payment = await this.prisma.paymentReceived.findFirst({
        where: { id: paymentId, entityId },
        include: {
          invoice: {
            include: { customer: true, paymentReceived: { select: { amount: true } } },
          },
        },
      });
      if (!payment) return;
      const invoice = payment.invoice;
      const recipient = invoice.customer?.email || invoice.customerEmail;
      if (!recipient) return;

      const currency = invoice.currency || ctx.currency;
      const paid = invoice.paymentReceived.reduce((s, p) => s + p.amount, 0);
      const invoiceBalance = Math.max(0, invoice.total - paid);

      // Account balance: everything this customer still owes the entity
      let accountBalance = invoiceBalance;
      if (invoice.customerId) {
        const open = await this.prisma.invoice.findMany({
          where: { entityId, customerId: invoice.customerId, status: { notIn: ['Draft', 'Paid'] as any } },
          select: { total: true, paymentReceived: { select: { amount: true } } },
        });
        accountBalance = open.reduce(
          (s, i) => s + Math.max(0, i.total - i.paymentReceived.reduce((a, p) => a + p.amount, 0)),
          0,
        );
      }

      const customerName = invoice.customer?.name || invoice.customerName || 'Customer';
      const { subject, html } = await this.render(ctx, 'payment-confirmation', {
        customer_name: customerName,
        payment_amount: this.money(payment.amount, currency),
        payment_date: this.date(payment.paidAt),
        payment_method: PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod,
        invoice_details: `Invoice: ${invoice.invoiceNumber} (balance remaining ${this.money(invoiceBalance, currency)})`,
        account_balance: this.money(accountBalance, currency),
      });
      await this.mailer.send(entityId, { to: recipient, toName: customerName, subject, html });
    } catch (e) {
      this.logger.warn(`Payment confirmation email failed for ${paymentId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ─── Receipt ─────────────────────────────────────────────────────────────────

  async sendReceiptEmail(receiptId: string, entityId: string, to: string) {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, entityId },
      include: { customer: true, receiptItem: { include: { item: true, storeItem: true } } },
    });
    if (!receipt) throw new HttpException('Receipt not found', HttpStatus.NOT_FOUND);
    const ctx = await this.entityContext(entityId);
    const customerName = receipt.customer?.name || receipt.customerName || 'Customer';
    const lines = receipt.receiptItem.map((ri) => {
      const name = ri.item?.name || ri.storeItem?.name || ri.itemName || 'Item';
      return `${ri.quantity} × ${name} — ${this.money(ri.total, ctx.currency)}`;
    });
    if (receipt.tax > 0) {
      lines.push(
        `${receipt.taxName || 'Tax'} (${receipt.taxRate}%${receipt.taxInclusive ? ', included' : ''}) — ${this.money(receipt.tax, ctx.currency)}`,
      );
    }
    const { subject, html } = await this.render(ctx, 'receipt', {
      customer_name: customerName,
      receipt_number: receipt.receiptNumber,
      transaction_date: this.date(receipt.date),
      payment_method: PAYMENT_METHOD_LABELS[receipt.paymentMethod] ?? receipt.paymentMethod,
      total_amount: this.money(receipt.total, ctx.currency),
      items_list: lines.join('\n'),
    });
    return this.mailer.send(entityId, { to, toName: customerName, subject, html });
  }

  /** "Receipt Emails" switch — `to` overrides the saved customer's email (POS / online orders) */
  async autoSendReceipt(receiptId: string, entityId: string, to?: string | null) {
    try {
      const ctx = await this.entityContext(entityId);
      if (!ctx.automation.receiptEmails) return;
      let recipient = to?.trim() || null;
      if (!recipient) {
        const r = await this.prisma.receipt.findFirst({
          where: { id: receiptId, entityId },
          select: { customer: { select: { email: true } } },
        });
        recipient = r?.customer?.email ?? null;
      }
      if (!recipient) return;
      await this.sendReceiptEmail(receiptId, entityId, recipient);
    } catch (e) {
      this.logger.warn(`Receipt email failed for ${receiptId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // ─── Payment reminder ────────────────────────────────────────────────────────

  async sendPaymentReminder(
    invoice: {
      id: string;
      invoiceNumber: string;
      invoiceDate: Date;
      dueDate: Date;
      total: number;
      currency: string;
      customerName: string | null;
      customerEmail: string | null;
      customer: { name: string; email: string } | null;
      paymentReceived: { amount: number }[];
    },
    ctx: EntityContext,
    kind: 'before' | 'overdue',
    days: number,
  ) {
    const recipient = invoice.customer?.email || invoice.customerEmail;
    if (!recipient) return false;
    const currency = invoice.currency || ctx.currency;
    const balance = invoice.total - invoice.paymentReceived.reduce((s, p) => s + p.amount, 0);
    const customerName = invoice.customer?.name || invoice.customerName || 'Customer';
    const plural = days === 1 ? 'day' : 'days';
    const { subject, html } = await this.render(ctx, 'payment-reminder', {
      customer_name: customerName,
      invoice_number: invoice.invoiceNumber,
      invoice_date: this.date(invoice.invoiceDate),
      due_date: this.date(invoice.dueDate),
      amount_due: this.money(balance, currency),
      reminder_status: kind === 'before' ? `due in ${days} ${plural}` : `${days} ${plural} overdue`,
      overdue_message:
        kind === 'before'
          ? 'Please arrange payment by the due date.'
          : 'This invoice is now past due. Please arrange payment as soon as possible.',
    });
    await this.mailer.send(ctx.entityId, { to: recipient, toName: customerName, subject, html });
    return true;
  }

  // ─── Monthly statement ───────────────────────────────────────────────────────

  /**
   * Customer statement for one calendar month: opening balance, the month's
   * invoices and payments, closing balance, and what is still outstanding.
   * Returns null when the customer had no activity and owes nothing.
   */
  async buildStatement(customerId: string, entityId: string, periodStart: Date, periodEnd: Date) {
    const invoices = await this.prisma.invoice.findMany({
      where: { entityId, customerId, status: { not: 'Draft' as any }, invoiceDate: { lte: periodEnd } },
      include: { paymentReceived: { select: { amount: true, paidAt: true, paymentMethod: true, paymentNumber: true } } },
      orderBy: { invoiceDate: 'asc' },
    });

    let opening = 0;
    let charges = 0;
    let payments = 0;
    const rows: Array<{ date: Date; description: string; charge: number; payment: number }> = [];
    const outstanding: Array<{ invoiceNumber: string; dueDate: Date; balance: number }> = [];

    for (const inv of invoices) {
      if (inv.invoiceDate < periodStart) opening += inv.total;
      else {
        charges += inv.total;
        rows.push({ date: inv.invoiceDate, description: `Invoice ${inv.invoiceNumber}`, charge: inv.total, payment: 0 });
      }
      let paidToEnd = 0;
      for (const p of inv.paymentReceived) {
        if (p.paidAt > periodEnd) continue;
        paidToEnd += p.amount;
        if (p.paidAt < periodStart) opening -= p.amount;
        else {
          payments += p.amount;
          rows.push({
            date: p.paidAt,
            description: `Payment ${p.paymentNumber} — Invoice ${inv.invoiceNumber}`,
            charge: 0,
            payment: p.amount,
          });
        }
      }
      const balance = inv.total - paidToEnd;
      if (balance > 0) outstanding.push({ invoiceNumber: inv.invoiceNumber, dueDate: inv.dueDate, balance });
    }

    const closing = opening + charges - payments;
    if (rows.length === 0 && closing === 0) return null;
    rows.sort((a, b) => a.date.getTime() - b.date.getTime());
    return { opening, charges, payments, closing, rows, outstanding };
  }

  async sendStatement(
    customer: { id: string; name: string; email: string },
    ctx: EntityContext,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<boolean> {
    const statement = await this.buildStatement(customer.id, ctx.entityId, periodStart, periodEnd);
    if (!statement) return false;

    const month = periodStart.toLocaleDateString('en-GB', { month: 'long' });
    const year = String(periodStart.getFullYear());
    const m = (n: number) => this.money(n, ctx.currency);
    let running = statement.opening;
    const pdf = await this.pdfService.generate('statement', {
      entity: { name: ctx.name, logo: ctx.logoUrl ? { secureUrl: ctx.logoUrl } : null },
      primaryColor: ctx.primaryColor ?? '#4152B6',
      customer,
      period: `${this.date(periodStart)} – ${this.date(periodEnd)}`,
      summary: [
        { label: 'Opening Balance', value: m(statement.opening) },
        { label: 'Total Charges', value: m(statement.charges) },
        { label: 'Total Payments', value: m(statement.payments) },
        { label: 'Closing Balance', value: m(statement.closing) },
      ],
      openingRow: { date: this.date(periodStart), balance: m(statement.opening) },
      rows: statement.rows.map((r) => {
        running += r.charge - r.payment;
        return {
          date: this.date(r.date),
          description: r.description,
          charge: r.charge ? m(r.charge) : '',
          payment: r.payment ? m(r.payment) : '',
          balance: m(running),
        };
      }),
      outstanding: statement.outstanding.map((o) => ({
        invoiceNumber: o.invoiceNumber,
        dueDate: this.date(o.dueDate),
        balance: m(o.balance),
      })),
      generatedAt: new Date(),
    });

    const outstandingText = statement.outstanding.length
      ? 'Outstanding invoices:\n' +
        statement.outstanding
          .map((o) => `${o.invoiceNumber} — ${m(o.balance)} (due ${this.date(o.dueDate)})`)
          .join('\n')
      : 'You have no outstanding invoices. Thank you!';
    const { subject, html } = await this.render(ctx, 'monthly-statement', {
      customer_name: customer.name,
      month,
      year,
      opening_balance: m(statement.opening),
      total_charges: m(statement.charges),
      total_payments: m(statement.payments),
      closing_balance: m(statement.closing),
      outstanding_invoices: outstandingText,
    });
    await this.mailer.send(ctx.entityId, {
      to: customer.email,
      toName: customer.name,
      subject,
      html,
      attachments: [
        {
          filename: `statement-${year}-${String(periodStart.getMonth() + 1).padStart(2, '0')}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
    return true;
  }
}
