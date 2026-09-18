"use client";
import React from "react";
import { Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MODAL } from "@/lib/data/modal-data";
import { useDeleteTaxJurisdiction } from "@/lib/api/hooks/useTax";
import type { TaxJurisdiction } from "@/lib/api/services/taxService";
import { StatusBadge, flagEmoji, fmtRate } from "../shared";
import TaxRowActions from "../TaxRowActions";
import TaxJurisdictionForm from "./TaxJurisdictionForm";

function JurisdictionCard({ jurisdiction }: { jurisdiction: TaxJurisdiction }) {
  const deleteJurisdiction = useDeleteTaxJurisdiction();
  const flag = flagEmoji(jurisdiction.countryCode);

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">
            {flag ?? <Globe className="w-4 h-4 text-primary" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{jurisdiction.name}</p>
            <p className="text-xs text-gray-500 line-clamp-2">
              {jurisdiction.description || (jurisdiction.countryCode ? jurisdiction.countryCode : "No description")}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <StatusBadge active={jurisdiction.isActive} />
          <TaxRowActions
            editKey={`${MODAL.TAX_JURISDICTION_EDIT}-${jurisdiction.id}`}
            deleteKey={`${MODAL.TAX_JURISDICTION_DELETE}-${jurisdiction.id}`}
            editTitle="Configure Jurisdiction"
            editDescription={`Update ${jurisdiction.name}`}
            editLabel="Configure"
            renderForm={(close) => <TaxJurisdictionForm jurisdiction={jurisdiction} onSuccess={close} />}
            deleteTitle={
              jurisdiction.taxRates.length
                ? `Delete "${jurisdiction.name}"? Its ${jurisdiction.taxRates.length} tax rate(s) will be kept without a jurisdiction.`
                : `Are you sure you want to delete "${jurisdiction.name}"?`
            }
            onDelete={(done) => deleteJurisdiction.mutate(jurisdiction.id, { onSettled: done })}
            deleting={deleteJurisdiction.isPending}
          />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {jurisdiction.taxRates.length ? (
          jurisdiction.taxRates.map((r) => (
            <Badge
              key={r.id}
              variant="outline"
              className={`text-xs font-normal ${r.isActive ? "" : "text-gray-400"}`}
              title={r.isActive ? undefined : "Inactive"}
            >
              {r.name}: {fmtRate(r.rate)}
            </Badge>
          ))
        ) : (
          <p className="text-xs text-gray-400">No tax rates yet — pick this jurisdiction when adding a tax rate.</p>
        )}
      </div>
    </div>
  );
}

export default function TaxJurisdictionList({
  jurisdictions,
  loading,
}: {
  jurisdictions: TaxJurisdiction[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }
  if (!jurisdictions.length) {
    return <p className="py-8 text-center text-sm text-gray-400">No jurisdictions yet</p>;
  }
  return (
    <div className="space-y-4">
      {jurisdictions.map((j) => (
        <JurisdictionCard key={j.id} jurisdiction={j} />
      ))}
    </div>
  );
}
