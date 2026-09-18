import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReportExportFormat, ReportExportPayload } from "@/lib/reports/export-types";
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
  CashFlowForecastData,
  CashFlowForecastParams,
  MovementOfEquityData,
  SalesTaxSummaryData,
  TaxLiabilityReportData,
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

export const useCustomerBalances = (params: PeriodParams) =>
  useQuery<CustomerBalancesData>({
    queryKey: ["customer-balances", params.startDate, params.endDate],
    queryFn: () => reportService.getCustomerBalances(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
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

export const useVendorBalances = (params: PeriodParams) =>
  useQuery<VendorBalancesData>({
    queryKey: ["vendor-balances", params.startDate, params.endDate],
    queryFn: () => reportService.getVendorBalances(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
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

export const useCashFlowForecast = (params: CashFlowForecastParams) =>
  useQuery<CashFlowForecastData>({
    queryKey: ["cash-flow-forecast", params.months, params.asOfDate],
    queryFn: () => reportService.getCashFlowForecast(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useMovementOfEquity = (params: PeriodParams) =>
  useQuery<MovementOfEquityData>({
    queryKey: ["movement-of-equity", params.startDate, params.endDate],
    queryFn: () => reportService.getMovementOfEquity(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useSalesTaxSummary = (params: PeriodParams) =>
  useQuery<SalesTaxSummaryData>({
    queryKey: ["sales-tax-summary", params.startDate, params.endDate],
    queryFn: () => reportService.getSalesTaxSummary(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

export const useTaxLiabilityReport = (params: PeriodParams) =>
  useQuery<TaxLiabilityReportData>({
    queryKey: ["tax-liability-report", params.startDate, params.endDate],
    queryFn: () => reportService.getTaxLiabilityReport(params),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!params.startDate && !!params.endDate,
  });

// ─── Export ───────────────────────────────────────────────────────────────────

const safeName = (title: string) => title.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";

/**
 * PDF / CSV export for any report. `mode: "print"` opens the PDF in a new tab
 * (the window is opened synchronously so popup blockers allow it); otherwise
 * the file downloads.
 */
export const useExportReport = () =>
  useMutation({
    mutationFn: async (args: { payload: ReportExportPayload; format: ReportExportFormat; mode?: "download" | "print" }) => {
      const printWindow = args.mode === "print" ? window.open("", "_blank") : null;
      try {
        const blob = await reportService.exportReport(args.payload, args.format);
        return { blob, printWindow };
      } catch (err) {
        printWindow?.close();
        throw err;
      }
    },
    onSuccess: ({ blob, printWindow }, { payload, format }) => {
      const type = format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8";
      const url = window.URL.createObjectURL(new Blob([blob], { type }));
      if (printWindow) {
        printWindow.location.href = url;
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${safeName(`${payload.title} ${payload.period ?? ""}`)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10_000);
      toast.success(format === "pdf" ? "PDF download started" : "Excel (CSV) download started");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to export report");
    },
  });
