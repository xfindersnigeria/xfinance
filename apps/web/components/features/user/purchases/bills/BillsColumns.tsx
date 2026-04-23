import { Badge } from "@/components/ui/badge";
import { BillActions } from "./BillActions";

type BillRow = {
  id: string;
  billNumber: string;
  billDate: string;
  vendor: {
    displayName: string;
    name: string;
  };
  dueDate: string;
  total: string;
  status: "unpaid" | "paid" | "draft" | string;
};

type BillColumn = {
  key: string;
  title: string;
  className?: string;
  render: (value: unknown, row?: BillRow) => React.ReactNode;
};

export const billsColumns: BillColumn[] = [
  {
    key: "billNumber",
    title: "Bill #",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-medium">{value as string}</span>
    ),
  },
  {
    key: "billDate",
    title: "Date",
    className: "text-xs",
    render: (value: unknown) => {
      const date = new Date(value as string);
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return <span className="text-xs">{formatted}</span>;
    },
  },
  {
    key: "vendor",
    title: "Vendor",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-medium">{(value as any)?.displayName || (value as any)?.name}</span>
    ),
  },
  {
    key: "dueDate",
    title: "Due Date",
    className: "text-xs",
    render: (value: unknown) => {
      const date = new Date(value as string);
      const formatted = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return <span className="text-xs">{formatted}</span>;
    },
  },
  {
    key: "total",
    title: "Amount",
    className: "text-xs",
    render: (value: unknown) => {
      const amount = parseFloat(value as string) || 0;
    const formatted = new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
      }).format(amount);
      return (
        <span className="text-xs font-semibold">{formatted}</span>
      );
    },
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value: unknown) => {
      const status = value as string;
      let badgeClass = "";
      if (status === "paid" || status === "Paid") badgeClass = "bg-green-100 text-green-700";
      else if (status === "unpaid" || status === "Unpaid")
        badgeClass = "bg-yellow-100 text-yellow-700";
      else if (status === "partial" || status === "Partial")
        badgeClass = "bg-blue-100 text-blue-700";
      else badgeClass = "bg-gray-100 text-gray-700";
      return (
        <Badge
          className={`${badgeClass} px-3 py-1 rounded-full text-xs font-medium capitalize`}
        >
          {status}
        </Badge>
      );
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs text-center",
    render: (_: unknown, row?: BillRow) => (
      <BillActions bill={row} />
    ),
  },
];
