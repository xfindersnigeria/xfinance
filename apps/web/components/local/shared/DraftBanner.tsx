"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

function ago(ts: number) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h !== 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d !== 1 ? "s" : ""} ago`;
}

interface Props {
  savedAt: number;
  label: string;
  onResume: () => void;
  onDiscard: () => void;
}

export function DraftBanner({ savedAt, label, onResume, onDiscard }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 mb-4">
      <RotateCcw className="w-4 h-4 shrink-0" />
      <span className="flex-1">
        You have an unsaved {label} from {ago(savedAt)}.
      </span>
      <Button size="sm" className="h-7 text-xs" onClick={onResume}>
        Resume
      </Button>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onDiscard}>
        Discard
      </Button>
    </div>
  );
}
