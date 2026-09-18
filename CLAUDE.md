# Project: XFinance — Agent Instructions

## What This Project Is
A multi-tenant Finance and Accounting SaaS built with NestJS (apps/api/) 
and Next.js (apps/web/). It supports two deployment modes: SaaS and Standalone.


## CRITICAL — Read This First
Before making ANY changes, read the architecture document:
  ARCHITECTURE.md (at project root)

This document contains all agreed decisions. Every change must align 
with it. Do not deviate without asking first.

## Project Structure
xfinance/
├── apps/
│   ├── api/          # NestJS API
│   └── web/          # Next.js frontend
├── deploy/
│   ├── saas/
│   └── standalone/
├── scripts/
└── ARCHITECTURE.md

## Tech Stack
- Backend: NestJS, Prisma, PostgreSQL, Redis, Socket.IO
- Frontend: Next.js
- Storage: Cloudinary
- Deployment: Docker, GHCR, GitHub Actions

## Deployment Modes (core concept)
The app runs in two modes controlled by DEPLOYMENT_MODE env var:
- `saas` → multi-tenant, subdomain routing, super admin active
- `standalone` → single client, DEFAULT_GROUP_ID env, no super admin

## Current State
The codebase is production-ready with full SaaS and standalone deployment support:
- DEPLOYMENT_MODE switching in TenantService (saas / standalone)
- groupId on all 32 major Prisma models, non-nullable, indexed
- Super admin routes guarded by DeploymentModeGuard; subscription gates bypassed in standalone
- Cloudinary uploads scoped to `groups/{groupId}/...`
- Dockerfiles for API (node:24-slim, Chromium/Puppeteer) and web (node:24-alpine, standalone output)
- Production docker-compose files in deploy/saas/ and deploy/standalone/
- GitHub Actions pipeline: parallel image builds → push to GHCR → auto-deploy to SaaS on push to main
- Standalone clients auto-update via Watchtower watching :stable tag

## Feature Development Conventions

### Backend Pattern (NestJS)
- Every endpoint must have: JWT guard + RolesGuard + DeploymentModeGuard
- groupId always sourced from controller via getEffectiveGroupId(req) —
  never looked up via DB unless in a background job, BullMQ processor,
  seeder, or script where no req object exists
- All new Prisma models must have groupId as plain String column
  with @@index([groupId]) — populated at insert time from controller
- If a DB lookup fetches other fields AND groupId is needed, add
  groupId to the existing select — never add a separate lookup
- On create operations where record ID is needed before DB insert
  (e.g. for Cloudinary path), pre-generate using createId() from
  @paralleldrive/cuid2 and pass to prisma.create({ data: { id: ... } })
- Response format: { data, message, statusCode }
- Errors via NestJS built-in HttpException

### Cloudinary Rule (critical)
- All uploads must use fileuploadService.buildAssetPath() —
  never pass a raw folder string to uploadFile()
- Path structure: groups/{groupId}/entities/{entityId}/{category}
- groupId for the path always comes from controller via
  getEffectiveGroupId(req) — never from a DB lookup
- For create operations where record ID does not exist yet,
  pre-generate using createId() from @paralleldrive/cuid2

### Frontend Pattern (Next.js)
- Pages live in: apps/web/src/app/(dashboard)/[feature]/page.tsx
- API calls via: apps/web/src/services/[feature].service.ts
- Components in: apps/web/src/components/[feature]/
- Use existing shadcn components before creating new ones
- All API errors handled with toast notifications

### Server-Side API Call Pattern
All server-side fetches (layouts, page.tsx, server components)
must derive the URL from request headers — never hardcode:

  const protocol = headersObj.get("x-forwarded-proto") || "http";
  const host = headersObj.get("host");
  const url = `${protocol}://${host}/backend${path}`;

This works because Nginx sets x-forwarded-proto and host headers
in production, and Next.js rewrite handles it in local dev.

### Client-Side API Call Pattern
Browser fetch calls use relative URLs only:
  fetch('/backend/auth/whoami')
