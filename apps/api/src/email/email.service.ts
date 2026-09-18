import * as fs from 'fs';
import * as path from 'path';

import { Injectable, Logger } from '@nestjs/common';
import { SendMailClient } from 'zeptomail';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private zeptomail: SendMailClient;

  constructor() {
    this.zeptomail = new SendMailClient({
      token: process.env.ZEPTOMAIL_API_KEY!,
      url:
        process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email',
    });
  }

  async sendEmail({
    to,
    subject,
    html,
    from = process.env.DEFAULT_EMAIL_FROM,
  }: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    const result = await this.zeptomail.sendMail({
      from: {
        address: from || process.env.DEFAULT_EMAIL_FROM!,
        name: process.env.DEFAULT_EMAIL_FROM_NAME || 'x-finance',
      },
      to: [{ email_address: { address: to, name: to } }],
      subject,
      htmlbody: html,
    });

    this.logger.log(`Email sent to ${to}`);
    return result;
  }

  /**
   * Send an email with a PDF attachment (base64 encoded buffer).
   */
  async sendEmailWithAttachment({
    to,
    toName,
    senderName,
    subject,
    html,
    attachment,
    attachmentName,
    from = process.env.DEFAULT_EMAIL_FROM,
  }: {
    to: string;
    toName?: string;
    senderName?: string;
    subject: string;
    html: string;
    attachment: Buffer;
    attachmentName: string;
    from?: string;
  }) {
    const base64Content = attachment.toString('base64');
    const result = await this.zeptomail.sendMail({
      from: {
        address: from || process.env.DEFAULT_EMAIL_FROM!,
        name: senderName || process.env.DEFAULT_EMAIL_FROM_NAME || 'Xfinance',
      },
      to: [{ email_address: { address: to, name: toName || to } }],
      subject,
      htmlbody: html,
      attachments: [
        {
          content: base64Content,
          mime_type: 'application/pdf',
          name: attachmentName,
        },
      ],
    } as any);

    this.logger.log(`Email with attachment sent to ${to}`);
    return result;
  }

  /**
   * Send through the platform mailer (ZeptoMail) on behalf of an entity: the
   * display name is the entity's, replies go to the entity's own address.
   * Used for entity emails when the entity hasn't configured its own SMTP.
   */
  async sendPlatformEmail({
    to,
    toName,
    senderName,
    replyTo,
    subject,
    html,
    attachments = [],
  }: {
    to: string;
    toName?: string;
    senderName?: string;
    replyTo?: { address: string; name?: string };
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  }) {
    const result = await this.zeptomail.sendMail({
      from: {
        address: process.env.DEFAULT_EMAIL_FROM!,
        name: senderName || process.env.DEFAULT_EMAIL_FROM_NAME || 'Xfinance',
      },
      to: [{ email_address: { address: to, name: toName || to } }],
      ...(replyTo ? { reply_to: [{ address: replyTo.address, name: replyTo.name || replyTo.address }] } : {}),
      subject,
      htmlbody: html,
      ...(attachments.length
        ? {
            attachments: attachments.map((a) => ({
              content: a.content.toString('base64'),
              mime_type: a.contentType,
              name: a.filename,
            })),
          }
        : {}),
    } as any);

    this.logger.log(`Platform email sent to ${to}`);
    return result;
  }

  /**
   * Helper to wrap email content in the base template.
   */
  wrapWithBaseTemplate(
    contentHtml: string,
    subject: string,
    slug: string,
    logo: string,
    variables: Record<string, string | number> = {},
  ): string {
    let base = fs.readFileSync(
      // path.resolve(process.cwd(), 'src/email/templates/base-template.html'),
      path.resolve(__dirname, './templates/base-template.html'),
      'utf8',
    );
    const logoUrl = logo || 'https://xfinance.ng/images/logo.png';
    const groupSlug = slug || 'Xfinance';
    base = base.replace(/{{subject}}/g, subject);
    base = base.replace(/{{content}}/g, contentHtml);
    base = base.replace(/{{slug}}/g, groupSlug);
    base = base.replace(/{{logoUrl}}/g, logoUrl);
    for (const [key, value] of Object.entries(variables)) {
      base = base.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return base;
  }

  /**
   * Render a template file with variables (for content blocks)
   */
  renderHtmlTemplate(
    templatePath: string,
    variables: Record<string, string | number>,
  ): string {
    let html = fs.readFileSync(path.resolve(templatePath), 'utf8');
    for (const [key, value] of Object.entries(variables)) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return html;
  }
}
