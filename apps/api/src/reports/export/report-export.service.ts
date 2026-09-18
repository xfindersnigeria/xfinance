import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PdfService } from '@/pdf/pdf.service';
import {
  ReportCellFormat,
  ReportExportColumn,
  ReportExportDto,
} from './report-export.dto';

const DEFAULT_PRIMARY = '#4152B6';
const MAX_ROWS = 20000;
const MAX_COLUMNS = 40;

@Injectable()
export class ReportExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
  ) {}

  async toPdf(dto: ReportExportDto, ctx: { entityId?: string | null; groupId?: string | null }): Promise<Buffer> {
    this.assertShape(dto);
    const [branding, primaryColor] = await Promise.all([
      this.resolveBranding(dto.scope, ctx),
      this.resolvePrimaryColor(ctx.groupId),
    ]);

    const report = {
      title: dto.title,
      period: dto.period,
      currencyNote: dto.currency ? `Amounts in ${dto.currency}` : undefined,
      warnings: dto.warnings ?? [],
      notes: dto.notes ?? [],
      summary: (dto.summary ?? []).map((s) => ({
        label: s.label,
        value: formatCell(s.value, s.format ?? 'text'),
      })),
      sections: dto.sections.map((section) => {
        const columns = section.columns ?? dto.columns;
        return {
          title: section.title,
          columns: columns.map((c) => ({ label: c.label, right: isNumeric(c.format) })),
          rows: section.rows.map((row) => ({
            kind: row.kind ?? 'row',
            cells: columns.map((c, i) => ({
              text: formatCell(row.cells?.[c.key], c.format ?? 'text'),
              right: isNumeric(c.format),
              indent: i === 0 && row.indent ? 7 + row.indent * 14 : 0,
            })),
          })),
        };
      }),
    };

    return this.pdfService.generate(
      'report',
      { report, entity: branding, primaryColor, generatedAt: new Date() },
      { landscape: !!dto.landscape },
    );
  }

  /** CSV with a UTF-8 BOM so Excel opens currency symbols correctly */
  toCsv(dto: ReportExportDto): string {
    this.assertShape(dto);
    const lines: string[] = [];
    lines.push(csvRow([dto.title]));
    if (dto.period) lines.push(csvRow([dto.period]));
    if (dto.currency) lines.push(csvRow([`Amounts in ${dto.currency}`]));
    for (const w of dto.warnings ?? []) lines.push(csvRow([w]));
    lines.push('');

    if (dto.summary?.length) {
      for (const s of dto.summary) lines.push(csvRow([s.label, rawCell(s.value, s.format ?? 'text')]));
      lines.push('');
    }

    for (const section of dto.sections) {
      const columns = section.columns ?? dto.columns;
      if (section.title) lines.push(csvRow([section.title]));
      lines.push(csvRow(columns.map((c) => c.label)));
      for (const row of section.rows) {
        lines.push(
          csvRow(
            columns.map((c, i) => {
              const value = rawCell(row.cells?.[c.key], c.format ?? 'text');
              // Keep hierarchy readable in a flat sheet
              return i === 0 && row.indent ? `${'  '.repeat(row.indent)}${value}` : value;
            }),
          ),
        );
      }
      lines.push('');
    }

    for (const n of dto.notes ?? []) lines.push(csvRow([n]));
    return '\uFEFF' + lines.join('\r\n');
  }

  fileName(dto: ReportExportDto, ext: 'pdf' | 'csv'): string {
    const base = `${dto.title} ${dto.period ?? ''}`
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
    return `${base || 'report'}.${ext}`;
  }

  private assertShape(dto: ReportExportDto) {
    const columns = (cols: ReportExportColumn[] | undefined) => {
      if (!Array.isArray(cols) || cols.length === 0 || cols.length > MAX_COLUMNS) {
        throw new BadRequestException(`Each table needs 1–${MAX_COLUMNS} columns`);
      }
      for (const c of cols) {
        if (typeof c?.key !== 'string' || typeof c?.label !== 'string') {
          throw new BadRequestException('Columns need a key and a label');
        }
      }
    };
    columns(dto.columns);
    let rows = 0;
    for (const s of dto.sections) {
      if (s.columns) columns(s.columns);
      if (!Array.isArray(s.rows)) throw new BadRequestException('Each section needs a rows array');
      rows += s.rows.length;
    }
    if (rows > MAX_ROWS) throw new BadRequestException(`Reports are limited to ${MAX_ROWS} rows per export`);
  }

  private async resolveBranding(
    scope: 'entity' | 'group',
    ctx: { entityId?: string | null; groupId?: string | null },
  ): Promise<{ name: string; logo?: { secureUrl: string } }> {
    if (scope === 'entity' && ctx.entityId) {
      const entity = await this.prisma.entity.findUnique({
        where: { id: ctx.entityId },
        select: { name: true, logo: true },
      });
      const logoUrl = (entity?.logo as any)?.secureUrl;
      return { name: entity?.name ?? '', logo: logoUrl ? { secureUrl: logoUrl } : undefined };
    }
    if (ctx.groupId) {
      const [group, customization] = await Promise.all([
        this.prisma.group.findUnique({ where: { id: ctx.groupId }, select: { name: true, logo: true } }),
        this.prisma.groupCustomization.findUnique({ where: { groupId: ctx.groupId }, select: { logoUrl: true } }),
      ]);
      const logoUrl = customization?.logoUrl ?? (group?.logo as any)?.secureUrl;
      return { name: group?.name ?? '', logo: logoUrl ? { secureUrl: logoUrl } : undefined };
    }
    return { name: '' };
  }

  private async resolvePrimaryColor(groupId?: string | null): Promise<string> {
    if (!groupId) return DEFAULT_PRIMARY;
    const c = await this.prisma.groupCustomization.findUnique({
      where: { groupId },
      select: { primaryColor: true },
    });
    return c?.primaryColor ?? DEFAULT_PRIMARY;
  }
}

function isNumeric(format?: ReportCellFormat) {
  return format === 'amount' || format === 'number' || format === 'percent';
}

function formatCell(value: unknown, format: ReportCellFormat): string {
  if (value === null || value === undefined || value === '') return '';
  if (format === 'text' || typeof value !== 'number' || !Number.isFinite(value)) return String(value);
  if (format === 'amount') {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (format === 'percent') {
    return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** CSV keeps numbers raw so Excel can sum them */
function rawCell(value: unknown, format: ReportCellFormat): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return format === 'amount' ? value.toFixed(2) : String(value);
  }
  const s = String(value);
  // Neutralise spreadsheet formula injection from user-entered names
  return /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
}

function csvRow(cells: string[]): string {
  return cells
    .map((c) => {
      const s = String(c ?? '');
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}
