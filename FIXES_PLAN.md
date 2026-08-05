# XFinance — Fix Plan (2026-08-05)

Tracking file for the current round of fixes. Mark `[x]` when done. Work happens top to bottom unless a dependency forces reordering (shared combobox component must land before the free-text vendor/customer/line-item work that depends on it).

Scope note on the searchable combobox (per user instruction): replace `<Select>` with the searchable combobox **in regular user-facing forms, mainly account pickers and similar long lists**. Do **not** touch Select components in the sidebar (entity-switcher) or in superadmin-only screens (e.g. master-chart-of-accounts group picker, other superadmin panels).

---

## Quick fixes

- [x] **1. Receipt No. column bug** — `apps/web/components/features/user/income/sales-receipt/SalesReceiptColumns.tsx:33` renders `id` (cuid) instead of `receiptNumber`. One-line key swap.

- [x] **2. Remove Opening Balance from bank creation** — strip field from `apps/web/components/features/user/banking/BankForm.tsx` (zod field, defaultValues, JSX card lines ~288-316, submit payload), remove from `CreateBankAccountDto`/`UpdateBankAccountDto` (`apps/api/src/banking/dto/`), remove the opening-balance-creation block in `BankingService.createBankAccount()` (`banking.service.ts:101-124`). Opening balances only ever get created via the dedicated Opening Balance module going forward.

- [x] **3. Account name → linked bank name sync** — done. `AccountService.update()` now updates `BankAccount.accountName` when a bank-linked account is renamed.

- [x] **4. Account delete guard fix** — done, plus a related bug found and fixed: `BankingService.deleteBankAccount()` was deleting the parent `Account` before the child `BankAccount`, which would always throw a FK violation (`ON DELETE RESTRICT`) — this is very likely the actual cause of "delete blocked on mere linking." Fixed the delete order (wrapped in `$transaction`, child-then-parent) in both `banking.service.ts` and the new `AccountService.delete()` logic, which now checks real `accountTransactions` count instead of catching any FK error generically.

- [x] **5. Rename "Sales Receipt" → "Income Receipt" in UI text** — done. Updated `SalesReceiptHeader.tsx`, `SalesReceipts.tsx`, `SalesReceiptDetails.tsx`. Sidebar label IS DB-seeded (`Module.displayName`, key `salesReceipt`) — updated `seed-modules.ts` + `update-module-sort-orders.ts`, and added migration `20260805000000_rename_sales_receipt_module` to rename it on already-seeded deployments. Component/route/file/moduleKey names left as-is per scope.

---

## Shared component work

- [x] **6. Extract shared searchable combobox** — done. Built `components/ui/searchable-combobox.tsx` (generic `SearchableCombobox`), refactored `ItemSelector.tsx` to wrap it (also fixed a latent bug: cmdk search was filtering by item id instead of name). Applied to account-picker `<Select>`s in: `ManualJournalForm`, `OpeningBalanceForm`, `ChartOfAccountsForm` (type/category/subcategory), `ExpensesForm`, `PaymentMadeForm`, `BillsForm` (payable + line-item accounts), `BulkExpenseModal` (per-row account), `CreateBookEntryModal`, `SetBudgetForm`, `StatutoryDeductionForm`, `ItemsForm`. Excluded sidebar (entity-switcher) and superadmin screens (master-chart-of-accounts `AccountForm.tsx`, admin users/roles, audit trail) per scope.

- [x] **7. Fix zod "stuck at 0" bug** — done. Root cause confirmed and fixed at the source: `.default(0)`/literal-`0` defaultValues combined with `onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}` handlers, which snap any cleared field straight back to `0`. Fixed in: `OpeningBalanceForm`, `ManualJournalForm` (debit/credit — now `.optional()`), `ExpensesForm` (amount, tax), `PaymentMadeForm` (amount), `StoreSupplyForm` (unitPrice, quantity, minQuantity), `ProjectsForm` (budgetedRevenue, budgetedCost), `ProjectTeamMemberForm` (monthlyRate), `ProjectMilestoneForm` (budget), `AddTransactionModal`, `AddBookTransactionModal`, `CreateBookEntryModal` (amount). Defaults now `undefined` (shows placeholder), zod's own required/positive checks still enforce entry on submit — verified no other `.default(0)` patterns remain app-wide.

