"use client";

import { ArrowLeft, Download, Save, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface ReconciliationHeaderProps {
  accountName: string;
  status: "DRAFT" | "COMPLETED" | null;
  onSaveProgress: () => void;
  onExport: () => void;
}

export default function ReconciliationHeader({
  accountName,
  status,
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
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Bank Reconciliation</h1>
            <p className="text-sm text-gray-500">{accountName}</p>
          </div>
          {status === "COMPLETED" && (
            <Badge className="bg-green-100 text-green-700 gap-1 text-xs ml-1">
              <CheckCircle2 className="w-3 h-3" />
              Completed
            </Badge>
          )}
          {status === "DRAFT" && (
            <Badge className="bg-amber-100 text-amber-700 gap-1 text-xs ml-1">
              <Clock className="w-3 h-3" />
              Draft
            </Badge>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {status !== "COMPLETED" && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onSaveProgress}>
            <Save className="w-4 h-4" />
            Save Progress
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </div>
  );
}
