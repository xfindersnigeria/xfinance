"use client";

import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  Upload,
  Download,
  CheckCircle2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAccounts } from "@/lib/api/hooks/useAccounts";
import { useBulkImportExpenses } from "@/lib/api/hooks/usePurchases";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import { useDraft } from "@/lib/drafts/useDraft";
import { BulkResult, newImportId, rowProblem } from "@/lib/drafts/importRows";
import { DraftBanner } from "@/components/local/shared/DraftBanner";

const PAGE_SIZE = 200;

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  _rowIdx: number;
  date: string;
  description: string;
  amount: number;
  reference: string;
  payee: string;
  category: string;
  expenseAccountId: string;
  /** Message from the client check or the server for this row. */
  error?: string;
}

type Step = "upload" | "map" | "preview" | "done";

const TARGET_FIELDS = [
  { key: "date", label: "Date", required: true, hint: "Transaction date" },
  { key: "description", label: "Description", required: true, hint: "Narrative / memo" },
  { key: "amount", label: "Amount", required: true, hint: "Expense amount (positive)" },
  { key: "reference", label: "Reference", required: false, hint: "Invoice or ref number" },
  { key: "payee", label: "Payee", required: false, hint: "Vendor or supplier name" },
  { key: "category", label: "Category", required: false, hint: "Internal category label" },
] as const;

