"use client";

import React, { useState } from "react";
import GroupReportsSidebar from "./GroupReportsSidebar";
import GroupReportsTable from "./GroupReportsTable";
import GroupReportsHeader from "./GroupReportsHeader";
import { Menu, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GroupReports() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* <GroupReportsHeader /> */}
      <div className="w-full flex justify-end my-3 px-4 sm:px-6 md:px-8">
        {" "}
        <Button className=" rounded-lg gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          Create New Report
        </Button>
      </div>
      <div className="flex gap-4 w-full flex-1 p-4">
        {/* Mobile sidebar toggle button */}
        <div className="lg:hidden mb-4 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="gap-2"
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            {sidebarOpen ? "Close" : "Categories"}
          </Button>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`fixed lg:sticky lg:top-10 lg:self-start lg:h-fit z-50 lg:z-0 transform lg:transform-none transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
          style={{ minWidth: "240px" }}
        >
          <GroupReportsSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 w-full overflow-x-auto">
          <GroupReportsTable />
        </div>
      </div>
    </div>
  );
}
