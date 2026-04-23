"use client";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  Eye,
  Edit3,
  FilePlus,
  FileText,
  Trash2,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
// ...existing code...
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { getInitials } from "@/lib/utils";

export const chartOfAccountsColumns: Column<any>[] = [
  {
    key: "code",
    title: "Code",
    className: "text-xs",
    render: (value) => (
      <span className="font-medium text-gray-900">{value}</span>
    ),
  },
  {
    key: "accountName",
    title: "Account Name",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <div className="font-medium text-gray-900 line-clamp-1">{row.name}</div>
        <div className="text-xs text-gray-400 line-clamp-1">
          {row.description}
        </div>
      </div>
    ),
  },
  {
    key: "typeName",
    title: "Type",
    className: "text-xs",
    render: (value) => {
      const typeStyles: { [key: string]: string } = {
        Assets: "bg-blue-100 text-blue-700",
        Liabilities: "bg-red-100 text-red-700",
        Equity: "bg-purple-100 text-purple-700",
        Revenue: "bg-green-100 text-green-700",
        Expenses: "bg-yellow-100 text-yellow-700",
      };
      const style = typeStyles[value] || "bg-gray-100 text-gray-700";
      return (
        <Badge className={`${style} px-3 py-1 rounded-full font-medium`}>
          {value}
        </Badge>
      );
    },
  },
  {
    key: "categoryName",
    title: "Category",
    className: "text-xs",
    render: (value) => <span className="text-gray-700">{value}</span>,
  },
  {
    key: "balance",
    title: "Balance",
    className: "text-xs font-medium",
    render: (value) => (
      <span className="text-gray-900 font-medium">
        {new Intl.NumberFormat("en-NG", {
          style: "currency",
          currency: "NGN",
        }).format(value || 0)}
      </span>
    ),
  },
  // {
  //   key: "actions",
  //   title: "Actions",
  //   className: "w-20 text-xs",
  //   render: (_, row) => (
  //     <div className="flex gap-2 items-center">
  //       <Button variant="ghost" size="icon" className="hover:bg-gray-100">
  //         <Eye className="w-4 h-4" />
  //       </Button>
  //       <Button variant="ghost" size="icon" className="hover:bg-gray-100">
  //         <Edit3 className="w-4 h-4" />
  //       </Button>
  //       <Button variant="ghost" size="icon" className="hover:bg-red-100 text-red-600">
  //         <Trash2 className="w-4 h-4" />
  //       </Button>
  //     </div>
  //   ),
  //   searchable: false,
  // },
];
