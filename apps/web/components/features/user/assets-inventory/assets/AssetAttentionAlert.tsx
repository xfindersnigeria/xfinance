import { AlertCircle } from "lucide-react";

export default function AssetAttentionAlert() {
  return (
    <div className="flex items-start gap-3 p-4 mb-4 rounded-xl border border-red-100 bg-linear-to-br from-red-50 to-white mt-3">
      <span className="mt-1 text-red-500">
        <AlertCircle className="w-5 h-5" />
      </span>
      <div>
        <div className="font-semibold text-red-700">
          Asset Attention Required:
          <span className="font-normal text-gray-700"> You have 1 asset(s) with low or zero value.</span>
        </div>
        <div className="text-sm text-gray-500">
          Click "Review" on highlighted assets to dispose them and remove from records.
        </div>
      </div>
    </div>
  );
}
