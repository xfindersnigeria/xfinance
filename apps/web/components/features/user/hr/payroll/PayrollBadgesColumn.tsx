
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import PayrollActions from "./PayrollActions";

export function createPayrollBadgesColumns(sym: string): Column<any>[] {
  return [
  {
    key: "batchName",
    title: "Batch Name",
    className: "text-xs",
    render: (_, row) => (
      <div>
        <div className="font-medium text-gray-900 line-clamp-1">{row.batchName}</div>
        <div className="text-xs text-gray-400 line-clamp-1">
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-NG") : ""}
        </div>
      </div>
    ),
  },
  {
    key: "period",
    title: "Period",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "paymentDate",
    title: "Pay Date",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">{value ? new Date(value).toLocaleDateString("en-NG") : "—"}</span>
    ),
  },
  {
    key: "totalEmployees",
    title: "Employees",
    className: "text-xs",
    render: (value) => (
      <span className="flex items-center gap-1 text-gray-700">👥 {value ?? 0}</span>
    ),
  },
  {
    key: "totalAmount",
    title: "Total Amount",
    className: "text-xs",
    render: (value) => (
      <span className="text-blue-700 font-medium">
        {sym}{typeof value === "number" ? value.toLocaleString() : "0"}
      </span>
    ),
  },
  {
    key: "createdBy",
    title: "Created By",
    className: "text-xs",
    render: (_, row) => (
      <span className="text-gray-700">
        {row.createdBy ? `${row.createdBy.firstName ?? ""} ${row.createdBy.lastName ?? ""}`.trim() : "—"}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Approved") {
        return <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Approved</Badge>;
      }
      if (value === "Pending") {
        return <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Pending</Badge>;
      }
      if (value === "Draft") {
        return <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">Draft</Badge>;
      }
      return <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{value}</Badge>;
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "w-24 text-xs",
    render: (_, row) => <PayrollActions row={row} />,
    searchable: false,
  },
  ];
}