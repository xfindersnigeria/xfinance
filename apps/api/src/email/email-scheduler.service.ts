import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { DocumentEmailService, OVERDUE_REMINDER_DAYS } from './document-email.service';

const DAY_MS = 86_400_000;

/** Whole days from `from` to `to`, by calendar date (UTC midnight to midnight). */
function dayDiff(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY_MS);
}

/**
 * Scheduled customer emails (Settings → Email → Automated Email Settings):
 *   - Payment reminders, daily 08:00 — N days before the due date (the
 *     entity's reminder schedule, e.g. 3/7/14) and 1/7/14/30 days overdue.
 *   - Monthly statements, 07:00 on the 1st — last month's statement (PDF) to
 *     every customer with an email and activity or a balance.
 *
 * Each email is claimed with a unique log row (InvoiceReminderLog /
 * CustomerStatementLog) BEFORE it is sent, so a reminder/statement goes out
 * once even if the job runs twice (restart, several API replicas). A failed
 * send releases its claim so the next run can retry it.
 *
 * Registered in exactly one module (EmailSettingsModule) — registering it in
 * several would schedule the jobs once per registration.
 */
@Injectable()
export class EmailSchedulerService {
  private readonly logger = new Logger(EmailSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  private isUniqueViolation(e: unknown) {
    return (e as any)?.code === 'P2002';
  }

  @Cron('0 8 * * *')
  async runPaymentReminders(today: Date = new Date()) {
    const entities = await this.prisma.settings.findMany({
      where: { paymentReminders: true },
      select: { entityId: true },
    });
    let sent = 0;
    for (const { entityId } of entities) {
      try {
        sent += await this.remindersForEntity(entityId, today);
      } catch (e) {
        this.logger.error(`Payment reminders failed for entity ${entityId}: ${e instanceof Error ? e.message : e}`);
      }
    }
    if (sent) this.logger.log(`Sent ${sent} payment reminder(s)`);
    return sent;
  }

  private async remindersForEntity(entityId: string, today: Date): Promise<number> {
    const ctx = await this.documentEmail.entityContext(entityId);
    if (!ctx.automation.paymentReminders) return 0;
    const beforeDays = ctx.automation.reminderSchedule;
    const maxAhead = Math.max(0, ...beforeDays);
    const maxOverdue = Math.max(...OVERDUE_REMINDER_DAYS);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        entityId,
        status: { in: ['Sent', 'Partial', 'Overdue'] as any },
        dueDate: {
          gte: new Date(today.getTime() - (maxOverdue + 1) * DAY_MS),
          lte: new Date(today.getTime() + (maxAhead + 1) * DAY_MS),
        },
      },
      include: {
        customer: { select: { name: true, email: true } },
        paymentReceived: { select: { amount: true } },
      },
    });

    let sent = 0;
    for (const inv of invoices) {
      const balance = inv.total - inv.paymentReceived.reduce((s, p) => s + p.amount, 0);
      if (balance <= 0) continue;
      if (!inv.customer?.email && !inv.customerEmail) continue;

      const untilDue = dayDiff(today, inv.dueDate);
      let kind: 'before' | 'overdue' | null = null;
      let days = 0;
      if (untilDue > 0 && beforeDays.includes(untilDue)) {
        kind = 'before';
        days = untilDue;
      } else if (untilDue < 0 && OVERDUE_REMINDER_DAYS.includes(-untilDue)) {
        kind = 'overdue';
        days = -untilDue;
      }
      if (!kind) continue;

      let claimId: string;
      try {
        const claim = await this.prisma.invoiceReminderLog.create({
          data: { invoiceId: inv.id, kind, days, groupId: inv.groupId },
        });
        claimId = claim.id;
      } catch (e) {
        if (this.isUniqueViolation(e)) continue; // already sent
        throw e;
      }

      try {
        if (await this.documentEmail.sendPaymentReminder(inv, ctx, kind, days)) sent++;
      } catch (e) {
        await this.prisma.invoiceReminderLog.delete({ where: { id: claimId } }).catch(() => undefined);
        this.logger.warn(`Reminder for ${inv.invoiceNumber} failed: ${e instanceof Error ? e.message : e}`);
      }
    }
    return sent;
  }

  @Cron('0 7 1 * *')
  async runMonthlyStatements(today: Date = new Date()) {
    // Last full calendar month
    const periodStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    const period = `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, '0')}`;

    const entities = await this.prisma.emailSettings.findMany({
      where: { monthlyStatements: true },
      select: { entityId: true },
    });
    let sent = 0;
    for (const { entityId } of entities) {
      try {
        const ctx = await this.documentEmail.entityContext(entityId);
        const customers = await this.prisma.customer.findMany({
          where: { entityId, isActive: true, email: { not: '' } },
          select: { id: true, name: true, email: true, groupId: true },
        });
        for (const customer of customers) {
          let claimId: string;
          try {
            const claim = await this.prisma.customerStatementLog.create({
              data: { customerId: customer.id, period, entityId, groupId: customer.groupId },
            });
            claimId = claim.id;
          } catch (e) {
            if (this.isUniqueViolation(e)) continue;
            throw e;
          }
          try {
            const didSend = await this.documentEmail.sendStatement(customer, ctx, periodStart, periodEnd);
            if (didSend) sent++;
            // No activity and nothing owed — release the claim, nothing was sent
            else await this.prisma.customerStatementLog.delete({ where: { id: claimId } });
          } catch (e) {
            await this.prisma.customerStatementLog.delete({ where: { id: claimId } }).catch(() => undefined);
            this.logger.warn(`Statement for customer ${customer.id} failed: ${e instanceof Error ? e.message : e}`);
          }
        }
      } catch (e) {
        this.logger.error(`Monthly statements failed for entity ${entityId}: ${e instanceof Error ? e.message : e}`);
      }
    }
    if (sent) this.logger.log(`Sent ${sent} monthly statement(s) for ${period}`);
    return sent;
  }
}
