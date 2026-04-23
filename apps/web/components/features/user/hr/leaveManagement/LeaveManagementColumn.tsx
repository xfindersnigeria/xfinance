"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import LeaveManagementActions from "./LeaveManagementActions";

export const leaveManagementColumns: Column<any>[] = [
  {
    key: "employee",
    title: "Employee",
    className: "text-xs",
    render: (_, row) => (
      <div>
        <div className="font-medium text-gray-900">
          {row.employee?.firstName} {row.employee?.lastName}
        </div>
        <div className="text-xs text-gray-500">{row.employee?.employeeId}</div>
      </div>
    ),
  },
  {
    key: "leaveType",
    title: "Leave Type",
    className: "text-xs",
    render: (value) => {
      const leaveTypeStyles: { [key: string]: string } = {
        "Annual Leave": "bg-blue-100 text-blue-700",
        "Sick Leave": "bg-red-100 text-red-700",
        "Personal Leave": "bg-purple-100 text-purple-700",
        "Casual Leave": "bg-green-100 text-green-700",
      };
      const style = leaveTypeStyles[value] || "bg-gray-100 text-gray-700";
      return (
        <Badge className={`${style} px-3 py-1 rounded-full font-medium`}>
          {value}
        </Badge>
      );
    },
  },
  {
    key: "startDate",
    title: "Start Date",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value ? new Date(value).toLocaleDateString("en-NG") : "-"}</span>,
  },
  {
    key: "endDate",
    title: "End Date",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value ? new Date(value).toLocaleDateString("en-NG") : "-"}</span>,
  },
  {
    key: "days",
    title: "Days",
    className: "text-xs",
    render: (value) => <span className="text-gray-700 font-medium">{value}</span>,
  },
  {
    key: "reason",
    title: "Reason",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      const statusStyles: { [key: string]: string } = {
        "Approved": "bg-green-100 text-green-700",
        "Pending": "bg-yellow-100 text-yellow-700",
        "Rejected": "bg-red-100 text-red-700",
      };
      const style = statusStyles[value] || "bg-gray-100 text-gray-700";
      return (
        <Badge className={`${style} px-3 py-1 rounded-full font-medium`}>
          {value}
        </Badge>
      );
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "w-32 text-xs",
    render: (_, row) => <LeaveManagementActions row={row} />,
    searchable: false,
  },
];
