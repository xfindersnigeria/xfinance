import { apiClient } from "../client";

export interface PLAccountLine {
  id: string;
  name: string;
  code: string;
  actual: number;
  comparison: number;
  budget: number;
}

export interface PLSection {
  actual: number;
  comparison: number;
  budget: number;
  accounts: PLAccountLine[];
}

export interface PLKPIEntry {
  actual: number;
  comparison: number;
}

export interface ProfitAndLossData {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  revenue: PLSection;
  otherIncome: PLSection;
  cogs: PLSection;
  operatingExpenses: PLSection;
  otherExpenses: PLSection;
  grossProfit: PLKPIEntry;
  operatingProfit: PLKPIEntry;
  netProfit: PLKPIEntry;
  kpis: {
    totalRevenue: PLKPIEntry;
    grossProfit: PLKPIEntry;
    operatingProfit: PLKPIEntry;
    netProfit: PLKPIEntry;
  };
}

export interface ProfitAndLossParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
}

// ─── Cash Flow ────────────────────────────────────────────────────────────────

export interface CFEntry {
  actual: number;
  comparison: number;
}

export interface CashFlowStatementData {
  period: { startDate: string; endDate: string };
  comparePeriod: { startDate: string; endDate: string } | null;
  operating: {
    netProfit: CFEntry;
    depreciation: CFEntry;
    arChange: CFEntry;
    inventoryChange: CFEntry;
    prepaidChange: CFEntry;
    apChange: CFEntry;
    wagesPayableChange: CFEntry;
    deferredRevenueChange: CFEntry;
    netCash: CFEntry;
  };
  investing: {
    fixedAssetsChange: CFEntry;
    intangibleAssetsChange: CFEntry;
    netCash: CFEntry;
  };
  financing: {
    longTermDebtChange: CFEntry;
    capitalStockChange: CFEntry;
    netCash: CFEntry;
  };
  netCashChange: CFEntry;
  cashAtStart: CFEntry;
  cashAtEnd: CFEntry;
  kpis: {
    operatingCashFlow: CFEntry;
    investingCashFlow: CFEntry;
    financingCashFlow: CFEntry;
    netCashIncrease: CFEntry;
  };
}

export interface CashFlowParams {
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
}

// ─── Trial Balance ────────────────────────────────────────────────────────────

export interface TBAccountLine {
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

export interface TBSection {
  typeCode: string;
  typeName: string;
  linkedType: string;
  accounts: TBAccountLine[];
  totalOpeningBalance: number;
  totalDebit: number;
  totalCredit: number;
  totalClosingBalance: number;
}

export interface TrialBalanceData {
  period: { startDate: string; endDate: string };
  sections: TBSection[];
  totalOpeningBalance: number;
  grandTotalDebit: number;
  grandTotalCredit: number;
  totalClosingBalance: number;
  isBalanced: boolean;
  difference: number;
}

export interface TrialBalanceParams {
  startDate: string;
  endDate: string;
}

export const getTrialBalance = async (params: TrialBalanceParams): Promise<TrialBalanceData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<TrialBalanceData>(`reports/trial-balance?${q.toString()}`);
};

export const getCashFlowStatement = async (
  params: CashFlowParams
): Promise<CashFlowStatementData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.compareStartDate) q.append("compareStartDate", params.compareStartDate);
  if (params.compareEndDate) q.append("compareEndDate", params.compareEndDate);
  return apiClient<CashFlowStatementData>(`reports/cash-flow-statement?${q.toString()}`);
};

// ─── Profit & Loss ────────────────────────────────────────────────────────────

export const getProfitAndLoss = async (
  params: ProfitAndLossParams
): Promise<ProfitAndLossData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.compareStartDate) q.append("compareStartDate", params.compareStartDate);
  if (params.compareEndDate) q.append("compareEndDate", params.compareEndDate);
  return apiClient<ProfitAndLossData>(`reports/profit-and-loss?${q.toString()}`);
};

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export interface BSAccountLine {
  id: string;
  name: string;
  code: string;
  balance: number;
  comparison: number;
}

export interface BSSection {
  label: string;
  accounts: BSAccountLine[];
  total: number;
  comparison: number;
}

export interface BalanceSheetData {
  asOfDate: string;
  compareAsOfDate: string | null;
  assets: { current: BSSection; nonCurrent: BSSection; total: number; comparison: number };
  liabilities: { current: BSSection; longTerm: BSSection; total: number; comparison: number };
  equity: { sections: BSSection[]; retainedEarnings: number; retainedEarningsComparison: number; total: number; comparison: number };
  totalLiabilitiesAndEquity: number;
  totalLiabilitiesAndEquityComparison: number;
  isBalanced: boolean;
}

