"use client";
import React from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteTaxRate, useUpdateTaxRate } from "@/lib/api/hooks/useTax";
import type { TaxJurisdiction, TaxRate } from "@/lib/api/services/taxService";
import TaxRowActions from "../TaxRowActions";
import TaxRateForm from "./TaxRateForm";

export default function TaxRateActions({ row, jurisdictions }: { row: TaxRate; jurisdictions: TaxJurisdiction[] }) {
  const deleteRate = useDeleteTaxRate();
  const setDefault = useUpdateTaxRate();

  return (
    <TaxRowActions
      editKey={`${MODAL.TAX_RATE_EDIT}-${row.id}`}
      deleteKey={`${MODAL.TAX_RATE_DELETE}-${row.id}`}
      editTitle="Edit Tax Rate"
      editDescription={`Update ${row.name}`}
      renderForm={(close) => <TaxRateForm rate={row} jurisdictions={jurisdictions} onSuccess={close} />}
      deleteTitle={`Are you sure you want to delete "${row.name}"?`}
      onDelete={(done) => deleteRate.mutate(row.id, { onSettled: done })}
      deleting={deleteRate.isPending}
      // The default rate can't be deleted — make another rate the default first
      canDelete={!row.isDefault}
      extra={
        !row.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100 text-gray-600 gap-1 px-2"
            disabled={setDefault.isPending}
            title={row.isActive ? "Make this the default tax rate" : "Activate and make this the default tax rate"}
            onClick={() => setDefault.mutate({ id: row.id, payload: { isDefault: true } })}
          >
            <Star className="w-3.5 h-3.5" />
            Set as default
          </Button>
        )
      }
    />
  );
}
