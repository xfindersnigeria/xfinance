import { Badge } from "@/components/ui/badge";
import ExpenseActions from "./ExpenseActions";

type ExpenseRow = {
  expenseNo: string;
  date: string;
  vendor: string;
  category: string;
  submittedBy: string;
  amount: string;
  status: "Approved" | "Pending" | string;
};

type ExpenseColumn = {
  key: string;
  title: string;
  className?: string;
  render: (value: unknown, row?: ExpenseRow) => React.ReactNode;
};

export const expensesColumns: ExpenseColumn[] = [
  {
    key: "reference",
    title: "Expense #",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-medium">{value as string}</span>
    ),
  },
  {
    key: "date",
    title: "Date",
    className: "text-xs",
    render: (value: any) =>
      value
        ? new Date(value).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "2-digit",
        })
        : "",
  },
  {
    key: "vendor",
    title: "Vendor",
    className: "text-xs",
    render: (value: unknown, row) => (
      <span className="text-xs font-medium">{(row?.vendor as any)?.name}</span>
    ),
  },
  // {
  //   key: "category",
  //   title: "Category",
  //   className: "text-xs",
  //   render: (value: unknown) => (
  //     <span className="text-xs">{value as string}</span>
  //   ),
  // },
 
  {
    key: "amount",
    title: "Amount",
    className: "text-xs",
    render: (value: unknown) => (
      <span className="text-xs font-semibold">
        {new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "NGN",
        }).format(Number(value))}
      </span>
    ),
  },
  {
    key: "status",
    title: "Status",
    className: "text-xs",
    render: (value: unknown) => {
      const status = value as string;
      let badgeClass = "";
      let text = status;
      if (status === "Approved") badgeClass = "bg-green-100 text-green-700";
      else if (status === "Pending")
        badgeClass = "bg-yellow-100 text-yellow-700";
      else badgeClass = "bg-gray-100 text-gray-700";
      return (
        <Badge
          className={`${badgeClass} px-3 py-1 rounded-full text-xs font-medium`}
        >
          {text}
        </Badge>
      );
    },
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs",
    render: (value: unknown, row?: ExpenseRow) => (
      <ExpenseActions expense={row} />
    ),
  },
];
 // {
  //   key: "submittedBy",
  //   title: "Submitted By",
  //   className: "text-xs",
  //   render: (value: unknown) => (
  //     <span className="text-xs">{(value as string) || "--"}</span>
  //   ),
  // },