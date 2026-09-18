import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EntityMailerService, SmtpConfig } from '@/email/entity-mailer.service';
import { DocumentEmailService } from '@/email/document-email.service';
import { EMAIL_TEMPLATES, EMAIL_TEMPLATE_TYPES, isEmailTemplateType } from '@/email/email-templates';
import { decryptSecret, encryptSecret } from '@/email/secret.util';
import {
  SaveEmailTemplateDto,
  TestSmtpDto,
  UpdateEmailAutomationDto,
  UpdateSignatureDto,
  UpdateSmtpDto,
} from './dto/email-settings.dto';

@Injectable()
export class EmailSettingsService {
  private readonly logger = new Logger(EmailSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentEmail: DocumentEmailService,
  ) {}

  private rethrow(e: unknown): never {
    if (e instanceof HttpException) throw e;
    throw new HttpException(e instanceof Error ? e.message : String(e), HttpStatus.BAD_REQUEST);
  }

  private async ensure(entityId: string, groupId: string) {
    return this.prisma.emailSettings.upsert({
      where: { entityId },
      update: {},
      create: { entityId, groupId },
    });
  }

  private async ensureSettingsRow(entityId: string, groupId: string) {
    const s = await this.prisma.settings.findFirst({ where: { entityId }, select: { id: true } });
    return s?.id ?? (await this.prisma.settings.create({ data: { entityId, groupId } })).id;
  }

