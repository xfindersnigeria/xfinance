import React from "react";
import ReportsSidebar from "./ReportsSidebar";
import ReportsTable from "./ReportsTable";

export default function Reports() {
  return (
    <div className="flex gap-4 w-full min-h-[80vh] p-4">
      <div className="sticky top-10 self-start h-fit" style={{ minWidth: 240 }}>
        <ReportsSidebar />
      </div>
      <div className="flex-1 overflow-x-auto">
        <ReportsTable />
      </div>
    </div>
  );
}
