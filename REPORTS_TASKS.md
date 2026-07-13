# Reports — End-to-End Build Plan

**Last updated:** 2026-07-13  
**Scope:** All entity-level and group-level reports — backend endpoints + frontend UI + wiring  
**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[B]` blocked — needs owner answer before touching

---

## ⛔ BLOCKED REPORTS SUMMARY

These reports cannot be built until the owner provides the answers below. Do NOT start these. Leave them as `[B]`.

| Report | Blocked By | Reason |
|---|---|---|
| Sales by Salesperson (entity) | **Q1** | `Invoice` model has no `salesperson` field. No way to attribute a sale to a person without a schema decision. Could map to the user who created the invoice, but that is a guess — needs explicit confirmation to avoid building the wrong thing. |
| Cash Flow Forecasting (entity) | **Q2** | A `Forecast` Prisma model exists in the schema (line 921) but its purpose and population flow are unknown. Building a projection engine on the wrong data source would require a full rewrite. Need to confirm: use the `Forecast` model or compute from trailing historical averages? |
| Movement of Equity (entity) | **Q4** | It is unclear which equity movements exist in the data. Dividends declared are not tracked in any model. Without knowing which transactions represent capital contributions vs. retained earnings vs. distributions, the report will be inaccurate. |
| Sales Tax Summary (entity) | **Q5** | `Invoice.tax` and `Bills.tax` are both raw integer amounts with no tax-type breakdown. Whether purchase tax is netted against sales tax to derive the net liability is a tax-policy decision, not a code decision. Building without this produces wrong figures. |
| Tax Liability Report (entity) | **Q5** | Same reason as Sales Tax Summary — depends on the netting decision and whether tax payments are tracked through expense accounts or elsewhere. |
| Intercompany Transactions (group) | **Q3** | No intercompany transaction model exists in the Prisma schema. Building this report requires either: (a) a new `IntercompanyTransaction` model + migration, or (b) a convention for identifying cross-entity journal entries. Neither is defined yet. |
| Group Cash Flow Forecasting (group) | **Q2** | Same dependency as entity Cash Flow Forecasting — group version cannot be built until the approach for the entity version is resolved. |

**7 reports blocked. 28 reports unblocked and ready to build.**

---

## How to Pick Up Work

1. Read this file top to bottom to understand what's done and what's next.
2. Pick the next `[ ]` item in sequence (entity reports first, then group).
3. Follow the **Established Patterns** section before writing any code.
4. Mark each item `[~]` when you start, `[x]` when both backend and frontend are wired and working.
5. Update this file after each report is complete.

---

## Established Patterns (READ BEFORE CODING)

### Backend pattern (`apps/api/src/reports/`)
- All endpoints live in `reports.controller.ts` with `@Get('report-key')`.
- Logic lives in `reports.service.ts` — one private fetch method, one public async method.
- DTOs live in `reports.dto.ts` — add interfaces there, do not create new DTO files.
- Guard: `@UseGuards(AuthGuard)` only (no RolesGuard/DeploymentModeGuard needed — reports are entity-scoped).
- `entityId` always from `getEffectiveEntityId(req)` — never from query params.
- Date params: accept `startDate` / `endDate` as strings, parse with `new Date(...)`, set `end.setHours(23,59,59,999)`.
- Response: `{ data, message, statusCode: 200 }`.
- All amounts in the DB are stored as integers (cents/kobo). Divide by 100 only in the frontend or when explicitly stated.
- Category codes in chart of accounts: `1000` = Assets, `2000` = Liabilities, `3000` = Equity, `4000` = Revenue, `5000` = Expenses.
- Sub-category codes used in existing reports: `1110` = Cash, `1120` = AR, `1130` = Inventory, `1140` = Prepaid, `1200` = Fixed Assets, `1300` = Intangibles, `2110` = AP, `2120` = Wages Payable, `2150` = Deferred Revenue, `2200` = LT Debt, `3110` = Capital Stock, `4100` = Operating Revenue, `4200` = Other Income, `5100` = COGS, `5200` = Operating Expenses, `5260` = Depreciation, `5300` = Other Expenses.

### Frontend pattern (`apps/web/components/features/user/reports/`)
- Each report lives in `details/{report-key}/index.tsx`.
- Register it in `details/ReportsDetails.tsx` — add to `REPORT_COMPONENTS` map.
- Filters use `periodToDates` / `defaultPeriodValue` from `@/lib/period-utils` — same as P&L and Cash Flow.
- Date period selector: show `This Month / This Quarter / This Year / Custom` — use the established `ReportPeriodType`.
- Comparison toggle: only for financial statements (P&L, Balance Sheet, Cash Flow). Operational reports (Sales by Customer, AR Aging, etc.) use date range only.
- KPI cards at top — 3 or 4 cards in a grid showing the key headline numbers.
- Charts use `recharts` (`BarChart`, `PieChart`, `LineChart`) — already installed.
- Currency formatting: use `useEntityCurrencySymbol()` hook + format helper matching what P&L uses.
- API service functions go in `apps/web/lib/api/services/reportService.ts`.
- React Query hooks go in `apps/web/lib/api/hooks/useReports.ts`.
- `staleTime: 5 * 60 * 1000`, `refetchOnWindowFocus: false`, `enabled: !!startDate && !!endDate`.

### Group Reports pattern (`apps/web/app/(dashboards)/@admin/reports/`)
- Group endpoints will live in a new `group-reports.controller.ts` + `group-reports.service.ts` inside a new `apps/api/src/group-reports/` module.
- `groupId` from `getEffectiveGroupId(req)`.
- Frontend components in `apps/web/components/features/admin/group-reports/details/{report-key}/index.tsx`.
- Register in a new `GroupReportsDetails.tsx` (mirror of `ReportsDetails.tsx`).

---

## Open Questions (must be answered before building the flagged report)

| # | Question | Affects |
|---|---|---|
| Q1 | `Invoice` has no `salesperson` field in the schema. Does "Sales by Salesperson" map to the `User` who created the invoice, or the `projectId` owner, or is a new field needed? | Sales by Salesperson |
| Q2 | Cash Flow Forecasting — is this a projection based on historical averages, or does it use the existing `Forecast` Prisma model (`apps/api/prisma/schema.prisma:921`)? If the `Forecast` model, what is its structure and how is it populated? | Cash Flow Forecasting |
| Q3 | Intercompany Transactions — there is no intercompany transaction model in the current schema. Does this feature require a new Prisma model + migration, or should it show cross-entity journal entries where both parties are internal entities? | Intercompany Transactions Report (Group) |
| Q4 | Movement of Equity — should this show changes in: (a) retained earnings from net profit, (b) capital contributions, (c) dividends declared? Which of these are tracked in the current schema (equity accounts via journal entries)? | Movement of Equity |
| Q5 | Sales Tax Summary / Tax Liability Report — `Invoice.tax` is stored as a total tax amount integer. Is there a single tax rate (in `Settings.taxRate`) or multiple tax types? Are purchase taxes (from `Bills.tax`) netted against sales tax to get the liability? | Sales Tax Summary, Tax Liability Report |

---

## ENTITY REPORTS

### ── Business Overview ──────────────────────────────────────────────

#### [x] Profit and Loss
- **Backend:** `GET /reports/profit-and-loss` — done
- **Frontend:** `details/profit-and-loss/index.tsx` — done
- **Data sources:** `AccountTransaction` via account category codes `4xxx` / `5xxx`
- **Features:** KPI cards, collapsible sections, comparison period, budget comparison, variance %

#### [x] Cash Flow Statement
- **Backend:** `GET /reports/cash-flow-statement` — done
- **Frontend:** `details/cash-flow-statement/index.tsx` — done
- **Data sources:** `AccountTransaction` — operating/investing/financing via subcategory codes
- **Features:** 3-section structure, comparison period, opening/closing cash

#### [x] Trial Balance
- **Backend:** `GET /reports/trial-balance` — done
- **Frontend:** `details/trial-balance/index.tsx` — done
- **Data sources:** `AccountTransaction` grouped by account, pre-period + in-period
- **Features:** Opening balance, debit, credit, closing balance per account; balanced check

#### [ ] Balance Sheet
- **Backend:** `GET /reports/balance-sheet`
- **Service method:** `getBalanceSheet(entityId, asOfDate, compareAsOfDate?)`
- **Logic:** Fetch all `AccountTransaction` up to `asOfDate`. Group by account type: Assets (1000), Liabilities (2000), Equity (3000). Balance = debit - credit for assets; credit - debit for liabilities/equity. Auto-compute Retained Earnings = cumulative net profit (revenue minus expenses to date).
- **Response shape:**
  ```ts
  { asOfDate, compareAsOfDate?,
    assets: { current: Section, nonCurrent: Section, total: KPIEntry },
    liabilities: { current: Section, longTerm: Section, total: KPIEntry },
    equity: { sections: Section[], retainedEarnings: KPIEntry, total: KPIEntry },
    totalLiabilitiesAndEquity: KPIEntry,
    isBalanced: boolean }
  ```
- **Frontend:** Date picker (single "As of" date, not range). Comparison "As of" toggle. Two-column layout: left = Assets, right = Liabilities + Equity. KPI cards: Total Assets, Total Liabilities, Total Equity, Balance Check.
- **Figma ref:** `styles/src/app/components/pages/BalanceSheet.tsx`

#### [ ] Business Performance Ratios
- **Backend:** `GET /reports/business-performance-ratios?startDate=&endDate=`
- **Service method:** `getPerformanceRatios(entityId, startDate, endDate)` — internally calls `getBalanceSheet` + `getProfitAndLoss` and derives ratios.
- **Ratios to compute:**
  - Liquidity: Current Ratio (current assets / current liabilities), Quick Ratio ((current assets - inventory) / current liabilities)
  - Profitability: Gross Margin % (gross profit / revenue × 100), Net Margin % (net profit / revenue × 100), EBITDA Margin
  - Efficiency: Asset Turnover (revenue / total assets), Receivables Turnover (revenue / AR balance)
  - Leverage: Debt-to-Equity (total liabilities / total equity), Debt Ratio (total liabilities / total assets)
- **Response shape:** Flat object of ratio name → `{ value: number, benchmark?: number, status: 'good'|'warning'|'poor' }`
- **Frontend:** Grid of ratio cards — each card shows ratio name, computed value, a coloured status badge, brief description. Date range filter (same as P&L). No comparison period needed.
- **Figma ref:** `styles/src/app/components/pages/BusinessPerformanceRatio.tsx`

#### [B] Cash Flow Forecasting
- **BLOCKED — Q2:** A `Forecast` Prisma model exists but its population flow is unknown. Cannot build a projection engine without knowing the data source. Owner must answer Q2 first.
- **Tentative approach (pending Q2):** Use trailing 3-month average of operating/investing/financing cash flows to project next 3–6 months. Also incorporate AR aging (expected collections) and AP aging (expected payments).
- **Figma ref:** `styles/src/app/components/pages/CashFlowForecasting.tsx`

#### [B] Movement of Equity
- **BLOCKED — Q4:** Dividends and capital contributions are not tracked in any current model. Without knowing which transactions constitute equity movements, any calculation would be a guess. Owner must answer Q4 first.
- **Tentative approach:** Show opening equity balance, add net profit for period, add/subtract capital contributions and dividends (from equity account transactions), arrive at closing equity balance. Columnar table per equity sub-account.
- **Figma ref:** `styles/src/app/components/pages/MovementOfEquity.tsx`

---

### ── Sales & Receivables ─────────────────────────────────────────────

#### [ ] Sales by Customer
- **Backend:** `GET /reports/sales-by-customer?startDate=&endDate=`
- **Service method:** `getSalesByCustomer(entityId, startDate, endDate)`
- **Logic:** `Invoice.findMany` where `entityId`, `invoiceDate` in range, `status != 'Draft'`. Group by `customerId`. For each customer compute: `totalSales` (sum of `total`), `invoiceCount`, `avgInvoice`, `percentOfTotal`. Join `Customer` for `name`.
- **Response shape:**
  ```ts
  { period, summary: { totalSales, totalInvoices, avgInvoice },
    rows: Array<{ customerId, customerName, totalSales, invoiceCount, avgInvoice, percentOfTotal }> }
  ```
- **Frontend:** 3 KPI cards (Total Sales, Total Invoices, Avg Invoice). Pie chart (sales distribution) + horizontal Bar chart (top 10 customers). Detailed table with all columns + % of total. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/SalesByCustomer.tsx`

