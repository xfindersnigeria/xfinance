"use client";

import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { Project } from "./utils/types";
import ProjectsActions from "./ProjectsActions";

function fmtMoney(value: number): string {
  if (value >= 1_000_000_000)
    return `₦${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1_000_000)
    return `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${value}`;
}

const STATUS_STYLES: Record<string, string> = {
  In_Progress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Planning: "bg-orange-100 text-orange-700",
  On_Hold: "bg-yellow-100 text-yellow-700",
};

export const projectsColumns: Column<Project>[] = [
  {
    key: "name",
    title: "Project",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-medium text-gray-900 line-clamp-1">{value}</div>
        <div className="text-xs text-gray-400 line-clamp-1">
          {row.projectCode ?? row.projectNumber}
        </div>
      </div>
    ),
  },
  {
    key: "customer",
    title: "Customer",
    className: "text-xs",
    render: (value: any) => (
      <span className="text-gray-700">{value?.name ?? "—"}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => (
      <Badge
        className={`px-3 py-1 rounded-full font-medium ${STATUS_STYLES[value as string] ?? "bg-gray-100 text-gray-600"}`}
      >
        {(value as string)?.replace("_", " ")}
      </Badge>
    ),
  },
  {
    key: "startDate",
    title: "Timeline",
    className: "text-xs",
    render: (value, row) => (
      <div className="text-gray-700">
        <div className="text-xs">{new Date(value).toLocaleDateString()}</div>
        <div className="text-xs text-gray-400">
          {new Date(row.endDate).toLocaleDateString()}
        </div>
      </div>
    ),
  },
  {
    key: "budgetedRevenue",
    title: "Budget Revenue",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" ? (
        <span className="text-gray-700">{fmtMoney(value)}</span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "actualRevenue",
    title: "Actual Revenue",
    className: "text-xs",
    render: (value, row) => {
      // console.log("Rendering actualRevenue with value:", row); // Debug log
      return typeof value === "number" ? (
        <span className="text-green-600 font-medium">{fmtMoney(value)}</span>
      ) : (
        <span className="text-gray-400">—</span>
      );
    },
  },
  {
    key: "budgetedCost",
    title: "Budget Cost",
    className: "text-xs",
    render: (value) =>
      typeof value === "number" ? (
        <span className="text-gray-700">{fmtMoney(value)}</span>
      ) : (
        <span className="text-gray-400">—</span>
      ),
  },
  {
    key: "actions",
    title: "",
    className: "w-8 text-xs",
    render: (_, row) => <ProjectsActions row={row} />,
    searchable: false,
  },
];