Next.js rewrite (dev/Docker) or Nginx (production) handles routing.
Never use absolute URLs in client-side fetch calls.

### WebSocket Pattern
Use getWebSocketUrl() which derives from window.location.host
in the browser and NEXT_PUBLIC_WS_URL as fallback for localhost.
WebSocket connects to /{namespace} — routed by Nginx in production.

### Currency & Typography
- Amounts: `fmtAmount(amount, sym)` with `sym = useEntityCurrencySymbol()`
  from `lib/api/hooks/useCurrencyFormat.ts` — never a local formatter
- When porting a reference design, take its layout/functionality only;
  keep the app's fonts and existing component styles (no `font-mono`,
  uppercase/tracking labels, or new type scales)

### Figma to Code
- Match spacing and layout exactly
- Use existing color tokens from tailwind.config — no hardcoded colors
- Mobile first — all screens must be responsive
- Always check existing components before creating new ones

## Key Design Decisions

### Subscription Gating
In standalone mode, all subscription feature gates must return true automatically.
Check DEPLOYMENT_MODE in the subscription/permission service before evaluating
any plan-based access. No subscription records, plan management UI, or upgrade
prompts are needed in standalone mode. Menu items and modules are unlocked purely
based on user permissions in standalone.

## Server Environment Files

These files are gitignored and must be created manually on each server before running docker compose.

### deploy/saas/.env
Contains the compose variable substitutions for the SaaS stack:
```
DB_NAME=xfinance
DB_USER=postgres
DB_PASSWORD=<strong-random-password>
```

### Full app env files (SaaS server only)
The full application env files must also be created manually on the SaaS server:
- `apps/api/.env` — all NestJS env vars (gitignored)
- `apps/web/.env` — all Next.js env vars (gitignored)

### deploy/standalone/.env
The only .env file standalone clients need — covers both compose variable
substitutions and the full app configuration. See `deploy/standalone/.env.example`
for all required values.

None of these files are ever committed. Use the corresponding `.env.example`
files as templates.

## Standalone Deployment Checklist

Steps required for every fresh standalone setup before the app is usable:

1. Set `DEPLOYMENT_MODE=standalone` and `DEFAULT_GROUP_ID=<id>` in the environment.
2. Run Prisma migrations: `npx prisma migrate deploy`
3. **Run the modules seeder**: `npx ts-node apps/api/seeders/seed-modules.ts`
   - `getAvailableModules()` returns `prisma.module.findMany()` in standalone mode.
     If the modules table is empty, all menus will be blank even though access
     is technically granted.
4. Run any other required seeders (account chart, entity accounts, etc.)
5. Run `npm run setup:standalone` with `STANDALONE_GROUP_NAME` and
   `STANDALONE_GROUP_EMAIL` set in env. Copy the printed group ID into
   `DEFAULT_GROUP_ID` in `.env`, then restart the app.
6. If migrating an existing deployment onto the statutory-deduction seeding
   added in Goal 21, backfill default deductions onto all existing entities:
   `npm run backfill:statutory-deductions` (from `apps/api/`, idempotent, safe
   to re-run — new entities get these seeded automatically on creation).
7. If migrating an existing deployment onto the payroll journal-posting added
   in Goal 22, run, **in this order** (both idempotent, safe to re-run; new
   entities get all of this automatically on creation):
   `npm run backfill:payroll-accounts` (from `apps/api/`; adds the
   PAYE/Pension/NHF/NHIS/Other-Deductions Payable accounts to every group's
   chart and every entity), then `npm run backfill:statutory-deductions`
   (links each entity's statutory deductions to its new payable accounts —
   must run after the accounts exist, or the links are silently skipped with
   a warning and approval postings will fail to balance).
8. If migrating an existing deployment onto the fixed-asset categories added in
   Goal 23, run `npm run backfill:asset-categories` (from `apps/api/`,
   idempotent — skips any entity that already has asset categories; new
   entities get the defaults automatically on creation).

