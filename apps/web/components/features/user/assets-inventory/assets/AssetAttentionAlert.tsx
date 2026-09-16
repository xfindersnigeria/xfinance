import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssetSummary } from "./AssetsHeader";

export default function AssetAttentionAlert({
  summary,
  onReviewUncategorised,
}: {
  summary: AssetSummary;
  onReviewUncategorised: () => void;
}) {
  if (!summary.total) return null;

  let message: string;
  let action: React.ReactNode = null;
  if (summary.uncategorised > 0) {
    message = `${summary.uncategorised} asset(s) have no category and are not being depreciated. Edit them to assign a category.`;
    action = (
      <Button size="sm" variant="outline" className="shrink-0" onClick={onReviewUncategorised}>
        Review
      </Button>
    );
  } else if (summary.fullyDepreciated > 0) {
    message = `${summary.fullyDepreciated} asset(s) are fully depreciated and carry zero book value. Review them for disposal.`;
  } else {
    message =
      "Depreciation is computed at each category's rate for the current financial year. Click on any category to view individual assets.";
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3 text-sm">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <p>
          <span className="font-semibold text-amber-700">Asset Attention Required: </span>
          <span className="text-foreground">{message}</span>
        </p>
      </div>
      {action}
    </div>
  );
}