#### [ ] Sales by Item
- **Backend:** `GET /reports/sales-by-item?startDate=&endDate=`
- **Service method:** `getSalesByItem(entityId, startDate, endDate)`
- **Logic:** `InvoiceItem.findMany` joining `Invoice` (filter by `entityId`, `invoiceDate` in range, non-Draft), joining `Items` for name. Group by `itemId`. Compute: `totalRevenue` (sum of `total`), `totalQuantity` (sum of `quantity`), `avgRate`, `invoiceCount`, `percentOfTotal`.
- **Response shape:** `{ period, summary: {...}, rows: Array<{ itemId, itemName, totalRevenue, totalQuantity, avgRate, invoiceCount, percentOfTotal }> }`
- **Frontend:** 3 KPI cards. Bar chart (top items by revenue). Table with all columns. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/SalesByItem.tsx`

#### [B] Sales by Salesperson
- **BLOCKED — Q1:** `Invoice` has no `salesperson` field in the Prisma schema. Cannot attribute revenue to a person without a schema decision. Owner must answer Q1 first.

#### [ ] Invoice Details
- **Backend:** `GET /reports/invoice-details?startDate=&endDate=&status=&customerId=`
- **Service method:** `getInvoiceDetails(entityId, startDate, endDate, status?, customerId?)`
- **Logic:** `Invoice.findMany` with optional filters. Include `Customer.name`, `InvoiceItem[]` with `Items.name`. Return full invoice list.
- **Response shape:** `{ period, rows: Array<{ invoiceId, invoiceNumber, invoiceDate, dueDate, customerName, subtotal, tax, total, status, items: [...] }> }`
- **Frontend:** Filter bar: date range + status dropdown + customer search. Table with all columns. Row expand to show line items. Summary row at bottom. No KPI cards (this is a detail/drill-down report).
- **Figma ref:** `styles/src/app/components/pages/reports/InvoiceDetails.tsx`

#### [ ] Receivable Summary
- **Backend:** `GET /reports/receivable-summary?asOfDate=`
- **Service method:** `getReceivableSummary(entityId, asOfDate)`
- **Logic:** Fetch all non-Draft `Invoice` up to `asOfDate`. For each, compute outstanding = `total - sum(PaymentReceived.amount)`. Aggregate into buckets: Total Outstanding, Current (not yet due), Overdue (past due date). Also compute total collected in period.
- **Response shape:**
  ```ts
  { asOfDate, totalOutstanding, totalCurrent, totalOverdue, totalCollected,
    overduePercentage, rows: Array<{ invoiceNumber, customerName, invoiceDate, dueDate, total, paid, outstanding, status }> }
  ```
- **Frontend:** 4 KPI cards (Total Outstanding, Current, Overdue, Overdue %). Table of open invoices sorted by due date. Single "As of" date picker (not range).
- **Figma ref:** `styles/src/app/components/pages/reports/ReceivableSummary.tsx`

#### [ ] Aged Receivables
- **Backend:** `GET /reports/aged-receivables?asOfDate=`
- **Service method:** `getAgedReceivables(entityId, asOfDate)`
- **Logic:** Same data as Receivable Summary. For each outstanding invoice, compute days overdue = `asOfDate - dueDate`. Bucket into: Current (≤0 days), 1-30, 31-60, 61-90, 91-120, 120+ days. Group by customer, showing each aging bucket as a column.
- **Response shape:**
  ```ts
  { asOfDate,
    buckets: ['Current','1-30','31-60','61-90','91-120','120+'],
    totals: { current, b1_30, b31_60, b61_90, b91_120, b120plus, total },
    rows: Array<{ customerName, current, b1_30, b31_60, b61_90, b91_120, b120plus, total }> }
  ```
- **Frontend:** Aging buckets shown as columns. Summary bar chart of bucket totals. KPI cards: Total AR, Overdue %, Largest overdue amount. Single "As of" date picker.
- **Figma ref:** `styles/src/app/components/pages/reports/AgedReceivables.tsx`

#### [ ] Customer Balances
- **Backend:** `GET /reports/customer-balances?asOfDate=`
- **Service method:** `getCustomerBalances(entityId, asOfDate)`
- **Logic:** Per customer: `totalInvoiced` (sum of Invoice.total for status != Draft), `totalReceived` (sum of PaymentReceived.amount), `balance = totalInvoiced - totalReceived`. Sort by balance descending.
- **Response shape:** `{ asOfDate, totalBalance, rows: Array<{ customerId, customerName, totalInvoiced, totalReceived, balance }> }`
- **Frontend:** Single "As of" date. 2 KPI cards (Total Invoiced, Total Balance). Simple table sorted by balance. No charts needed.
- **Figma ref:** `styles/src/app/components/pages/reports/CustomerBalances.tsx`

#### [ ] Payment Method Summary
- **Backend:** `GET /reports/payment-method-summary?startDate=&endDate=`
- **Service method:** `getPaymentMethodSummary(entityId, startDate, endDate)`
- **Logic:** `PaymentReceived.groupBy(['paymentMethod'])` where `entityId`, `paidAt` in range. Sum `amount` per method. Compute % of total per method.
- **Response shape:** `{ period, totalReceived, rows: Array<{ paymentMethod, totalAmount, transactionCount, percentOfTotal }> }`
- **Frontend:** Pie chart (method distribution) + table. 2 KPI cards (Total Received, Transaction Count). Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/PaymentMethodSummary.tsx`