  async getOverview(entityId: string, groupId: string) {
    try {
      const [s, settings, entity, templates] = await Promise.all([
        this.ensure(entityId, groupId),
        this.prisma.settings.findFirst({ where: { entityId }, select: { paymentReminders: true } }),
        this.prisma.entity.findUnique({ where: { id: entityId }, select: { name: true, email: true } }),
        this.prisma.emailTemplate.findMany({ where: { entityId } }),
      ]);
      const customSmtp = !!(s.smtpHost && s.smtpUsername && s.smtpPassword);
      return {
        data: {
          smtp: {
            host: s.smtpHost ?? '',
            port: s.smtpPort ?? 587,
            encryption: s.smtpEncryption,
            username: s.smtpUsername ?? '',
            hasPassword: !!s.smtpPassword,
            fromEmail: s.fromEmail ?? '',
            fromName: s.fromName ?? '',
          },
          // How mail goes out right now — shown in the SMTP card
          delivery: customSmtp
            ? { mode: 'smtp', from: s.fromEmail || s.smtpUsername }
            : {
                mode: 'platform',
                from: process.env.DEFAULT_EMAIL_FROM ?? null,
                senderName: s.fromName || entity?.name,
                replyTo: s.fromEmail || entity?.email || null,
              },
          automation: {
            invoiceEmails: s.invoiceEmails,
            paymentReminders: settings?.paymentReminders ?? false,
            paymentConfirmation: s.paymentConfirmation,
            receiptEmails: s.receiptEmails,
            monthlyStatements: s.monthlyStatements,
            reminderSchedule: s.reminderSchedule,
          },
          signature: s.signature ?? '',
          templates: EMAIL_TEMPLATE_TYPES.map((type) => {
            const custom = templates.find((t) => t.type === type);
            const def = EMAIL_TEMPLATES[type];
            return {
              type,
              name: def.name,
              description: def.description,
              isCustom: !!custom,
              updatedAt: custom?.updatedAt ?? null,
            };
          }),
        },
        message: 'Email settings fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async updateSmtp(entityId: string, groupId: string, dto: UpdateSmtpDto) {
    try {
      const existing = await this.ensure(entityId, groupId);
      if (!dto.password && !existing.smtpPassword) {
        throw new HttpException('SMTP password is required', HttpStatus.BAD_REQUEST);
      }
      await this.prisma.emailSettings.update({
        where: { entityId },
        data: {
          smtpHost: dto.host.trim(),
          smtpPort: dto.port,
          smtpEncryption: dto.encryption,
          smtpUsername: dto.username.trim(),
          ...(dto.password ? { smtpPassword: encryptSecret(dto.password) } : {}),
          fromEmail: dto.fromEmail.trim(),
          fromName: dto.fromName?.trim() || null,
        },
      });
      return this.getOverview(entityId, groupId).then((r) => ({ ...r, message: 'SMTP settings saved' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  /** Stop using the entity's own SMTP — mail goes back through the platform mailer */
  async removeSmtp(entityId: string, groupId: string) {
    try {
      await this.ensure(entityId, groupId);
      await this.prisma.emailSettings.update({
        where: { entityId },
        data: { smtpHost: null, smtpPort: null, smtpUsername: null, smtpPassword: null },
      });
      return this.getOverview(entityId, groupId).then((r) => ({ ...r, message: 'Custom SMTP removed' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  /** Send a test email through the SMTP details on the form (saved password when left blank) */
  async testSmtp(entityId: string, groupId: string, dto: TestSmtpDto) {
    try {
      const saved = await this.ensure(entityId, groupId);
      const cfg: SmtpConfig = {
        host: dto.host?.trim() || saved.smtpHost || '',
        port: dto.port || saved.smtpPort || 587,
        encryption: dto.encryption || saved.smtpEncryption,
        username: dto.username?.trim() || saved.smtpUsername || '',
        password: dto.password || (saved.smtpPassword ? decryptSecret(saved.smtpPassword) : ''),
        fromEmail: dto.fromEmail?.trim() || saved.fromEmail,
        fromName: dto.fromName?.trim() || saved.fromName,
      };
      if (!cfg.host || !cfg.username || !cfg.password) {
        throw new HttpException('Enter the SMTP host, username and password first', HttpStatus.BAD_REQUEST);
      }
      const entity = await this.prisma.entity.findUnique({ where: { id: entityId }, select: { name: true } });
      const entityName = entity?.name ?? 'Xfinance';
      try {
        await EntityMailerService.buildTransport(cfg).verify();
        await EntityMailerService.sendViaSmtp(cfg, entityName, {
          to: dto.to,
          subject: `Test email from ${entityName}`,
          html: `<p>This is a test email from <strong>${entityName}</strong>.</p><p>Your SMTP settings are working — emails to your customers will be sent through <strong>${cfg.host}</strong> from <strong>${cfg.fromEmail || cfg.username}</strong>.</p>`,
        });
      } catch (err) {
        throw new HttpException(
          `SMTP test failed: ${err instanceof Error ? err.message : String(err)}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      return { data: { to: dto.to }, message: `Test email sent to ${dto.to}`, statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async updateAutomation(entityId: string, groupId: string, dto: UpdateEmailAutomationDto) {
    try {
      await this.ensure(entityId, groupId);
      const { paymentReminders, reminderSchedule, ...toggles } = dto;
      await this.prisma.emailSettings.update({
        where: { entityId },
        data: {
          ...toggles,
          ...(reminderSchedule !== undefined
            ? { reminderSchedule: reminderSchedule.replace(/\s+/g, '') }
            : {}),
        },
      });
      // Payment reminders is the same switch as Settings → Income "Payment Reminders"
      if (paymentReminders !== undefined) {
        const id = await this.ensureSettingsRow(entityId, groupId);
        await this.prisma.settings.update({ where: { id }, data: { paymentReminders } });
      }
      return this.getOverview(entityId, groupId).then((r) => ({ ...r, message: 'Email settings saved' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  async updateSignature(entityId: string, groupId: string, dto: UpdateSignatureDto) {
    try {
      await this.ensure(entityId, groupId);
      await this.prisma.emailSettings.update({
        where: { entityId },
        data: { signature: dto.signature.trim() || null },
      });
      return { data: { signature: dto.signature.trim() }, message: 'Signature saved', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  private assertType(type: string) {
    if (!isEmailTemplateType(type)) throw new HttpException('Unknown email template', HttpStatus.NOT_FOUND);
    return type;
  }

  async getTemplate(entityId: string, type: string) {
    try {
      const t = this.assertType(type);
      const custom = await this.prisma.emailTemplate.findUnique({
        where: { entityId_type: { entityId, type: t } },
      });
      const def = EMAIL_TEMPLATES[t];
      return {
        data: {
          type: t,
          name: def.name,
          description: def.description,
          subject: custom?.subject ?? def.subject,
          body: custom?.body ?? def.body,
          variables: def.variables,
          isCustom: !!custom,
          updatedAt: custom?.updatedAt ?? null,
          defaults: { subject: def.subject, body: def.body },
        },
        message: 'Email template fetched',
        statusCode: 200,
      };
    } catch (e) {
      this.rethrow(e);
    }
  }

  async saveTemplate(entityId: string, groupId: string, type: string, dto: SaveEmailTemplateDto) {
    try {
      const t = this.assertType(type);
      await this.prisma.emailTemplate.upsert({
        where: { entityId_type: { entityId, type: t } },
        update: { subject: dto.subject, body: dto.body },
        create: { entityId, groupId, type: t, subject: dto.subject, body: dto.body },
      });
      return this.getTemplate(entityId, t).then((r) => ({ ...r, message: 'Template saved' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  async resetTemplate(entityId: string, type: string) {
    try {
      const t = this.assertType(type);
      await this.prisma.emailTemplate.deleteMany({ where: { entityId, type: t } });
      return this.getTemplate(entityId, t).then((r) => ({ ...r, message: 'Template reset to default' }));
    } catch (e) {
      this.rethrow(e);
    }
  }

  async previewTemplate(entityId: string, type: string, dto: SaveEmailTemplateDto) {
    try {
      const t = this.assertType(type);
      const data = await this.documentEmail.preview(entityId, t, dto.subject, dto.body);
      return { data, message: 'Preview rendered', statusCode: 200 };
    } catch (e) {
      this.rethrow(e);
    }
  }
}
