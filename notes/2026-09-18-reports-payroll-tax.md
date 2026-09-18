# 2026-09-18 — Reports completion, payroll ledger posting, sales tax

Reference notes for the changes made on 2026-09-18 (CLAUDE.md "Goal 24").

---

## 1. Intercompany — TEMPORARILY HIDDEN (not removed)

Intercompany is needed later, so it was hidden, not deleted. Nothing in the
database changed: the `intercompany` module row, its permissions, and the
pages under `apps/web/app/(dashboards)/@admin/intercompany/` and
`components/features/admin/consolidation/` are all still there.

### Where it is hidden

| What | File | Switch |
|---|---|---|
| "Intercompany" item in the **group sidebar menu** | `apps/api/src/menu/menu.service.ts` | `HIDDEN_GROUP_MODULE_KEYS = ['intercompany']` (filtered in `buildAdminMenu`) |
| "Intercompany Transactions Report" in **Group Reports** | `apps/web/components/features/admin/group-reports/GroupReportsColumn.tsx` | `HIDDEN_GROUP_REPORTS = ["intercompany-transactions"]` |

### How to bring it back

1. Remove `'intercompany'` from `HIDDEN_GROUP_MODULE_KEYS` in `menu.service.ts`.
2. Remove `"intercompany-transactions"` from `HIDDEN_GROUP_REPORTS` in `GroupReportsColumn.tsx`.
3. Build the intercompany report page (it does not exist yet) and register it
   in `apps/web/components/features/admin/group-reports/details/GroupReportDetails.tsx`
   under the key `intercompany-transactions`. The design is
   `styles/src/app/components/pages/IntercompanyTransactionsReport.tsx`.
4. Redeploy. Menus and whoami are cached in Redis for 5 minutes, so the menu
   item reappears within 5 minutes (or immediately after an API restart).

### What intercompany still needs before it is real

- A data model for intercompany transactions (none exists in `schema.prisma`),
  or an agreed convention for tagging cross-entity journals.
- Consolidation **eliminations**: the group reports currently do **not**
  eliminate intercompany balances — consolidated totals are straight sums of
  the entities. The design's "Eliminations" column was deliberately left out.
  Once intercompany data exists, add eliminations in
  `apps/api/src/reports/group/group-reports.service.ts`.

---

## 2. Report export (PDF + Excel) — every report

Before: every Print/Export button on every report had no click handler.

- **Backend:** `POST /reports/export?format=pdf|csv`
  (`apps/api/src/reports/export/`). The page sends the table it is showing;
  the server renders it.
  - PDF: existing `PdfService` (same as payslips/invoices) with the new
    template `apps/api/src/pdf/templates/report.hbs`. Logo, name and brand
    colour are resolved server-side. `PdfService.generate()` gained an optional
    `{ landscape }` option.
  - CSV (opens in Excel): same server-built CSV approach as the payroll/PAYE
    exports; UTF-8 BOM, raw numbers, formula-injection guard.
- **Frontend:** `lib/reports/export-types.ts`, `useExportReport()` in
  `lib/api/hooks/useReports.ts`, and the shared
  `components/features/user/reports/ReportExportButtons.tsx`
  (Print = PDF in a new tab, Export = PDF or Excel CSV).
- To add export to a new report: build a `ReportExportPayload` from the page's
  data and pass it to `<ReportExportButtons getPayload={...} />`.

## 3. Entity reports

- New: Cash Flow Forecasting, Movement of Equity, Sales Tax Summary, Tax
  Liability (`GET reports/cash-flow-forecasting | movement-of-equity |
  sales-tax-summary | tax-liability-report`).
- **Sales by Salesperson hidden** — no salesperson exists in the data model.
  Switch: `HIDDEN_REPORT_KEYS` in
  `components/features/user/reports/ReportsColumn.tsx`.
- Fixed the broken Supplies Inventory Report link (`supplies-inventory`).
- Fixed Payable Summary / Aged Payables / Vendor Balances: they read payments
  from `PaymentRecord` (never written) instead of `PaymentMade`, so every bill
  appeared fully unpaid.

## 4. Group reports (previously a static mockup)

- Backend: `apps/api/src/reports/group/` — `GET reports/group/context |
  profit-and-loss | balance-sheet | cash-flow-statement | entity-comparison |
  cash-flow-forecast`. Group admins and superadmins only.
- Every figure reuses the entity report logic per entity, then converts and sums.
- **Currency:** reports are shown in the group's primary currency. Each entity's
  currency (Settings.baseCurrency, else Entity.currency) is converted with the
  group's rate from Admin → Settings → Currency (`GroupCurrency.exchangeRate` =
  units of that currency per 1 base unit, so base = amount ÷ rate), at the
  current rate. **An entity whose currency has no rate is excluded** and a
  banner tells the admin to add the rate.
- Frontend: `components/features/admin/group-reports/` (list) and
  `.../details/` (Consolidated P&L, Balance Sheet, Cash Flow, Financial
  Position, Entity Revenue / Profitability / Expense Comparison, Group Cash
  Flow Forecasting); route `app/(dashboards)/@admin/reports/[key]/`.

## 5. Payroll

- **Post to Ledger** action (`PATCH hr-payroll/payroll/:id/post`) for Approved
  batches that never posted (approved before ledger posting existed) or whose
  posting failed. After it succeeds, **Mark as Paid** appears.
- The approval posting job is now idempotent (claims the batch inside the
  posting transaction), so retries / double clicks cannot post a second journal.
- Mark as Paid lists all Cash & Cash Equivalents accounts (was bank accounts
  only) and shows the entity currency.

## 6. Sales tax (invoices + income receipts)

- Was hardcoded to 10%. Now a per-document **Tax %** field, defaulting to
  Settings → Sales → "Default Sales Tax Rate" (decimals allowed, e.g. 7.5).
- Applies to taxable items (receipts: also free-text lines).
- Also fixed: receipt edits wiped the tax; the receipt form showed no tax while
  the server added 10%; the invoice page recomputed 10% in the browser; the
  invoice PDF printed "Tax (%)" with no number.
- Shared logic: `apps/api/src/sales/sales-tax.util.ts`.

## 7. Deployment

Migration `20260918000000_sales_tax_rate` (adds `Invoice.taxRate` /
`Receipt.taxRate`, backfilled to 10 where tax > 0; `Settings.taxRate` Int → Float).
Run on every server after deploying — until it runs, invoice/receipt creation fails:

```
docker compose -f deploy/saas/docker-compose.yml run --rm api npx prisma migrate deploy
```

No backfill scripts are needed for these changes.

## 8. Known issues found — NOT fixed yet

- Jaycee Foods' ledger has an unbalanced bank posting (reference `BCH/112025`:
  credits ₦135,000 vs debits ₦45,000), so its balance sheet (and the group
  balance sheet) is out by ₦90,000.
- `BankingService.addTransaction` still allows single-sided entries (no offset
  account) and moves `Account.balance` the opposite way to the ledger row for
  withdrawals.
- `Account.balance` has drifted from the ledger on VAT 2140-01 and two bank
  accounts. Reports read the ledger, so they stay consistent with each other.
