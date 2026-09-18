"use client";

import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import GroupReportsSidebar from "./GroupReportsSidebar";
import GroupReportsTable from "./GroupReportsTable";

export default function GroupReports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [category, setCategory] = useState("all");

  const select = (key: string) => {
    setCategory(key);
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col w-full min-h-[80vh] p-4 gap-4">
      {/* Mobile category toggle */}
      <div className="lg:hidden">
        <Button variant="outline" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="gap-2">
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {sidebarOpen ? "Close" : "Categories"}
        </Button>
      </div>

      <div className="flex gap-4 w-full flex-1">
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden bg-black/50" onClick={() => setSidebarOpen(false)} />
        )}
        <div
          className={`fixed left-0 top-0 h-full lg:h-fit lg:sticky lg:top-10 lg:self-start z-50 lg:z-0 transform lg:transform-none transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          style={{ minWidth: 240 }}
        >
          <GroupReportsSidebar selected={category} onSelect={select} />
        </div>

        <div className="flex-1 w-full overflow-x-auto">
          <GroupReportsTable selectedCategory={category} />
        </div>
      </div>
    </div>
  );
}
