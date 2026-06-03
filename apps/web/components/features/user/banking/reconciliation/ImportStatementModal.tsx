"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
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
  amount?: number;
  debit?: number;
  credit?: number;
  type: "credit" | "debit";
}

interface ImportStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (rows: MappedRow[]) => void;
}

// Target columns — amount OR debit+credit
const TARGET_COLUMNS = [
  { key: "date", label: "Date", required: true },
  { key: "description", label: "Description", required: false },
  { key: "reference", label: "Reference", required: false },
  { key: "amount", label: "Amount (single column)", required: false },
  { key: "debit", label: "Debit / Withdrawal", required: false },
  { key: "credit", label: "Credit / Deposit", required: false },
] as const;

type TargetKey = (typeof TARGET_COLUMNS)[number]["key"];

function autoMatch(csvCol: string): TargetKey | "" {
  const c = csvCol.toLowerCase().replace(/[\s_\-()]/g, "");
  if (
    [
      "date",
      "transdate",
      "txdate",
      "valuedate",
      "postdate",
      "accountdate",
    ].some((k) => c.includes(k))
  )
    return "date";
  if (
    [
      "desc",
      "description",
      "details",
      "narrative",
      "particulars",
      "memo",
      "remarks",
    ].some((k) => c.includes(k))
  )
    return "description";
  if (
    ["ref", "reference", "refno", "txref", "cheque", "check"].some((k) =>
      c.includes(k),
    )
  )
    return "reference";
  if (c === "debit" || c === "withdrawal" || c === "dr") return "debit";
  if (c === "credit" || c === "deposit" || c === "cr") return "credit";
  if (
    ["amount", "totalamount", "value", "amt", "sum"].some((k) => c.includes(k))
  )
    return "amount";
  return "";
}

function resolveDate(raw: string): string {
  const clean = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) return clean.slice(0, 10);
  const dmy = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const mdy = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy)
    return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  // Excel serial date
  const serial = parseInt(clean, 10);
  if (!isNaN(serial) && serial > 40000) {
    const d = XLSX.SSF.parse_date_code(serial);
    if (d)
      return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  return clean;
}

function parseAmt(raw: string | number | undefined): number {
  if (raw === undefined || raw === null || raw === "") return 0;
  if (typeof raw === "number") return raw;
  return parseFloat(String(raw).replace(/[^0-9.\-]/g, "")) || 0;
}

function fileToSheetRows(
  file: File,
): Promise<{ headers: string[]; rows: (string | number)[][] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: "",
        });
        if (!raw.length) {
          resolve({ headers: [], rows: [] });
          return;
        }
        const headers = (raw[0] as any[]).map((h) => String(h ?? "").trim());
        const rows = raw.slice(1).map((r) =>
          headers.map((_, i) => {
            const v = (r as any[])[i];
            return v === null || v === undefined ? "" : v;
          }),
        );
        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

