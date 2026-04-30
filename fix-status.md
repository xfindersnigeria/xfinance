# Fix Status

## 1. Dashboard KPI — Swap Active Customers → Outstanding Receivables
**Status: DONE**

Files changed:
- `apps/api/src/analytics/dto/analytics-response.dto.ts` — `KPIDto.activeCustomers` replaced with `outstandingReceivables: { total, change, changePercent }`
- `apps/api/src/analytics/analytics.service.ts` — customer count queries replaced with `invoice.aggregate` on `status: ['Sent','Overdue','Partial']`; comparison uses same filter + `invoiceDate: { lte: previousMonthEnd }`
- `apps/web/lib/api/services/analyticsService.ts` — `KPIs.activeCustomers` renamed to `outstandingReceivables`
- `apps/web/components/features/user/dashboard/StatsGrid.tsx` — card updated: title="Outstanding Receivables", icon=ReceiptText, currency-formatted value, `isPositive` inverted (lower = better)

---

## 2. Reports — Profit & Loss (Analysis & Way Forward)
**Status: ANALYSIS DONE — Implementation pending**

### System Understanding

**Account Hierarchy (from seeder):**
```
AccountType (global, 5 types)
  └─ AccountCategory (per group)
       └─ AccountSubCategory (per group)
            └─ Account (per entity, has balance)
                 └─ AccountTransaction (per entity, has debitAmount / creditAmount)
```

**Type Code → P&L Mapping:**
| Type Code | Type Name | P&L Role |
|-----------|-----------|----------|
| 4000 | Revenue | Income side |
| → 4100 | Operating Revenue | Sales, Service, Rental |
| → 4200 | Other Income | Interest, Gains, Misc |
| 5000 | Expenses | Expense side |
| → 5100 | Cost of Goods Sold | COGS section |
| → 5200 | Operating Expenses | OpEx section |
| → 5300 | Other Expenses | Below-the-line |
| 1000/2000/3000 | Assets/Liabilities/Equity | Balance Sheet only |

**How GL entries relate to P&L:**
- Invoice created → Dr Accounts Receivable (1120) / Cr Revenue account (4100)
- Receipt posted → Dr Cash / Cr Revenue account (4100)
- Expense approved → Dr Expense account (5xxx) / Cr Cash or Payable
- Bill created → Dr Expense account (5xxx) / Cr Accounts Payable (2110)

So every revenue/expense flow is already in `AccountTransaction` rows with full account linkage.

**P&L Aggregation Logic:**
- Revenue accounts (type 4000): `net = SUM(creditAmount) - SUM(debitAmount)` per account
- Expense accounts (type 5000): `net = SUM(debitAmount) - SUM(creditAmount)` per account
- Filter by `date BETWEEN startDate AND endDate` and `entityId`
- Group by `accountCategory.code` to get P&L sections

### What P&L needs (calculated values):
```
Total Revenue          = sum of all 4100-category account nets
Gross Profit           = Total Revenue - Total COGS (5100 accounts)
Total Operating Exps   = sum of all 5200-category account nets
Operating Profit (EBIT)= Gross Profit - Total Operating Expenses
Other Income           = sum of 4200-category account nets
Other Expenses         = sum of 5300-category account nets
Net Profit             = Operating Profit + Other Income - Other Expenses
```

### What needs to be built:

#### Backend — New `ReportsModule`
Location: `apps/api/src/reports/`

**Endpoint:** `GET /reports/profit-and-loss`
Query params: `startDate`, `endDate`, `compareStartDate?`, `compareEndDate?`
Auth: JWT + RolesGuard (same as all endpoints); entityId from `getEffectiveGroupId(req)` pattern

