import { apiClient } from "../client";

// Settings → Email (apps/api/src/settings/email)

export type SmtpEncryption = "none" | "tls" | "ssl";

export interface SmtpSettings {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  hasPassword: boolean;
  fromEmail: string;
  fromName: string;
}

export type EmailDelivery =
  | { mode: "smtp"; from: string }
  | { mode: "platform"; from: string | null; senderName: string | null; replyTo: string | null };

export interface EmailAutomation {
  invoiceEmails: boolean;
  paymentReminders: boolean;
  paymentConfirmation: boolean;
  receiptEmails: boolean;
  monthlyStatements: boolean;
  reminderSchedule: string;
}

export type EmailTemplateType =
  | "invoice"
  | "payment-reminder"
  | "payment-confirmation"
  | "receipt"
  | "monthly-statement";

export interface EmailTemplateSummary {
  type: EmailTemplateType;
  name: string;
  description: string;
  isCustom: boolean;
  updatedAt: string | null;
}

export interface EmailSettingsOverview {
  smtp: SmtpSettings | null;
  delivery: EmailDelivery;
  automation: EmailAutomation;
  signature: string;
  templates: EmailTemplateSummary[];
}

export interface EmailTemplate extends EmailTemplateSummary {
  subject: string;
  body: string;
  variables: string[];
  defaults: { subject: string; body: string };
}

export interface EmailTemplatePreview {
  subject: string;
  html: string;
}

export interface SmtpPayload {
  host: string;
  port: number;
  encryption: SmtpEncryption;
  username: string;
  password?: string;
  fromEmail: string;
  fromName?: string;
}

export type SmtpTestPayload = Partial<SmtpPayload> & { to: string };

interface Envelope<T> {
  data: T;
  message: string;
  statusCode: number;
}

export const getEmailSettings = () =>
  apiClient<Envelope<EmailSettingsOverview>>("settings/email", { method: "GET" });

export const saveSmtp = (payload: SmtpPayload) =>
  apiClient<Envelope<EmailSettingsOverview>>("settings/email/smtp", {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const removeSmtp = () =>
  apiClient<Envelope<EmailSettingsOverview>>("settings/email/smtp", { method: "DELETE" });

export const testSmtp = (payload: SmtpTestPayload) =>
  apiClient<Envelope<unknown>>("settings/email/smtp/test", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateEmailAutomation = (payload: Partial<EmailAutomation>) =>
  apiClient<Envelope<unknown>>("settings/email/automation", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const updateEmailSignature = (signature: string) =>
  apiClient<Envelope<unknown>>("settings/email/signature", {
    method: "PATCH",
    body: JSON.stringify({ signature }),
  });

export const getEmailTemplate = (type: EmailTemplateType) =>
  apiClient<Envelope<EmailTemplate>>(`settings/email/templates/${type}`, { method: "GET" });

export const saveEmailTemplate = (type: EmailTemplateType, payload: { subject: string; body: string }) =>
  apiClient<Envelope<EmailTemplate>>(`settings/email/templates/${type}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const resetEmailTemplate = (type: EmailTemplateType) =>
  apiClient<Envelope<EmailTemplate>>(`settings/email/templates/${type}`, { method: "DELETE" });

export const previewEmailTemplate = (type: EmailTemplateType, payload: { subject: string; body: string }) =>
  apiClient<Envelope<EmailTemplatePreview>>(`settings/email/templates/${type}/preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
