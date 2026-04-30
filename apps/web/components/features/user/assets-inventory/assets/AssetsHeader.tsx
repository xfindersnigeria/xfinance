"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import AssetsStatCardSmall from "./AssetsStatCardSmall";
import AssetAttentionAlert from "./AssetAttentionAlert";
import AssetsForm from "./AssetsForm";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

export default function AssetsHeader({
  summary,
  loading,
}: {
  summary?: {
    total: number;
    inUse: number;
    inStorage: number;
    depricableValue: number;
  };
  loading: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const sym = useEntityCurrencySymbol();
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Fixed Assets</h2>
          <p className="text-muted-foreground">
            Manage fixed assets and depreciation{" "}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl">
            <Download />
            Export
          </Button>
          <Button onClick={() => setOpen(true)} className="rounded-xl">
            <Plus /> New Asset
          </Button>
        </div>
      </div>

      <AssetAttentionAlert />
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AssetsStatCardSmall
          title="Total Assets"
          value={
            <span className="text-3xl font-bold text-primary">
              {summary?.total || 0}
            </span>
          }
          subtitle={
            <span>
              Worth {sym}
              {((summary?.depricableValue || 0)).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          }
          loading={loading}
        />
        <AssetsStatCardSmall
          title="In Use"
          value={
            <span className="text-3xl font-bold text-primary">
              {summary?.inUse || 0}
            </span>
          }
          subtitle={<span>Active assets</span>}
          loading={loading}
        />
        <AssetsStatCardSmall
          title="In Storage"
          value={
            <span className="text-3xl font-bold text-primary">
              {summary?.inStorage || 0}
            </span>
          }
          subtitle={<span>Available</span>}
          loading={loading}
        />
        <AssetsStatCardSmall
          title="Total Value"
          value={
            <span className="text-3xl font-bold text-primary">
              {sym}
              {((summary?.depricableValue || 0)).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>
          }
          subtitle={<span>Current value</span>}
          loading={loading}
        />
      </div>

      <CustomModal
        title="Add New Asset"
        module={MODULES.ASSETS}
        open={open}
        onOpenChange={setOpen}
      >
        <AssetsForm onSuccess={() => setOpen(false)} />
      </CustomModal>
    </div>
  );
}
