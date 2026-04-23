"use client";
import { useState, useCallback } from "react";
import PaymentReceivedHeader from "./PaymenrReceivedHeader";
import { CustomTable } from "@/components/local/custom/custom-table";
import { PaymentReceivedColumns } from "./PaymentReceivedColumns";
import { usePaymentsReceived } from "@/lib/api/hooks/useSales";
import { useDebounce } from "use-debounce";

export default function PaymentReceived() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data, isLoading } = usePaymentsReceived({
    page: currentPage,
    limit: rowsPerPage,
    search: debouncedSearchTerm,
    status: statusFilter === "All Statuses" ? undefined : statusFilter,
  });

  const payments = data?.payments || [];

  console.log("Fetched payments received:", data); // Debug log to check fetched data

  return (
    <div className="space-y-6">
      <PaymentReceivedHeader stats={data?.stats} loading={isLoading} />

      <CustomTable
        searchPlaceholder="Search by reference, invoice, customer, method..."
        tableTitle="Payment Received"
        columns={PaymentReceivedColumns}
        data={payments}
        pageSize={rowsPerPage}
        onSearchChange={setSearchTerm}
        statusOptions={["All Statuses", "Paid", "Partial", "Pending"]}
        onStatusChange={setStatusFilter}
        display={{
          statusComponent: true,
          filterComponent: false,
          searchComponent: true,
        }}
        loading={isLoading}
      />
    </div>
  );
}
