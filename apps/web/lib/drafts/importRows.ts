// Shared client-side checks for bulk-import rows, mirroring the server rules so
// problems show up in the preview instead of as a failed save.

export function rowProblem(r: {
  date: string;
  description: string;
  amount: number;
}): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || Number.isNaN(new Date(r.date).getTime())) {
    return `Invalid date "${r.date}" — expected YYYY-MM-DD`;
  }
  if (!(r.amount > 0)) return "Amount must be greater than zero";
  if (!r.description.trim()) return "Description is required";
  return null;
}

export function newImportId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.random().toString(36).slice(2, 10)}`;
}

export interface BulkResult {
  importId: string;
  imported: number;
  alreadyImported: number;
  failed: { row: string; message: string }[];
  total: number;
  importedKeys: string[];
}
