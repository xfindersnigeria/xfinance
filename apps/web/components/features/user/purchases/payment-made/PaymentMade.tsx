"use client";
import { useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { paymentMadeColumns } from "./PaymentMadeColumns";
import PaymentMadeHeader from "./PaymentMadeHeader";
import { useBillPayments } from "@/lib/api/hooks/usePurchases";

export default function PaymentMade() {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const { data, isLoading } = useBillPayments({
    page: currentPage,
    limit: rowsPerPage,
  });

  const payments = (data as any)?.payments || [];
  const total = (data as any)?.total || 0;
  console.log("Fetched payments:", data); // Debug log to check fetched data

  return (
    <div className="space-y-4">
      <PaymentMadeHeader loading={isLoading} data={data as any} />
      <CustomTable
        searchPlaceholder="Search payments..."
        tableTitle="Recent Payments"
        columns={paymentMadeColumns as any}
        data={payments}
        pageSize={rowsPerPage}
        display={{
          statusComponent: false,
          filterComponent: false,
          searchComponent: false,
          methodsComponent: false,
        }}
        loading={isLoading}
      />
    </div>
  );
}
