"use client";
import { useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import VendorsHeader from "./VendorsHeader";
import { vendorColumns } from "./VendorColumns";
import { useVendors } from "@/lib/api/hooks/usePurchases";
import { useDebounce } from "use-debounce";
import { Vendor } from "./types";
import { useRouter } from "next/navigation";

export default function Vendors() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const router = useRouter();

  const { data, isLoading } = useVendors({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
    type: typeFilter === "All Types" ? undefined : typeFilter,
  });

  const vendors = (data as any)?.vendors || [];
  const totalVendors = (data as any)?.totalCount || 0;

  console.log("Fetched vendors:", data); // Debug log to check fetched data
  const handleRowClick = (vendor: Vendor) => {
    router.push(`/purchases/vendors/${vendor.id}`);
  };
  return (
    <div className="space-y-4">
      <VendorsHeader loading={isLoading} data={data as any} />
      <CustomTable
        searchPlaceholder="Search vendors..."
        tableTitle="All Vendors"
        columns={vendorColumns as any}
        onRowClick={handleRowClick}
        data={vendors}
        pageSize={rowsPerPage}
        onSearchChange={setSearchTerm}
        statusOptions={["All Types", "supplier", "manufacturer", "consultant"]}
        onStatusChange={setTypeFilter}
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
