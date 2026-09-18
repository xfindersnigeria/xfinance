# 2026-09-18 — Tax & Email settings, POS / Orders / Online Store, typed-in customers & vendors

Reference notes for CLAUDE.md "Goal 25". Delivery tidy-ups requested before the
client review.

---

## 1. Deploying this (run in order, on every server)

```bash
# 1. Migrations (adds tax/email/order tables, makes invoice customer / bill
#    vendor optional, fixes service store-item prices)
docker compose -f deploy/saas/docker-compose.yml run --rm api npx prisma migrate deploy

# 2. Backfills — all idempotent, safe to re-run
docker compose -f deploy/saas/docker-compose.yml run --rm api npm run backfill:sales-setup
docker compose -f deploy/saas/docker-compose.yml run --rm api npm run backfill:standard-accounts
```

Standalone: same commands with `-f deploy/standalone/docker-compose.yml`.
Locally: `cd apps/api && npx prisma migrate deploy && npm run backfill:sales-setup && npm run backfill:standard-accounts`.

- `backfill:sales-setup` — adds the **Cost of Goods Sold (5140)** subcategory/account
  (POS sales post COGS to it) and seeds each entity's **tax settings** (Nigeria
  jurisdiction, VAT 7.5% default, Zero Rated, four common VAT exemptions). An
  entity that already had a different default rate (Settings.taxRate) keeps it
  as its default ("Sales Tax x%"). Entities that already have tax rates are skipped.
- `backfill:standard-accounts` — adds the client's **44 standard accounts**
  (`seeders/seed-standard-entity-accounts.ts`, e.g. 5280-01 Audit Fees … 5330-04
  Bank Charges) and the new **5280 General & Administrative Expenses**
  subcategory. An account is skipped if the entity already has that **code or
  that name** — nothing is ever duplicated. New entities get all of this
  automatically (create-entity-user job).
- Optional env: `SMTP_ENCRYPTION_KEY` (any long random string). Entity SMTP
  passwords are encrypted with it; if unset, `COOKIE_SECRET` is used. Changing
  whichever key is in use makes saved SMTP passwords unreadable — entities would
  have to re-enter them.

## 2. Settings → Tax (was "Coming soon")

Exactly the old UI: Tax Configuration switches + Tax Rates / Tax Groups /
Exemptions / Jurisdictions, all CRUD (`apps/api/src/settings/tax/`,
`GET/PATCH settings/tax…`).

How it drives the app (`apps/api/src/sales/sales-tax.util.ts`):

| Setting | Effect |
|---|---|
| Default tax rate | Pre-selected on new invoices, income receipts, bills and POS sales; can be changed per document. Mirrored into `Settings.taxRate`. |
| Enable Tax Calculation | Off → new documents start with **no tax** (user can still pick one). |
| Tax Inclusive Pricing | Sales prices already include tax: tax is **extracted** (`tax = gross × r/(100+r)`), total = sum of lines. Stored per document (`taxInclusive`) so later edits don't change basis. |
| Compound Tax | Tax groups charge each rate on top of the previous ones (1.075 × 1.05 …). |
| Reverse Charge VAT | Bills get a "Reverse charge" tick: tax recorded on the bill but not added to the payable (not posted). |
| Exemptions | Pickable on documents as a 0% tax labelled "Exempt: name (code)". |

Documents store `taxRate` + `taxName` (+ `taxInclusive`). Every form uses the
shared `components/local/shared/TaxSelect.tsx` picker. Settings → Income's old
"Default Sales Tax Rate" field now just points to the Tax tab.

## 3. Settings → Email (was "Coming soon")

`apps/api/src/settings/email/`, `apps/api/src/email/`.

### How SMTP works (the question asked)
Every customer email an entity sends goes through `EntityMailerService`:

- **Entity set up its own SMTP** (host/port/encryption/username/password/from):
  the app logs into *their* mail server and sends as them — the customer sees
  e.g. `billing@clientcompany.com`, it lands in their Sent folder if the server
  keeps copies, and their domain's SPF/DKIM apply. Password stored AES-256-GCM
  encrypted, never returned by the API. "Send Test Email" verifies the login and
  sends a test before saving.
- **No SMTP set** (default): the platform mailer (ZeptoMail, `DEFAULT_EMAIL_FROM`)
  sends it **on their behalf** — sender *name* is the entity's name (or the
  configured From Name), sender *address* is the platform's, and **Reply-To** is
  the entity's From Email / entity email, so customer replies go to the entity.
- "Remove SMTP" switches back to the platform mailer.

### Templates
Invoice, Payment Reminder, Payment Confirmation, Receipt, Monthly Statement —
defaults in `email-templates.ts`; edits stored per entity (`EmailTemplate`),
Reset deletes the edit. Plain text with `{{variables}}`, rendered with the
entity's logo/brand colour + signature. (Quote/Estimate omitted — the app has
no quotes.)

