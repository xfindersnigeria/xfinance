"use client";

import { useState } from "react";
import BudgetHeader from "./BudgetHeader";
import { CustomTabs } from "@/components/local/custom/tabs";
import { CustomTable } from "@/components/local/custom/custom-table";
import { createBudgetColumns } from "./BudgetColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useBudgetVsActual } from "@/lib/api/hooks/useAccounts";
import SetBudgetForm from "./SetBudgetForm";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan–Mar)" },
  { value: "Q2", label: "Q2 (Apr–Jun)" },
  { value: "Q3", label: "Q3 (Jul–Sep)" },
  { value: "Q4", label: "Q4 (Oct–Dec)" },
];

const FISCAL_YEARS = ["2023", "2024", "2025", "2026", "2027"];

function currentMonth() {
  return MONTHS[new Date().getMonth()];
}

function currentYear() {
  return String(new Date().getFullYear());
}

function SummaryCard({
  label,
  value,
  sym,
  variant,
}: {
  label: string;
  value: number;
  sym: string;
  variant: "green" | "blue" | "neutral";
}) {
  const isPositive = value >= 0;
  const styles = {
    green: "bg-green-50 border-green-200 text-green-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    neutral: isPositive
      ? "bg-green-50 border-green-200 text-green-700"
      : "bg-red-50 border-red-200 text-red-700",
  } as const;

  const Icon =
    variant === "neutral"
      ? isPositive
        ? TrendingUp
        : TrendingDown
      : Minus;

  return (
    <div className={`rounded-xl border p-4 ${styles[variant]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 opacity-70" />
        <p className="text-xs font-medium opacity-80">{label}</p>
      </div>
      <p className="text-xl font-bold">
        {variant === "neutral" && value > 0 ? "+" : ""}
        {sym}
        {Math.abs(value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

export default function Budget() {
  const sym = useEntityCurrencySymbol();

  // "All" is the default — shows every budget for the fiscal year aggregated by account
  const [periodType, setPeriodType] = useState("All");
  const [period, setPeriod] = useState("");
  const [fiscalYear, setFiscalYear] = useState(currentYear());

  const { data: vsActualResponse, isLoading: vsActualLoading } =
    useBudgetVsActual(
      periodType === "All"
        ? { fiscalYear }
        : { periodType, period, fiscalYear },
    );

  const vsActualRows = vsActualResponse?.data ?? [];
  const summary = vsActualResponse?.summary;

  const handlePeriodTypeChange = (v: string) => {
    setPeriodType(v);
    if (v === "Monthly") setPeriod(currentMonth());
    else if (v === "Quarterly") setPeriod("Q1");
    else setPeriod(""); // Yearly or All
  };

  return (
    <div className="space-y-4">
      <BudgetHeader loading={false} />
      <CustomTabs
        storageKey="budget-tab"
        tabs={[
          {
            title: "Budget vs Actual",
            value: "budgetActual",
            content: (
              <div className="space-y-4">
                {/* Period filter bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">
                    Period:
                  </span>

                  <Select value={periodType} onValueChange={handlePeriodTypeChange}>
                    <SelectTrigger className="w-36 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All", "Monthly", "Quarterly", "Yearly"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v === "All" ? "All Periods" : v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {periodType === "Monthly" && (
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {periodType === "Quarterly" && (
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUARTERS.map((q) => (
                          <SelectItem key={q.value} value={q.value}>
                            {q.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={fiscalYear} onValueChange={setFiscalYear}>
                    <SelectTrigger className="w-32 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FISCAL_YEARS.map((y) => (
                        <SelectItem key={y} value={y}>
                          FY {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Summary cards — only show when we have data */}
                {summary && vsActualRows.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SummaryCard
                      label="Total Budgeted"
                      value={summary.totalBudgeted}
                      sym={sym}
                      variant="green"
                    />
                    <SummaryCard
                      label="Total Actual"
                      value={summary.totalActual}
                      sym={sym}
                      variant="blue"
                    />
                    <SummaryCard
                      label="Variance"
                      value={summary.totalVariance}
                      sym={sym}
                      variant="neutral"
                    />
                  </div>
                )}

                <CustomTable
                  searchPlaceholder="Search accounts..."
                  tableTitle="Budget vs Actual"
                  columns={createBudgetColumns(sym)}
                  data={vsActualRows}
                  pageSize={20}
                  loading={vsActualLoading}
                  display={{ filterComponent: false }}
                />
              </div>
            ),
          },
          {
            title: "Set Budget",
            value: "setBudget",
            content: <SetBudgetForm />,
          },
        ]}
      />
    </div>
  );
}
