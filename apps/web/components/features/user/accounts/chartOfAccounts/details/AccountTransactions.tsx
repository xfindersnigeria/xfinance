"use client";

import React, { useMemo, useState } from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { createAccountsDetailsColumns } from "./AccountsDetailsColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useDebounce } from "use-debounce";

interface AccountTransactionsProps {
  transactions: any[];
  isLoading: boolean;
}

export default function AccountTransactions({
  transactions,
  isLoading,
}: AccountTransactionsProps) {
  const sym = useEntityCurrencySymbol();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // Search through transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) =>
      t.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      t.reference.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [transactions, debouncedSearchTerm]);

  return (
    <div className="space-y-4">
      <CustomTable
        data={filteredTransactions}
        columns={createAccountsDetailsColumns(sym) as any}
        tableTitle="Account Transactions"
        searchPlaceholder="Search transactions..."
        onSearchChange={setSearchTerm}
        display={{
          searchComponent: true,
          statusComponent: false,
          filterComponent: false,
          methodsComponent: false,
        }}
        loading={isLoading}
      />
    </div>
  );
}