## Settings Module — Conventions

### Settings backend folder: `apps/api/src/settings/`
Each settings sub-feature lives in its own subfolder, registered in `app.module.ts`.
Existing subfolders: `organization/`, `config/`, `department/`.
Route prefix convention: `settings/<feature>` (e.g., `settings/department`, `settings/payroll/statutory-deductions`).

### Department (COMPLETE — both ends)
- Prisma model `Department` with groupId, entityId, status enum, `employees Employee[]` relation, `supplyIssueHistory SupplyIssueHistory[]`
- Employee model has optional `departmentId String?` + `dept Department? @relation(onDelete: SetNull)`
- Migration: `20260416000000_department_model`
- Backend CRUD at `settings/department` — controller, service, DTO, module all in `apps/api/src/settings/department/`
- Frontend: `apps/web/components/features/user/settings/department/` — index, DepartmentForm, DepartmentColumn, DepartmentActions
- Service: `apps/web/lib/api/services/settingsService.ts` (shared settings service)
- Hook: `apps/web/lib/api/hooks/useSettings.ts` (shared settings hook)
- Mounted inside `Organization.tsx` below `<OrganizationForm />`

---

### C. Other Settings Pages (product, purchases, sales, setupConfig)

Frontend components exist for these but backend endpoints may not. These were NOT in scope — do not work on them unless asked.

---

## Completed Goals

- [x] **Goal 1** — Add DEPLOYMENT_MODE switch to NestJS TenantService
- [x] **Goal 1.5** — Folder restructure done (apps/api and apps/web); backfill groupId on all existing DB rows (migration `20260410150000_backfill_group_id`)
- [x] **Goal 2** — groupId added as plain String column (no Prisma relations, indexed) to all 32 major Prisma models; promoted to non-nullable (migration `20260410145246_make_group_id_non_nullable`); all service create calls updated; TSC exit 0
- [x] **Goal 3** — `RolesGuard` throws `NotFoundException` (404) in standalone for superadmin-only routes; `SubscriptionService` gates (`hasModuleAccess`, `getAvailableModules`, `checkUserLimit`, `checkEntityLimit`, `checkTransactionLimit`, `checkStorageLimit`) early-return allowed/true in standalone; TSC exit 0
- [x] **Goal 4** — Restructure Cloudinary uploads to `groups/{groupId}/...` path; `buildAssetPath()` added to `FileuploadService`; all 12 `uploadFile()` callers updated; groupId passed from controller (no DB lookup)
- [x] **Goal 4b** — Cleanup: removed all pure-groupId entity DB lookups added during Goal 2 from 13 service files; controller passthrough pattern applied throughout; `journal-posting.createJournalEntry` left (BullMQ exception); TSC exit 0
- [x] **Goal 5** — Dockerfiles for API (node:24-slim + Chromium/Puppeteer via apt-get) and web (node:24-alpine, standalone output, build-time ARGs for API_URL and ENABLE_REWRITE)
- [x] **Goal 6** — deploy/saas/docker-compose.yml, deploy/standalone/docker-compose.yml (with Watchtower), scripts/backup.sh, deploy/standalone/.env.example, deploy/standalone/README.md with Nginx config
- [x] **Goal 7** — .github/workflows/deploy.yml: parallel api+web builds → :latest + :sha → auto-deploy to SaaS on push; manual trigger for :stable and per-client tags
- [x] **Goal 8** — deploy/standalone/ folder complete with .env.example and README
- [x] **Goal 9** — Department model + full CRUD (backend + frontend); Employee.departmentId relation; migration `20260416000000_department_model`; mounted in Organization settings page
- [x] **Goal 10** — Store inventory restock/issue: RestockForm + SingleIssueForm per-row in StoreInventoryTable; RestockHistoryTable switched from mock data to real API; IssueHistoryTable page-state bug fixed; restock service now validates supply + updates quantity in transaction; bulkCreate issue now handles department/project ID resolution (was TODO comment); restock controller extracts restockedBy from auth user
- [x] **Goal 11** — Payroll deductions CRUD: `StatutoryDeduction` + `OtherDeduction` Prisma models with enums; `Account.statutoryDeductions` back-relation; migration `20260417000000_deductions_and_disabled_modules`; full backend CRUD at `settings/payroll/statutory-deductions` and `settings/payroll/other-deductions`; both registered in app.module.ts; TSC exit 0
- [x] **Goal 14** — Bank reconciliation fully wired: Prisma migration `20260417130000_bank_reconciliation` adds `BankReconciliation`, `BankStatementTransaction`, `BankReconciliationMatch` models + `BankReconciliationStatus` enum + `clearedInReconciliationId` on `AccountTransaction`; 5 new backend endpoints (`GET /reconciliations`, `GET /reconciliations/active`, `PUT /reconciliations/draft`, `POST /reconciliations/complete`, `POST /reconciliations/import`); frontend wired to real data — `ReconciliationPage` uses `useActiveReconciliation`; both panels load/save real state; book panel can post to GL (`POST /banking/accounts/:id/transactions`); CSV import parses and returns transactions; draft/complete uses `PUT`/`POST` with full-state payload; completed reconciliation marks book txs as cleared via `clearedInReconciliationId`; `AddBookTransactionModal` created; summary logic: `statementBalance = statementEndingBalance (fixed)`, `bookBalance = sum(checked book txs)`, `difference = statementBalance − bookBalance`

