"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {CustomTable} from "@/components/local/custom/custom-table";
import { auditColumns, auditLogsData, AuditLog } from "./AuditTrailColumn";

const modules = [
  "All Modules",
  "Reports",
  "Transactions",
  "Invoices",
  "Consolidation",
  "Settings",
  "Vendors",
  "Payroll",
  "Banking",
  "Budgeting",
  "Expenses",
];

export default function AuditTrail() {
  const [selectedModule, setSelectedModule] = useState<string>("All Modules");
  const [filteredData, setFilteredData] = useState<AuditLog[]>(auditLogsData);

  const handleModuleChange = (module: string) => {
    setSelectedModule(module);

    if (module === "All Modules") {
      setFilteredData(auditLogsData);
    } else {
      setFilteredData(
        auditLogsData.filter((log) => log.module === module)
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filter by Module:</label>
        <Select value={selectedModule} onValueChange={handleModuleChange}>
          <SelectTrigger className="w-62.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modules.map((module) => (
              <SelectItem key={module} value={module}>
                {module}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <CustomTable columns={auditColumns} data={filteredData} />
    </div>
  );
}
