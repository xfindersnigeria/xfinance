import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ReconciliationStatusBannerProps {
  difference: number;
}

export default function ReconciliationStatusBanner({
  difference,
}: ReconciliationStatusBannerProps) {
  const isReconciled = difference === 0;
  const absFormatted =
    Math.abs(difference) >= 1_000_000
      ? `₦${(Math.abs(difference) / 1_000_000).toFixed(1)}M`
      : Math.abs(difference) >= 1_000
      ? `₦${(Math.abs(difference) / 1_000).toFixed(1)}k`
      : `₦${Math.abs(difference).toLocaleString()}`;

  if (isReconciled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            Reconciliation Complete
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            All transactions match. You can now complete the reconciliation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold text-amber-800">
          Reconciliation In Progress
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          There is a difference of {absFormatted} that needs to be resolved.
          Match transactions or add missing entries to complete the
          reconciliation.
        </p>
      </div>
    </div>
  );
}
