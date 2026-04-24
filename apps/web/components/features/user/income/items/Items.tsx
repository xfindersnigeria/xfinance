"use client";

import React, { useState } from "react";
import { useDebounce } from "use-debounce";
import { CustomTable } from "@/components/local/custom/custom-table";
import ItemsHeader from "./ItemsHeader";
import { createItemsColumns } from "./ItemsColumn";
import { mockItemsData } from "./utils/data";
import { useItems } from "@/lib/api/hooks/useSales";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

/**
 * Main Items list component
 * Handles search, filtering, and pagination through CustomTable
 * TODO: Replace mockItemsData with actual useItems API hook
 */
export default function Items() {
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("All Items");
  const pageSize = 10;

  // TODO: Replace with actual API hook
  const { data: itemsData, isPending } = useItems({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
    type: typeFilter === "All Items" ? "" : typeFilter,
  });

  console.log("Fetched items data:", itemsData); // Debug log to check fetched data
  // Using mock data for now
  // const isLoading = false;
  // const data = mockItemsData;

  // Filter by type from statusOptions
  // const filteredItems = data.items.filter((item) => {
  //   return typeFilter === "All Items" || item.type === typeFilter;
  // });

  // Handle search term change and reset pagination
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-4">
      <ItemsHeader data={itemsData} loading={isPending} />
      <CustomTable
        searchPlaceholder="Search items..."
        tableTitle="All Items"
        columns={createItemsColumns(sym)}
        data={itemsData?.items || []}
        pageSize={pageSize}
        loading={isPending}
        onSearchChange={handleSearchChange}
        statusOptions={["All Items", "Service", "Good"]}
        onStatusChange={setTypeFilter}
        display={{
          searchComponent: true,
        }}
        pagination={{
          page,
          totalPages: Math.ceil(itemsData?.totalPages || 1),
          total: itemsData?.total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
