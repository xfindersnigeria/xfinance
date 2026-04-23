"use client";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import { useInventory } from "@/lib/api/hooks/useProducts";
import InventoryHeader from "./InventoryHeader";
import { CustomTable } from "@/components/local/custom/custom-table";
import { inventoryColumns } from "./InventoryColumn";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [page, setPage] = useState(1);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const pageSize = 10;

  const { data, isLoading } = useInventory({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
  });

  const inventory = (data as any)?.data || [];
  const stats = (data as any)?.stats;
  const pagination = (data as any)?.pagination;

  return (
    <div className="space-y-4">
      <InventoryHeader data={stats} loading={isLoading} />
      <CustomTable
        onSearchChange={(v) => { setSearchTerm(v); setPage(1); }}
        statusOptions={["All Status", "normal", "low_stock", "critical"]}
        onStatusChange={setStatusFilter}
        searchPlaceholder="Search stock..."
        tableTitle="Stock Levels"
        columns={inventoryColumns}
        data={inventory}
        pageSize={pageSize}
        loading={isLoading}
        display={{ statusComponent: true, searchComponent: true }}
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
