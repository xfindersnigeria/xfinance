"use client";

import React from "react";
import { CustomTabs, type Tab } from "@/components/local/custom/tabs";
import {
  ConsolidationHeader,
  ConsolidationProgress,
  EntityDataStatus,
  ConsolidationEliminationEntries,
  IntercompanyTransactions,
} from "@/components/features/admin/consolidation";

export default function ConsolidationPage() {
  const tabs: Tab[] = [
    {
      title: "Intercompany Transactions",
      value: "transactions",
      content: <IntercompanyTransactions />,
    },
    {
      title: "Elimination Entities",
      value: "elimination",
      content: <ConsolidationEliminationEntries />,
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <ConsolidationHeader />
      {/* <div className="grid grid-cols-1  gap-4"> */}
        {/* <div className="lg:col-span-2"> */}
          <ConsolidationProgress />
        {/* </div> */}
        <EntityDataStatus />
      {/* </div> */}
      <div>
        <CustomTabs tabs={tabs} storageKey="consolidation-tab" />
      </div>
    </div>
  );
}