- [x] **8. Live thousands-separator formatting on number inputs** — done. Built `components/ui/number-input.tsx` (`NumberInput`, UI-only formatting, emits raw numeric value or `undefined`, same payload sent to backend as before).

**Follow-up full sweep (2026-08-05):** the first pass missed the sales/income receipt line-item rate & quantity fields (still raw `<Input type="number">`) and used a grep too narrow to catch every occurrence — `Number(e.target.value)` with no `|| 0` still reproduces the bug because `Number("") === 0` in JS. Did a second, complete app-wide sweep: fixed `SalesReceiptsForm.tsx` (rate/quantity), plus 23 more files (CurrencyForm, SubscriptionSettingsTab, CreatePlanForm, ProcessPayrollForm, BulkIssueSuppliesForm, RestockForm, SingleIssueForm, ReconciliationSetup, AssetsForm, EmployeeForm, InvoiceForm, PaymentReceivedForm, InventoryForm, StoreItemProductForm, StoreItemServiceForm, MakeBillPayment, OtherDeductionForm, and others) — every genuine numeric form field app-wide now uses `NumberInput`. Deliberately left unconverted: fields already typed as `z.string()` end-to-end with no forced re-coercion (CreateForecastForm, SetGroupBudgetForm, PurchasesForm, SalesForm, CustomerForm's creditLimit) — these don't exhibit the bug since RHF just stores the raw string; a Recharts `<XAxis type="number">` (not a form field); and a non-functional static mockup (BudgetFormDummy).

Also caught and fixed a **regression the sweep itself introduced**: several per-row quantity fields (RestockForm, BulkIssueSuppliesForm, SingleIssueForm, ProcessPayrollForm's 6 payroll fields) had a business-rule floor (e.g. `Math.max(1, ...)`) applied *synchronously inside the onChange handler*, which snaps the field right back to a non-zero value the instant it's cleared — the same class of bug, just relocated. Fixed by deferring the floor/clamp to submit time (or, for ProcessPayrollForm's live net-pay preview, computing the preview with a `|| 0` fallback without touching the field's own stored value), so the field can now actually sit blank while being edited.

---

## Feature / schema work

- [x] **9. Group-level Chart of Accounts — add Account creation with multi-entity select** — done. Added `"account"` mode to `AccountForm.tsx` alongside category/subcategory, with category→subcategory cascading selects (existing `<Select>`s untouched, no combobox swap per scope), plus a checkbox-list entity picker with "Select all/Clear all". Backend: new `POST /account/bulk-for-entities` (`CreateAccountForEntitiesDto`, `AccountService.createForEntities`) validates all `entityIds` belong to the resolved group then creates one account per entity, following the same `getEffectiveGroupId(req) ?? dto.groupId` pattern as `account-category`. Entity list source: new `GET /entities/by-group/:groupId` (superadmin-only) for the superadmin explicit-group-picker case, existing `useEntities()` (effective-group) for group admins.

- [x] **10. Expense form — vendor free text** — done. Migration `20260805010000_expense_vendor_name` adds nullable `Expenses.vendorName`. Built shared `components/ui/creatable-combobox.tsx` (`CreatableCombobox` — search existing options, or "Use '<text>'" to free-type). Wired into `ExpensesForm.tsx`'s vendor field: selecting an existing vendor sets `vendorId` + clears `vendorName`, typing free text does the reverse; both are now optional (no longer required) matching `vendorId` already being optional in the DTO/schema. `CreateExpenseDto`/`UpdateExpenseDto` updated. `ExpenseViewModal` and `ExpensesColumns` fall back to `vendorName` for display when no linked vendor record exists.

- [x] **11. Income Receipt — customer free text** — done. Migration `20260805020000_receipt_customer_optional` makes `Receipt.customerId` optional (FK changed `CASCADE`→`SET NULL` so deleting a Customer no longer deletes their receipts) + adds nullable `customerName`. DTO/service updated (list transform + create/update no longer overwrite free-text name with linked customer's name). Customer `<Select>` swapped for `CreatableCombobox`.

- [x] **12. Income Receipt line items — free text + rate bug fix** — done. Migration `20260805030000_receipt_item_free_text` makes `ReceiptItem.itemId` optional (FK `RESTRICT`→`SET NULL`) + adds nullable `itemName`. Line-item picker swapped from `ItemSelector` to `CreatableCombobox` (pick existing item or type free text). Rate field bug fixed: was hardcoded `disabled={true}` unconditionally — now `disabled={!!itemId}`, i.e. locked/auto-filled only when a real catalog item is selected, editable for free-text items. Also removed the "Add Item" button's `fields.length < items.length` cap, since free-text lines aren't bounded by catalog size. `SalesReceiptDetails.tsx` line-item display now falls back to `itemName`. Also fixed a journal-posting bug this exposed: `handleReceiptJournalPosting` (`bullmq.processor.ts`) `continue`d past any item with no matching `Items` record (i.e. every free-text item), so the debit (full receipt total) would never balance against the credit side and posting would throw "Journal entry does not balance." Free-text items now default to service revenue instead of being skipped.

- [x] **13. Bulk Income** — done. New `BulkIncomeModal.tsx` mirrors `BulkExpenseModal.tsx`'s 4-step upload→map→preview→import flow (fields: date, description, amount required; reference, customerName optional — customerName uses the free-text field from task 11). No per-row account assignment step needed (unlike bulk expense) since a receipt's revenue account is derived automatically at journal-posting time, not selected per line. Backend: `BulkIncomeItemDto`/`BulkImportReceiptsDto`, `ReceiptService.bulkImportReceipts` (creates one Receipt + one free-text ReceiptItem per row, status `Completed`, queues `post-receipt-journal` per row), new `POST sales/receipts/bulk-import`. Wired into the bank details page next to the existing Bulk Expense button.

---

## Notes / risk flags
- Items 10, 11, 12 each loosen a `NOT NULL` FK constraint via migration (additive — old data/behavior unaffected, only relaxing a requirement + adding a new nullable column). Per CLAUDE.md, migrations only — never direct DB edits.
- All groupId/entityId sourcing follows existing controller pattern (`getEffectiveGroupId`/`getEffectiveEntityId`) — no new DB lookups for tenancy scoping.

---

## Post-completion follow-ups (2026-08-05, later same day)

- [x] **Chart of Accounts — Edit action** — `ChartOfAccountsColumn.tsx`/`ChartOfAccountsActions.tsx` only had Delete. Added Edit, deliberately scoped to name + description only (new `AccountEditForm.tsx`, mirrors `DepartmentForm.tsx`'s pattern) — not the full type/category/subcategory cascade. Renaming an account with a linked bank account still cascades to the bank record via the existing `AccountService.update()` fix.
  - **Bug found and fixed during this**: used a bare (non-row-suffixed) modal key for Edit; since `ChartOfAccountsActions` renders once per table row and each holds its own `Dialog`, a shared key opened *every* row's modal simultaneously on any single click — stacked overlays (black backdrop, flicker) and whichever row's data rendered on top looked identical for every row. Fixed by row-suffixing the key (`account-edit-{id}`), matching how Delete already worked.
- [x] **More zero-bug instances found on second sweep** — `ItemsForm.tsx` (unit price), `BillsForm.tsx` (line-item quantity/rate, discount, tax), `StatutoryDeductionForm.tsx` (rate, fixed amount, tiered brackets) all had the same `Number(e.target.value)`-with-no-fallback bug, missed in the original file-list-based sweep. Re-verified with an exhaustive grep for the actual bug signature across the whole app (not a hand-built list) — confirmed nothing else remains.
- [x] **Sales Receipt → Income Receipt, full rename** — beyond the earlier display-name-only migration:
  - New migration `20260805040000_rename_sales_receipt_module_key`: `Module.moduleKey` `'salesReceipt'` → `'incomeReceipt'`. Safe as a single global UPDATE — `Module` is a catalog table (one row per `moduleKey`+`scope`, not per group), and every permission/menu lookup joins to it by `moduleId` FK, never by this string.
  - Updated `seed-modules.ts`, `update-module-sort-orders.ts`, `update-modules-menu.ts`, `seed-subscription-tiers.ts` (found 2 more references here on a full-codebase grep) so fresh installs and re-seeds use the new key.
  - Renamed the Next.js route folder: `app/(dashboards)/@user/income/sales-receipt/` → `.../income-receipt/` (`git mv`, clean rename, both `page.tsx` files use absolute imports so nothing inside needed editing). Confirmed via grep there were zero hardcoded links to the old path anywhere — sidebar route and breadcrumb are both generated dynamically from `moduleKey`, so they update themselves. No redirect, per instruction.
  - Component files/folder (`components/features/user/income/sales-receipt/...`) intentionally left as-is, per instruction.

## Dashboard cache invalidation (2026-08-05, later)

**Reported:** bulk income import doesn't reflect on MTD Revenue on the dashboard.

**Root cause — two layers, both real:**
1. Backend (Redis, 5-min TTL): `AnalyticsService.getDashboardData()` caches under `dashboard:{entityId}:{filters}`, busted via `cacheService.invalidateEntityDashboardCache()`. This part was already correctly wired for `bulkImportReceipts` (and most financial services) — but **`JournalService`** (manual journal create + draft activation) and **`OpeningBalanceService`** (create + reverse — the two paths that actually post to the ledger) never called it at all, despite both directly changing account balances shown on the dashboard. Fixed: injected `CacheService` into both and added the invalidation call at the same point other services use it (right after the balance-affecting transaction commits). `updateOpeningBalance`/`deleteOpeningBalance` intentionally left alone — those only touch Draft (unposted) records, which never affect any account balance.
2. **Frontend (React Query, 5-min `staleTime`): this was the actual cause of the reported symptom.** Audited all four financial hook files — 111 total `invalidateQueries` calls across receipts, invoices, payments, expenses, bills, banking, and accounts — and **zero** of them invalidated the `["dashboard"]` query key. The backend was correctly recomputing fresh numbers the whole time; the browser just never asked for them again until the 5-minute `staleTime` expired naturally.
   Fixed at the root instead of patching 100+ individual mutations one by one (easy to miss one, easy to forget on the next new mutation): added a global `MutationCache` in `QueryProvider.tsx` that invalidates every dashboard-related query key (`dashboard`, `monthlyBreakdown`, `cashFlow`, `expensesByCategory`, `kpis`, `receivableAging`, `payableAging`, `recentTransactions`, `adminDashboard`, `superadmin`) after **any** mutation in the app succeeds. Cheap when the dashboard isn't being actively viewed — invalidation only triggers a refetch for currently-mounted/observed queries.

**Outstanding on the user's end:** none of the above takes effect until migrations are applied — the dashboard error the user is hitting (`Expenses.findMany` — "column does not exist") is the same pending-migration issue from earlier, now compounded by one more migration. Full, current command:

```bash
# Locally
cd apps/api
npx prisma migrate deploy
npx prisma generate
# restart the local API dev server

# Docker/production, after redeploying the updated image
docker compose -f deploy/saas/docker-compose.yml exec api npx prisma migrate deploy
```