---

### ── Payables & Expenses ─────────────────────────────────────────────

#### [ ] Payable Summary
- **Backend:** `GET /reports/payable-summary?asOfDate=`
- **Service method:** `getPayableSummary(entityId, asOfDate)`
- **Logic:** All non-Draft `Bills` up to `asOfDate`. For each, outstanding = `total - sum(PaymentRecord.amount where status=paid)`. Aggregate: Total Outstanding, Current, Overdue.
- **Response shape:** Mirror of Receivable Summary but for Bills/vendors.
- **Frontend:** Mirror of Receivable Summary UI (swap "Customer" → "Vendor", "Invoice" → "Bill").
- **Figma ref:** `styles/src/app/components/pages/reports/PayableSummary.tsx`

#### [ ] Aged Payables
- **Backend:** `GET /reports/aged-payables?asOfDate=`
- **Service method:** `getAgedPayables(entityId, asOfDate)`
- **Logic:** Mirror of Aged Receivables but using `Bills` and `PaymentRecord`. Same aging buckets.
- **Response shape:** Mirror of Aged Receivables.
- **Frontend:** Mirror of Aged Receivables UI.
- **Figma ref:** `styles/src/app/components/pages/reports/AgedPayables.tsx`

#### [ ] Vendor Balances
- **Backend:** `GET /reports/vendor-balances?asOfDate=`
- **Service method:** `getVendorBalances(entityId, asOfDate)`
- **Logic:** Per vendor: `totalBilled` (sum of Bills.total where status != draft), `totalPaid` (sum of PaymentRecord.amount), `balance`. Join `vendor.name`.
- **Response shape:** Mirror of Customer Balances but for vendors.
- **Frontend:** Mirror of Customer Balances UI.
- **Figma ref:** `styles/src/app/components/pages/reports/VendorBalances.tsx`

