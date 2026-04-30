# Fix Status Tracker

---

## Fix A — PDF Generation: Docker + Performance

**Root cause:** `puppeteer.launch()` called with no args → ignores `PUPPETEER_EXECUTABLE_PATH` env (set in Dockerfile), no `--no-sandbox` flags needed in container, new browser spawned per request (slow).

- [x] Rewrite `pdf.service.ts` — singleton browser, read `executablePath` from env, `--no-sandbox --disable-setuid-sandbox` flags, `domcontentloaded` (faster than `networkidle0`)
- [x] Dockerfile already installs `chromium` and sets `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`

---

## Fix B — Send Invoice to Customer (Email with PDF)

**Root cause:** `POST /sales/invoices/:id/send` endpoint does not exist; ZeptoMail client has no attachment support.

- [x] Add `sendEmailWithAttachment()` to `EmailService` (base64 PDF as ZeptoMail attachment)
- [x] Add `sendInvoice(invoiceId, entityId)` to `InvoiceService` (generate PDF → email customer)
- [x] Add `POST /sales/invoices/:id/send` to `InvoiceController`
- [x] Add `EmailService` to `InvoiceModule` providers
- [x] Wire "Send" button + "Download PDF" button in `InvoiceDetailsHeader.tsx` (wired to hooks, spinner states added)

---

## Fix C — Payroll PDF in Docker

**Root cause:** Same Puppeteer issue — fixed by Fix A (shared `PdfService`).

- [x] Covered by Fix A (no additional changes needed — same `PdfService` singleton)

---

## Fix 1 — User Edit Modal (Admin → Users table)

### Backend
- [x] Add `systemRole` + `entityId` to `UpdateUserDto`
- [x] Handle role change logic in `updateUser` service (admin→entityId=null, user→require entityId)

### Frontend
- [x] Rewrite `UserEditForm.tsx` — real form with firstName/lastName/dept, systemRole, adminEntities checkboxes (admin), entityId select (user), role select, isActive toggle
- [x] Fix `useUpdateUser` to close the correct per-user modal (`MODAL.ADMIN_USER_EDIT + "-" + userId`)

---

## Fix 2 — Invoice Bank Details + Notes from Sales Settings

### Backend
- [x] Add `bankName`, `bankAccountName`, `bankAccountNumber`, `bankRoutingNumber`, `bankSwiftCode`, `invoiceNotes` to `Settings` model
- [x] Create Prisma migration
- [x] Extend `ConfigService.getEntityConfig` + `updateEntityConfig` with new fields
- [x] Extend `UpdateEntityConfigDto` with new fields

### Frontend
- [x] Update `settingsService.ts` type with new fields
- [x] Wire `SalesForm.tsx` to `useEntityConfig` / `useUpdateEntityConfig`, add bank section + notes
- [x] Replace hardcoded `sampleBank` + `notes` in `InvoiceDetailsPage.tsx` with entity config data

---

## Fix 3 — PaymentMade Auto-fill Amount from Bill

### Backend
- [x] Include `paymentsMade` aggregate in `getBills` list → return `paidAmount` + `outstandingBalance`

### Frontend
- [x] Add `useEffect` to auto-set `amount = outstandingBalance` when bill is selected
- [x] Uncomment + update bill summary block (total, paid, outstanding)
- [x] Show graceful "already fully paid" message if remaining ≤ 0
