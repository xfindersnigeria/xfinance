import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export type ReportCellFormat = 'text' | 'amount' | 'number' | 'percent';

export interface ReportExportColumn {
  key: string;
  label: string;
  format?: ReportCellFormat;
}

export interface ReportExportRow {
  cells: Record<string, string | number | null | undefined>;
  /** Visual weight in the PDF; CSV ignores it */
  kind?: 'row' | 'header' | 'subtotal' | 'total';
  /** Indent level for the first column (hierarchical statements) */
  indent?: number;
}

export interface ReportExportSection {
  title?: string;
  /** Defaults to the report-level columns */
  columns?: ReportExportColumn[];
  rows: ReportExportRow[];
}

/**
 * A report, already computed by the report endpoint and shaped as a table by
 * the page that displays it. The export endpoint only renders it — as a PDF
 * through the shared PdfService (same pipeline as payslips/invoices) or as a
 * CSV that opens in Excel. Branding (name, logo, colour) is resolved
 * server-side from the request context, never taken from the payload.
 */
export class ReportExportDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsIn(['entity', 'group'])
  scope: 'entity' | 'group';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  period?: string;

  /** ISO currency code the amounts are expressed in */
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsArray()
  summary?: Array<{ label: string; value: string | number; format?: ReportCellFormat }>;

  @IsArray()
  columns: ReportExportColumn[];

  @IsArray()
  sections: ReportExportSection[];

  @IsOptional()
  @IsArray()
  notes?: string[];

  @IsOptional()
  @IsArray()
  warnings?: string[];

  /** Wide reports (e.g. one column per entity) render in landscape */
  @IsOptional()
  landscape?: boolean;
}