#### [ ] Expense by Category
- **Backend:** `GET /reports/expense-by-category?startDate=&endDate=`
- **Service method:** `getExpenseByCategory(entityId, startDate, endDate)`
- **Logic:** `AccountTransaction.findMany` where `entityId`, `date` in range, account type = `5000` (expenses). Group by `account.subCategory.category` (expense categories: COGS `5100`, Operating Expenses `5200`, Other Expenses `5300`). Sum net debit-credit per category and per account within each category.
- **Response shape:**
  ```ts
  { period, totalExpenses, rows: Array<{ categoryName, categoryCode, total, percentOfTotal,
      accounts: Array<{ accountName, accountCode, amount }> }> }
  ```
- **Frontend:** Pie chart (category distribution) + bar chart (top accounts). Collapsible category rows with account drill-down. KPI cards: Total Expenses, Largest Category, Month-over-month trend (if comparison enabled). Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/ExpenseByCategory.tsx`

#### [ ] Expense by Vendor
- **Backend:** `GET /reports/expense-by-vendor?startDate=&endDate=`
- **Service method:** `getExpenseByVendor(entityId, startDate, endDate)`
- **Logic:** `Bills.findMany` where `entityId`, `billDate` in range, `status != draft`. Group by `vendorId`. Sum `total` per vendor. Join `vendor.name`.
- **Response shape:** `{ period, totalExpenses, rows: Array<{ vendorId, vendorName, totalBilled, billCount, percentOfTotal }> }`
- **Frontend:** Horizontal bar chart (top vendors). Table. KPI cards: Total Billed, Vendor Count, Avg per Vendor.
- **Figma ref:** `styles/src/app/components/pages/reports/ExpenseByVendor.tsx`

#### [ ] Bill Details
- **Backend:** `GET /reports/bill-details?startDate=&endDate=&status=&vendorId=`
- **Service method:** `getBillDetails(entityId, startDate, endDate, status?, vendorId?)`
- **Logic:** `Bills.findMany` with optional filters. Include `vendor.name`, parsed `items` JSON. Return full bill list.
- **Response shape:** `{ period, rows: Array<{ billNumber, billDate, dueDate, vendorName, subtotal, tax, total, status, items: [...] }> }`
- **Frontend:** Mirror of Invoice Details — filter bar, table, expandable rows. No KPI cards.
- **Figma ref:** `styles/src/app/components/pages/reports/BillDetails.tsx`

---

### ── Taxes ───────────────────────────────────────────────────────────

#### [B] Sales Tax Summary
- **BLOCKED — Q5:** Whether `Bills.tax` is netted against `Invoice.tax` is a tax-policy decision that changes the figures entirely. Building without confirmation produces wrong output. Owner must answer Q5 first.
- **Backend:** `GET /reports/sales-tax-summary?startDate=&endDate=`
- **Service method:** `getSalesTaxSummary(entityId, startDate, endDate)`
- **Logic:** Sum `Invoice.tax` for non-Draft invoices in range = tax collected. Sum `Bills.tax` for non-Draft bills in range = tax on purchases (if netted). Tax rate from `Settings.taxRate`. Net liability = tax collected - tax on purchases.
- **Response shape:** `{ period, taxCollected, taxOnPurchases, netTaxLiability, taxRate, invoiceCount, rows: Array<{ date, refNumber, description, taxableAmount, taxAmount, taxRate }> }`
- **Frontend:** 4 KPI cards (Tax Collected, Tax on Purchases, Net Liability, Effective Rate). Table of taxable transactions. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/SalesTaxSummary.tsx`

