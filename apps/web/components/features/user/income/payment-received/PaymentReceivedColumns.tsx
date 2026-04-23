import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import { PaymentReceived } from "./utils/types";
import PaymentReceivedActions from "./PaymentReceivedActions";

// const statusColors: Record<string, string> = {
//   Paid: "bg-green-100 text-green-700",
//   Partial: "bg-yellow-100 text-yellow-700",
//   Pending: "bg-gray-100 text-gray-700",
// };

const paymentMethodColors: Record<string, string> = {
  Bank_Transfer: "bg-blue-50 text-blue-700",
  Cash: "bg-green-50 text-green-700",
  Card: "bg-purple-50 text-purple-700",
  Mobile_Money: "bg-orange-50 text-orange-700",
  Check: "bg-gray-50 text-gray-700",
};

export const PaymentReceivedColumns: Column<PaymentReceived>[] = [
  {
    key: "reference",
    title: "Reference",
    className: "text-xs font-semibold",
    render: (value) => <span className="text-xs font-medium">{value}</span>,
  },
  {
    key: "invoice",
    title: "Invoice",
    className: "text-xs",
    render: (value: any) =>
      value ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-xs">{value.invoiceNumber}</span>
          <span className="text-gray-500 text-xs">{value.customer?.name}</span>
        </div>
      ) : (
        "-"
      ),
  },
  {
    key: "paidAt",
    title: "Date",
    className: "text-xs",
    render: (value) => (
      <span className="text-xs">
        {new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    ),
  },
  {
    key: "paymentMethod",
    title: "Method",
    className: "text-xs",
    render: (value) => (
      <Badge className={`${paymentMethodColors[value] || "bg-gray-100"} text-[10px] font-medium px-2 py-0.5`}>
        {value?.replace("_", " ")}
      </Badge>
    ),
  },
  {
    key: "amount",
    title: "Amount",
    className: "text-xs font-semibold",
    render: (value) => (
      <span className="text-xs font-semibold">
        ₦{(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </span>
    ),
  },
  // {
  //   key: "status",
  //   title: "Status",
  //   className: "text-xs",
  //   render: (value) => (
  //     <Badge className={`${statusColors[value] || "bg-gray-100"} px-3 py-1 rounded-full text-[10px] font-medium`}>
  //       {value}
  //     </Badge>
  //   ),
  // },
  {
    key: "actions",
    title: "Actions",
    className: "w-8 text-xs",
    render: (_, row) => <PaymentReceivedActions row={row} />,
    searchable: false,
  },
];
