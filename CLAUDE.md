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

## TODO (pending data / schema additions)

- [ ] **Admin dashboard Phase 2** — ConsolidationStatusChart: replace mock with real data once a consolidation tracking concept exists in the schema (e.g. a `ConsolidationRun` model with status). FXImpactSummaryCard: replace mock once currency fields are added to invoices/transactions and an FX rates table is introduced. QuickActions: wire buttons once consolidation/FX workflows are defined.

- [x] **Goal 12** — Entity module toggle: `Entity.disabledModuleIds String[]` added; `PATCH settings/modules/menu-toggle` endpoint (finds all optional modules by menu name, updates disabledModuleIds, busts `ctx:groupId:*` + `menu:groupId:*` cache, publishes `whoami-invalidate:groupId` for real-time sidebar update); `getModulesByScope?optional=True` now returns `isMenuVisible` per entity; `MenuService.buildEntityMenu` filters out disabled modules (applies to all users incl. superadmin); frontend updated to single menu-level call (no per-module loop, no race condition)

- [x] **Goal 15** — Per-group customization (logo, theme color, login bg): `GroupCustomization` Prisma model + migration `20260420000000_group_customization` (includes data migration inserting `groupCustomization` module into Admin menu); backend `GET/PATCH /settings/customization` (protected) + `GET /public/customization` (no auth, host-header based, SSR-safe via `X-Forwarded-Host`); customization included in `whoami` response (cached 1h); `ThemeProvider` client component injects `--primary/--primary-foreground/--ring/--sidebar-primary` CSS variables from session store on every whoami change; login page fetches customization server-side → injects inline `<style>` tag (zero flash); realtime: `customization-invalidate:{groupId}` pubsub → gateway broadcasts `customization-changed` socket event → `useRealtimeSync` updates session store → CSS vars update instantly for all logged-in group members; `fileuploadService.buildAssetPath` extended with group-level `category` support (`groups/{groupId}/{category}`); hardcoded brand-color classes (`text-[#2d3a7b]`, `bg-[#3B4FEA]`, `bg-[#5D7DD4]`, `text-indigo-700` in sidebars) replaced with `text-primary`/`bg-primary`/`bg-primary/10` etc.; Customization tab added to `@admin/admin/` route; works in both SaaS and standalone modes.

## Rules for the Agent
- Never modify the database directly — only via Prisma migrations
- Always ask before making breaking changes to existing API contracts
- Keep all existing features working in both deployment modes
