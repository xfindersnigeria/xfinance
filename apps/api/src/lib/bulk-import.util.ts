export interface BulkRowError {
  /** The client's row key (spreadsheet row number) when sent, else the 0-based index. */
  row: string;
  message: string;
}

/**
 * Parses an ISO-style date (YYYY-MM-DD or a full ISO string). Returns null for
 * anything unparseable so a bad row is reported instead of crashing the batch.
 */
export function parseImportDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw.trim())) return null;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Deterministic row id: the same import + the same row always maps to the same
 * primary key, so a retried request cannot create a second copy of a row.
 */
export function importRowId(prefix: string, importId: string, rowKey: string): string {
  return `${prefix}_${importId}_${rowKey}`.slice(0, 190);
}

export function rowKeyOf(item: { key?: string }, index: number): string {
  return item.key ? String(item.key) : String(index);
}
