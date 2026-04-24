"use client";

import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { useStoreSupplyRestocks } from "@/lib/api/hooks/useAssets";
import { useDebounce } from "use-debounce";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export default function RestockHistoryTable() {
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = React.useState("");

  const columns = [
    {
      key: "restockDate",
      title: "Date",
      render: (_: any, row: any) => (
        <span>{row.restockDate ? new Date(row.restockDate).toLocaleDateString("en-NG") : "—"}</span>
      ),
    },
    {
      key: "supply",
      title: "Supply Item",
      render: (_: any, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.supply?.name}</div>
          <div className="text-xs text-gray-500">{row.supply?.sku}</div>
        </div>
      ),
    },
    {
      key: "quantity",
      title: "Quantity",
      render: (value: number) => (
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium text-xs">
          +{value}
        </span>
      ),
    },
    {
      key: "unitPrice",
      title: "Unit Price",
      render: (value: number) => `${sym}${value?.toLocaleString()}`,
    },
    {
      key: "totalCost",
      title: "Total Cost",
      render: (value: number) => (
        <span className="font-bold">{sym}{value?.toLocaleString()}</span>
      ),
    },
    {
      key: "supplier",
      title: "Supplier",
    },
    {
      key: "restockedBy",
      title: "Restocked By",
    },
    {
      key: "notes",
      title: "Notes",
      render: (value: string) => <span className="text-gray-500">{value || "—"}</span>,
    },
  ];
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { data: response, isPending } = useStoreSupplyRestocks({
    page,
    limit: pageSize,
    search: debouncedSearch,
  });
console.log(response)
  const data = (response as any)?.data || [];
  const pagination = (response as any)?.pagination;

  return (
    <div className="space-y-4">
      <CustomTable
        tableTitle="Restock History"
        columns={columns}
        data={data}
        onSearchChange={(val) => { setSearchTerm(val); setPage(1); }}
        searchPlaceholder="Search restock records..."
        display={{ searchComponent: true }}
        pageSize={pageSize}
        loading={isPending}
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