export interface BalanceSheetParams {
  asOfDate: string;
  compareAsOfDate?: string;
}

export const getBalanceSheet = async (params: BalanceSheetParams): Promise<BalanceSheetData> => {
  const q = new URLSearchParams({ asOfDate: params.asOfDate });
  if (params.compareAsOfDate) q.append("compareAsOfDate", params.compareAsOfDate);
  return apiClient<BalanceSheetData>(`reports/balance-sheet?${q.toString()}`);
};

// ─── Business Performance Ratios ─────────────────────────────────────────────

export interface RatioData {
  key: string;
  name: string;
  value: number | null;
  description: string;
  interpretation: string;
  status: "excellent" | "good" | "warning" | "poor" | "neutral";
}

export interface PerformanceRatiosData {
  period: { startDate: string; endDate: string };
  asOfDate: string;
  ratios: RatioData[];
}

export interface PeriodParams {
  startDate: string;
  endDate: string;
}

export const getPerformanceRatios = async (params: PeriodParams): Promise<PerformanceRatiosData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<PerformanceRatiosData>(`reports/performance-ratios?${q.toString()}`);
};

// ─── Sales by Customer ────────────────────────────────────────────────────────

export interface SalesByCustomerRow {
  customerId: string;
  customerName: string;
  totalSales: number;
  invoiceCount: number;
  avgInvoice: number;
  percentOfTotal: number;
  growth: number | null;
}

export interface SalesByCustomerData {
  period: { startDate: string; endDate: string };
  summary: { totalSales: number; totalInvoices: number; avgInvoice: number };
  rows: SalesByCustomerRow[];
}

export const getSalesByCustomer = async (params: PeriodParams): Promise<SalesByCustomerData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<SalesByCustomerData>(`reports/sales-by-customer?${q.toString()}`);
};

// ─── Sales by Item ────────────────────────────────────────────────────────────

export interface SalesByItemRow {
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

export interface SalesByItemData {
  period: { startDate: string; endDate: string };
  summary: { totalRevenue: number; totalQuantity: number; totalCost: number; totalProfit: number; profitMargin: number | null; totalInvoices: number };
  rows: SalesByItemRow[];
}

export const getSalesByItem = async (params: PeriodParams): Promise<SalesByItemData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<SalesByItemData>(`reports/sales-by-item?${q.toString()}`);
};

// ─── Invoice Details ──────────────────────────────────────────────────────────

export interface InvoiceDetailRow {
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

export interface InvoiceDetailsData {
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
  rows: InvoiceDetailRow[];
}

export interface InvoiceDetailsParams extends PeriodParams {
  status?: string;
  customerId?: string;
}

export const getInvoiceDetails = async (params: InvoiceDetailsParams): Promise<InvoiceDetailsData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.status) q.append("status", params.status);
  if (params.customerId) q.append("customerId", params.customerId);
  return apiClient<InvoiceDetailsData>(`reports/invoice-details?${q.toString()}`);
};

// ─── Receivable Summary ───────────────────────────────────────────────────────

export interface ReceivableSummaryRow {
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

export interface ReceivableSummaryData {
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
  rows: ReceivableSummaryRow[];
}

export interface AsOfParams {
  asOfDate: string;
}

export const getReceivableSummary = async (params: AsOfParams): Promise<ReceivableSummaryData> => {
  const q = new URLSearchParams({ asOfDate: params.asOfDate });
  return apiClient<ReceivableSummaryData>(`reports/receivable-summary?${q.toString()}`);
};

// ─── Aged Receivables ─────────────────────────────────────────────────────────

export interface AgedReceivablesRow {
  customerName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  days120Plus: number;
  total: number;
}

export interface AgedTotals {
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  days120Plus: number;
  total: number;
}

export interface AgedReceivablesData {
  asOfDate: string;
  totals: AgedTotals;
  rows: AgedReceivablesRow[];
}

export const getAgedReceivables = async (params: AsOfParams): Promise<AgedReceivablesData> => {
  const q = new URLSearchParams({ asOfDate: params.asOfDate });
  return apiClient<AgedReceivablesData>(`reports/aged-receivables?${q.toString()}`);
};

// ─── Customer Balances ────────────────────────────────────────────────────────

export interface CustomerBalanceRow {
  customerId: string;
  customerName: string;
  email: string;
  openingBalance: number;
  invoiced: number;
  payments: number;
  closingBalance: number;
  status: 'Debit' | 'Credit' | 'Zero';
  lastTransactionDate: string | null;
}

export interface CustomerBalancesData {
  period: { startDate: string; endDate: string };
  totalCustomers: number;
  debitCount: number;
  creditCount: number;
  zeroCount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  totalOpeningBalance: number;
  totalInvoiced: number;
  totalPayments: number;
  totalClosingBalance: number;
  rows: CustomerBalanceRow[];
}

export const getCustomerBalances = async (params: PeriodParams): Promise<CustomerBalancesData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<CustomerBalancesData>(`reports/customer-balances?${q.toString()}`);
};

