/**
 * Shape a report page sends to `POST /reports/export` to get a PDF (rendered
 * through the server's PdfService, same as payslips) or a CSV (opens in
 * Excel). Mirrors apps/api/src/reports/export/report-export.dto.ts.
 */
export type ReportCellFormat = "text" | "amount" | "number" | "percent";

export interface ReportExportColumn {
  key: string;
  label: string;
  format?: ReportCellFormat;
}

export interface ReportExportRow {
  cells: Record<string, string | number | null | undefined>;
  kind?: "row" | "header" | "subtotal" | "total";
  indent?: number;
}

export interface ReportExportSection {
  title?: string;
  columns?: ReportExportColumn[];
  rows: ReportExportRow[];
}

export interface ReportExportPayload {
  title: string;
  scope: "entity" | "group";
  period?: string;
  currency?: string;
  summary?: Array<{ label: string; value: string | number; format?: ReportCellFormat }>;
  columns: ReportExportColumn[];
  sections: ReportExportSection[];
  notes?: string[];
  warnings?: string[];
  landscape?: boolean;
}

export type ReportExportFormat = "pdf" | "csv";

/** Convenience: a single-section table where each data row maps straight to cells */
export function simpleTable<T>(
  columns: ReportExportColumn[],
  rows: T[],
  toCells: (row: T) => ReportExportRow["cells"],
  total?: ReportExportRow["cells"],
): ReportExportSection {
  return {
    rows: [
      ...rows.map((r) => ({ cells: toCells(r) })),
      ...(total ? [{ cells: total, kind: "total" as const }] : []),
    ],
    columns,
  };
}