- [x] **Goal 13** — Admin dashboard Phase 1: group-scoped analytics backend (`GET /analytics/group/dashboard` — KPIs, monthly trend, entity performance) + frontend wired (`useAdminDashboard` hook, AdminStatsGrid, RevenueAndProfitTrendChart, EntityPerformanceChart all use real data with 5-min cache); ConsolidationStatusChart + FXImpactSummaryCard remain mock pending schema additions (see TODO below)

- [x] **Goal 24** — Reports completion + payroll/tax fixes (2026-09-18).
  - **Report export (all reports):** one `POST /reports/export?format=pdf|csv` renders a table payload the page builds from its on-screen data. PDF goes through the existing `PdfService` with a new generic `pdf/templates/report.hbs` (payslip styling, entity/group logo + brand colour resolved server-side, `landscape` option added to `PdfService.generate`); CSV follows the payroll/PAYE server-built CSV pattern (UTF-8 BOM for Excel, raw numbers, formula-injection guard). Frontend: `lib/reports/export-types.ts`, `useExportReport`, `ReportExportButtons` (Print = PDF in a new tab, Export = PDF / Excel CSV) wired into all 27 entity reports and all group reports — previously every Print/Export button had no handler.
  - **Entity reports:** added Cash Flow Forecasting, Movement of Equity, Sales Tax Summary, Tax Liability (`GET reports/cash-flow-forecasting|movement-of-equity|sales-tax-summary|tax-liability-report`). Sales by Salesperson hidden (`HIDDEN_REPORT_KEYS` in `ReportsColumn.tsx`) — no salesperson in the data model. Fixed broken `supplies-inventory-report` link. Fixed Payable Summary / Aged Payables / Vendor Balances reading bill payments from `PaymentRecord` (never written) instead of `PaymentMade` — every bill showed fully unpaid.
  - **Group reports** (were a static mockup): `apps/api/src/reports/group/` — `GroupCurrencyService` presents everything in the group primary currency, converting each entity (Settings.baseCurrency → Entity.currency) with `GroupCurrency.exchangeRate` (units per 1 base, so base = amount ÷ rate, current rate). An entity with no rate is **excluded with a warning** (never treated 1:1). Endpoints (admin/superadmin only via RolesGuard): `GET reports/group/context|profit-and-loss|balance-sheet|cash-flow-statement|entity-comparison|cash-flow-forecast`, all reusing the entity `ReportsService` methods per entity. Frontend: categorised list + `@admin/reports/[key]` route with Consolidated P&L / Balance Sheet / Cash Flow / Financial Position, Entity Revenue / Profitability / Expense Comparison, Group Cash Flow Forecasting (`components/features/admin/group-reports/details/`). No eliminations (no intercompany data yet).
  - **Intercompany temporarily hidden:** menu via `HIDDEN_GROUP_MODULE_KEYS` in `apps/api/src/menu/menu.service.ts`; group report via `HIDDEN_GROUP_REPORTS` in `GroupReportsColumn.tsx`. To restore: remove `'intercompany'` / `'intercompany-transactions'` from those lists and redeploy (menu + whoami caches expire in 5 min); the intercompany report page still needs building.
  - **Payroll:** "Post to Ledger" action (`PATCH hr-payroll/payroll/:id/post`) for Approved batches that never posted (approved before Goal 22) or failed. The approval posting job is now idempotent (claims the batch with a guarded `updateMany` inside the posting transaction), so re-posts, retries and duplicate jobs can never write a second journal. Mark as Paid now lists all Cash & Cash Equivalents accounts (not only bank accounts) and shows the entity currency.
  - **Sales tax:** was hardcoded 10% (invoices/receipts; receipt edit silently zeroed it; invoice detail page recomputed 10% client-side; receipt form showed no tax at all while the server added 10%). Now per-document `taxRate` (migration `20260918000000_sales_tax_rate`: `Invoice.taxRate`/`Receipt.taxRate` added and backfilled to 10 where tax > 0; `Settings.taxRate` Int→Float so 7.5% works), defaulting to Settings > Sales "Default Sales Tax Rate"; applies to taxable items (receipts: plus free-text lines). Shared logic in `src/sales/sales-tax.util.ts`.
  - **Known data issues found (not fixed):** Jaycee Foods' ledger has an unbalanced bank posting (ref `BCH/112025`, Cr ₦135,000 vs Dr ₦45,000) so its balance sheet is out by ₦90,000; `BankingService.addTransaction` still allows single-sided entries (no offset account) and moves `Account.balance` opposite to the ledger row for withdrawals; `Account.balance` has drifted from the ledger on VAT 2140-01 and two bank accounts. Reports read the ledger, so they are consistent with each other.