// ─── Payment Method Summary ───────────────────────────────────────────────────

export interface PaymentMethodRow {
  paymentMethod: string;
  totalAmount: number;
  transactionCount: number;
  percentOfTotal: number;
  avgTransaction: number;
  growthPercent: number | null;
}

export interface PaymentTransaction {
  id: string;
  date: string;
  customerName: string;
  invoiceNumber: string;
  paymentMethod: string;
  amount: number;
  reference: string;
}

export interface PaymentMethodSummaryData {
  period: { startDate: string; endDate: string };
  totalReceived: number;
  transactionCount: number;
  totalGrowthPercent: number | null;
  methods: string[];
  rows: PaymentMethodRow[];
  trends: Record<string, number | string>[];
  recentTransactions: PaymentTransaction[];
}

export const getPaymentMethodSummary = async (params: PeriodParams): Promise<PaymentMethodSummaryData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<PaymentMethodSummaryData>(`reports/payment-method-summary?${q.toString()}`);
};

// ─── Payable Summary ──────────────────────────────────────────────────────────

export interface PayableSummaryRow {
  vendorId: string;
  vendorName: string;
  paymentTerms: string;
  totalPayable: number;
  current: number;
  overdue: number;
  billCount: number;
  lastPaymentDate: string | null;
  status: 'Good' | 'Warning' | 'Critical';
}

export interface PayableSummaryData {
  asOfDate: string;
  vendorCount: number;
  totalPayable: number;
  totalCurrent: number;
  totalOverdue: number;
  avgPayable: number;
  overdueVendorCount: number;
  overduePercentage: number;
  goodCount: number;
  warningCount: number;
  criticalCount: number;
  rows: PayableSummaryRow[];
}

export const getPayableSummary = async (params: AsOfParams): Promise<PayableSummaryData> => {
  const q = new URLSearchParams({ asOfDate: params.asOfDate });
  return apiClient<PayableSummaryData>(`reports/payable-summary?${q.toString()}`);
};

// ─── Aged Payables ────────────────────────────────────────────────────────────

export interface AgedPayablesRow {
  vendorName: string;
  current: number;
  days1_30: number;
  days31_60: number;
  days61_90: number;
  days91_120: number;
  days120Plus: number;
  total: number;
}

export interface AgedPayablesData {
  asOfDate: string;
  totals: AgedTotals;
  rows: AgedPayablesRow[];
}

export const getAgedPayables = async (params: AsOfParams): Promise<AgedPayablesData> => {
  const q = new URLSearchParams({ asOfDate: params.asOfDate });
  return apiClient<AgedPayablesData>(`reports/aged-payables?${q.toString()}`);
};

// ─── Vendor Balances ──────────────────────────────────────────────────────────

export interface VendorBalanceRow {
  vendorId: string;
  vendorName: string;
  email: string;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  debitNotes: number;
  closingBalance: number;
  status: 'Debit' | 'Credit' | 'Zero';
  lastTransactionDate: string | null;
}

export interface VendorBalancesData {
  startDate: string;
  endDate: string;
  vendorCount: number;
  debitCount: number;
  totalDebit: number;
  totalCredit: number;
  netBalance: number;
  totalBilled: number;
  totalPaid: number;
  rows: VendorBalanceRow[];
}

export const getVendorBalances = async (params: PeriodParams): Promise<VendorBalancesData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<VendorBalancesData>(`reports/vendor-balances?${q.toString()}`);
};

// ─── Expense by Category ──────────────────────────────────────────────────────

export interface ExpenseCategoryAccount {
  accountId: string;
  accountName: string;
  accountCode: string;
  amount: number;
  percentOfCategory: number;
}

export interface ExpenseByCategoryRow {
  categoryCode: string;
  categoryName: string;
  total: number;
  percentOfTotal: number;
  accounts: ExpenseCategoryAccount[];
}

export interface ExpenseByCategoryData {
  period: { startDate: string; endDate: string };
  totalExpenses: number;
  rows: ExpenseByCategoryRow[];
}

export const getExpenseByCategory = async (params: PeriodParams): Promise<ExpenseByCategoryData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<ExpenseByCategoryData>(`reports/expense-by-category?${q.toString()}`);
};

// ─── Expense by Vendor ────────────────────────────────────────────────────────

export interface ExpenseByVendorRow {
  vendorId: string;
  vendorName: string;
  totalBilled: number;
  billCount: number;
  percentOfTotal: number;
}

