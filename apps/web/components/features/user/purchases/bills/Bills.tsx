"use client";
import { useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { billsColumns } from "./BillsColumns";
import BillsHeader from "./BillsHeader";
import { useBills } from "@/lib/api/hooks/usePurchases";
import { useDebounce } from "use-debounce";

export default function Bills() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  // const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data, isLoading } = useBills({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    // category: categoryFilter === "All Categories" ? undefined : categoryFilter,
  });

  const bills = (data as any)?.bills || [];
  const totalBills = (data as any)?.total || 0;

  console.log(data, "Fetched bills:"); // Debug log to check fetched data

  return (
    <div className="space-y-4">
      <BillsHeader loading={isLoading} data={data as any} />
      <CustomTable
        searchPlaceholder="Search bills..."
        tableTitle="All Bills"
        columns={billsColumns as any}
        data={bills}
        pageSize={rowsPerPage}
        onSearchChange={setSearchTerm}
        statusOptions={[
          "All Categories",
          "Office Supplies",
          "Utilities",
          "Travel",
          "Meals & Entertainment",
          "Equipment",
          "Repairs & Maintenance",
          "Professional Services",
          "Other",
        ]}
        // onStatusChange={setCategoryFilter}
        display={{
          statusComponent: false,
          filterComponent: false,
          searchComponent: true,
          methodsComponent: false,
        }}
        loading={isLoading}
      />
    </div>
  );
}
