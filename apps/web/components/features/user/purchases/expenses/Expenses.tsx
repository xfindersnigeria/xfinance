"use client";
import { useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { expensesColumns } from "./ExpensesColumns";
import ExpensesHeader from "./ExpensesHeader";
import { useExpenses } from "@/lib/api/hooks/usePurchases";
import { useDebounce } from "use-debounce";

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data, isLoading } = useExpenses({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    category: categoryFilter === "All Categories" ? undefined : categoryFilter,
  });

  const expenses = (data as any)?.expenses || [];
  const totalExpenses = (data as any)?.totalCount || 0;

  console.log(data, "Fetched expenses:"); // Debug log to check fetched data

  return (
    <div className="space-y-4">
      <ExpensesHeader loading={isLoading} data={data as any} />
      <CustomTable
        searchPlaceholder="Search expenses..."
        tableTitle="All Expenses"
        columns={expensesColumns as any}
        data={expenses}
        pageSize={rowsPerPage}
        onSearchChange={setSearchTerm}
        statusOptions={[
          "All Categories",
          "Office Supplies",
          "IT & Software",
          "Utilities",
          "Travel",
          "Meals & Entertainment",
          "Equipment",
          "Repairs & Maintenance",
          "Professional Services",
          "Other",
        ]}
        onStatusChange={setCategoryFilter}
        display={{
          statusComponent: true,
          filterComponent: false,
          searchComponent: true,
          methodsComponent: false,
        }}
        loading={isLoading}
      />
    </div>
  );
}
