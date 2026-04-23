"use client";

import React from "react";
import { CustomTable } from "@/components/local/custom/custom-table";
import { useStoreSupplyIssues } from "@/lib/api/hooks/useAssets";
import { useDebounce } from "use-debounce";

const issueData = [
  {
    id: 1,
    date: "2025-03-06 11:00 AM",
    item: "A4 Paper (Ream)",
    sku: "PP-A4-500",
    quantity: 5,
    issuedTo: "Finance Department",
    type: "Department",
    purpose: "Monthly reporting",
    issuedBy: "John Adebayo",
  },
  {
    id: 2,
    date: "2025-03-06 09:30 AM",
    item: "Whiteboard Markers (Set of 4)",
    sku: "WBM-4C",
    quantity: 2,
    issuedTo: "Mobile App Development",
    type: "Project",
    purpose: "Sprint planning session",
    issuedBy: "Sarah Okonkwo",
  },
  {
    id: 3,
    date: "2025-03-05 02:45 PM",
    item: "Stapler (Heavy Duty)",
    sku: "STL-HD-001",
    quantity: 3,
    issuedTo: "HR Department",
    type: "Department",
    purpose: "New employee onboarding",
    issuedBy: "Mary Edows",
  },
];

const columns = [
  {
    key: "date",
    title: "Date & Time",
    render: (value: string, row: any) => <span>{new Date(row?.createdAt).toLocaleDateString('en-NG')}</span>,
  },
  {
    key: "item",
    title: "Supply Item",
    render: (_: any, row: any) => (
      <div>
        <div className="font-medium text-gray-900">{row?.supply?.name}</div>
        <div className="text-xs text-gray-500">{row?.supply?.sku}</div>
      </div>
    ),
  },
  {
    key: "quantity",
    title: "Quantity",
    render: (value: number) => (
      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
        -{value}
      </span>
    ),
  },
  {
    key: "issuedTo",
    title: "Issued To",
  },
  {
    key: "type",
    title: "Type",
    render: (value: string) => (
      <span
        className={
          value === "department"
            ? "bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium"
            : value === "project"
              ? "bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium"
              : "bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium"
        }
      >
        {value}
      </span>
    ),
  },
  {
    key: "purpose",
    title: "Purpose",
  },
  {
    key: "issuedBy",
    title: "Issued By",
    render: (value: string, row: any) => (
      <span>
        {row?.issuedBy?.firstName} {row?.issuedBy?.lastName}
      </span>
    ),
  },
];

export default function IssueHistoryTable() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  const { data: storeSuppliesIssues, isPending: isLoading } =
    useStoreSupplyIssues({
      page,
      limit: pageSize,
      search: debouncedSearchTerm,
    });

  const pagination = (storeSuppliesIssues as any)?.pagination;
  const storeSuppliesIssuesData = (storeSuppliesIssues as any)?.data || [];

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-4">
      <CustomTable
        tableTitle="Issue History"
        columns={columns}
        data={storeSuppliesIssuesData}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search issue records..."
        pagination={{
          page,
          totalPages: pagination?.totalPages || 1,
          total: pagination?.total,
          onPageChange: setPage,
        }}
        loading={isLoading}
      />
    </div>
  );
}
