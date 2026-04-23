"use client";
import { Badge } from "@/components/ui/badge";
import { Column } from "@/components/local/custom/custom-table";
import UnitActions from "./UnitActions";

export interface ProductUnit {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  status?: string;
}

export const unitColumns: Column<ProductUnit>[] = [
  {
    key: "name",
    title: "Unit Name",
    className: "text-xs",
    render: (value) => <span className="font-medium text-gray-900">{value}</span>,
  },
  {
    key: "abbreviation",
    title: "Abbreviation",
    className: "text-xs",
    render: (value) => (
      <span className="text-gray-500">{value}</span>
    ),
  },
  {
    key: "type",
    title: "Type",
    className: "text-xs",
    render: (value) => (
      <Badge variant="outline" className="text-xs font-normal">
        {value}
      </Badge>
    ),
  },
  {
    key: "actions",
    title: "Actions",
    className: "text-xs text-right",
    render: (_, row) => <UnitActions row={row} />,
    searchable: false,
  },
];
