# Fix Status
_Last updated: 2026-04-30_

---

## DONE ✅

### 1. Dashboard KPI — Active Customers → Outstanding Receivables
Files changed:
- `apps/api/src/analytics/dto/analytics-response.dto.ts` — `KPIDto.activeCustomers` → `outstandingReceivables: { total, change, changePercent }`
- `apps/api/src/analytics/analytics.service.ts` — replaced customer counts with `invoice.aggregate` on `status: ['Sent','Overdue','Partial']`; comparison = same filter + `invoiceDate: { lte: previousMonthEnd }`
- `apps/web/lib/api/services/analyticsService.ts` — `KPIs.activeCustomers` → `outstandingReceivables`
- `apps/web/components/features/user/dashboard/StatsGrid.tsx` — title, icon (ReceiptText), currency value, `isPositive` inverted (lower outstanding = good)

### 2. Reports Backend — GET /reports/profit-and-loss
Files created:
- `apps/api/src/reports/dto/reports.dto.ts`
- `apps/api/src/reports/reports.service.ts`
- `apps/api/src/reports/reports.controller.ts`
- `apps/api/src/reports/reports.module.ts` ← linter added AuthService, MenuService, SubscriptionService, CacheService, PubsubService, BullmqModule (already there, don't revert)
- `apps/api/src/app.module.ts` — ReportsModule registered

TSC: clean (exit 0)

**Endpoint:** `GET /reports/profit-and-loss?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&compareStartDate=?&compareEndDate=?`

**Response envelope:** `{ data: ProfitAndLossDto, message, statusCode }`

**ProfitAndLossDto shape:**
```json
{
  "period":        { "startDate": "...", "endDate": "..." },
  "comparePeriod": null | { "startDate": "...", "endDate": "..." },
  "revenue":            { "actual": 0, "comparison": 0, "accounts": [{ "id","name","code","actual","comparison" }] },
  "otherIncome":        { "actual": 0, "comparison": 0, "accounts": [...] },
  "cogs":               { "actual": 0, "comparison": 0, "accounts": [...] },
  "operatingExpenses":  { "actual": 0, "comparison": 0, "accounts": [...] },
  "otherExpenses":      { "actual": 0, "comparison": 0, "accounts": [...] },
  "grossProfit":        { "actual": 0, "comparison": 0 },
  "operatingProfit":    { "actual": 0, "comparison": 0 },
  "netProfit":          { "actual": 0, "comparison": 0 },
  "kpis": {
    "totalRevenue":    { "actual": 0, "comparison": 0 },
    "grossProfit":     { "actual": 0, "comparison": 0 },
    "operatingProfit": { "actual": 0, "comparison": 0 },
    "netProfit":       { "actual": 0, "comparison": 0 }
  }
}
```

---

### 3. Reports Frontend — Profit & Loss wiring ✅
Files created/updated:
- `apps/web/lib/api/services/reportService.ts` — `getProfitAndLoss(params)`, full TypeScript types (PLSection, PLAccountLine, PLKPIEntry, ProfitAndLossData)
- `apps/web/lib/api/hooks/useReports.ts` — React Query hook `useProfitAndLoss`, queryKey includes all 4 date params, enabled guard
- `apps/web/components/features/user/reports/details/profit-and-loss/index.tsx` — fully rewritten:
  - Uses `useEntityCurrencySymbol()` — no hardcoded currency
  - Quarter selector maps to ISO dates via `quarterToDates()` helper
  - Calls `useProfitAndLoss` hook; loading skeleton + empty state handled
  - `buildPLItems(data)` maps API → PLItem[] tree; `buildKPIItems(data)` builds KPI cards
  - Sections collapse/expand per period change; comparison period fully wired
  - Still imports PLItem/KPIItem *types only* from `./mock-data` (the mock data values are gone)

### 4. Cash Flow Statement — Currency fix ✅
- `apps/web/components/features/user/reports/details/cash-flow-statement/index.tsx`
  - Added `useEntityCurrencySymbol()` — replaces hardcoded `$` and `USD`
  - `fmt(value, sym)` threaded through `buildRows` and `KPICard`
  - Still uses mock data (backend is more complex — see Cash Flow section below)

TSC: clean (both API and web, exit 0)

### 5. Cash Flow Statement — Full Stack ✅
Files created/updated:

**Backend:**
- `apps/api/src/reports/dto/reports.dto.ts` — Added `CFEntryDto`, `CashFlowOperatingDto`, `CashFlowInvestingDto`, `CashFlowFinancingDto`, `CashFlowKPIsDto`, `CashFlowStatementDto`
- `apps/api/src/reports/reports.service.ts` — Added `getCashFlowStatement()`, `fetchCFData()` (3-query approach: account metadata + opening txns + period txns, all balance groups computed in-memory), `buildCFResponse()`
- `apps/api/src/reports/reports.controller.ts` — Added `GET /reports/cash-flow-statement?startDate&endDate&compareStartDate?&compareEndDate?`

**Endpoint:** `GET /reports/cash-flow-statement?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&compareStartDate=?&compareEndDate=?`

**Frontend:**
- `apps/web/lib/api/services/reportService.ts` — Added `CFEntry`, `CashFlowStatementData`, `CashFlowParams`, `getCashFlowStatement()`
- `apps/web/lib/api/hooks/useReports.ts` — Added `useCashFlowStatement()` React Query hook
- `apps/web/components/features/user/reports/details/cash-flow-statement/index.tsx` — Fully rewritten:
  - `quarterToDates()` maps period selector → ISO dates
  - `useCashFlowStatement` hook drives all data
  - `buildCFItems(data)` maps API response → `CFItem[]` tree (Operating/Investing/Financing sections, subtotals, net, cashlines)
  - `buildKPIItems(data)` builds 4 KPI cards from `kpis.*`
  - Loading skeleton + error state + empty state
  - Sections auto-collapse on period change via `useEffect`
  - Comparison column hidden when `comparePeriod` is null in API response
  - Uses `useEntityCurrencySymbol()` — no hardcoded currency

TSC: clean (both API and web, exit 0)

## PENDING ⬜

_Nothing currently pending._

---

## ACCOUNTING SYSTEM CONTEXT
_Read this before touching reports code._

### Chart of Accounts hierarchy
```
AccountType  (global — seeded once, never changes)
  └─ AccountCategory  (per group — seeded when group created)
       └─ AccountSubCategory  (per group)
            └─ Account  (per entity — holds current balance as Int)
                 └─ AccountTransaction  (per entity — debitAmount Int, creditAmount Int)
```

### The 5 AccountType codes
| Code | Name      | Balance Sheet / P&L |
|------|-----------|---------------------|
| 1000 | Assets    | Balance Sheet       |
| 2000 | Liabilities | Balance Sheet     |
| 3000 | Equity    | Balance Sheet       |
| 4000 | Revenue   | P&L — income side   |
| 5000 | Expenses  | P&L — expense side  |

### Category codes (seeded per group in seed-account-chart.ts)
| Code | Name | P&L Section |
|------|------|-------------|
| 1100 | Current Assets | BS |
| 1200 | Fixed Assets | BS |
| 1300 | Intangible Assets | BS |
| 2100 | Current Liabilities | BS |
| 2200 | Long-term Liabilities | BS |
| 3100 | Shareholders Equity | BS |
| **4100** | **Operating Revenue** | **P&L Revenue** |
| **4200** | **Other Income** | **P&L Other Income** |
| **5100** | **Cost of Goods Sold** | **P&L COGS** |
| **5200** | **Operating Expenses** | **P&L OpEx** |
| **5300** | **Other Expenses** | **P&L below-the-line** |

### SubCategory codes under each category (examples)
- 4100 → 4110 Product Sales Revenue, 4120 Service Revenue, 4130 Rental Income
- 4200 → 4210 Interest Income, 4220 Gain on Sale of Assets, 4230 Misc Income
- 5100 → 5110 Raw Materials, 5120 Direct Labor, 5130 Manufacturing Overhead
- 5200 → 5210 Salaries & Wages, 5220 Rent, 5230 Utilities, 5240 Office Supplies, 5250 Marketing, 5260 Depreciation, 5270 Insurance
- 5300 → 5310 Interest Expense, 5320 Loss on Sale of Assets, 5330 Taxes & Licenses

### How double-entry posting works
Every business event creates `AccountTransaction` rows (one debit, one credit per journal line):

| Event | Debit | Credit |
|-------|-------|--------|
| Invoice created | AR (1120) | Revenue (4110 or 4120) |
| Customer pays invoice | Cash/Bank (1110) | AR (1120) |
| Receipt (cash sale) | Cash/Bank (1110) | Revenue (4110 or 4120) |
| Expense approved | Expense account (5xxx) | Cash or Payable |
| Bill created | Expense account (5xxx) | AP (2110) |
| Bill paid | AP (2110) | Cash/Bank (1110) |

All posting is via `journal-posting.service.ts` which calls `createJournalEntry()` → writes `AccountTransaction` rows.

### P&L aggregation rule
- **Revenue** accounts (typeCode '4000'): `net = creditAmount - debitAmount` (credits increase revenue)
- **Expense** accounts (typeCode '5000'): `net = debitAmount - creditAmount` (debits increase expense)
- Filter: `status: { not: 'Failed' }`, date range on `AccountTransaction.date`
- Group by `account.subCategory.category.code` → maps to the 5 P&L sections above

### P&L formula
```
Gross Profit    = revenue.actual - cogs.actual
Operating Profit (EBIT) = Gross Profit - operatingExpenses.actual
Net Profit      = Operating Profit + otherIncome.actual - otherExpenses.actual
```

### Cash Flow (indirect method — future work)
Needs:
1. Net Profit from P&L for the period
2. Add back depreciation (txns on SubCategory 5260)
3. Working capital changes = reconstruct account balances at period start and end:
   - Balance at date X = SUM(debit - credit) for asset accounts OR SUM(credit - debit) for liability accounts, for all AccountTransactions with date <= X
   - AR change: 1120 accounts balance(end) - balance(start)
   - Inventory change: 1130 accounts
   - AP change: 2110 accounts
4. Investing: bank txns (type=BANK) hitting 1200-category accounts
5. Financing: bank txns hitting 2200 or 3100-category accounts

### Key files for reports work
| File | Purpose |
|------|---------|
| `apps/api/src/reports/reports.service.ts` | P&L service — main logic |
| `apps/api/src/reports/reports.controller.ts` | `GET /reports/profit-and-loss` |
| `apps/api/src/reports/dto/reports.dto.ts` | Response types |
| `apps/api/prisma/schema.prisma` lines 657-732 | Account hierarchy models |
| `apps/api/prisma/schema.prisma` lines 1497-1527 | AccountTransaction model |
| `apps/api/seeders/seed-account-chart.ts` | Category/subcategory codes reference |
| `apps/api/seeders/seed-account-types.ts` | Type codes reference |
| `apps/api/src/accounts/journal/journal-posting.service.ts` | How postings are written |
| `apps/web/components/features/user/reports/details/profit-and-loss/index.tsx` | P&L component (needs wiring) |
| `apps/web/components/features/user/reports/details/profit-and-loss/mock-data.ts` | Types + mock to replace |
| `apps/web/lib/api/hooks/useCurrencyFormat.ts` | `useEntityCurrencySymbol()` — use this, not hardcoded ₦ |

### Frontend routing for reports
- `/reports` → `ReportsDetails.tsx` (dispatcher) → imports component by `params.key`
- `/reports/profit-and-loss` → renders `ProfitAndLoss` component
- `/reports/cash-flow-statement` → renders `CashFlowStatement` component
- The reports list page (`/reports`) uses static `reportsData` in `ReportsColumn.tsx` — no backend needed for the list