type TargetKey = (typeof TARGET_FIELDS)[number]["key"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function autoMatch(col: string): TargetKey | "" {
  const c = col.toLowerCase().replace(/[\s_\-()]/g, "");
  if (["date", "transdate", "txdate", "valuedate"].some((k) => c.includes(k))) return "date";
  if (["desc", "description", "details", "narrative", "memo", "remarks"].some((k) => c.includes(k))) return "description";
  if (["amount", "amt", "sum", "value", "totalamount"].some((k) => c.includes(k))) return "amount";
  if (["ref", "reference", "refno", "txref", "cheque", "check"].some((k) => c.includes(k))) return "reference";
  if (["payee", "vendor", "supplier", "recipient", "party"].some((k) => c.includes(k))) return "payee";
  if (["category", "cat", "type", "expensetype", "class"].some((k) => c.includes(k))) return "category";
  return "";
}

function resolveDate(raw: string | number): string {
  if (typeof raw === "number" && raw > 40000) {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return s;
}

function parseAmt(raw: string | number | undefined): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") return Math.abs(raw);
  return Math.abs(parseFloat(String(raw).replace(/[^0-9.\-]/g, "")) || 0);
}

function fileToSheetRows(file: File): Promise<{ headers: string[]; rows: (string | number)[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (!raw.length) { resolve({ headers: [], rows: [] }); return; }
        const headers = (raw[0] as any[]).map((h) => String(h ?? "").trim());
        const rows = raw.slice(1).map((r) =>
          headers.map((_, i) => { const v = (r as any[])[i]; return v ?? ""; }),
        );
        resolve({ headers, rows });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const CSV_TEMPLATE = `date,description,reference,payee,category,amount\n2025-11-24,Office rent payment,RENT-NOV-2025,Property Management LLC,Operating Expense,85000\n2025-11-23,AWS cloud services,AWS-INV-001,Amazon Web Services,IT,2400\n2025-11-22,Office supplies,CHK-2846,Office Depot,Office Supplies,1850`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bulk_expense_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stepper ──────────────────────────────────────────────────────────────────

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "map", label: "Map" },
  { id: "preview", label: "Preview" },
  { id: "done", label: "Done" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center gap-1 mb-5">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border-2 transition-colors
              ${done ? "bg-primary border-primary text-white" : active ? "border-primary text-primary bg-white" : "border-gray-300 text-gray-400 bg-white"}`}>
              {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium ${active ? "text-primary" : done ? "text-primary" : "text-gray-400"}`}>{s.label}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 w-8 h-0.5 mx-1 ${i < idx ? "bg-primary" : "bg-gray-200"}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface BulkExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentAccountId: string;
  accountLabel: string;
}

export default function BulkExpenseModal({
  open,
  onOpenChange,
  paymentAccountId,
  accountLabel,
}: BulkExpenseModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sym = useEntityCurrencySymbol();

  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [headers, setHeaders] = useState<string[]>([]);
  const [sheetRows, setSheetRows] = useState<(string | number)[][]>([]);
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({ date: "", description: "", amount: "", reference: "", payee: "", category: "" });
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; total: number; failed: number } | null>(null);
  const [importId, setImportId] = useState(() => newImportId());
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: expenseAccountsData } = useAccounts({ type: "Expenses" });
  const expenseAccounts: any[] = (expenseAccountsData?.data as any) || [];

  const bulkImport = useBulkImportExpenses();

  // ── Reset ────────────────────────────────────────────────────────────────

  // Work in progress is autosaved so a failed save, a closed modal or a
  // refresh never loses a long import. Only a clean save clears it.
  const draftValue = useMemo(
    () => (step === "map" || step === "preview" ? { step, headers, sheetRows, mapping, rows, importId } : null),
    [step, headers, sheetRows, mapping, rows, importId],
  );
  const { saved: savedDraft, discard: discardDraft, dismissOffer } = useDraft({
    feature: "bulk-expense",
    scope: paymentAccountId,
    enabled: open,
    value: draftValue,
  });

  function resumeDraft() {
    if (!savedDraft) return;
    const d: any = savedDraft.data;
    setHeaders(d.headers);
    setSheetRows(d.sheetRows);
    setMapping(d.mapping);
    setRows(d.rows);
    setImportId(d.importId);
    setStep(d.step);
    dismissOffer();
  }

  function reset() {
    setImportId(newImportId());
    setLimit(PAGE_SIZE);
    setStep("upload");
    setDragOver(false);
    setHeaders([]);
    setSheetRows([]);
    setMapping({ date: "", description: "", amount: "", reference: "", payee: "", category: "" });
    setRows([]);
    setImportResult(null);
  }

  // Closing keeps the draft (it lives in IndexedDB); it only clears the form.
  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  // ── Upload step ──────────────────────────────────────────────────────────

  async function handleFile(f: File) {
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      toast.error("Only CSV and Excel (.xlsx, .xls) files are supported");
      return;
    }
    try {
      const { headers: h, rows: r } = await fileToSheetRows(f);
      if (!h.length) { toast.error("File appears to be empty"); return; }
      setHeaders(h);
      setSheetRows(r);
      const auto: Record<TargetKey, string> = { date: "", description: "", amount: "", reference: "", payee: "", category: "" };
      h.forEach((col) => { const match = autoMatch(col); if (match) auto[match] = col; });
      setMapping(auto);
      setStep("map");
    } catch {
      toast.error("Failed to parse file. Check it is a valid CSV or Excel file.");
    }
  }

  // ── Map step ─────────────────────────────────────────────────────────────

  const requiredMapped = TARGET_FIELDS.filter((f) => f.required).every((f) => mapping[f.key]);
  const autoCount = Object.values(mapping).filter(Boolean).length;

  // Pre-select an expense account when the file's category names one.
  function matchAccount(category: string): string {
    const c = category.trim().toLowerCase();
    if (!c) return "";
    const hit = expenseAccounts.find((a: any) => String(a.name).toLowerCase() === c);
    return hit?.id ?? "";
  }

  function buildRows() {
    return sheetRows
      .filter((r) => r.some((c) => c !== "" && c !== null))
      .map((r, i) => {
        const get = (key: TargetKey) => {
          const col = mapping[key];
          if (!col) return "";
          const idx = headers.indexOf(col);
          return idx >= 0 ? r[idx] : "";
        };
        return {
          _rowIdx: i + 2,
          date: resolveDate(get("date") as any),
          description: String(get("description") || ""),
          amount: parseAmt(get("amount") as any),
          reference: String(get("reference") || ""),
          payee: String(get("payee") || ""),
          category: String(get("category") || ""),
          expenseAccountId: matchAccount(String(get("category") || "")),
        };
      });
  }

  function goToPreview() {
    if (!requiredMapped) return;
    setRows(buildRows().map((r) => ({ ...r, error: rowProblem(r) ?? undefined })));
    setLimit(PAGE_SIZE);
    setStep("preview");
  }

  // ── Preview step ─────────────────────────────────────────────────────────

  const unassigned = rows.filter((r) => !r.expenseAccountId).length;
  const invalid = rows.filter((r) => r.error).length;
  const ready = rows.filter((r) => r.expenseAccountId && !r.error);
  const total = ready.reduce((s, r) => s + r.amount, 0);
  const canImport = ready.length > 0;

  function assignAll(accountId: string) {
    setRows((prev) => prev.map((r) => (r.expenseAccountId ? r : { ...r, expenseAccountId: accountId })));
  }

  function setRowAccount(idx: number, accountId: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expenseAccountId: accountId } : r)));
  }

  function deleteRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleImport() {
    if (!canImport) return;
    try {
      const result: BulkResult = await bulkImport.mutateAsync({
        importId,
        paymentAccountId,
        items: ready.map((r) => ({
          key: String(r._rowIdx),
          date: r.date,
          description: r.description,
          amount: Math.round(r.amount),
          reference: r.reference || undefined,
          payee: r.payee || undefined,
          expenseAccountId: r.expenseAccountId,
        })),
      } as any);

      const failedByRow = new Map(result.failed.map((f) => [f.row, f.message]));
      const done = new Set(result.importedKeys.filter((k) => !failedByRow.has(k)));
      // Imported rows leave the list; failed ones stay (flagged) so they can be fixed and re-sent.
      const remaining = rows
        .filter((r) => !done.has(String(r._rowIdx)))
        .map((r) => ({ ...r, error: failedByRow.get(String(r._rowIdx)) ?? r.error }));

      const imported = result.imported + result.alreadyImported;
      if (remaining.length === 0) {
        await discardDraft();
        setImportResult({ imported, total: result.total, failed: 0 });
        setStep("done");
      } else {
        setRows(remaining);
        toast.warning(`${imported} imported — ${remaining.length} row${remaining.length !== 1 ? "s" : ""} left to review`);
      }
    } catch {
      // Error toast comes from the hook. Rows, mapping and the draft are untouched —
      // the user can retry (same importId, so nothing double-posts) or come back later.
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Bulk Expense Upload</DialogTitle>
          <p className="text-xs text-gray-500">{accountLabel}</p>
        </DialogHeader>

        {savedDraft && step === "upload" && (
          <DraftBanner
            savedAt={savedDraft.savedAt}
            label="expense import"
            onResume={resumeDraft}
            onDiscard={discardDraft}
          />
        )}

        <StepIndicator current={step} />

        {/* ── Step 1: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors
                ${dragOver ? "border-primary bg-primary/5" : "border-gray-200 bg-gray-50 hover:border-primary/50"}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <Upload className="w-10 h-10 text-gray-400 mb-3" />
              <p className="font-medium text-gray-700 mb-1">Drop your file here</p>
              <p className="text-xs text-gray-400">Supports CSV, Excel (.xlsx, .xls)</p>
              <input ref={inputRef} type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Recommended CSV columns</p>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={downloadTemplate}>
                  <Download className="w-3 h-3" /> Download Template
                </Button>
              </div>
              <p className="text-xs font-mono text-gray-500 leading-relaxed">
                date, description, reference, payee, category, amount<br />
                <span className="text-gray-400">2025-11-24, Office rent payment, RENT-NOV-2025, Property Mgmt, Operating Expense, 85000</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Step 2: Map ── */}
        {step === "map" && (
          <div className="space-y-4">
            {autoCount === headers.length ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-2.5 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Auto-matched {autoCount} of {headers.length} columns
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-700">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Auto-matched {autoCount} of {headers.length} columns
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Columns in your file</p>
              <div className="flex flex-wrap gap-1.5">
                {headers.map((h) => (
                  <span key={h} className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-600 font-mono">{h}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border divide-y">
              <div className="grid grid-cols-2 px-4 py-2 bg-gray-50">
                <p className="text-xs font-semibold text-gray-500">FIELD WE NEED</p>
                <p className="text-xs font-semibold text-gray-500">COLUMN IN YOUR FILE</p>
              </div>
              {TARGET_FIELDS.map((f) => {
                const isAuto = !!mapping[f.key] && autoMatch(mapping[f.key]) === f.key;
                return (
                  <div key={f.key} className="grid grid-cols-2 items-center px-4 py-3 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-800">{f.label}</span>
                        {f.required && <span className="text-red-500 text-xs">*</span>}
                        {isAuto && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">auto</span>}
                      </div>
                      <p className="text-xs text-gray-400">{f.hint}</p>
                    </div>
                    <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="h-8 text-xs w-full">
                        <SelectValue placeholder="— Not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not mapped —</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>

            {!requiredMapped && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⚠ Map all required fields (*) before continuing
              </p>
            )}

            <div className="flex justify-between pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep("upload")}>Back</Button>
              <Button size="sm" disabled={!requiredMapped} onClick={goToPreview} className="gap-1.5">
                Proceed &amp; Import <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === "preview" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
                {ready.length} ready
              </div>
              {unassigned > 0 && (
                <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">
                  {unassigned} unassigned
                </div>
              )}
              {invalid > 0 && (
                <div className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                  {invalid} need fixing
                </div>
              )}
              <div className="text-xs text-gray-500 font-medium">
                {sym}{Math.round(total).toLocaleString()}
              </div>
              <button className="text-xs text-primary underline ml-auto" onClick={() => setStep("map")}>Edit mapping</button>
            </div>

            {unassigned > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-amber-600">Select an expense account for each transaction, or</p>
                <div className="w-56">
                  <SearchableCombobox
                    value=""
                    onChange={assignAll}
                    placeholder="Set account for all unassigned..."
                    searchPlaceholder="Search accounts..."
                    emptyMessage="No accounts found."
                    triggerClassName="h-7 text-xs"
                    options={expenseAccounts.map((a: any) => ({ value: a.id, label: `${a.code} ${a.name}` }))}
                  />
                </div>
              </div>
            )}

            <div className="rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
              <div className="grid grid-cols-[2rem_1fr_1fr_6rem_8rem_2rem] min-w-150 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-2 gap-2 border-b">
                <span>#</span>
                <span>Description</span>
                <span>Payee</span>
                <span>Amount</span>
                <span>Expense Account</span>
                <span />
              </div>
              <div className="divide-y max-h-64 overflow-y-auto">
                {rows.slice(0, limit).map((r, i) => (
                  <div key={r._rowIdx} className="grid grid-cols-[2rem_1fr_1fr_6rem_8rem_2rem] min-w-150 items-center px-3 py-2.5 gap-2 hover:bg-gray-50">
                    <span className="text-xs text-gray-400">{r._rowIdx}</span>
                    <div>
                      <p className="text-xs font-medium text-gray-800 truncate">{r.description}</p>
                      <p className="text-xs text-gray-400 font-mono">{r.date}</p>
                      {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                    </div>
                    <span className="text-xs text-gray-600 truncate">{r.payee || "—"}</span>
                    <span className={`text-xs font-semibold ${r.amount > 0 ? "text-red-600" : "text-gray-400"}`}>
                      {sym}{Math.round(r.amount).toLocaleString()}
                    </span>
                    <SearchableCombobox
                      value={r.expenseAccountId}
                      onChange={(v) => setRowAccount(i, v)}
                      placeholder="Select account..."
                      searchPlaceholder="Search accounts..."
                      emptyMessage="No accounts found."
                      triggerClassName="h-7 text-xs"
                      options={expenseAccounts.map((a: any) => ({
                        value: a.id,
                        label: `${a.code} ${a.name}`,
                      }))}
                    />
                    <button onClick={() => deleteRow(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {rows.length > limit && (
                  <button className="w-full py-2 text-xs text-primary underline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                    Show more ({rows.length - limit} hidden)
                  </button>
                )}
              </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <Button variant="outline" size="sm" onClick={() => setStep("map")}>Back</Button>
              <Button
                size="sm"
                disabled={!canImport || bulkImport.isPending}
                onClick={handleImport}
                className="gap-1.5 bg-primary text-white"
              >
                <Upload className="w-3.5 h-3.5" />
                {bulkImport.isPending ? "Importing..." : `Import ${ready.length} Expense${ready.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && importResult && (
          <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">Import Complete</p>
              <p className="text-sm text-gray-500 mt-1">
                {importResult.imported} expense{importResult.imported !== 1 ? "s" : ""} totalling{" "}
                <span className="font-semibold text-gray-700">{sym}{importResult.total.toLocaleString()}</span>{" "}
                imported to {accountLabel.split("·")[0].trim()}
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" size="sm" onClick={reset}>Upload Another</Button>
              <Button size="sm" onClick={() => handleClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
