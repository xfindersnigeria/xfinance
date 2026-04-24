"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { usePayrollRecords } from "@/lib/api/hooks/useHR";
import PayrollRecordsHeader from "./PayrollRecordsHeader";
import { createPayrollRecordsColumns } from "./PayrollRecordsColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useDebounce } from "use-debounce";

export default function PayrollRecords() {
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { data, isLoading } = usePayrollRecords({ page, limit: pageSize, search: debouncedSearch });
  const records = (data as any)?.data || [];
  const stats = (data as any)?.stats;
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-4">
      <PayrollRecordsHeader data={stats} loading={isLoading} />
      <CustomTable
        searchPlaceholder="Search employees..."
        tableTitle="Payroll Records"
        columns={createPayrollRecordsColumns(sym)}
        data={records}
        pageSize={pageSize}
        loading={isLoading}
        onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
        display={{ searchComponent: true }}
        pagination={{
          page,
          totalPages: pagination?.totalPages || 1,
          total: pagination?.total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