### Automated emails
| Switch | When |
|---|---|
| Invoice Emails | Invoice created as Sent / moved to Sent → emailed with PDF (background). "Send to Customer" always works manually and now lets you type/confirm the address. |
| Payment Reminders | Daily 08:00: N days before due (schedule, default 3/7/14) and 1/7/14/30 days overdue. Same switch as Settings → Income "Payment Reminders". |
| Payment Received Confirmation | On recording a payment against an invoice. |
| Receipt Emails | Income receipts (saved customer's email) and POS sales (email typed at the till). |
| Monthly Statements | 07:00 on the 1st: last month's statement PDF (opening, invoices, payments, closing, outstanding) to every active customer with an email and activity or a balance. |

Reminders/statements are claimed in `InvoiceReminderLog` / `CustomerStatementLog`
(unique) **before** sending, so each goes out once even if the job runs twice;
a failed send releases the claim. The cron class is registered in exactly one
module (EmailSettingsModule).

## 4. POS / Quick Sale, Orders, Online Store

`apps/api/src/product/orders/`. New `Order` / `OrderItem` models.

### How the POS works end to end
1. Quick Sale (header) or Orders → New sale opens the POS: product grid from the
   store catalog, cart, customer (saved or walk-in name + optional email), tax
   (default pre-selected), payment method, deposit account.
2. **Charge** → `POST orders/pos-checkout`. Prices come from the catalog on the
   server (not the browser). In one database transaction:
   - stock is taken from each tracked product with a guarded decrement (can't
     go below zero even with two tills selling the last unit) + an
     InventoryMovement "Sale ORD-2026-0001";
   - a Completed **income receipt** is created with the lines;
   - the **order** (ORD-…, Completed) is created and linked to the receipt.
3. After commit the receipt is posted by the existing receipt posting job:
   Dr Cash/Bank · Cr Product Sales (4110) / Service Revenue (4120) · Cr VAT
   (2140) · **Dr Cost of Goods Sold (5140) / Cr Inventory (1130)** at the item's
   cost price. The receipt is emailed if "Receipt Emails" is on.
4. The sale appears on the Orders page, in Income Receipts, the ledger, stock
   history and every report.

### Online store (manual payment)
- Orders page → Online Store card: publish/unpublish, store link
  (`/store/{slug}`, auto-generated from the entity name, editable), copy/visit.
- Items marked "Sell on Online Store" are listed at `/store/{slug}` (public,
  no login). Customer checks out with name/email/phone/address → order
  **WEB-…, Pending**. No stock is taken and nothing is posted yet; the customer
  and the business both get an email.
- The business collects payment offline, then Orders → order → **Mark as paid**
  (payment method + deposit account) → exactly the POS path above (stock,
  receipt, ledger, COGS). Or **Cancel order**.

### Accounting note (COGS)
COGS credits Inventory (1130). For the inventory balance to stay right, stock
purchases should be booked to Inventory (1130) — e.g. bill lines for stock use
the Inventory account, not an expense account. If they're expensed, Inventory
will go negative as sales post COGS.

### Also fixed here
- Store items: GET/PUT/DELETE `store-items/:id` didn't exist (edit/delete never
  worked); added, plus item images (`POST/DELETE store-items/:id/image`).
- Service store items saved their price ×100 (kobo) and never showed a price;
  form fixed + migration `20260919010000_store_item_service_price` normalises
  existing rows.

## 5. Invoices & bills with typed-in customers / vendors

Same as income receipts/expenses: pick a saved customer/vendor or type a name.
`Invoice.customerId` / `Bills.vendorId` / `PaymentMade.vendorId` now optional
(`ON DELETE SET NULL`), plus `customerName`/`customerEmail`, `vendorName`.
The API presents a typed-in party in the same shape as a saved one
(`invoice.customer.name`, `bill.vendor.displayName`, id null — `sales/party.util.ts`)
so every screen, PDF and email keeps working. Reports group typed-in parties
by name. Deleting a customer no longer deletes their invoices — the name is
stamped on their invoices/receipts/orders instead.

Bills with a typed-in vendor are paid from the bill (Record Payment) or from
Payment Made → vendor "Typed-in vendor (not saved)".

## 6. Bugs found and fixed on the way
- **Bill tax** — form sent a *percentage*, server added it as an *amount*
  (7.5% on ₦50,000 added ₦7.50). Now a rate on (subtotal − discount), computed
  server-side; existing bills got the equivalent rate backfilled.
- **Bill posting ignored the discount** — AP was credited subtotal + tax, so a
  discounted bill left the discount stuck in Payables after payment. Discount is
  now netted across the expense lines; AP = bill total.
- **Bills list ignored `vendorId`** — the "bills for this vendor" dropdown in
  Payment Made listed every vendor's bills (first 10).
- Group chart of accounts → Create Account: superadmins inside a group no
  longer see a redundant group picker; the entity checklist loads every entity
  (the list endpoint paged at 10, so groups with 18 entities showed 10).

## 7. Reports print/PDF
Every report PDF (entity + group, Print and Export) is now **landscape**;
reports wider than 10 columns (group reports across many entities) use **A3
landscape**, which still prints scaled to A4.
