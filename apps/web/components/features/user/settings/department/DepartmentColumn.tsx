"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import DepartmentActions from "./DepartmentActions";

export interface Department {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  _count?: { employees: number };
}

export const departmentColumns: Column<Department>[] = [
  {
    key: "name",
    title: "Department",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "description",
    title: "Description",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-500 line-clamp-1">{value || "—"}</span>
    ),
  },
  {
    key: "_count",
    title: "Employees",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">{value?.employees ?? 0}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) =>
      value === "active" ? (
        <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
          Active
        </Badge>
      ) : (
        <Badge className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
          Inactive
        </Badge>
      ),
  },
  {
    key: "actions",
    title: "",
    className: "w-24 text-xs",
    render: (_, row) => <DepartmentActions row={row} />,
    searchable: false,
  },
];
