"use client";
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { usePayrollBatch, useUpdatePayrollBatch } from "@/lib/api/hooks/useHR";
import ProcessPayrollForm from "./ProcessPayrollForm";

interface Props {
  batchId: string;
  open: boolean;
  onClose: () => void;
}

export default function PayrollBatchEditSheet({ batchId, open, onClose }: Props) {
  const { data, isLoading } = usePayrollBatch(batchId);
  const updateBatch = useUpdatePayrollBatch();

  const batch = (data as any)?.data;

  // Map batch records back to the shape ProcessPayrollForm expects as `employees`
  const employees = (batch?.records ?? []).map((r: any) => ({
    id: r.employeeId,
    firstName: r.employee?.firstName ?? "",
    lastName: r.employee?.lastName ?? "",
    position: r.employee?.position ?? "",
    salary: r.basicSalary,
    allowances: r.allowances,
    // Pass bonus/overtime so buildRows can use them via suggestedStatutoryDed override
    suggestedStatutoryDed: r.statutoryDed,
    suggestedOtherDed: r.otherDed,
    _bonus: r.bonus,
    _overtime: r.overtime,
  }));

  const handleSubmit = async (payload: any) => {
    await updateBatch.mutateAsync(
      {
        id: batchId,
        data: {
          batchName: payload.batchName,
          period: payload.period,
          paymentDate: payload.paymentDate,
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          employees: payload.employees,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto p-0">
        <SheetHeader className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <SheetTitle>Edit Payroll Batch</SheetTitle>
        </SheetHeader>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ProcessPayrollForm
              employees={employees}
              initialBatch={batch}
              isEditMode
              onSubmit={handleSubmit}
              loading={false}
              isSubmitting={updateBatch.isPending}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
