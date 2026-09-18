"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/local/custom/custom-table";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteTaxGroup } from "@/lib/api/hooks/useTax";
import type { TaxGroup, TaxRate } from "@/lib/api/services/taxService";
import { StatusBadge, fmtRate } from "../shared";
import TaxRowActions from "../TaxRowActions";
import TaxGroupForm from "./TaxGroupForm";

function TaxGroupActions({ row, rates, compound }: { row: TaxGroup; rates: TaxRate[]; compound: boolean }) {
  const deleteGroup = useDeleteTaxGroup();
  return (
    <TaxRowActions
      editKey={`${MODAL.TAX_GROUP_EDIT}-${row.id}`}
      deleteKey={`${MODAL.TAX_GROUP_DELETE}-${row.id}`}
      editTitle="Edit Tax Group"
      editDescription={`Update ${row.name}`}
      renderForm={(close) => <TaxGroupForm group={row} rates={rates} compound={compound} onSuccess={close} />}
      deleteTitle={`Are you sure you want to delete "${row.name}"?`}
      onDelete={(done) => deleteGroup.mutate(row.id, { onSettled: done })}
      deleting={deleteGroup.isPending}
    />
  );
}

export function createTaxGroupColumns(rates: TaxRate[], compound: boolean): Column<TaxGroup>[] {
  return [
    {
      key: "name",
      title: "Group Name",
      className: "text-xs",
      render: (value) => <span className="font-medium text-gray-900">{value}</span>,
    },
    {
      key: "rates",
      title: "Tax Rates",
      className: "text-xs",
      render: (value: TaxGroup["rates"]) => (
        <div className="flex flex-wrap gap-1">
          {value.map((r) => (
            <Badge key={r.id} variant="outline" className="rounded-full text-xs font-normal">
              {r.name} ({fmtRate(r.rate)})
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "totalRate",
      title: compound ? "Total Rate (%, compounded)" : "Total Rate (%)",
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
      render: (_, row) => <TaxGroupActions row={row} rates={rates} compound={compound} />,
    },
  ];
}