#### [B] Tax Liability Report
- **BLOCKED — Q5:** Same dependency as Sales Tax Summary. Also unclear how/whether tax payments are recorded in the chart of accounts. Owner must answer Q5 first.
- **Backend:** `GET /reports/tax-liability-report?startDate=&endDate=`
- **Service method:** `getTaxLiabilityReport(entityId, startDate, endDate)`
- **Logic:** More detailed version of Sales Tax Summary. Break down by tax period (monthly). Show running liability balance. Include any tax payments made (via expense/payment accounts tagged as tax payments).
- **Response shape:** `{ period, rows: Array<{ month, taxCollected, taxPaid, openingLiability, closingLiability }>, summary: {...} }`
- **Frontend:** Monthly breakdown table + line chart showing liability trend. KPI cards.
- **Figma ref:** `styles/src/app/components/pages/reports/TaxLiabilityReport.tsx`

---

### ── Banking ──────────────────────────────────────────────────────────

#### [ ] Bank Reconciliation Summary
- **Backend:** `GET /reports/bank-reconciliation-summary?startDate=&endDate=`
- **Service method:** `getBankReconciliationSummary(entityId, startDate, endDate)`
- **Logic:** `BankReconciliation.findMany` where `entityId`, `statementEndDate` in range. Include `BankAccount.name`. For each: status, statementEndingBalance, completedAt, completedBy.
- **Response shape:** `{ period, rows: Array<{ reconciliationId, bankAccountName, statementEndDate, statementEndingBalance, status, completedAt, completedBy, matchedCount, unmatchedCount }> }`
- **Frontend:** Table of reconciliations. Status badges (Draft/Completed). KPI cards: Total Reconciled, Pending. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/BankReconciliationSummary.tsx`

#### [ ] Bank Account Transactions
- **Backend:** `GET /reports/bank-account-transactions?startDate=&endDate=&bankAccountId=`
- **Service method:** `getBankAccountTransactions(entityId, startDate, endDate, bankAccountId?)`
- **Logic:** `AccountTransaction.findMany` where `entityId`, `date` in range, account is a bank/cash account (subCategory code `1110` or linked to a `BankAccount`). Include account name. Optional filter by specific bank account. Compute running balance.
- **Response shape:** `{ period, rows: Array<{ date, description, reference, debit, credit, runningBalance, accountName }>, openingBalance, closingBalance }`
- **Frontend:** Account selector dropdown (filter by bank account). Table with running balance column. KPI cards: Opening Balance, Total Debits, Total Credits, Closing Balance. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/BankAccountTransactions.tsx`

