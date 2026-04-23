import { Column } from "@/components/local/custom/custom-table";
import EntitiesActions from "./EntitiesActions";

export interface Entity {
  id: string;
  name: string;
  legalName: string;
  taxId: string;
  country: string;
  currency: string;
  yearEnd: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phoneNumber: string;
  email: string;
  website?: string | null;
  status?: string;
  logo?: {
    publicId: string;
    secureUrl: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export const entitiesColumns: Column<any>[] = [
  {
    key: "name",
    title: "Entity Name",
    className: "text-sm font-medium",
  },
  {
    key: "country",
    title: "Country",
    className: "text-xs",
  },
  {
    key: "currency",
    title: "Currency",
    className: "text-xs",
    render: (value) => {
      const currencyCode = value?.split(" - ")[0] || value || "";
      return currencyCode;
    },
  },
  {
    key: "email",
    title: "Email",
    className: "text-xs",
  },
  {
    key: "taxId",
    title: "Tax ID",
    className: "text-xs",
  },
  {
    key: "id",
    title: "",
    className: "w-8 text-sm",
    render: (_, row: any) => <EntitiesActions row={row} />, // Actions will be rendered by component
    searchable: false,
  },
];


