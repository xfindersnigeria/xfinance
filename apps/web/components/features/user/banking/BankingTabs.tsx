"use client";
import { CustomTable } from "@/components/local/custom/custom-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";
import BankReconciliationCard from "./BankReconciliationCard";
import { bankingColumns } from "./BankingColumn";
import { useAccountTransactions } from "@/lib/api/hooks/useAccounts";

export function BankingTabs() {
  const { data: transactionsResponse, isLoading } = useAccountTransactions({
    type: "BANK",
    pageSize: 10,
  });

  const transactions = (transactionsResponse as any)?.data || [];
  console.log(transactionsResponse, "Transactions response"); // Debug log to check the structure of the transactions data

  return (
    <div className="flex w-full flex-col gap-6">
      <Tabs defaultValue="transactions">
        <TabsList>
          {/* <TabsTrigger value="transactions">Recent Transactions</TabsTrigger> */}
          {/* <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger> */}
        </TabsList>
        <TabsContent value="transactions">
          <CustomTable
            tableTitle="Recent Transactions"
            tableSubtitle="Latest bank activity"
            columns={bankingColumns}
            data={transactions}
            pageSize={10}
            loading={isLoading}
            display={{ searchComponent: false, exportButton: true }}
          />
        </TabsContent>
        {/* <TabsContent value="reconciliation">
          <BankReconciliationCard />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}