---

### ── Inventory (Supplies) ─────────────────────────────────────────────

#### [ ] Supplies Consumption by Department
- **Backend:** `GET /reports/supplies-consumption-by-department?startDate=&endDate=`
- **Service method:** `getSuppliesConsumptionByDepartment(entityId, startDate, endDate)`
- **Logic:** `SupplyIssueHistory.findMany` where `entityId`, `issueDate` in range. Group by `departmentId`. For each department: sum `quantity`. Join `Department.name`, `StoreSupply.name`, `StoreSupply.unitPrice` to compute value.
- **Response shape:** `{ period, rows: Array<{ departmentName, totalQuantity, totalValue, items: Array<{ supplyName, quantity, unitPrice, totalValue }> }> }`
- **Frontend:** Bar chart (consumption by department). Table with department rows expandable to show supply breakdown. KPI cards: Total Items Issued, Total Departments, Total Value Consumed. Date range filter.
- **Figma ref:** `styles/src/app/components/pages/reports/SuppliesConsumptionByDepartment.tsx`

#### [ ] Supplies Consumption by Project
- **Backend:** `GET /reports/supplies-consumption-by-project?startDate=&endDate=`
- **Service method:** `getSuppliesConsumptionByProject(entityId, startDate, endDate)`
- **Logic:** Same as by-department but group by `projectId`. Join `Project.name`.
- **Response shape:** Mirror of by-department with `projectName` instead of `departmentName`.
- **Frontend:** Mirror of by-department UI.
- **Figma ref:** `styles/src/app/components/pages/reports/SuppliesConsumptionByProject.tsx`

