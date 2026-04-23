"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Employee } from "./utils/types";
import { getInitials } from "@/lib/utils";
import EmployeesActions from "./EmployeesActions";

export const employeesColumns: Column<Employee>[] = [
  {
    key: "name",
    title: "Employee",
    className: "text-xs",
    render: (value, row) => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-gray-500 font-semibold text-base">
          {getInitials(row.firstName + " " + row.lastName)}
        </div>
        <div>
          <div className="font-medium text-gray-900 line-clamp-1">{row.firstName} {row.lastName}</div>
          <div className="text-xs text-gray-500 line-clamp-1">{row.type}</div>
          <div className="text-xs text-gray-400 line-clamp-1">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    key: "department",
    title: "Department",
    className: "text-xs",
    render: (_, row) => (
      <span className="text-gray-700">{(row as any)?.dept?.name || "--"}</span>
    ),
  },
  {
    key: "salary",
    title: "Salary",
    className: "text-xs",
    render: (value) => (
      <span className="font-normal text-gray-700">
        {typeof value === "number"
          ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value)
          : value}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => (
      <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
        {value}
      </Badge>
    ),
  },
  {
    key: "actions",
    title: "",
    className: "w-32 text-xs",
    render: (_, row) => <EmployeesActions row={row} />,
    searchable: false,
  },
];
