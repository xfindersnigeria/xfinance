"use client";

import { ArrowLeft, Download, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ReconciliationHeaderProps {
  accountName: string;
  onSaveProgress: () => void;
  onExport: () => void;
}

export default function ReconciliationHeader({
  accountName,
  onSaveProgress,
  onExport,
}: ReconciliationHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-gray-600"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Banking
        </Button>
        <div className="h-5 w-px bg-gray-300" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bank Reconciliation</h1>
          <p className="text-sm text-gray-500">{accountName}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={onSaveProgress}>
          <Save className="w-4 h-4" />
          Save Progress
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
