import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { reportsColumns, reportsData } from "./ReportsColumn";

export default function ReportsTable() {
  return (
    <div className="bg-white rounded-2xl border border-border p-2 w-full overflow-x-auto">
      <CustomTable
        columns={reportsColumns}
        data={reportsData}
        pageSize={20}
        className="border-0 shadow-none p-0"
        searchPlaceholder="search reports..."
        tableTitle="All Reports"
      />
    </div>
  );
}