#### [ ] Supplies Inventory Report
- **Backend:** `GET /reports/supplies-inventory-report`  (no date filter — current state)
- **Service method:** `getSuppliesInventory(entityId)`
- **Logic:** `StoreSupply.findMany` where `entityId`. For each: current `quantity`, `minQuantity`, `unitPrice`, `totalValue = quantity × unitPrice`, `status = quantity <= minQuantity ? 'Low Stock' : 'OK'`. Also sum from `SupplyRestockHistory` for last restock date.
- **Response shape:** `{ rows: Array<{ supplyName, category, sku, quantity, minQuantity, unitPrice, totalValue, status, lastRestockDate, supplier }>, summary: { totalItems, totalValue, lowStockCount } }`
- **Frontend:** 3 KPI cards (Total Items, Total Value, Low Stock Count). Table with status badges. Filter by category. No date range (snapshot report).
- **Figma ref:** `styles/src/app/components/pages/reports/SuppliesInventoryReport.tsx`

---

## GROUP REPORTS

> These are admin-only, accessed via `@admin/reports`. Aggregate data across ALL entities in the group.
> Backend module: `apps/api/src/group-reports/` (new module, not yet created).
> `groupId` comes from `getEffectiveGroupId(req)`.

### [ ] Create group-reports module (prerequisite for all group reports)
- Create `apps/api/src/group-reports/group-reports.module.ts`
- Create `apps/api/src/group-reports/group-reports.controller.ts`
- Create `apps/api/src/group-reports/group-reports.service.ts`
- Create `apps/api/src/group-reports/dto/group-reports.dto.ts`
- Register in `app.module.ts`
- Create `apps/web/lib/api/services/groupReportService.ts`
- Create `apps/web/lib/api/hooks/useGroupReports.ts`
- Create `apps/web/components/features/admin/group-reports/details/GroupReportsDetails.tsx`
- Wire `GroupReportsDetails` into the admin reports page

### ── Consolidated Statements ─────────────────────────────────────────

#### [ ] Consolidated Profit and Loss
- **Backend:** `GET /group-reports/consolidated-profit-and-loss?startDate=&endDate=`
- **Logic:** Run `fetchPLSections` from existing `ReportsService` for **each entity** in the group. Sum all results. Optionally show per-entity breakdown. Also accept `compareStartDate/compareEndDate`.
- **Response shape:** Same as entity P&L plus `entityBreakdown: Array<{ entityName, revenue, expenses, netProfit }>`.
- **Frontend:** Same UI as entity P&L. Add entity breakdown table below main statements. Entity filter dropdown (show all or select specific entities).
- **Figma ref:** `styles/src/app/components/pages/ConsolidatedProfitAndLoss.tsx`

#### [ ] Consolidated Balance Sheet
- **Backend:** `GET /group-reports/consolidated-balance-sheet?asOfDate=`
- **Logic:** Sum balance sheet across all entities in group. Optionally eliminate intercompany balances (deferred if intercompany model not yet built — see Q3).
- **Response shape:** Same as entity Balance Sheet plus `entityBreakdown`.
- **Figma ref:** `styles/src/app/components/pages/ConsolidatedBalanceSheet.tsx`

#### [ ] Consolidated Cash Flow Statement
- **Backend:** `GET /group-reports/consolidated-cash-flow-statement?startDate=&endDate=`
- **Logic:** Sum cash flow across all entities in group.
- **Response shape:** Same as entity Cash Flow plus `entityBreakdown`.
- **Figma ref:** `styles/src/app/components/pages/ConsolidatedCashFlowStatement.tsx`

#### [ ] Consolidated Financial Position
- **Backend:** `GET /group-reports/consolidated-financial-position?asOfDate=`
- **Logic:** Statement of Financial Position format (IFRS style) = Assets − Liabilities = Net Assets = Equity. Uses same data as Consolidated Balance Sheet but displayed in "net assets" format.
- **Figma ref:** `styles/src/app/components/pages/ConsolidatedFinancialPosition.tsx`

### ── Intercompany Reports ─────────────────────────────────────────────

#### [B] Intercompany Transactions Report
- **BLOCKED — Q3:** No `IntercompanyTransaction` model or equivalent exists in the schema. There is no way to identify cross-entity transactions without either a new model+migration or an agreed convention. Owner must answer Q3 first.
- **Figma ref:** `styles/src/app/components/pages/IntercompanyTransactionsReport.tsx`

