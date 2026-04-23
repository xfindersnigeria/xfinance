import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

type VendorRow = {
  initials: string;
  name: string;
  id: string | number;
  email: string;
  phone: string;
  bills: number;
  outstanding: number;
  status: string;
  jobTitle: string;
};

type VendorColumn = {
  key: string;
  title: string;
  className?: string;
  render: (value: unknown, row?: VendorRow) => React.ReactNode;
};

export const vendorColumns: VendorColumn[] = [
  {
    key: "name",
    title: "Vendor",
    className: "text-xs",
    render: (_: unknown, row?: VendorRow) => (
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-full flex items-center justify-center bg-purple-100 text-purple-600 font-bold text-xs">
          {row?.initials}
        </span>
        <div>
          <div className="font-medium text-xs text-gray-900">{row?.name}</div>
          <div className="text-xs text-gray-400">{row?.jobTitle}</div>
        </div>
      </div>
    ),
  },
  {
    key: "contact",
    title: "Contact",
    className: "text-xs",
    render: (_: unknown, row?: VendorRow) => (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Mail className="w-3 h-3" /> {row?.email}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Phone className="w-3 h-3" /> {row?.phone}
        </span>
      </div>
    ),
  },
  {
    key: "billsCount",
    title: "Bills",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs">{value as number}</span>
    ),
  },
  {
    key: "outstandingAmount",
    title: "Outstanding",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs">
        ₦
        {typeof value === "number"
          ? value.toLocaleString()
          : String(value ?? 0)}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value: unknown) => (
      <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
        {value as string}
      </Badge>
    ),
  },
];
