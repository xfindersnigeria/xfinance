"use client";

import React from "react";
import { CustomTabs, type Tab } from "@/components/local/custom/tabs";
import StoreInventoryTable from "./StoreInventoryTable";
import RestockHistoryTable from "./RestockHistoryTable";
import IssueHistoryTable from "./IssueHistoryTable";
import StoreInventoryHeader from "./StoreInventoryHeader";

const tabs: Tab[] = [
  {
    title: "Inventory",
    value: "inventory",
    content: <StoreInventoryTable />,
  },
  {
    title: "Restock History",
    value: "restock-history",
    content: <RestockHistoryTable />,
  },
  {
    title: "Issue History",
    value: "issue-history",
    content: <IssueHistoryTable />,
  },
];

export default function StoreInventoryPage() {
  return (
    <div className="space-y-4">
      <StoreInventoryHeader />
      <CustomTabs tabs={tabs} storageKey="store-inventory-tab" />
    </div>
  );
}
