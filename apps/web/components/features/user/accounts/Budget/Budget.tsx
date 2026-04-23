"use client";

import BudgetHeader from "./BudgetHeader";
import { CustomTabs } from "@/components/local/custom/tabs";
import { CustomTable } from "@/components/local/custom/custom-table";
import { budgetColumns } from "./BudgetColumn";
import SetBudgetForm from "./SetBudgetForm";

export default function Budget() {
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
                  columns={budgetColumns}
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
