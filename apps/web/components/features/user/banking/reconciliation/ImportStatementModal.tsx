"use client";

import { useRef, useState } from "react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Upload,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export interface MappedRow {
  date: string;
  description: string;
  reference: string;
  amount: number;
}

interface ImportStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: MappedRow[]) => void;
}

// Our target columns
const TARGET_COLUMNS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: true },
  { key: "reference", label: "Reference", required: false },
  { key: "amount", label: "Amount", required: true },
] as const;

type TargetKey = (typeof TARGET_COLUMNS)[number]["key"];

// Try to auto-match a CSV column name to one of our target keys
function autoMatch(csvCol: string): TargetKey | "" {
  const c = csvCol.toLowerCase().replace(/[\s_-]/g, "");
  if (["date", "transdate", "accountdate", "txdate", "valuedate", "postdate"].some((k) => c.includes(k)))
    return "date";
  if (["desc", "description", "details", "narrative", "particulars", "memo", "remarks"].some((k) => c.includes(k)))
    return "description";
  if (["ref", "reference", "refno", "referenceno", "txref"].some((k) => c.includes(k)))
    return "reference";
  if (["amount", "totalamount", "value", "credit", "debit", "amt", "sum"].some((k) => c.includes(k)))
    return "amount";
  return "";
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const parse = (line: string) =>
    line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const headers = parse(lines[0]);
  const rows = lines.slice(1).map(parse);
  return { headers, rows };
}

function resolveDate(raw: string): string {
  // Try several common date formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY
  const clean = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // MM/DD/YYYY
  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return clean;
}

export default function ImportStatementModal({
  open,
  onOpenChange,
  onImport,
}: ImportStatementModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "map">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({
    date: "",
    description: "",
    reference: "",
    amount: "",
  });

  const handleFile = (file: File) => {
    const allowed = ["text/csv", "application/vnd.ms-excel"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(csv)$/i)) {
      toast.error("Only CSV files are supported for column mapping");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large — max 5MB");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleProceedToMapping = () => {
    if (!selectedFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers, rows } = parseCSV(text);
      if (!headers.length) {
        toast.error("Could not parse CSV — check the file format");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);

      // Auto-match columns
      const auto: Record<TargetKey, string> = { date: "", description: "", reference: "", amount: "" };
      headers.forEach((h) => {
        const matched = autoMatch(h);
        if (matched && !auto[matched]) auto[matched] = h;
      });
      setMapping(auto);
      setStep("map");
    };
    reader.readAsText(selectedFile);
  };

  const handleProceedImport = () => {
    const missing = TARGET_COLUMNS.filter(
      (c) => c.required && !mapping[c.key],
    );
    if (missing.length) {
      toast.error(`Please map required columns: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }

    const colIndex = (key: TargetKey) => csvHeaders.indexOf(mapping[key]);
    const di = colIndex("date");
    const dsi = colIndex("description");
    const ri = colIndex("reference");
    const ai = colIndex("amount");

    const rows: MappedRow[] = csvRows
      .filter((row) => row.some((c) => c.trim()))
      .map((row) => ({
        date: resolveDate(row[di] ?? ""),
        description: row[dsi] ?? "",
        reference: ri >= 0 ? (row[ri] ?? "") : "",
        amount: parseFloat((row[ai] ?? "0").replace(/[^0-9.\-]/g, "")) || 0,
      }))
      .filter((r) => r.date && r.description);

    if (!rows.length) {
      toast.error("No valid rows found after applying mapping");
      return;
    }

    onImport(rows);
    handleClose();
    toast.success(`${rows.length} transaction${rows.length !== 1 ? "s" : ""} imported`);
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({ date: "", description: "", reference: "", amount: "" });
    setStep("upload");
    onOpenChange(false);
  };

  const autoMatchedCount = TARGET_COLUMNS.filter((c) => !!mapping[c.key]).length;

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "upload" ? "Import Bank Statement" : "Map Columns"}
      description={
        step === "upload"
          ? "Upload your bank statement CSV file"
          : "Match your CSV columns to the fields we need"
      }
      module={MODULES.BANKING}
      width="sm:max-w-lg"
    >
      {step === "upload" && (
        <div className="space-y-4 pt-6 pb-4">
          {/* Drop zone */}
          <div
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 cursor-pointer transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
            {selectedFile ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-primary max-w-[200px] truncate">
                    {selectedFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-blue-500 hover:text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">CSV files only (Max 5MB)</p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700 leading-relaxed">
            Any CSV format works — you&apos;ll map the columns on the next step.
            We&apos;ll auto-detect common column names like <span className="font-medium">Date</span>,{" "}
            <span className="font-medium">Description</span>,{" "}
            <span className="font-medium">Reference</span>, and{" "}
            <span className="font-medium">Amount</span>.
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              className="gap-2"
              disabled={!selectedFile}
              onClick={handleProceedToMapping}
            >
              Next: Map Columns
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-5 pt-6 pb-4">
          {/* Auto-match summary */}
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${
              autoMatchedCount === TARGET_COLUMNS.length
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {autoMatchedCount === TARGET_COLUMNS.length ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>
              Auto-matched <strong>{autoMatchedCount}</strong> of{" "}
              {TARGET_COLUMNS.length} columns from your file.
              {autoMatchedCount < TARGET_COLUMNS.length &&
                " Please map the remaining ones below."}
            </span>
          </div>

          {/* CSV column preview */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Columns detected in your file:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {csvHeaders.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center rounded-md bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-700 font-mono"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>

          {/* Mapping rows */}
          <div className="space-y-3">
            {TARGET_COLUMNS.map((col) => (
              <div key={col.key} className="grid grid-cols-[120px_1fr] gap-3 items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-700">{col.label}</span>
                  {col.required && <span className="text-red-500 text-xs">*</span>}
                  {mapping[col.key] && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <Select
                  value={mapping[col.key] || "__none__"}
                  onValueChange={(v) =>
                    setMapping((prev) => ({
                      ...prev,
                      [col.key]: v === "__none__" ? "" : v,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 text-xs bg-white">
                    <SelectValue placeholder="Select a column from your CSV…" />
                  </SelectTrigger>
                  <SelectContent>
                    {!col.required && (
                      <SelectItem value="__none__" className="text-xs text-gray-400">
                        — Not mapped
                      </SelectItem>
                    )}
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h} className="text-xs font-mono">
                        {h}
                        {csvRows[0]?.[csvHeaders.indexOf(h)] ? (
                          <span className="text-gray-400 ml-1">
                            (e.g. {csvRows[0][csvHeaders.indexOf(h)]?.slice(0, 20)})
                          </span>
                        ) : null}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Row count */}
          <p className="text-xs text-gray-400">
            {csvRows.length} data row{csvRows.length !== 1 ? "s" : ""} found in file
          </p>

          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("upload")}
            >
              ← Back
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={handleProceedImport}
              >
                Proceed &amp; Import
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
