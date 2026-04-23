import { Column } from "@/components/local/custom/custom-table";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export const usersColumns: Column<any>[] = [
  {
    key: "name",
    title: "Name",
    className: "text-sm",
  },
  {
    key: "email",
    title: "Email",
    className: "text-sm",
  },
  {
    key: "role",
    title: "Role",
    className: "text-sm",
  },
  {
    key: "status",
    title: "Status",
    className: "text-sm",
    render: (value) => (
      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
        {value}
      </span>
    ),
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-sm",
    render: (_, row: any) => (
      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
        Edit
      </button>
    ),
    searchable: false,
  },
];

export const usersData: User[] = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah.chen@hunslow.com",
    role: "Group CFO",
    status: "Active",
  },
  {
    id: "2",
    name: "Michael Rodriguez",
    email: "m.rodriguez@hunslow.com",
    role: "Controller - US",
    status: "Active",
  },
  {
    id: "3",
    name: "Emma Thompson",
    email: "e.thompson@hunslow.co.uk",
    role: "Finance Manager - UK",
    status: "Active",
  },
  {
    id: "4",
    name: "Hans Mueller",
    email: "h.mueller@hunslow.de",
    role: "Finance Manager - DE",
    status: "Active",
  },
  {
    id: "5",
    name: "Li Wei",
    email: "l.wei@hunslow.sg",
    role: "Accountant - SG",
    status: "Active",
  },
];