### ── Entity Comparison ───────────────────────────────────────────────

#### [ ] Entity Revenue Comparison
- **Backend:** `GET /group-reports/entity-revenue-comparison?startDate=&endDate=`
- **Logic:** For each entity in the group, sum revenue (`AccountTransaction` on type `4000` accounts). Return sorted by revenue descending.
- **Response shape:** `{ period, totalGroupRevenue, rows: Array<{ entityId, entityName, revenue, percentOfGroup, revenueGrowth? }> }`
- **Frontend:** Horizontal bar chart (entity revenue). Table. KPI cards: Total Group Revenue, Highest Entity, Avg per Entity.
- **Figma ref:** `styles/src/app/components/pages/EntityRevenueComparison.tsx`

#### [ ] Entity Profitability Analysis
- **Backend:** `GET /group-reports/entity-profitability-analysis?startDate=&endDate=`
- **Logic:** For each entity: revenue, expenses, net profit, net margin %. Sort by net profit.
- **Response shape:** `{ period, rows: Array<{ entityId, entityName, revenue, expenses, netProfit, netMargin }> }`
- **Frontend:** Grouped bar chart (revenue vs expenses per entity). Table. KPI cards: Most Profitable, Least Profitable, Group Net Profit.
- **Figma ref:** `styles/src/app/components/pages/EntityProfitabilityAnalysis.tsx`

#### [ ] Entity Expense Comparison
- **Backend:** `GET /group-reports/entity-expense-comparison?startDate=&endDate=`
- **Logic:** For each entity, sum expenses (type `5000` accounts). Sort by total expenses descending.
- **Response shape:** `{ period, totalGroupExpenses, rows: Array<{ entityId, entityName, totalExpenses, percentOfGroup }> }`
- **Frontend:** Bar chart + table. KPI cards: Total Group Expenses, Highest Spender.

### ── Group Analytics ─────────────────────────────────────────────────

#### [B] Group Cash Flow Forecasting Report
- **BLOCKED — Q2:** Same dependency as entity Cash Flow Forecasting. Cannot build the group version until the entity version approach is confirmed.
- **Figma ref:** `styles/src/app/components/pages/GroupCashFlowForecastingReport.tsx`

---

## Build Order (recommended sequence)

### Entity reports
1. Balance Sheet ← unblocked, needed by Business Performance Ratios
2. Business Performance Ratios ← depends on Balance Sheet logic
3. Sales by Customer ← simple, unblocked, good warm-up
4. Sales by Item
5. Invoice Details
6. Receivable Summary
7. Aged Receivables
8. Customer Balances
9. Payment Method Summary
10. Payable Summary
11. Aged Payables
12. Vendor Balances
13. Expense by Category
14. Expense by Vendor
15. Bill Details
16. Bank Reconciliation Summary
17. Bank Account Transactions
18. Supplies Inventory Report
19. Supplies Consumption by Department
20. Supplies Consumption by Project
21. Sales Tax Summary ← after Q5 is answered
22. Tax Liability Report ← after Q5 is answered
23. Sales by Salesperson ← after Q1 is answered
24. Cash Flow Forecasting ← after Q2 is answered
25. Movement of Equity ← after Q4 is answered

### Group reports
26. Create group-reports module (prerequisite)
27. Consolidated Profit and Loss
28. Consolidated Balance Sheet
29. Consolidated Cash Flow Statement
30. Consolidated Financial Position
31. Entity Revenue Comparison
32. Entity Profitability Analysis
33. Entity Expense Comparison
34. Intercompany Transactions Report ← after Q3 is answered
35. Group Cash Flow Forecasting Report ← after Q2 is answered

**Total:** 35 tasks (24 entity reports + 9 group reports + 1 module setup + 1 already-done Balance Sheet deferred to here)

---

## Summary counts

| Category | Entity Done | Entity Todo | Group Done | Group Todo |
|---|---|---|---|---|
| Business Overview | 3 | 4 (2 blocked) | - | - |
| Consolidated Statements | - | - | 0 | 4 |
| Sales & Receivables | 0 | 8 (1 blocked) | - | - |
| Payables & Expenses | 0 | 6 | - | - |
| Taxes | 0 | 2 (partial block) | - | - |
| Banking | 0 | 2 | - | - |
| Inventory | 0 | 3 | - | - |
| Intercompany | - | - | 0 | 1 (blocked) |
| Entity Comparison | - | - | 0 | 3 |
| Group Analytics | - | - | 0 | 1 (blocked) |
| **Total** | **3** | **25** | **0** | **9** |
