"use client";
import React from "react";
import { useAccounts, useOpeningBalances } from "@/lib/api/hooks/useAccounts";
import { useDebounce } from "use-debounce";
import OpeningBalanceHeader from "./OpeningBalanceHeader";
import OpeningBalanceForm from "./OpeningBalanceForm";
import { CustomTable } from "@/components/local/custom/custom-table";
import { openingBalanceColumns } from "./OpeningBalanceColumn";

export default function OpeningBalance() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { data: accountsResponse, isLoading: accountsLoading } = useAccounts({
    search: debouncedSearchTerm,
  });

  const { data: openingBalancesResponse, isLoading: balancesLoading } =
    useOpeningBalances({
      search: debouncedSearchTerm,
      page,
      limit: pageSize,
    });

  const accountsData = (accountsResponse as any)?.data || [];
  const openingBalancesData = (openingBalancesResponse as any)?.data || [];

  console.log("Opening Balances Data:", openingBalancesData);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-4">
      <OpeningBalanceHeader loading={accountsLoading} />

      <OpeningBalanceForm accounts={accountsData} onSuccess={() => {}} />

      <CustomTable
        searchPlaceholder="Search opening balances..."
        tableTitle="Opening Balances History"
        columns={openingBalanceColumns}
        data={openingBalancesData as any}
        pageSize={10}
        loading={balancesLoading}
        onSearchChange={handleSearchChange}
        display={{ searchComponent: true }}
        pagination={{
          page: openingBalancesData.currentPage,
          totalPages: openingBalancesData.totalPages || 1,
          total: openingBalancesData.total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
