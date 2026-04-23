import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type PaymentRow = {
  paymentNo: string;
  date: string;
  vendor: string;
  bill: string;
  method: string;
  amount: string;
  status: "Cleared" | "Pending" | string;
};

type PaymentColumn = {
  key: string;
  title: string;
  className?: string;
  render: (value: unknown, row?: PaymentRow) => React.ReactNode;
};

export const paymentMadeColumns: PaymentColumn[] = [
  {
    key: "reference",
    title: "Payment #",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-medium">{value as string}</span>
    ),
  },
  {
    key: "paymentDate",
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
    render: (value: unknown, row?: PaymentRow) => (
      <span className="text-xs font-medium">{(row?.vendor as any)?.name}</span>
    ),
  },
  {
    key: "bill",
    title: "Bill",
    className: "text-xs",
    render: (value: unknown, row?: PaymentRow) => (
      <span className="text-xs">{((row?.bill as any)?.billNumber) || '-'}</span>
    ),
  },
  {
    key: "paymentMethod",
    title: "Method",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs">{value as string}</span>
    ),
  },
  {
    key: "amount",
    title: "Amount",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-semibold">{value as string}</span>
    ),
  },
  // {
  //   key: "status",
  //   title: "Status",
  //   className: "text-xs",
  //   render: (value: unknown) => {
  //     const status = value as string;
  //     let badgeClass = "";
  //     if (status === "Cleared") badgeClass = "bg-green-100 text-green-700";
  //     else if (status === "Pending") badgeClass = "bg-yellow-100 text-yellow-700";
  //     else badgeClass = "bg-gray-100 text-gray-700";
  //     return (
  //       <Badge className={`${badgeClass} px-3 py-1 rounded-full text-xs font-medium`}>{status}</Badge>
  //     );
  //   },
  // },
];
