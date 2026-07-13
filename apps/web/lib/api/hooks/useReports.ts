import { useQuery } from "@tanstack/react-query";
import * as reportService from "../services/reportService";
import {
  ProfitAndLossData,
  ProfitAndLossParams,
  CashFlowStatementData,
  CashFlowParams,
  TrialBalanceData,
  TrialBalanceParams,
  BalanceSheetData,
  BalanceSheetParams,
  PerformanceRatiosData,
  SalesByCustomerData,
  SalesByItemData,
  InvoiceDetailsData,
  InvoiceDetailsParams,
  ReceivableSummaryData,
  AgedReceivablesData,
  CustomerBalancesData,
  PaymentMethodSummaryData,
  PayableSummaryData,
  AgedPayablesData,
  VendorBalancesData,
  ExpenseByCategoryData,
  ExpenseByVendorData,
  BillDetailsData,
  BillDetailsParams,
  BankReconciliationSummaryData,
  BankAccountTransactionsData,
  BankAccountTransactionsParams,
  SuppliesInventoryData,
  SuppliesConsumptionByDeptData,
  SuppliesConsumptionByProjectData,
  PeriodParams,
  AsOfParams,
} from "../services/reportService";

export const useProfitAndLoss = (params: ProfitAndLossParams) =>
  useQuery<ProfitAndLossData>({
    queryKey: [
      "profit-and-loss",
      params.startDate,
      params.endDate,
      params.compareStartDate,
      params.compareEndDate,
    ],
    queryFn: () => reportService.getProfitAndLoss(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useCashFlowStatement = (params: CashFlowParams) =>
  useQuery<CashFlowStatementData>({
    queryKey: [
      "cash-flow-statement",
      params.startDate,
      params.endDate,
      params.compareStartDate,
      params.compareEndDate,
    ],
    queryFn: () => reportService.getCashFlowStatement(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useTrialBalance = (params: TrialBalanceParams) =>
  useQuery<TrialBalanceData>({
    queryKey: ["trial-balance", params.startDate, params.endDate],
    queryFn: () => reportService.getTrialBalance(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useBalanceSheet = (params: BalanceSheetParams) =>
  useQuery<BalanceSheetData>({
    queryKey: ["balance-sheet", params.asOfDate, params.compareAsOfDate],
    queryFn: () => reportService.getBalanceSheet(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const usePerformanceRatios = (params: PeriodParams) =>
  useQuery<PerformanceRatiosData>({
    queryKey: ["performance-ratios", params.startDate, params.endDate],
    queryFn: () => reportService.getPerformanceRatios(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useSalesByCustomer = (params: PeriodParams) =>
  useQuery<SalesByCustomerData>({
    queryKey: ["sales-by-customer", params.startDate, params.endDate],
    queryFn: () => reportService.getSalesByCustomer(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useSalesByItem = (params: PeriodParams) =>
  useQuery<SalesByItemData>({
    queryKey: ["sales-by-item", params.startDate, params.endDate],
    queryFn: () => reportService.getSalesByItem(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useInvoiceDetails = (params: InvoiceDetailsParams) =>
  useQuery<InvoiceDetailsData>({
    queryKey: ["invoice-details", params.startDate, params.endDate, params.status, params.customerId],
    queryFn: () => reportService.getInvoiceDetails(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useReceivableSummary = (params: AsOfParams) =>
  useQuery<ReceivableSummaryData>({
    queryKey: ["receivable-summary", params.asOfDate],
    queryFn: () => reportService.getReceivableSummary(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const useAgedReceivables = (params: AsOfParams) =>
  useQuery<AgedReceivablesData>({
    queryKey: ["aged-receivables", params.asOfDate],
    queryFn: () => reportService.getAgedReceivables(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const useCustomerBalances = (params: AsOfParams) =>
  useQuery<CustomerBalancesData>({
    queryKey: ["customer-balances", params.asOfDate],
    queryFn: () => reportService.getCustomerBalances(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const usePaymentMethodSummary = (params: PeriodParams) =>
  useQuery<PaymentMethodSummaryData>({
    queryKey: ["payment-method-summary", params.startDate, params.endDate],
    queryFn: () => reportService.getPaymentMethodSummary(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const usePayableSummary = (params: AsOfParams) =>
  useQuery<PayableSummaryData>({
    queryKey: ["payable-summary", params.asOfDate],
    queryFn: () => reportService.getPayableSummary(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const useAgedPayables = (params: AsOfParams) =>
  useQuery<AgedPayablesData>({
    queryKey: ["aged-payables", params.asOfDate],
    queryFn: () => reportService.getAgedPayables(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const useVendorBalances = (params: AsOfParams) =>
  useQuery<VendorBalancesData>({
    queryKey: ["vendor-balances", params.asOfDate],
    queryFn: () => reportService.getVendorBalances(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.asOfDate,
  });

export const useExpenseByCategory = (params: PeriodParams) =>
  useQuery<ExpenseByCategoryData>({
    queryKey: ["expense-by-category", params.startDate, params.endDate],
    queryFn: () => reportService.getExpenseByCategory(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useExpenseByVendor = (params: PeriodParams) =>
  useQuery<ExpenseByVendorData>({
    queryKey: ["expense-by-vendor", params.startDate, params.endDate],
    queryFn: () => reportService.getExpenseByVendor(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useBillDetails = (params: BillDetailsParams) =>
  useQuery<BillDetailsData>({
    queryKey: ["bill-details", params.startDate, params.endDate, params.status, params.vendorId],
    queryFn: () => reportService.getBillDetails(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useBankReconciliationSummary = (params: PeriodParams) =>
  useQuery<BankReconciliationSummaryData>({
    queryKey: ["bank-reconciliation-summary", params.startDate, params.endDate],
    queryFn: () => reportService.getBankReconciliationSummary(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useBankAccountTransactions = (params: BankAccountTransactionsParams) =>
  useQuery<BankAccountTransactionsData>({
    queryKey: ["bank-account-transactions", params.startDate, params.endDate, params.bankAccountId],
    queryFn: () => reportService.getBankAccountTransactions(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useSuppliesInventory = () =>
  useQuery<SuppliesInventoryData>({
    queryKey: ["supplies-inventory"],
    queryFn: () => reportService.getSuppliesInventory(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useSuppliesConsumptionByDept = (params: PeriodParams) =>
  useQuery<SuppliesConsumptionByDeptData>({
    queryKey: ["supplies-consumption-by-dept", params.startDate, params.endDate],
    queryFn: () => reportService.getSuppliesConsumptionByDept(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useSuppliesConsumptionByProject = (params: PeriodParams) =>
  useQuery<SuppliesConsumptionByProjectData>({
    queryKey: ["supplies-consumption-by-project", params.startDate, params.endDate],
    queryFn: () => reportService.getSuppliesConsumptionByProject(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });
