"use client";
import { useParams } from "next/navigation";
import React from "react";
import ProfitAndLoss from "./profit-and-loss";
import CashFlowStatement from "./cash-flow-statement";
import TrialBalance from "./trial-balance";
import BalanceSheet from "./balance-sheet";
import PerformanceRatios from "./performance-ratios";
import SalesByCustomer from "./sales-by-customer";
import SalesByItem from "./sales-by-item";
import InvoiceDetails from "./invoice-details";
import ReceivableSummary from "./receivable-summary";
import AgedReceivables from "./aged-receivables";
import CustomerBalances from "./customer-balances";
import PaymentMethodSummary from "./payment-method-summary";
import PayableSummary from "./payable-summary";
import AgedPayables from "./aged-payables";
import VendorBalances from "./vendor-balances";
import ExpenseByCategory from "./expense-by-category";
import ExpenseByVendor from "./expense-by-vendor";
import BillDetails from "./bill-details";
import BankReconciliationSummary from "./bank-reconciliation-summary";
import BankAccountTransactions from "./bank-account-transactions";
import SuppliesInventory from "./supplies-inventory";
import SuppliesConsumptionByDepartment from "./supplies-consumption-by-department";
import SuppliesConsumptionByProject from "./supplies-consumption-by-project";
import { TriangleAlert } from "lucide-react";

const REPORT_COMPONENTS: Record<string, React.ComponentType> = {
  "profit-and-loss": ProfitAndLoss,
  "cash-flow-statement": CashFlowStatement,
  "trial-balance": TrialBalance,
  "balance-sheet": BalanceSheet,
  "business-performance-ratios": PerformanceRatios,
  "sales-by-customer": SalesByCustomer,
  "sales-by-item": SalesByItem,
  "invoice-details": InvoiceDetails,
  "receivable-summary": ReceivableSummary,
  "aged-receivables": AgedReceivables,
  "customer-balances": CustomerBalances,
  "payment-method-summary": PaymentMethodSummary,
  "payable-summary": PayableSummary,
  "aged-payables": AgedPayables,
  "vendor-balances": VendorBalances,
  "expense-by-category": ExpenseByCategory,
  "expense-by-vendor": ExpenseByVendor,
  "bill-details": BillDetails,
  "bank-reconciliation-summary": BankReconciliationSummary,
  "bank-account-transactions": BankAccountTransactions,
  "supplies-inventory": SuppliesInventory,
  "supplies-consumption-by-department": SuppliesConsumptionByDepartment,
  "supplies-consumption-by-project": SuppliesConsumptionByProject,
};

export default function ReportsDetails() {
  const params = useParams();
  const key = params?.key ? params.key.toString() : "";

  const ReportComponent = REPORT_COMPONENTS[key];

  if (!ReportComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center ">
        <span className="bg-primary/10 rounded-lg p-6">
          {" "}
          <p className="text-lg font-semibold text-gray-700 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 inline mr-2 text-red-500" />
            Report not found
          </p>
          <p className="text-sm text-gray-500">
            The report <span className="font-mono text-gray-700">{key}</span> is
            not available yet.
          </p>
        </span>
      </div>
    );
  }

  return (
    <div className="p-4">
      <ReportComponent />
    </div>
  );
}
