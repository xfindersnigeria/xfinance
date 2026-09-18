"use client";
import React from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportReport } from "@/lib/api/hooks/useReports";
import type { ReportExportFormat, ReportExportPayload } from "@/lib/reports/export-types";

interface ReportExportButtonsProps {
  /** Builds the export table from the data currently on screen; null while loading */
  getPayload: () => ReportExportPayload | null;
  disabled?: boolean;
}

/**
 * Print + Export buttons shared by every entity and group report. Print opens
 * the server-rendered PDF in a new tab; Export downloads it as PDF or as a CSV
 * that opens in Excel.
 */
export function ReportExportButtons({ getPayload, disabled }: ReportExportButtonsProps) {
  const exportReport = useExportReport();
  const busy = exportReport.isPending;

  const run = (format: ReportExportFormat, mode: "download" | "print" = "download") => {
    const payload = getPayload();
    if (!payload) return;
    exportReport.mutate({ payload, format, mode });
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        variant="outline"
        size="sm"
        className="gap-2 rounded-xl"
        disabled={disabled || busy}
        onClick={() => run("pdf", "print")}
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} Print
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" disabled={disabled || busy}>
            <Download className="w-4 h-4" /> Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onSelect={() => run("pdf")}>
            <FileText className="size-4 mr-2" /> PDF
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run("csv")}>
            <FileSpreadsheet className="size-4 mr-2" /> Excel (CSV)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
