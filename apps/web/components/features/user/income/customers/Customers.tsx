"use client";
import React, { useState } from "react";
import CustomersHeader from "./CustomersHeader";
import { CustomTable } from "@/components/local/custom/custom-table";

import { useCustomers } from "@/lib/api/hooks/useSales";
import { customerColumns } from "./CustomersColumn";
import CustomersActions from "./CustomersActions";
import { useDebounce } from "use-debounce";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data, isLoading } = useCustomers({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
  });

  const customers = (data as any)?.customers || [];
  console.log("Fetched customers:", customers); // Debug log to check fetched data

  return (
    <div className="space-y-4">
      <CustomersHeader data={data} loading={isLoading} />
      <CustomTable
        searchPlaceholder="Search customers..."
        tableTitle="All Customers"
        columns={customerColumns}
        data={customers}
        pageSize={10}
        loading={isLoading}
        onSearchChange={setSearchTerm}
        display={{
          searchComponent: true,
        }}
      />
    </div>
  );
}
