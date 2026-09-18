import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from './email.service';
import { decryptSecret } from './secret.util';

export interface EntityMailMessage {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export interface SmtpConfig {
  host: string;
  port: number;
  encryption: string; // none | tls | ssl
  username: string;
  password: string;
  fromEmail?: string | null;
  fromName?: string | null;
}

/**
 * Sends email on behalf of an entity (invoices, receipts, reminders, ...).
 *
 *  - Entity has its own SMTP (Settings → Email → SMTP Configuration): the mail
 *    is sent through that server, from the entity's own address. It lands in
 *    customers' inboxes exactly as if the entity sent it from its mail client.
 *  - Otherwise: the platform mailer (ZeptoMail) sends it from the platform
 *    address with the entity's name as the sender name and Reply-To set to the
 *    entity's from/contact address, so customer replies still reach the entity.
 */
@Injectable()
export class EntityMailerService {
  private readonly logger = new Logger(EntityMailerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  static buildTransport(cfg: SmtpConfig) {
    const encryption = (cfg.encryption || 'tls').toLowerCase();
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: encryption === 'ssl', // implicit TLS (usually 465)
      requireTLS: encryption === 'tls', // STARTTLS (usually 587)
      ignoreTLS: encryption === 'none',
      auth: { user: cfg.username, pass: cfg.password },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  /** The entity's SMTP config, when fully set up (host + credentials). */
  async getSmtpConfig(entityId: string): Promise<SmtpConfig | null> {
    const s = await this.prisma.emailSettings.findUnique({ where: { entityId } });
    if (!s?.smtpHost || !s.smtpUsername || !s.smtpPassword) return null;
    return {
      host: s.smtpHost,
      port: s.smtpPort ?? 587,
      encryption: s.smtpEncryption,
      username: s.smtpUsername,
      password: decryptSecret(s.smtpPassword),
      fromEmail: s.fromEmail,
      fromName: s.fromName,
    };
  }

  static async sendViaSmtp(cfg: SmtpConfig, entityName: string, msg: EntityMailMessage) {
    const transport = EntityMailerService.buildTransport(cfg);
    const fromAddress = cfg.fromEmail || cfg.username;
    await transport.sendMail({
      from: { name: cfg.fromName || entityName, address: fromAddress },
      to: msg.toName ? { name: msg.toName, address: msg.to } : msg.to,
      subject: msg.subject,
      html: msg.html,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }

  async send(entityId: string, msg: EntityMailMessage): Promise<{ via: 'smtp' | 'platform' }> {
    const [entity, settings] = await Promise.all([
      this.prisma.entity.findUnique({ where: { id: entityId }, select: { name: true, email: true } }),
      this.prisma.emailSettings.findUnique({
        where: { entityId },
        select: { fromEmail: true, fromName: true },
      }),
    ]);
    const entityName = entity?.name || 'Xfinance';

    const smtp = await this.getSmtpConfig(entityId);
    if (smtp) {
      await EntityMailerService.sendViaSmtp(smtp, entityName, msg);
      this.logger.log(`Entity ${entityId}: email "${msg.subject}" sent to ${msg.to} via own SMTP`);
      return { via: 'smtp' };
    }

    const replyAddress = settings?.fromEmail || entity?.email;
    await this.emailService.sendPlatformEmail({
      to: msg.to,
      toName: msg.toName ?? undefined,
      senderName: settings?.fromName || entityName,
      replyTo: replyAddress ? { address: replyAddress, name: settings?.fromName || entityName } : undefined,
      subject: msg.subject,
      html: msg.html,
      attachments: msg.attachments,
    });
    this.logger.log(`Entity ${entityId}: email "${msg.subject}" sent to ${msg.to} via platform mailer`);
    return { via: 'platform' };
  }
}
