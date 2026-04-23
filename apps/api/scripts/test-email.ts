/**
 * Quick smoke-test for the ZeptoMail integration.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/test-email.ts your@email.com
 */
import 'dotenv/config';
import { SendMailClient } from 'zeptomail';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/test-email.ts <recipient@email.com>');
  process.exit(1);
}

const required = ['ZEPTOMAIL_API_KEY', 'DEFAULT_EMAIL_FROM'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

// Default ZeptoMail API URL — override with ZEPTOMAIL_API_URL in .env if on EU/IN region
const apiUrl = process.env.ZEPTOMAIL_API_URL || 'https://api.zeptomail.com/v1.1/email';
console.log(`Using API URL: ${apiUrl}`);

const client = new SendMailClient({
  token: process.env.ZEPTOMAIL_API_KEY!,
  url: apiUrl,
});

async function run() {
  console.log(`Sending test email to ${to} via ZeptoMail...`);

  const result = await client.sendMail({
    from: {
      address: process.env.DEFAULT_EMAIL_FROM!,
      name: process.env.DEFAULT_EMAIL_FROM_NAME || 'XFinance',
    },
    to: [{ email_address: { address: to, name: to } }],
    subject: 'ZeptoMail test — XFinance',
    htmlbody: `
      <div style="font-family:sans-serif;padding:24px">
        <h2>ZeptoMail is working ✓</h2>
        <p>This is a test email sent from the XFinance API.</p>
        <p style="color:#888;font-size:12px">Sent at ${new Date().toISOString()}</p>
      </div>
    `,
  });

  console.log('Success:', JSON.stringify(result, null, 2));
}

run().catch((err) => {
  console.error('Failed:', err?.message ?? err);
  process.exit(1);
});