## TODO (pending data / schema additions)

- [ ] **Admin dashboard Phase 2** — ConsolidationStatusChart: replace mock with real data once a consolidation tracking concept exists in the schema (e.g. a `ConsolidationRun` model with status). FXImpactSummaryCard: replace mock once currency fields are added to invoices/transactions and an FX rates table is introduced. QuickActions: wire buttons once consolidation/FX workflows are defined.

- [x] **Goal 12** — Entity module toggle: `Entity.disabledModuleIds String[]` added; `PATCH settings/modules/menu-toggle` endpoint (finds all optional modules by menu name, updates disabledModuleIds, busts `ctx:groupId:*` + `menu:groupId:*` cache, publishes `whoami-invalidate:groupId` for real-time sidebar update); `getModulesByScope?optional=True` now returns `isMenuVisible` per entity; `MenuService.buildEntityMenu` filters out disabled modules (applies to all users incl. superadmin); frontend updated to single menu-level call (no per-module loop, no race condition)

- [x] **Goal 15** — Per-group customization (logo, theme color, login bg): `GroupCustomization` Prisma model + migration `20260420000000_group_customization` (includes data migration inserting `groupCustomization` module into Admin menu); backend `GET/PATCH /settings/customization` (protected) + `GET /public/customization` (no auth, host-header based, SSR-safe via `X-Forwarded-Host`); customization included in `whoami` response (cached 1h); `ThemeProvider` client component injects `--primary/--primary-foreground/--ring/--sidebar-primary` CSS variables from session store on every whoami change; login page fetches customization server-side → injects inline `<style>` tag (zero flash); realtime: `customization-invalidate:{groupId}` pubsub → gateway broadcasts `customization-changed` socket event → `useRealtimeSync` updates session store → CSS vars update instantly for all logged-in group members; `fileuploadService.buildAssetPath` extended with group-level `category` support (`groups/{groupId}/{category}`); hardcoded brand-color classes (`text-[#2d3a7b]`, `bg-[#3B4FEA]`, `bg-[#5D7DD4]`, `text-primary` in sidebars) replaced with `text-primary`/`bg-primary`/`bg-primary/10` etc.; Customization tab added to `@admin/admin/` route; works in both SaaS and standalone modes.

