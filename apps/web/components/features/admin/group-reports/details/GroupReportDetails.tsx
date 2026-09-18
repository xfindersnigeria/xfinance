"use client";
import React from "react";
import { useParams } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { HIDDEN_GROUP_REPORTS } from "../GroupReportsColumn";
import ConsolidatedProfitAndLoss from "./consolidated-profit-and-loss";
import ConsolidatedBalanceSheet from "./consolidated-balance-sheet";
import ConsolidatedCashFlowStatement from "./consolidated-cash-flow-statement";
import ConsolidatedFinancialPosition from "./consolidated-financial-position";
import GroupCashFlowForecasting from "./group-cash-flow-forecasting";
import EntityRevenueComparison from "./entity-revenue-comparison";
import EntityProfitabilityAnalysis from "./entity-profitability-analysis";
import EntityExpenseComparison from "./entity-expense-comparison";

const REPORT_COMPONENTS: Record<string, React.ComponentType> = {
  "consolidated-profit-and-loss": ConsolidatedProfitAndLoss,
  "consolidated-balance-sheet": ConsolidatedBalanceSheet,
  "consolidated-cash-flow-statement": ConsolidatedCashFlowStatement,
  "consolidated-financial-position": ConsolidatedFinancialPosition,
  "group-cash-flow-forecasting": GroupCashFlowForecasting,
  "entity-revenue-comparison": EntityRevenueComparison,
  "entity-profitability-analysis": EntityProfitabilityAnalysis,
  "entity-expense-comparison": EntityExpenseComparison,
};

export default function GroupReportDetails() {
  const params = useParams();
  const key = params?.key ? params.key.toString() : "";
  const ReportComponent = HIDDEN_GROUP_REPORTS.includes(key) ? undefined : REPORT_COMPONENTS[key];

  if (!ReportComponent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <span className="bg-primary/10 rounded-lg p-6">
          <p className="text-lg font-semibold text-gray-700 flex items-center justify-center">
            <TriangleAlert className="w-5 h-5 inline mr-2 text-red-500" />
            Report not found
          </p>
          <p className="text-sm text-gray-500">
            The report <span className="text-gray-700">{key}</span> is not available yet.
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
