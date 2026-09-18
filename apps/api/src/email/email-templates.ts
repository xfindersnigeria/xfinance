/**
 * Customer-facing email templates (Settings → Email → Email Templates).
 * Defaults live here; an entity's edits are stored in EmailTemplate and
 * "Reset to Default" deletes them. Bodies are plain text with {{variables}}.
 */

export const EMAIL_TEMPLATE_TYPES = [
  'invoice',
  'payment-reminder',
  'payment-confirmation',
  'receipt',
  'monthly-statement',
] as const;

export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export interface EmailTemplateDefinition {
  name: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  sample: Record<string, string>;
}

const COMPANY_VARS = ['company_name', 'company_phone', 'company_email'];
const SIGN_OFF = `Best regards,
{{company_name}}
{{company_phone}}
{{company_email}}`;
const SAMPLE_COMPANY = {
  company_name: 'Hunslow Inc.',
  company_phone: '+234 800 000 0000',
  company_email: 'accounts@hunslow.com',
};

export const EMAIL_TEMPLATES: Record<EmailTemplateType, EmailTemplateDefinition> = {
  invoice: {
    name: 'Invoice Email',
    description: 'Sent to customers with their invoice attached',
    subject: 'Invoice {{invoice_number}} from {{company_name}}',
    body: `Dear {{customer_name}},

Thank you for your business! Please find your invoice attached.

Invoice Details:
Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Amount Due: {{amount_due}}

If you have any questions, please don't hesitate to contact us.

${SIGN_OFF}`,
    variables: ['customer_name', 'invoice_number', 'invoice_date', 'due_date', 'amount_due', ...COMPANY_VARS],
    sample: {
      customer_name: 'John Smith',
      invoice_number: 'INV-2026-0042',
      invoice_date: '01 Sep 2026',
      due_date: '01 Oct 2026',
      amount_due: '₦250,000.00',
      ...SAMPLE_COMPANY,
    },
  },
  'payment-reminder': {
    name: 'Payment Reminder',
    description: 'Sent to customers for upcoming or overdue payments',
    subject: 'Payment Reminder: Invoice {{invoice_number}} - Due {{due_date}}',
    body: `Dear {{customer_name}},

This is a friendly reminder that invoice {{invoice_number}} is {{reminder_status}}.

Invoice Details:
Invoice Number: {{invoice_number}}
Invoice Date: {{invoice_date}}
Due Date: {{due_date}}
Amount Due: {{amount_due}}

{{overdue_message}}

If you have already made the payment, please disregard this reminder.

Thank you for your prompt attention to this matter.

${SIGN_OFF}`,
    variables: [
      'customer_name',
      'invoice_number',
      'invoice_date',
      'due_date',
      'amount_due',
      'reminder_status',
      'overdue_message',
      ...COMPANY_VARS,
    ],
    sample: {
      customer_name: 'John Smith',
      invoice_number: 'INV-2026-0042',
      invoice_date: '01 Sep 2026',
      due_date: '01 Oct 2026',
      amount_due: '₦250,000.00',
      reminder_status: 'due in 3 days',
      overdue_message: 'Please arrange payment by the due date.',
      ...SAMPLE_COMPANY,
    },
  },
  'payment-confirmation': {
    name: 'Payment Confirmation',
    description: 'Sent when a payment is received from a customer',
    subject: 'Payment Received - Thank You!',
    body: `Dear {{customer_name}},

Thank you! We have received your payment.

Payment Details:
Payment Amount: {{payment_amount}}
Payment Date: {{payment_date}}
Payment Method: {{payment_method}}
{{invoice_details}}

Your current account balance is: {{account_balance}}

We appreciate your business!

${SIGN_OFF}`,
    variables: [
      'customer_name',
      'payment_amount',
      'payment_date',
      'payment_method',
      'invoice_details',
      'account_balance',
      ...COMPANY_VARS,
    ],
    sample: {
      customer_name: 'John Smith',
      payment_amount: '₦100,000.00',
      payment_date: '15 Sep 2026',
      payment_method: 'Bank Transfer',
      invoice_details: 'Invoice: INV-2026-0042 (balance remaining ₦150,000.00)',
      account_balance: '₦150,000.00',
      ...SAMPLE_COMPANY,
    },
  },
  receipt: {
    name: 'Receipt Email',
    description: 'Sent to customers with transaction receipts',
    subject: 'Receipt from {{company_name}} - {{transaction_date}}',
    body: `Dear {{customer_name}},

Thank you for your purchase! Here is your receipt.

Transaction Details:
Receipt Number: {{receipt_number}}
Transaction Date: {{transaction_date}}
Payment Method: {{payment_method}}
Total Amount: {{total_amount}}

Items Purchased:
{{items_list}}

If you have any questions about this transaction, please contact us.

Thank you for your business!

${SIGN_OFF}`,
    variables: [
      'customer_name',
      'receipt_number',
      'transaction_date',
      'payment_method',
      'total_amount',
      'items_list',
      ...COMPANY_VARS,
    ],
    sample: {
      customer_name: 'John Smith',
      receipt_number: 'RCT-2026-0101',
      transaction_date: '15 Sep 2026',
      payment_method: 'Cash',
      total_amount: '₦26,875.00',
      items_list: '2 × Premium Widget — ₦25,000.00\nVAT (7.5%) — ₦1,875.00',
      ...SAMPLE_COMPANY,
    },
  },
  'monthly-statement': {
    name: 'Monthly Statement',
    description: 'Sent to customers with their monthly account statement attached',
    subject: 'Monthly Statement - {{month}} {{year}}',
    body: `Dear {{customer_name}},

Please find your monthly account statement for {{month}} {{year}} attached.

Account Summary:
Opening Balance: {{opening_balance}}
Total Charges: {{total_charges}}
Total Payments: {{total_payments}}
Closing Balance: {{closing_balance}}

{{outstanding_invoices}}

If you have any questions about your statement, please contact us.

Thank you for your continued business!

${SIGN_OFF}`,
    variables: [
      'customer_name',
      'month',
      'year',
      'opening_balance',
      'total_charges',
      'total_payments',
      'closing_balance',
      'outstanding_invoices',
      ...COMPANY_VARS,
    ],
    sample: {
      customer_name: 'John Smith',
      month: 'August',
      year: '2026',
      opening_balance: '₦50,000.00',
      total_charges: '₦250,000.00',
      total_payments: '₦100,000.00',
      closing_balance: '₦200,000.00',
      outstanding_invoices: 'Outstanding invoices:\nINV-2026-0042 — ₦150,000.00 (due 01 Oct 2026)',
      ...SAMPLE_COMPANY,
    },
  },
};

