// ─── Trial Balance ────────────────────────────────────────────────────────────

export class TBAccountLineDto {
  id: string;
  name: string;
  code: string;
  linkedType: string;
  typeName: string;
  subCategoryName: string;
  openingBalance: number;
  debitAmount: number;
  creditAmount: number;
  closingBalance: number;
}

export class TBSectionDto {
  typeCode: string;
  typeName: string;
  linkedType: string;
  accounts: TBAccountLineDto[];
  totalOpeningBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalClosingBalance: number;
}

export class TrialBalanceDto {
  period: { startDate: string; endDate: string };
  sections: TBSectionDto[];
  totalOpeningBalance: number;
  grandTotalDebit: number;
  grandTotalCredit: number;
  totalClosingBalance: number;
  isBalanced: boolean;
  difference: number;
}

// ─── Profit & Loss ────────────────────────────────────────────────────────────

export class PLAccountLineDto {
  id: string;
  name: string;
  code: string;
  actual: number;
  comparison: number;
  /** Budget amount for the same period as "actual". 0 if no budget set. */
  budget: number;
}

export class PLSectionDto {
  actual: number;
  comparison: number;
  /** Sum of budget amounts for all accounts in this section. */
  budget: number;
  accounts: PLAccountLineDto[];
}

export class PLKPIEntryDto {
  actual: number;
  comparison: number;
}

export class PLKPIsDto {
  totalRevenue: PLKPIEntryDto;
  grossProfit: PLKPIEntryDto;
  operatingProfit: PLKPIEntryDto;
  netProfit: PLKPIEntryDto;
}

export class ProfitAndLossDto {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  revenue: PLSectionDto;
  otherIncome: PLSectionDto;
  cogs: PLSectionDto;
  operatingExpenses: PLSectionDto;
  otherExpenses: PLSectionDto;
  grossProfit: PLKPIEntryDto;
  operatingProfit: PLKPIEntryDto;
  netProfit: PLKPIEntryDto;
  kpis: PLKPIsDto;
}

// ─── Cash Flow Statement ──────────────────────────────────────────────────────

export class CFEntryDto {
  actual: number;
  comparison: number;
}