**Service query:**
```typescript
// Fetch all AccountTransactions for revenue/expense accounts in period
const transactions = await prisma.accountTransaction.findMany({
  where: {
    entityId,
    date: { gte: startDate, lte: endDate },
    account: {
      subCategory: {
        category: {
          type: { code: { in: ['4000', '5000'] } }
        }
      }
    }
  },
  include: {
    account: {
      select: {
        id: true, name: true, code: true,
        subCategory: {
          select: {
            name: true, code: true,
            category: {
              select: {
                name: true, code: true,
                type: { select: { name: true, code: true } }
              }
            }
          }
        }
      }
    }
  }
});
// Then group in memory by type/category/account and compute nets
```

**Response shape** (matches the mock-data.ts `PLItem` tree):
```typescript
{
  period: { startDate, endDate },
  comparePeriod?: { startDate, endDate },
  sections: {
    revenue: PLSection,        // 4100 accounts
    cogs: PLSection,           // 5100 accounts
    grossProfit: number,
    operatingExpenses: PLSection, // 5200 accounts
    operatingProfit: number,
    otherIncome: PLSection,    // 4200 accounts
    otherExpenses: PLSection,  // 5300 accounts
    netProfit: number,
  },
  kpis: { totalRevenue, grossProfit, operatingProfit, netProfit }
  // each with { actual, comparison? }
}
```

Where `PLSection = { label, actual, comparison, accounts: { id, name, code, actual, comparison }[] }`

#### Frontend — Update ProfitAndLoss component
- `apps/web/lib/api/services/reportService.ts` — new service with `getProfitAndLoss(params)` and types
- `apps/web/lib/api/hooks/useReports.ts` — SWR hook wrapping the service
- `apps/web/components/features/user/reports/details/profit-and-loss/index.tsx`:
  - Remove mock-data import
  - Add state for `startDate/endDate` (defaulting to current quarter)
  - Call `useProfitAndLoss({ startDate, endDate, compareStartDate, compareEndDate })`
  - Map API response to `PLItem[]` tree (or change `buildRows` to accept the API shape directly)
  - Replace hardcoded `₦` with `useEntityCurrencySymbol()`
  - Period selector: change from `Q1 2025` strings to actual date-range pickers (or keep quarters but map to ISO dates on query)

### Currency Fix (quick win — do this first)
`ProfitAndLoss` currently hardcodes `₦` in `formatCurrency()`.
Fix: accept `sym` as prop to `formatCurrency(value, sym)` and pass `useEntityCurrencySymbol()`.

---

## 3. Cash Flow Statement (Analysis)
**Status: ANALYSIS DONE — More complex, build after P&L**

Cash Flow (indirect method) requires:
1. **Operating section** — Net Profit (from P&L) + non-cash adjustments + working capital changes
   - Non-cash: Depreciation = AccountTransactions on depreciation accounts (5260)
   - Working capital changes = balance sheet account balance diffs between period start/end:
     - AR change = Account balance (1120) at end - at start
     - Inventory change = Account balance (1130) at end - at start
     - AP change = Account balance (2110) at end - at start
   - **Problem:** Account.balance is a current balance, not historical. We'd need to reconstruct period-start balance from running totals. Feasible by summing AccountTransactions before startDate.

2. **Investing section** — Transactions on asset accounts (1200 category) via BANK type
3. **Financing section** — Transactions on liability/equity accounts (2200, 3100) via BANK type

**Bottom line for Cash Flow:** The data exists in AccountTransaction, but the indirect method requires reconstructing opening/closing balances from transaction history. This is buildable but needs the P&L endpoint working first (Operating CF depends on Net Profit). Recommend building P&L first, then Cash Flow.

---

## Build Order Recommendation
1. ✅ Dashboard KPI fix (done)
2. ⬜ Fix currency symbol in P&L component (5 min, no backend needed)
3. ⬜ Backend: `ReportsModule` + `GET /reports/profit-and-loss`
4. ⬜ Frontend: `reportService.ts` + `useReports.ts` hook
5. ⬜ Wire ProfitAndLoss component to real data
6. ⬜ Backend: `GET /reports/cash-flow-statement`
7. ⬜ Wire CashFlowStatement component to real data