export function isEmailTemplateType(v: string): v is EmailTemplateType {
  return (EMAIL_TEMPLATE_TYPES as readonly string[]).includes(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Replace {{variables}} in plain text. Unknown variables become blank. */
export function fillTemplate(text: string, vars: Record<string, string | number | null | undefined>): string {
  return text.replace(/{{\s*([a-z_]+)\s*}}/gi, (_, name: string) => {
    const v = vars[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

/**
 * Render a plain-text template body as the HTML email: variables filled,
 * text escaped, line breaks kept, signature appended, entity branding on top.
 */
export function renderEmailHtml(opts: {
  body: string;
  vars: Record<string, string | number | null | undefined>;
  signature?: string | null;
  entityName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
}): string {
  const text = fillTemplate(opts.body, opts.vars)
    // collapse the blank lines left by empty optional variables
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const toHtml = (s: string) => escapeHtml(s).replace(/\r?\n/g, '<br/>');
  const color = opts.primaryColor || '#4152B6';
  const signature = opts.signature?.trim()
    ? `<div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;color:#475569">${toHtml(
        fillTemplate(opts.signature, opts.vars),
      )}</div>`
    : '';
  const logo = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="${escapeHtml(opts.entityName)}" style="max-height:48px;max-width:160px;margin-bottom:8px"/><br/>`
    : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:Arial,sans-serif;color:#1e293b">
  <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:24px 28px;border-bottom:3px solid ${color}">
      ${logo}<div style="font-size:18px;font-weight:bold;color:${color}">${escapeHtml(opts.entityName)}</div>
    </div>
    <div style="padding:24px 28px;font-size:14px;line-height:1.6">${toHtml(text)}${signature}</div>
  </div>
</body></html>`;
}
