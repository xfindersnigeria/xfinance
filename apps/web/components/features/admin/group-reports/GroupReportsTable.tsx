"use client";

import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { groupReportsColumns, groupReportsData } from "./GroupReportsColumn";

export default function GroupReportsTable() {
  return (
    <div className="bg-white rounded-2xl border border-border p-2 w-full overflow-x-auto">
      <CustomTable
        columns={groupReportsColumns}
        data={groupReportsData}
        pageSize={20}
        className="border-0 shadow-none p-0"
        searchPlaceholder="Search reports..."
        tableTitle="All Reports"
        display={{
          searchComponent: true,
          filterComponent: false,
        }}
      />
    </div>
  );
}
