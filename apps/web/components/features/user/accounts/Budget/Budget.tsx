"use client";

import BudgetHeader from "./BudgetHeader";
import { CustomTabs } from "@/components/local/custom/tabs";
import { CustomTable } from "@/components/local/custom/custom-table";
import { createBudgetColumns } from "./BudgetColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import SetBudgetForm from "./SetBudgetForm";

export default function Budget() {
  const sym = useEntityCurrencySymbol();
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
                <CustomTable
                  searchPlaceholder="Search budgets..."
                  tableTitle="Budget vs Actual"
                  columns={createBudgetColumns(sym)}
                  data={[]}
                  pageSize={10}
                  loading={false}
                  display={{ filterComponent: false }}
                />
              </div>
            ),
          },
          {
            title: "Set Budget",
            value: "setBudget",
            content: (
              <>
              <SetBudgetForm />
              </>
            ),
          },
        ]}
      />

    </div>
  );
}
