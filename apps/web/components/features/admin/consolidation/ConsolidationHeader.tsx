"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ConsolidationHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary">Consolidation</h1>
        <p className="text-muted-foreground">
          Intercompany transactions, eliminations, and consolidation workflow
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-lg gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
        <Button className="rounded-lg  gap-2">
          ▶️ Run Consolidation
        </Button>
      </div>
    </div>
  );
}
