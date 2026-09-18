"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/local/custom/custom-table";
import type { TaxJurisdiction, TaxRate } from "@/lib/api/services/taxService";
import { StatusBadge, fmtRate } from "../shared";
import TaxRateActions from "./TaxRateActions";

export function createTaxRateColumns(jurisdictions: TaxJurisdiction[]): Column<TaxRate>[] {
  return [
    {
      key: "name",
      title: "Tax Name",
      className: "text-xs",
      render: (value, row) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-gray-900">{value}</span>
          {row.isDefault && (
            <Badge className="bg-primary/10 text-primary border-transparent rounded-full font-medium">Default</Badge>
          )}
        </div>
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
      key: "jurisdiction",
      title: "Jurisdiction",
      className: "text-xs",
      render: (value) =>
        value?.name ? (
          <span className="text-gray-700">{value.name}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "rate",
      title: "Rate (%)",
      className: "text-xs",
      render: (value) => <span className="text-gray-900">{fmtRate(value)}</span>,
    },
    {
      key: "isActive",
      title: "Status",
      className: "text-xs",
      render: (value) => <StatusBadge active={!!value} />,
    },
    {
      key: "actions",
      title: "Actions",
      className: "text-xs text-right",
      searchable: false,
      render: (_, row) => <TaxRateActions row={row} jurisdictions={jurisdictions} />,
    },
  ];
}
