"use client";

import { cn } from "@/lib/utils";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import AssetsStatCardSmall from "./AssetsStatCardSmall";
import AssetAttentionAlert from "./AssetAttentionAlert";
import { formatAmount } from "./utils/format";

export interface AssetSummary {
  total: number;
  inUse: number;
  inStorage: number;
  totalCost: number;
  depreciableValue: number;
  uncategorised: number;
  fullyDepreciated: number;
}

export type AssetView = "categories" | "register";

const VIEWS: { value: AssetView; label: string }[] = [
  { value: "categories", label: "Asset Categories" },
  { value: "register", label: "Asset Register" },
];

export default function AssetsHeader({
  summary,
  loading,
  view,
  onViewChange,
  onReviewUncategorised,
}: {
  summary: AssetSummary;
  loading: boolean;
  view: AssetView;
  onViewChange: (view: AssetView) => void;
  onReviewUncategorised: () => void;
}) {
  const sym = useEntityCurrencySymbol();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider">
            Fixed Assets <span className="mx-1 text-muted-foreground">•</span>
            <span className="font-normal normal-case tracking-normal text-muted-foreground">
              Capital Registry
            </span>
          </p>
          <h2 className="mt-1 text-2xl font-bold">Asset Management</h2>
          <p className="text-sm text-muted-foreground">
            Declare, update, and manage your capital asset registry for tax valuation and
            automated depreciation.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted p-1 sm:inline-grid" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => onViewChange(v.value)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                view === v.value
                  ? "border border-primary bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AssetsStatCardSmall
          title="Total Assets"
          value={summary.total}
          subtitle={<span className="font-mono">Worth {formatAmount(sym, summary.totalCost)}</span>}
          loading={loading}
        />
        <AssetsStatCardSmall
          title="In Use"
          value={summary.inUse}
          subtitle="Active assets"
          loading={loading}
        />
        <AssetsStatCardSmall
          title="In Storage"
          value={summary.inStorage}
          subtitle="Available in inventory"
          loading={loading}
        />
        <AssetsStatCardSmall
          title="Depreciable Value"
          value={<span className="font-mono">{formatAmount(sym, summary.depreciableValue)}</span>}
          subtitle="Tracked for depreciation"
          loading={loading}
        />
      </div>

      {!loading && (
        <AssetAttentionAlert summary={summary} onReviewUncategorised={onReviewUncategorised} />
      )}
    </div>
  );
}
