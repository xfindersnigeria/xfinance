import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { getInitials } from "@/lib/utils";

function formatTime(iso?: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-NG");
}

export const attendanceColumns: Column<any>[] = [
  {
    key: "employee",
    title: "Employee",
    className: "text-xs",
    render: (_, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-gray-600 font-semibold text-xs">
          {getInitials(`${row.employee?.firstName ?? ""} ${row.employee?.lastName ?? ""}`)}
        </div>
        <div>
          <div className="font-medium text-gray-900">
            {row.employee?.firstName} {row.employee?.lastName}
          </div>
          <div className="text-xs text-gray-400">{row.employee?.department}</div>
        </div>
      </div>
    ),
  },
  {
    key: "attendanceLog",
    title: "Date",
    className: "text-xs",
    render: (_, row) => (
      <span className="text-gray-700">{formatDate(row.attendanceLog?.date)}</span>
    ),
  },
  {
    key: "checkInTime",
    title: "Check In",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{formatTime(value)}</span>,
  },
  {
    key: "checkOutTime",
    title: "Check Out",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{formatTime(value)}</span>,
  },
  {
    key: "hours",
    title: "Hours",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700">{value !== undefined && value !== null ? `${value}h` : "-"}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Present")
        return <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Present</Badge>;
      if (value === "On Leave" || value === "Leave")
        return <Badge className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full font-medium">On Leave</Badge>;
      if (value === "Late")
        return <Badge className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">Late</Badge>;
      if (value === "Absent")
        return <Badge className="bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">Absent</Badge>;
      return <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">{value || "-"}</Badge>;
    },
  },
];
