"use client";

import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { groupReportsColumns, groupReportsData } from "./GroupReportsColumn";

export default function GroupReportsTable({ selectedCategory }: { selectedCategory: string }) {
  const data =
    selectedCategory === "all"
      ? groupReportsData
      : groupReportsData.filter((r) => r.category === selectedCategory);

  return (
    <div className="bg-white rounded-2xl border border-border p-2 w-full overflow-x-auto">
      <CustomTable
        columns={groupReportsColumns}
        data={data}
        pageSize={20}
        className="border-0 shadow-none p-0"
        searchPlaceholder="Search reports..."
        tableTitle="Group Reports"
        display={{
          searchComponent: true,
          filterComponent: false,
        }}
      />
    </div>
  );
}
