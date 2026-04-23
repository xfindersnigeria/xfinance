# Email Service Setup

## Overview
This folder contains a reusable email service using [Resend](https://resend.com/) and [React Email](https://react.email/) for templating. All transactional emails can use the base template for consistent branding.

## Usage

### 1. Configure Environment
- Set `RESEND_API_KEY` in your environment variables.
- Optionally set `DEFAULT_EMAIL_FROM` for the sender address.

### 2. Creating a New Email Template
- Create a new file in `src/email/templates/` (e.g., `PasswordResetEmail.tsx`).
- Import and wrap your content with `BaseTemplate` for consistent layout.

### 3. Sending an Email
```ts
import { EmailService } from './email.service';
import { WelcomeEmail } from './templates/WelcomeEmail';

const emailService = new EmailService();
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  reactTemplate: <WelcomeEmail name="Sarah" />,
});
```

### 4. Base Template
- The `BaseTemplate` includes your logo, header, footer, and links.
- Update logo URL and company info in `BaseTemplate.tsx` as needed.

## Adding More Templates
- Just create a new React component and wrap with `BaseTemplate`.
- Example: `InvoicePaidEmail.tsx`, `PasswordResetEmail.tsx`, etc.

---

**All emails will have a consistent look and can be sent using the same service!**
