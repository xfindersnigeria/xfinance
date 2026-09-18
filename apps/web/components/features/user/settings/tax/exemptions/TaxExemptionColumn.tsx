"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/local/custom/custom-table";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteTaxExemption } from "@/lib/api/hooks/useTax";
import type { TaxExemption } from "@/lib/api/services/taxService";
import { StatusBadge } from "../shared";
import TaxRowActions from "../TaxRowActions";
import TaxExemptionForm from "./TaxExemptionForm";

function TaxExemptionActions({ row }: { row: TaxExemption }) {
  const deleteExemption = useDeleteTaxExemption();
  return (
    <TaxRowActions
      editKey={`${MODAL.TAX_EXEMPTION_EDIT}-${row.id}`}
      deleteKey={`${MODAL.TAX_EXEMPTION_DELETE}-${row.id}`}
      editTitle="Edit Exemption"
      editDescription={`Update ${row.name}`}
      renderForm={(close) => <TaxExemptionForm exemption={row} onSuccess={close} />}
      deleteTitle={`Are you sure you want to delete "${row.name}"?`}
      onDelete={(done) => deleteExemption.mutate(row.id, { onSettled: done })}
      deleting={deleteExemption.isPending}
    />
  );
}

export const taxExemptionColumns: Column<TaxExemption>[] = [
  {
    key: "name",
    title: "Exemption Name",
    className: "text-xs",
    render: (value, row) => (
      <div>
        <p className="font-medium text-gray-900">{value}</p>
        {row.description && <p className="text-gray-500 line-clamp-1">{row.description}</p>}
      </div>
    ),
  },
  {
    key: "code",
    title: "Code",
    className: "text-xs",
    render: (value) => (
      <Badge variant="outline" className="rounded-full text-xs font-normal">
        {value}
      </Badge>
    ),
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
    render: (_, row) => <TaxExemptionActions row={row} />,
  },
];
