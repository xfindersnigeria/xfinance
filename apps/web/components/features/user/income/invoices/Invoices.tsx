"use client";
import { useState } from "react";
import InvoicesHeader from "./InvoicesHeader";
import { CustomTable } from "@/components/local/custom/custom-table";

import { InvoiceColumns } from "./InvoiceColumns";
import { AccountsReceivableAgingChart } from "./AccountsReceivableAgingChart";
import { MonthlyInvoiceRevenue } from "./MonthlyInvoiceRevenue";
import { useInvoices, useInvoiceGraphs } from "@/lib/api/hooks/useSales";
import { useDebounce } from "use-debounce";
import { useSearchParams } from "next/navigation";

export default function Invoices() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const searchParams = useSearchParams();
  const customerId = searchParams.get("customerId") || undefined;

  const { data, isLoading } = useInvoices({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    status: statusFilter === "All Statuses" ? undefined : statusFilter,
    customerId,
  });

  const { data: graphsData } = useInvoiceGraphs({
    // Optional: pass filters if graphs should reflect search/filters
  });

  const invoices = data?.invoices || [];

  console.log(graphsData, "Graphs data"); // Debug log to check fetched graph data

  return (
    <div className="space-y-4">
      <InvoicesHeader loading={isLoading} stats={(data as any)?.stats} />
      <CustomTable
        searchPlaceholder="Search invoices..."
        tableTitle="All Invoices"
        columns={InvoiceColumns}
        data={invoices}
        pageSize={10}
        onSearchChange={setSearchTerm}
        statusOptions={["All Statuses", "Draft", "Sent", "Overdue", "Paid"]}
        onStatusChange={setStatusFilter}
        display={{
          statusComponent: true,
          filterComponent: false,
          searchComponent: true,
        }}
        loading={isLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccountsReceivableAgingChart data={(graphsData as any)?.aging} />
        <MonthlyInvoiceRevenue data={(graphsData as any)?.monthlyRevenue} />
      </div>
    </div>
  );
}