export class CashFlowOperatingDto {
  netProfit: CFEntryDto;
  depreciation: CFEntryDto;
  arChange: CFEntryDto;
  inventoryChange: CFEntryDto;
  prepaidChange: CFEntryDto;
  apChange: CFEntryDto;
  wagesPayableChange: CFEntryDto;
  deferredRevenueChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowInvestingDto {
  fixedAssetsChange: CFEntryDto;
  intangibleAssetsChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowFinancingDto {
  longTermDebtChange: CFEntryDto;
  capitalStockChange: CFEntryDto;
  netCash: CFEntryDto;
}

export class CashFlowKPIsDto {
  operatingCashFlow: CFEntryDto;
  investingCashFlow: CFEntryDto;
  financingCashFlow: CFEntryDto;
  netCashIncrease: CFEntryDto;
}

export class CashFlowStatementDto {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  operating: CashFlowOperatingDto;
  investing: CashFlowInvestingDto;
  financing: CashFlowFinancingDto;
  netCashChange: CFEntryDto;
  cashAtStart: CFEntryDto;
  cashAtEnd: CFEntryDto;
  kpis: CashFlowKPIsDto;
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export class BSAccountLineDto {
  id: string;
  name: string;
  code: string;
  balance: number;
  comparison: number;
}

export class BSSectionDto {
  label: string;
  accounts: BSAccountLineDto[];
  total: number;
  comparison: number;
}

export class BalanceSheetDto {
  asOfDate: string;
  compareAsOfDate: string | null;
  assets: {
    current: BSSectionDto;
    nonCurrent: BSSectionDto;
    total: number;
    comparison: number;
  };
  liabilities: {
    current: BSSectionDto;
    longTerm: BSSectionDto;
    total: number;
    comparison: number;
  };
  equity: {
    sections: BSSectionDto[];
    retainedEarnings: number;
    retainedEarningsComparison: number;
    total: number;
    comparison: number;
  };
  totalLiabilitiesAndEquity: number;
  totalLiabilitiesAndEquityComparison: number;
  isBalanced: boolean;
}

// ─── Business Performance Ratios ─────────────────────────────────────────────

export class RatioDto {
  key: string;
  name: string;
  value: number | null;
  description: string;
  interpretation: string;
  status: 'excellent' | 'good' | 'warning' | 'poor' | 'neutral';
}

export class PerformanceRatiosDto {
  period: { startDate: string; endDate: string };
  asOfDate: string;
  ratios: RatioDto[];
}

// ─── Sales by Customer ────────────────────────────────────────────────────────

export class SalesByCustomerRowDto {
  customerId: string;
  customerName: string;
  totalSales: number;
  invoiceCount: number;
  avgInvoice: number;
  percentOfTotal: number;
  growth: number | null;
}

export class SalesByCustomerDto {
  period: { startDate: string; endDate: string };
  summary: { totalSales: number; totalInvoices: number; avgInvoice: number };
  rows: SalesByCustomerRowDto[];
}

// ─── Sales by Item ────────────────────────────────────────────────────────────

export class SalesByItemRowDto {
  itemId: string;
  itemName: string;
  totalRevenue: number;
  totalQuantity: number;
  totalCost: number;
  totalProfit: number;
  margin: number | null;
  avgRate: number;
  invoiceCount: number;
  percentOfTotal: number;
}

export class SalesByItemDto {
  period: { startDate: string; endDate: string };
  summary: { totalRevenue: number; totalQuantity: number; totalCost: number; totalProfit: number; profitMargin: number | null; totalInvoices: number };
  rows: SalesByItemRowDto[];
}

// ─── Invoice Details ──────────────────────────────────────────────────────────

export class InvoiceDetailRowDto {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerName: string;
  paymentTerms: string;
  total: number;
  paid: number;
  balance: number;
  daysOverdue: number;
  status: string;
  currency: string;
  itemCount: number;
}

export class InvoiceDetailsDto {
  period: { startDate: string; endDate: string };
  summary: {
    totalInvoices: number;
    totalAmount: number;
    totalPaid: number;
    totalOutstanding: number;
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
    overdueCount: number;
    paidAmount: number;
    unpaidAmount: number;
    partialAmount: number;
    overdueAmount: number;
  };
  rows: InvoiceDetailRowDto[];
}

// ─── Receivable Summary ───────────────────────────────────────────────────────

export class ReceivableSummaryRowDto {
  customerId: string;
  customerName: string;
  paymentTerms: string;
  totalReceivable: number;
  current: number;
  overdue: number;
  invoiceCount: number;
  lastPaymentDate: string | null;
  creditLimit: number | null;
  creditUtilization: number | null;
  status: 'Good' | 'Warning' | 'Critical';
}

export class ReceivableSummaryDto {
  asOfDate: string;
  totalReceivables: number;
  totalCurrent: number;
  totalOverdue: number;
  customerCount: number;
  overdueCustomerCount: number;
  avgReceivable: number;
  overduePercentage: number;
  goodCount: number;
  warningCount: number;
  criticalCount: number;
  rows: ReceivableSummaryRowDto[];
}

// ─── Aged Receivables ─────────────────────────────────────────────────────────

export class AgedReceivablesRowDto {
  customerName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  days120Plus: number;
  total: number;
}

export class AgedReceivablesDto {
  asOfDate: string;
  totals: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days91_120: number;
    days120Plus: number;
    total: number;
  };
  rows: AgedReceivablesRowDto[];
}

// ─── Customer Balances ────────────────────────────────────────────────────────

export class CustomerBalanceRowDto {
  customerId: string;
  customerName: string;
  totalInvoiced: number;
  totalReceived: number;
  balance: number;
}

export class CustomerBalancesDto {
  asOfDate: string;
  totalInvoiced: number;
  totalReceived: number;
  totalBalance: number;
  rows: CustomerBalanceRowDto[];
}

// ─── Payment Method Summary ───────────────────────────────────────────────────

export class PaymentMethodRowDto {
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
  percentOfTotal: number;
}

export class PaymentMethodSummaryDto {
  period: { startDate: string; endDate: string };
  totalReceived: number;
  transactionCount: number;
  rows: PaymentMethodRowDto[];
}

// ─── Payable Summary ──────────────────────────────────────────────────────────

export class PayableSummaryRowDto {
  billId: string;
  billNumber: string;
  vendorName: string;
  billDate: string;
  dueDate: string;
  total: number;
  paid: number;
  outstanding: number;
  daysOverdue: number;
  status: string;
}

export class PayableSummaryDto {
  asOfDate: string;
  totalOutstanding: number;
  totalCurrent: number;
  totalOverdue: number;
  totalBilled: number;
  overduePercentage: number;
  rows: PayableSummaryRowDto[];
}

// ─── Aged Payables ────────────────────────────────────────────────────────────

export class AgedPayablesRowDto {
  vendorName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  days120Plus: number;
  total: number;
}

export class AgedPayablesDto {
  asOfDate: string;
  totals: {
    current: number;
    days1_30: number;
    days31_60: number;
    days61_90: number;
    days91_120: number;
    days120Plus: number;
    total: number;
  };
  rows: AgedPayablesRowDto[];
}

// ─── Vendor Balances ──────────────────────────────────────────────────────────

export class VendorBalanceRowDto {
  vendorId: string;
  vendorName: string;
  totalBilled: number;
  totalPaid: number;
  balance: number;
}

export class VendorBalancesDto {
  asOfDate: string;
  totalBilled: number;
  totalPaid: number;
  totalBalance: number;
  rows: VendorBalanceRowDto[];
}

// ─── Expense by Category ──────────────────────────────────────────────────────

export class ExpenseCategoryAccountDto {
  accountId: string;
  accountName: string;
  accountCode: string;
  amount: number;
  percentOfCategory: number;
}

export class ExpenseByCategoryRowDto {
  categoryCode: string;
  categoryName: string;
  total: number;
  percentOfTotal: number;
  accounts: ExpenseCategoryAccountDto[];
}

export class ExpenseByCategoryDto {
  period: { startDate: string; endDate: string };
  totalExpenses: number;
  rows: ExpenseByCategoryRowDto[];
}

// ─── Expense by Vendor ────────────────────────────────────────────────────────

export class ExpenseByVendorRowDto {
  vendorId: string;
  vendorName: string;
  totalBilled: number;
  billCount: number;
  percentOfTotal: number;
}

export class ExpenseByVendorDto {
  period: { startDate: string; endDate: string };
  totalExpenses: number;
  rows: ExpenseByVendorRowDto[];
}

// ─── Bill Details ─────────────────────────────────────────────────────────────

export class BillDetailRowDto {
  billId: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  vendorName: string;
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  items: { description: string; quantity: number; rate: number; total: number }[];
}

export class BillDetailsDto {
  period: { startDate: string; endDate: string };
  summary: { totalBills: number; totalAmount: number; totalTax: number };
  rows: BillDetailRowDto[];
}

// ─── Bank Reconciliation Summary ─────────────────────────────────────────────

export class BankReconciliationSummaryRowDto {
  reconciliationId: string;
  bankAccountName: string;
  statementEndDate: string;
  statementEndingBalance: number;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  matchedCount: number;
}

export class BankReconciliationSummaryDto {
  period: { startDate: string; endDate: string };
  totalCompleted: number;
  totalDraft: number;
  rows: BankReconciliationSummaryRowDto[];
}

// ─── Bank Account Transactions ────────────────────────────────────────────────

export class BankAccountTransactionRowDto {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  accountName: string;
}

export class BankAccountTransactionsDto {
  period: { startDate: string; endDate: string };
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  rows: BankAccountTransactionRowDto[];
}

// ─── Supplies Inventory Report ────────────────────────────────────────────────

export class SupplyInventoryRowDto {
  supplyId: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  totalValue: number;
  status: 'OK' | 'Low Stock' | 'Out of Stock';
  lastRestockDate: string | null;
  supplier: string | null;
}

export class SuppliesInventoryReportDto {
  summary: { totalItems: number; totalValue: number; lowStockCount: number; outOfStockCount: number };
  rows: SupplyInventoryRowDto[];
}

// ─── Supplies Consumption by Department ──────────────────────────────────────

export class SupplyConsumptionItemDto {
  supplyId: string;
  supplyName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export class SuppliesConsumptionByDeptRowDto {
  departmentId: string | null;
  departmentName: string;
  totalQuantity: number;
  totalValue: number;
  items: SupplyConsumptionItemDto[];
}

export class SuppliesConsumptionByDeptDto {
  period: { startDate: string; endDate: string };
  summary: { totalQuantity: number; totalValue: number; departmentCount: number };
  rows: SuppliesConsumptionByDeptRowDto[];
}

// ─── Supplies Consumption by Project ─────────────────────────────────────────

export class SuppliesConsumptionByProjectRowDto {
  projectId: string | null;
  projectName: string;
  totalQuantity: number;
  totalValue: number;
  items: SupplyConsumptionItemDto[];
}

export class SuppliesConsumptionByProjectDto {
  period: { startDate: string; endDate: string };
  summary: { totalQuantity: number; totalValue: number; projectCount: number };
  rows: SuppliesConsumptionByProjectRowDto[];
}