- [x] **Goal 16** — Subdomain-based login restriction: login validates host subdomain; users may only authenticate on their group's subdomain; `admin` subdomain only allows systemRole=superadmin; unknown subdomain returns 404 with clear message; frontend login page surfaces subdomain errors distinctly.

- [x] **Goal 17** — Image upload 413 fix: client-side file size validation on customization logo/loginBg uploads with human-readable max-size message; prevents 413 before hitting the server.

- [x] **Goal 18** — Group logo → customization sync: on group create/update when a logo is uploaded, also upsert `GroupCustomization.logoUrl/logoPublicId` so both use the same Cloudinary asset — one source of truth.

- [x] **Goal 19** — Entity currency → Settings.baseCurrency sync: on entity create/update when `currency` is set, upsert `Settings.baseCurrency` for that entity so entity form and config settings share one source of truth.

- [x] **Goal 20** — Audit logging system: `AuditLogInterceptor` already globally registered; improved module extraction (first 1-2 meaningful path segments, skips IDs/UUIDs); now also captures `impersonatedGroupId`/`impersonatedEntityId` from request headers; `GET /audit/logs` uses auth-context groupId (not query param), includes entity name, supports page/limit; `GET /audit/modules` returns distinct module names for filter; frontend `AuditTrail` fully wired with module/entity/action/date-range filters + clear button, pagination, detail sheet on row click showing all fields including changes JSON, IP, userAgent, impersonation context; `auditService.ts` + `useAudit.ts` hooks added.