export interface ExpenseByVendorData {
  period: { startDate: string; endDate: string };
  totalExpenses: number;
  rows: ExpenseByVendorRow[];
}

export const getExpenseByVendor = async (params: PeriodParams): Promise<ExpenseByVendorData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<ExpenseByVendorData>(`reports/expense-by-vendor?${q.toString()}`);
};

// ─── Bill Details ─────────────────────────────────────────────────────────────

export interface BillDetailRow {
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

export interface BillDetailsData {
  period: { startDate: string; endDate: string };
  summary: { totalBills: number; totalAmount: number; totalTax: number };
  rows: BillDetailRow[];
}

export interface BillDetailsParams extends PeriodParams {
  status?: string;
  vendorId?: string;
}

export const getBillDetails = async (params: BillDetailsParams): Promise<BillDetailsData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.status) q.append("status", params.status);
  if (params.vendorId) q.append("vendorId", params.vendorId);
  return apiClient<BillDetailsData>(`reports/bill-details?${q.toString()}`);
};

// ─── Bank Reconciliation Summary ─────────────────────────────────────────────

export interface BankReconciliationSummaryRow {
  reconciliationId: string;
  bankAccountName: string;
  statementEndDate: string;
  statementEndingBalance: number;
  status: string;
  completedAt: string | null;
  completedBy: string | null;
  matchedCount: number;
}

export interface BankReconciliationSummaryData {
  period: { startDate: string; endDate: string };
  totalCompleted: number;
  totalDraft: number;
  rows: BankReconciliationSummaryRow[];
}

export const getBankReconciliationSummary = async (params: PeriodParams): Promise<BankReconciliationSummaryData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<BankReconciliationSummaryData>(`reports/bank-reconciliation-summary?${q.toString()}`);
};

// ─── Bank Account Transactions ────────────────────────────────────────────────

export interface BankAccountTransactionRow {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
  accountName: string;
}

export interface BankAccountTransactionsData {
  period: { startDate: string; endDate: string };
  openingBalance: number;
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
  rows: BankAccountTransactionRow[];
}

export interface BankAccountTransactionsParams extends PeriodParams {
  bankAccountId?: string;
}

export const getBankAccountTransactions = async (params: BankAccountTransactionsParams): Promise<BankAccountTransactionsData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  if (params.bankAccountId) q.append("bankAccountId", params.bankAccountId);
  return apiClient<BankAccountTransactionsData>(`reports/bank-account-transactions?${q.toString()}`);
};

// ─── Supplies Inventory ───────────────────────────────────────────────────────

export interface SupplyInventoryRow {
  supplyId: string;
  name: string;
  category: string;
  sku: string | null;
  quantity: number;
  minQuantity: number;
  unitPrice: number;
  totalValue: number;
  status: "OK" | "Low Stock" | "Out of Stock";
  lastRestockDate: string | null;
  supplier: string | null;
}

export interface SuppliesInventoryData {
  summary: { totalItems: number; totalValue: number; lowStockCount: number; outOfStockCount: number };
  rows: SupplyInventoryRow[];
}

export const getSuppliesInventory = async (): Promise<SuppliesInventoryData> => {
  return apiClient<SuppliesInventoryData>(`reports/supplies-inventory`);
};

// ─── Supplies Consumption ─────────────────────────────────────────────────────

export interface SupplyConsumptionItem {
  supplyId: string;
  supplyName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
}

export interface SuppliesConsumptionByDeptRow {
  departmentId: string | null;
  departmentName: string;
  totalQuantity: number;
  totalValue: number;
  items: SupplyConsumptionItem[];
}

export interface SuppliesConsumptionByDeptData {
  period: { startDate: string; endDate: string };
  summary: { totalQuantity: number; totalValue: number; departmentCount: number };
  rows: SuppliesConsumptionByDeptRow[];
}

export const getSuppliesConsumptionByDept = async (params: PeriodParams): Promise<SuppliesConsumptionByDeptData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<SuppliesConsumptionByDeptData>(`reports/supplies-consumption-by-department?${q.toString()}`);
};

export interface SuppliesConsumptionByProjectRow {
  projectId: string | null;
  projectName: string;
  totalQuantity: number;
  totalValue: number;
  items: SupplyConsumptionItem[];
}

export interface SuppliesConsumptionByProjectData {
  period: { startDate: string; endDate: string };
  summary: { totalQuantity: number; totalValue: number; projectCount: number };
  rows: SuppliesConsumptionByProjectRow[];
}

export const getSuppliesConsumptionByProject = async (params: PeriodParams): Promise<SuppliesConsumptionByProjectData> => {
  const q = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
  return apiClient<SuppliesConsumptionByProjectData>(`reports/supplies-consumption-by-project?${q.toString()}`);
};
