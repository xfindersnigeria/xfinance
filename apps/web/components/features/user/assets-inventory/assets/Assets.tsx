"use client";
import React from "react";
import AssetsHeader from "./AssetsHeader";
import { CustomTable } from "@/components/local/custom/custom-table";
import { assetsColumns } from "./AssetsColumn";
import { useAssets } from "@/lib/api/hooks/useAssets";
import { useDebounce } from "use-debounce";

export default function Assets() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const { data: assetsResponse, isLoading: loading } = useAssets({
    search: debouncedSearchTerm,
  });

  console.log(assetsResponse, "Fetched assets response:"); // Debug log to check fetched data
  const assetsData = (assetsResponse as any)?.data?.assets || [];
  const summary = (assetsResponse as any)?.data?.summary || {
    depricableValue: 0,
    inUse: 0,
    inStorage: 0,
    total: 0,
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <AssetsHeader summary={summary} loading={loading} />
      <CustomTable
        searchPlaceholder="Search assets..."
        tableTitle="Fixed Assets"
        columns={assetsColumns}
        data={assetsData}
        pageSize={10}
        loading={loading}
        onSearchChange={setSearchTerm}
        display={{ searchComponent: true }}
      />
    </div>
  );
}
