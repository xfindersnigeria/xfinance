"use client";
import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { usePayrollBatches } from "@/lib/api/hooks/useHR";
import PayrollBadgesHeader from "./PayrollBadgesHeader";
import { payrollBadgesColumns } from "./PayrollBadgesColumn";
import { useDebounce } from "use-debounce";

const STATUS_FILTERS = [
  { label: "All",      value: "" },
  { label: "Draft",    value: "Draft" },
  { label: "Pending",  value: "Pending" },
  { label: "Approved", value: "Approved" },
];

export default function PayrollBadges() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const [activeStatus, setActiveStatus] = React.useState("");
  const pageSize = 10;

  const { data, isLoading } = usePayrollBatches({
    page,
    limit: pageSize,
    search: debouncedSearch,
    status: activeStatus || undefined,
  });
  const batches = (data as any)?.data || [];
  const stats = (data as any)?.stats;
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-4">
      <PayrollBadgesHeader data={stats} loading={isLoading} />

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setActiveStatus(f.value); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeStatus === f.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <CustomTable
        searchPlaceholder="Search batches..."
        tableTitle="Payroll Batches"
        columns={payrollBadgesColumns}
        data={batches}
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