const EMPTY_MAPPING: Record<TargetKey, string> = {
  date: "",
  description: "",
  reference: "",
  amount: "",
  debit: "",
  credit: "",
};

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
  const [csvRows, setCsvRows] = useState<(string | number)[][]>([]);
  const [mapping, setMapping] = useState<Record<TargetKey, string>>({
    ...EMPTY_MAPPING,
  });

  const handleFile = (file: File) => {
    const allowed = /\.(csv|xlsx|xls)$/i;
    if (!allowed.test(file.name)) {
      toast.error("Only CSV or Excel (.xlsx/.xls) files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large — max 10MB");
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

  const handleProceedToMapping = async () => {
    if (!selectedFile) return;
    try {
      const { headers, rows } = await fileToSheetRows(selectedFile);
      if (!headers.length) {
        toast.error("Could not read the file — check the format and try again");
        return;
      }
      setCsvHeaders(headers);
      setCsvRows(rows);
      const auto: Record<TargetKey, string> = { ...EMPTY_MAPPING };
      headers.forEach((h) => {
        const matched = autoMatch(h);
        if (matched && !auto[matched]) auto[matched] = h;
      });
      setMapping(auto);
      setStep("map");
    } catch {
      toast.error(
        "Failed to parse the file — it may be corrupted or in an unsupported format",
      );
    }
  };

  const handleProceedImport = () => {
    if (!mapping.date) {
      toast.error("Please map the Date column");
      return;
    }
    if (!mapping.description) {
      toast.error("Please map the Description column");
      return;
    }
    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      toast.error(
        "Please map at least one amount column (Amount, Debit, or Credit)",
      );
      return;
    }

    const colIndex = (key: TargetKey) => csvHeaders.indexOf(mapping[key]);
    const di = colIndex("date");
    const dsi = colIndex("description");
    const ri = colIndex("reference");
    const ai = colIndex("amount");
    const dbi = colIndex("debit");
    const cri = colIndex("credit");

    const rows: MappedRow[] = [];
    for (const row of csvRows) {
      const rawDate = String(row[di] ?? "");
      const desc = String(row[dsi] ?? "").trim();
      if (!rawDate || !desc) continue;

      let amount = 0;
      let type: "credit" | "debit" = "credit";

      if (ai >= 0 && mapping.amount) {
        amount = parseAmt(row[ai]);
        type = amount >= 0 ? "credit" : "debit";
        amount = Math.abs(amount);
      } else {
        const creditAmt = cri >= 0 && mapping.credit ? parseAmt(row[cri]) : 0;
        const debitAmt = dbi >= 0 && mapping.debit ? parseAmt(row[dbi]) : 0;
        if (creditAmt > 0) {
          amount = creditAmt;
          type = "credit";
        } else if (debitAmt > 0) {
          amount = debitAmt;
          type = "debit";
        } else continue; // skip zero-value rows
      }

      rows.push({
        date: resolveDate(rawDate),
        description: desc,
        reference: ri >= 0 ? String(row[ri] ?? "").trim() : "",
        amount,
        type,
      });
    }

    if (!rows.length) {
      toast.error("No valid rows found — check your column mapping");
      return;
    }

    onImport(rows);
    handleClose();
    toast.success(
      `${rows.length} transaction${rows.length !== 1 ? "s" : ""} imported`,
    );
  };

  const handleClose = () => {
    setSelectedFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setMapping({ ...EMPTY_MAPPING });
    setStep("upload");
    onOpenChange(false);
  };

  const autoMatchedCount = TARGET_COLUMNS.filter(
    (c) => !!mapping[c.key],
  ).length;
  const hasAmountMapping = !!(
    mapping.amount ||
    mapping.debit ||
    mapping.credit
  );

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      title={step === "upload" ? "Import Bank Statement" : "Map Columns"}
      description={
        step === "upload"
          ? "Upload your bank statement file (CSV or Excel)"
          : "Match your file columns to the fields we need"
      }
      module={MODULES.BANKING}
      width="sm:max-w-lg"
    >
      {step === "upload" && (
        <div className="space-y-4 pt-6 pb-4">
          <div
            className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-10 px-6 cursor-pointer transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
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
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
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
                  <p className="text-xs text-gray-400 mt-1">
                    CSV, XLSX, or XLS (Max 10MB)
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700 leading-relaxed">
            Any format works — you&apos;ll map the columns next. We support{" "}
            <span className="font-medium">single Amount</span> columns or
            separate <span className="font-medium">Debit / Credit</span>{" "}
            columns.
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
          <div
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-xs ${
              hasAmountMapping
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {hasAmountMapping ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>
              Auto-matched <strong>{autoMatchedCount}</strong> of{" "}
              {TARGET_COLUMNS.length} columns.
              {!hasAmountMapping &&
                " Map at least one amount column (Amount, Debit, or Credit)."}
            </span>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Columns in your file:
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

          <div className="space-y-3">
            {TARGET_COLUMNS.map((col) => (
              <div
                key={col.key}
                className="grid grid-cols-[160px_1fr] gap-3 items-center"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-700">
                    {col.label}
                  </span>
                  {col.required && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
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
                    <SelectValue placeholder="— Not mapped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value="__none__"
                      className="text-xs text-gray-400"
                    >
                      — Not mapped
                    </SelectItem>
                    {csvHeaders.map((h) => {
                      const value = h === mapping[col.key] ? "__none__" : h;
                      return (
                        <SelectItem
                          key={h}
                          value={value}
                          className="text-xs font-mono"
                        >
                          {h}
                          {csvRows[0]?.[csvHeaders.indexOf(h)] !==
                            undefined && (
                            <span className="text-gray-400 ml-1">
                              (e.g.{" "}
                              {String(csvRows[0][csvHeaders.indexOf(h)]).slice(
                                0,
                                18,
                              )}
                              )
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400">
            {csvRows.length} data row{csvRows.length !== 1 ? "s" : ""} in file
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
