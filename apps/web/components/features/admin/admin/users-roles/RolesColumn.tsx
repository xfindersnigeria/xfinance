import { Column } from "@/components/local/custom/custom-table";
import { Badge } from "@/components/ui/badge";
import { Role } from "./utils/types";
import RolesActions from "./roles/RolesActions";

export const rolesColumns: Column<Role>[] = [
  {
    key: "name",
    title: "Role Name",
    render: (value) => <span className="font-medium">{value}</span>,
  },
  {
    key: "description",
    title: "Description",
    render: (value) => <span className="text-xs text-gray-600">{value}</span>,
  },
  {
    key: "moduleCount",
    title: "Modules",
    render: (value) => (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          {value}
        </Badge>
      </div>
    ),
  },
  {
    key: "permissionCount",
    title: "Permissions",
    render: (value) => (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
          {value}
        </Badge>
      </div>
    ),
  },
  {
    key: "usersCount",
    title: "Users",
    render: (value) => (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          {value}
        </Badge>
      </div>
    ),
  },
  {
    key: "type",
    title: "Type",
    render: (value) => (
      <Badge
        variant="default"
        className={
          value === "System"
            ? "bg-purple-100 text-purple-700 hover:bg-purple-100"
            : "bg-blue-100 text-blue-700 hover:bg-blue-100"
        }
      >
        {value}
      </Badge>
    ),
  },
  {
    key: "actions",
    title: "Actions",
    render: (_, row) => <RolesActions role={row} />,
    searchable: false,
  },
];
