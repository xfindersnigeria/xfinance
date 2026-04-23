"use client";

import { useRef, useState } from "react";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Upload, Download, X } from "lucide-react";

interface ImportStatementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (file: File) => void;
}

const TEMPLATE_CSV =
  "Date,Description,Reference,Amount\n" +
  "2025-11-28,Customer Payment - ABC Corp,TRF/12825/001,12500000\n" +
  "2025-11-27,Supplier Payment - XYZ Ltd,CHQ/567890,-8900000\n" +
  "2025-11-26,Bank Charges - Monthly Fee,BCH/112025,-45000\n";

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "bank_statement_template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function ImportStatementModal({
  open,
  onOpenChange,
  onImport,
}: ImportStatementModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xls|xlsx)$/i))
      return;
    if (file.size > 5 * 1024 * 1024) return;
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmit = () => {
    if (!selectedFile) return;
    onImport(selectedFile);
    setSelectedFile(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <CustomModal
      open={open}
      onOpenChange={onOpenChange}
      title="Import Bank Statement"
      description="Upload your bank statement in CSV or Excel format"
      module={MODULES.BANKING}
      width="sm:max-w-md"
    >
      <div className="space-y-4 pt-8 pb-4">
        {/* Drop zone */}
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
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {selectedFile ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-4 py-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800 max-w-[200px] truncate">
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-blue-500 hover:text-blue-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
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
                  CSV or Excel files (Max 5MB)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Expected format info */}
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 space-y-2">
          <p className="text-xs font-semibold text-blue-800">Expected Format:</p>
          <p className="text-xs text-blue-700 leading-relaxed">
            Your file should include columns for{" "}
            <span className="font-medium">Date, Description, Reference,</span>{" "}
            and <span className="font-medium">Amount</span>. Credits should be
            positive numbers, debits should be negative.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 mt-1 underline underline-offset-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!selectedFile}
            onClick={handleSubmit}
          >
            Import Transactions
          </Button>
        </div>
      </div>
    </CustomModal>
  );
}
