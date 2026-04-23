"use client";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useStoreItems } from "@/lib/api/hooks/useProducts";
import { CustomTable } from "@/components/local/custom/custom-table";
import { storeItemColumns } from "./StoreItemColumn";
import StoreItemHeader from "./StoreItemHeader";

export default function StoreItem() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data, isLoading } = useStoreItems({
    page: currentPage,
    limit: rowsPerPage,
    category: categoryFilter === 'All Categories' ? '' : categoryFilter , 
    search: debouncedSearchTerm,
  });

  const items = (data as any)?.items || [];
  // const totalCount = data?.total || 0;
  // const totalInStock = data?.totalInStock || 0;
  // const totalOutOfStock = data?.totalOutOfStock || 0;

  console.log("Fetched items:", data); // Debug log to check fetched data

  return (
    <div className="space-y-4">
      <StoreItemHeader data={data as any} loading={isLoading} />
      <CustomTable
        onSearchChange={setSearchTerm}
        statusOptions={[
          "All Categories",
          "Electronics",
          "Office Supplies",
          "Furniture",
          "Hardware",
          "Software",
        ]}
        onStatusChange={setCategoryFilter}
        searchPlaceholder="Search store items..."
        tableTitle="Store Items"
        columns={storeItemColumns}
        data={items}
        pageSize={rowsPerPage}
        loading={isLoading}
        display={{
          statusComponent: true,
          searchComponent: true,
        }}
      />
    </div>
  );
}