- [x] **Goal 21** — PAYE recalculated to match the Nigeria Tax Act 2025 progressive bands (effective 2026): new `PayrollService.computeAnnualPaye()` shared helper (rent relief `MIN(20%×annualRent, 500000)` + active eligible statutory deductions reduce chargeable income *before* tiered tax bands apply) replaces three previously-diverging implementations — `getPrefillData` was applying tiered tax to raw monthly salary (no annualization), `buildDeductionBreakdown` (the one that actually produced payslip/netPay figures) skipped the chargeable-income step entirely and taxed annualized gross directly, and `getPayeReport` had the only correct version but used inconsistent FIXED_AMOUNT annualization and threshold units; all three now share one implementation. `statutoryDed` on `PayrollRecord` is now always server-computed from `buildDeductionBreakdown` (the frontend's "Statutory Ded." field became a display-only summary — editing it client-side had no effect and was misleading). `PayrollRecord.deductionBreakdown` JSON now carries a `payeDetail` block (rent relief, chargeable income, per-band tax amounts) so `payslip.hbs` renders a full itemized per-employee breakdown (each statutory/other deduction on its own line, plus a "how your tax was calculated" section) instead of one lumped "Statutory Deductions (PAYE, NHIS, Pension)" line — the old template also had a bug where "Total Deductions" only showed `statutoryDed`, ignoring `otherDed`, now fixed via a server-computed `deductionsTotal`. New idempotent seeder `seed-statutory-deductions.ts` (NHF 2.5%, NHIS 1.75%, pension 8%, PAYE tiered) hooked into the existing `create-entity-user` BullMQ job so every new entity gets these automatically instead of an admin hand-building the tiered PAYE table; `backfill-statutory-deductions.ts` seeds existing entities. Added an active/inactive `Switch` to `StatutoryDeductionForm`/`OtherDeductionForm` — the `status` column and its calculation-time filtering already existed end-to-end, but no UI could actually change it.

- [x] **Goal 22** — Payroll journal posting: approving a batch now posts a balanced double-entry journal (Dr Salaries & Wages Expense = total gross; Cr each statutory deduction's linked payable account, grouped/summed across every employee in the batch; Cr a new "Other Deductions Payable" for the lump other-deductions total; Cr Wages Payable = total net pay), and a new "Mark as Paid" action (3-dot menu, only once posting succeeds) posts Dr Wages Payable / Cr the chosen bank account. Built as two new `bullmq.processor.ts` handlers (`handlePayrollApprovalPosting`, `handlePayrollPaymentPosting`) following the project's actual live posting convention exactly (`resolveAccountMeta`/`balanceDelta`, `Journal` + `AccountTransaction` rows, `postingStatus`/`journalReference`/`errorMessage` tracking) — not `JournalPostingService`, which despite looking like the natural place for this turned out to be dead scaffolding with no live caller (its only real caller, `invoice.service.ts`, has the call commented out); this was confirmed by tracing every caller before writing a line of posting code, after an initial wrong claim that posting "doesn't work" in this codebase got corrected. New `PayrollPayment` model mirrors `PaymentMade`'s relationship to `Bills`. `PayrollBatch` gained `postingStatus`/`journalReference`/`postedAt`/`errorMessage`/`errorCode`/`netPayableAccountId`; `PayrollStatus.Paid` and two `AccountTransactionType` values added. `changeStatus()` now resolves and validates every account the posting needs *before* committing the status change, so a missing default account fails the request atomically instead of leaving a batch marked Approved with nothing posted; also blocks any further status change once Approved/Paid, closing a gap where an approved-and-posted batch could previously be silently reset to Pending/Rejected. Found and fixed a real bug while building this: `seed-account-chart.ts` only created subcategories inside the `if (!category)` branch, so adding new subcategories to an *existing* category (true for every pre-existing group) and re-running did nothing — subcategory creation now runs unconditionally, which is what let the 5 new payable accounts backfill onto existing groups at all. New accounts (PAYE/Pension–Employee/NHF/NHIS/Other Deductions Payable, codes 2160/2170/2180/2190/2195) reuse the chart's pre-existing "Wages Payable" (2120) and "Salaries & Wages" (5210) rather than adding duplicates. `seed-statutory-deductions.ts` now links each deduction's `accountId` (existing field, previously never populated) to its matching account by code, filling it in on already-existing rows without touching one an admin has customized. Two new backfill scripts (`backfill-payroll-accounts.ts`, must run before `backfill-statutory-deductions.ts`). Verified end-to-end against the dev DB (not just tsc): approved a real batch and confirmed the journal balanced and account balances updated correctly (₦520,000 gross split exactly across NHF/NHIS/Pension/PAYE/Wages Payable), then marked it paid and confirmed the reversing Dr Wages Payable / Cr Bank entry zeroed the payable out. **Prod-transition hardening** (prod already had Goal 21's deductions seeded *without* `accountId`, and in-flight batches whose snapshots lack it): approval falls back to the deduction's *current* `accountId` when a snapshot line has none (verified in-memory with real deduction IDs — balances exactly); any line still unresolvable, or any record whose itemized lines don't sum to its `statutoryDed` (pre-breakdown records), is rejected *before* the status changes with a message naming the deduction / telling the admin to re-save the batch — so these fail loudly and synchronously instead of as a background `Failed`. Re-running `backfill:statutory-deductions` on prod is safe: it only fills missing `accountId`s, and now also refuses to create a default whose name is missing but whose type/rate matches an existing deduction (a probable admin rename — creating it would double-deduct every employee), logging a `⚠` instead. Discovered the BullMQ queue has **no retry policy at all** (no `defaultJobOptions`, `addJob` passes none), so every `// Rethrow to trigger retry` comment in the processor is false; the two payroll posting jobs now pass `attempts: 3` + exponential backoff explicitly (safe — each handler is one atomic transaction). Deliberately did *not* add a global default, since `send-payslip-emails` isn't idempotent. Batches approved in prod *before* this deploy were never posted and are left as-is (`postingStatus` defaults to `Pending`) pending a decision on whether to post them retroactively.

- [x] **Goal 23** — Fixed-asset categories + depreciation schedule: new `AssetCategory` model (name, `depreciationRate` % of cost, unique per entity) and `Asset.categoryId` (nullable, `onDelete: Restrict`), plus `Asset.openingAccumulatedDepreciation`/`openingAccumAsOf` for legacy assets carried over from previous books; `Asset.assignedId` relaxed to optional (migration `20260916000000_asset_categories`). Depreciation convention (agreed with the business): straight-line on cost at the category rate, **full year's charge in the fiscal year of purchase**, accumulated capped at cost, schedule shows the **full charge for the current fiscal year** (not YTD). Fiscal year derived from `Entity.yearEnd`, which is stored inconsistently ("December 31" from the UIs vs "12-31" per the API DTO) — `parseYearEnd` accepts both and falls back to Dec 31. All maths is pure and unit-tested in `assets-inventory/asset/depreciation.util.ts` (+ spec). `currentValue` is now **computed on read** (cost − accumulated depreciation) everywhere; the column is only a snapshot written on create/update — previously it was a hand-typed number that never changed (and a blank field saved ₦0). Endpoints: `GET/POST asset-categories`, `PATCH/DELETE asset-categories/:id` (delete refused while assets use it; duplicate name → 409), `GET asset-categories/schedule` (per-category Opening Bal. / Addition / Total Cost / Depr. % / Depr. in Year / Opening Accum / Total Accum, plus a trailing "Uncategorised" row so totals reconcile with the register); `GET asset` now honours `search` (name/serial/category) and `categoryId` (incl. `uncategorised`) and returns `summary.totalCost/uncategorised/fullyDepreciated/fiscalYear`. Fixed while here: `PATCH asset/:id` didn't scope by entity (could update another entity's asset), errors were all rewrapped as 500, `UpdateAssetDto` fields lacked `@IsOptional`. Frontend (reference UI/functionality only — styled with the app's existing fonts, card/table/alert styles and the shared `fmtAmount(amount, useEntityCurrencySymbol())` currency helper; no font-mono or custom typography): "Asset Categories | Asset Register" toggle inside the Fixed Assets tab; clicking a category filters the register (with clear-filter chip); simplified asset form (name, category select showing rate, status, cost, date; opening-accumulated field only appears for purchase dates before the current fiscal year start); category create/edit/delete in the categories view; data-driven attention banner (uncategorised → Review filters to them; fully depreciated); register CSV export (was a dead button). Defaults (Motor vehicle 20%, Plant & Machinery 15%, Furniture & Fittings 10%, Office Equipment 10%, Office Building 2%) seeded by `seed-asset-categories.ts` via the `create-entity-user` job; `backfill:asset-categories` for existing entities. Not in scope yet: posting depreciation to the GL (1250 Accumulated Depreciation / 5260 Depreciation Expense exist in the chart), disposals, and a past-fiscal-year selector.

## Rules for the Agent
- Never modify the database directly — only via Prisma migrations
- Always ask before making breaking changes to existing API contracts
- Keep all existing features working in both deployment modes

## CV / experience log

The engineering work on this project is tracked for CV-building purposes in `~/projects/me/my-experience.md`, under its `## X-Finance` section (that file has one section per project across everything the user works on — see `~/projects/me/status.md` for the cross-project tracker this belongs to). Whenever a session produces a new learning point worth that file — a non-trivial architectural/domain-modeling decision (and the reasoning), a hard bug diagnosed and fixed (this is financial software — ledger/balance correctness bugs are especially worth capturing), a data-integrity or migration issue solved, a security fix, or a piece of engineering process enforced — append a concrete entry to that section before ending the session. Create the section if it's missing. Write entries as resume-bullet-ready facts: specific problem → specific solution → specific impact, not generic summaries, and not anything already fully covered there. Don't touch other projects' sections in that file.
