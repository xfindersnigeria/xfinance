import {
  Eye,
  DollarSign,
  Edit3,
  Send,
  Download,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Column } from "@/components/local/custom/custom-table";
import { Invoice } from "./utils/types";
import InvoicesActions from "./InvoicesActions";

const statusColors: Record<string, string> = {
  Sent: "bg-indigo-100 text-indigo-700",
  Paid: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
  Draft: "bg-gray-100 text-gray-700",
};

export const InvoiceColumns: Column<Invoice>[] = [
  { key: "invoiceNumber", title: "Invoice #", className: "text-xs" },
  {
    key: "customer",
    title: "Customer",
    className: "text-xs",
    render: (row) => {
      return <p className="">{row?.name || "--"}</p>;
    },
  },
  {
    key: "invoiceDate",
    title: "Date",
    className: "text-xs",
    render: (value) =>
      value
        ? new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
        : "",
  },
  {
    key: "dueDate",
    title: "Due Date",
    className: "text-xs",
    render: (value) =>
      value
        ? new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "2-digit",
          })
        : "",
  },
  {
    key: "total",
    title: "Amount",
    className: "text-xs",
    render: (value) => (
      <span>
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "NGN",
        }).format(value)}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value) => (
      <Badge
        className={`${
          statusColors[value] || ""
        } px-3 py-1 rounded-full text-[10px] font-medium`}
      >
        {value}
      </Badge>
    ),
  },
  {
    key: "actions",
    title: "",
    className: "w-8 text-xs",
    render: (_, row) => <InvoicesActions row={row} />,
    searchable: false,
  },
];
