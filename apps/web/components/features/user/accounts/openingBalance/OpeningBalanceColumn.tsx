import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";

export const openingBalanceColumns: Column<any>[] = [
  {
    key: "date",
    title: "Date",
    className: "text-xs",
    render: (value) => {
      const date = new Date(value);
      return <span className="text-gray-700">{date.toLocaleDateString()}</span>;
    },
  },
  {
    key: "fiscalYear",
    title: "Fiscal Year",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-700 font-medium">{value}</span>
    ),
  },
  {
    key: "totalDebit",
    title: "Total Debit",
    className: "text-xs text-right",
    render: (value) => (
      <span className="text-gray-900 font-medium">
        ₦{(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: "totalCredit",
    title: "Total Credit",
    className: "text-xs text-right",
    render: (value) => (
      <span className="text-gray-900 font-medium">
        ₦{(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    key: "note",
    title: "Notes",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-600 line-clamp-2">{value || "—"}</span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => {
      if (value === "Finalized") {
        return (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Finalized
          </Badge>
        );
      }
      if (value === "Draft") {
        return (
          <Badge className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">
            Draft
          </Badge>
        );
      }
      return (
        <Badge className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-medium">
          {value}
        </Badge>
      );
    },
  },
];
