"use client";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useStoreItems } from "@/lib/api/hooks/useProducts";
import { CustomTable } from "@/components/local/custom/custom-table";
import { createStoreItemColumns } from "./StoreItemColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import StoreItemHeader from "./StoreItemHeader";

const TYPE_OPTIONS = ["All Types", "Products", "Services"];

export default function StoreItem() {
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const rowsPerPage = 10;

  const { data, isLoading } = useStoreItems({
    page: currentPage,
    limit: rowsPerPage,
    search: debouncedSearchTerm,
    type: typeFilter === "Products" ? "product" : typeFilter === "Services" ? "service" : undefined,
  });

  const items = (data as any)?.items || [];

  return (
    <div className="space-y-4">
      <StoreItemHeader data={data as any} loading={isLoading} />
      <CustomTable
        onSearchChange={(v) => {
          setSearchTerm(v);
          setCurrentPage(1);
        }}
        statusOptions={TYPE_OPTIONS}
        onStatusChange={(v) => {
          setTypeFilter(v);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search store items..."
        tableTitle="Store Items"
        columns={createStoreItemColumns(sym)}
        data={items}
        pageSize={rowsPerPage}
        loading={isLoading}
        pagination={{
          page: currentPage,
          totalPages: data?.totalPages ?? 1,
          total: data?.total,
          onPageChange: setCurrentPage,
        }}
        display={{
          statusComponent: true,
          searchComponent: true,
        }}
      />
    </div>
  );
}
