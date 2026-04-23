"use client";
import React from "react";
import { CustomTabs } from "@/components/local/custom/tabs";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import PayrollBadges from "./PayrollBadges";
import PayrollRecords from "./PayrollRecords";
import ProcessPayrollForm from "./ProcessPayrollForm";
import { usePayrollPrefill, useProcessPayroll } from "@/lib/api/hooks/useHR";

export default function Payroll() {
  const { data: prefillResponse, isLoading: prefillLoading } = usePayrollPrefill();
  const employees = (prefillResponse as any)?.data ?? [];
  const processPayroll = useProcessPayroll();

  const handleSubmit = (formData: any) => {
    processPayroll.mutate(formData);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Payroll</h2>
          <p className="text-muted-foreground">Manage employee salaries and payroll</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
        </div>
      </div>
      <CustomTabs
        storageKey="payroll-tab"
        tabs={[
          {
            title: "Process Payroll",
            value: "process",
            content: (
              <ProcessPayrollForm
                employees={employees}
                loading={prefillLoading}
                onSubmit={handleSubmit}
                isSubmitting={processPayroll.isPending}
              />
            ),
          },
          {
            title: "Payroll Batches",
            value: "batches",
            content: <PayrollBadges />,
          },
          {
            title: "Payroll Records",
            value: "records",
            content: <PayrollRecords />,
          },
        ]}
      />
    </div>
  );
}
