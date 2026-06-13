"use client";

import { useState } from "react";
import BudgetHeader from "./BudgetHeader";
import { CustomTabs } from "@/components/local/custom/tabs";
import { CustomTable } from "@/components/local/custom/custom-table";
import { createBudgetHeaderColumns, createBudgetVsActualColumns } from "./BudgetColumn";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";
import {
  useBudgets,
  useBudgetVsActual,
  useBudgetHeader,
  useDeleteBudget,
} from "@/lib/api/hooks/useAccounts";
import SetBudgetForm from "./SetBudgetForm";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CustomModal } from "@/components/local/custom/modal";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import { MODULES } from "@/lib/types/enums";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, FileText, Layers } from "lucide-react";
import type { BudgetHeaderListItem, BudgetHeaderLine } from "@/lib/api/hooks/types/accountsTypes";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan–Mar)" },
  { value: "Q2", label: "Q2 (Apr–Jun)" },
  { value: "Q3", label: "Q3 (Jul–Sep)" },
  { value: "Q4", label: "Q4 (Oct–Dec)" },
];

const FISCAL_YEARS = ["2023", "2024", "2025", "2026", "2027"];

type SheetMode = "create" | "edit" | "view" | null;

function currentYear() {
  return String(new Date().getFullYear());
}
function currentMonth() {
  return MONTHS[new Date().getMonth()];
}

// ── Budget Detail View ──────────────────────────────────────────────────────

function BudgetDetailView({
  budgetId,
  sym,
  onEdit,
}: {
  budgetId: string;
  sym: string;
  onEdit: () => void;
}) {
  const { data: detail, isLoading } = useBudgetHeader(budgetId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!detail) return null;

  const total = detail.lines.reduce((sum, l) => sum + l.amount, 0);

  return (
    <div className="space-y-6">
      {/* Meta */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Period Type</p>
          <Badge variant="outline">{detail.periodType}</Badge>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Period</p>
          <p className="text-sm font-medium text-gray-900">{detail.period || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Fiscal Year</p>
          <p className="text-sm font-medium text-gray-900">FY {detail.fiscalYear}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Accounts</p>
          <p className="text-sm font-medium text-gray-900">{detail.lines.length}</p>
        </div>
        {detail.note && (
          <div className="col-span-2">
            <p className="text-xs text-gray-500 mb-0.5">Notes</p>
            <p className="text-sm text-gray-700">{detail.note}</p>
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between px-4 py-3 bg-teal-50 rounded-lg border border-teal-200">
        <span className="text-sm font-medium text-teal-800">Total Budget</span>
        <span className="text-xl font-bold text-teal-900">
          {sym}
          {total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>

      {/* Lines table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="w-16">Code</span>
          <span>Account Name</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-gray-50">
          {detail.lines.map((line: BudgetHeaderLine) => (
            <div key={line.id} className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 hover:bg-gray-50 transition-colors">
              <span className="w-16 text-xs font-mono text-gray-500">{line.accountCode}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{line.accountName}</p>
                <p className="text-xs text-gray-400">{line.accountCategory}</p>
              </div>
              <span className="text-sm font-semibold text-gray-900 text-right">
                {sym}{line.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2"
          onClick={onEdit}
        >
          Edit Budget
        </Button>
      </div>
    </div>
  );
}

// ── Main Budget Component ───────────────────────────────────────────────────

export default function Budget() {
  const sym = useEntityCurrencySymbol();

  // Budget list state — "all" is the sentinel for "no filter"
  const [listFiscalYear, setListFiscalYear] = useState(currentYear());
  const [listPeriodType, setListPeriodType] = useState("all");

  const { data: budgetsResponse, isLoading: budgetsLoading } = useBudgets({
    fiscalYear: listFiscalYear === "all" ? undefined : listFiscalYear,
    periodType: listPeriodType === "all" ? undefined : listPeriodType,
  });
  const budgetHeaders = budgetsResponse?.data ?? [];

  // Sheet state
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetHeaderListItem | null>(null);

  // For edit mode, load the full detail
  const { data: budgetDetail, isLoading: detailLoading } = useBudgetHeader(
    (sheetMode === "edit" || sheetMode === "view") && selectedBudget ? selectedBudget.id : null,
  );

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<BudgetHeaderListItem | null>(null);
  const deleteBudget = useDeleteBudget();

  // Budget vs Actual state
  const [periodType, setPeriodType] = useState("All");
  const [period, setPeriod] = useState("");
  const [fiscalYear, setFiscalYear] = useState(currentYear());

  const { data: vsActualResponse, isLoading: vsActualLoading } = useBudgetVsActual(
    periodType === "All" ? { fiscalYear } : { periodType, period, fiscalYear },
  );
  const vsActualRows = vsActualResponse?.data ?? [];

  const handlePeriodTypeChange = (v: string) => {
    setPeriodType(v);
    if (v === "Monthly") setPeriod(currentMonth());
    else if (v === "Quarterly") setPeriod("Q1");
    else setPeriod("");
  };

  const openCreate = () => {
    setSelectedBudget(null);
    setSheetMode("create");
  };

  const openView = (row: BudgetHeaderListItem) => {
    setSelectedBudget(row);
    setSheetMode("view");
  };

  const openEdit = (row: BudgetHeaderListItem) => {
    setSelectedBudget(row);
    setSheetMode("edit");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setSelectedBudget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteBudget.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const headerColumns = createBudgetHeaderColumns(sym, openView, openEdit, (row) => setDeleteTarget(row));

  const sheetTitle =
    sheetMode === "create" ? "New Budget"
    : sheetMode === "edit" ? `Edit Budget`
    : selectedBudget?.name ?? "Budget Details";

  return (
    <div className="space-y-4">
      <BudgetHeader loading={false} />
      <CustomTabs
        storageKey="budget-tab"
        tabs={[
          {
            title: "Budgets",
            value: "budgetList",
            content: (
              <div className="space-y-4">
                {/* Filters + New Budget */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap items-center gap-3 flex-1 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Filter:</span>
                    <Select value={listPeriodType} onValueChange={setListPeriodType}>
                      <SelectTrigger className="w-36 bg-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {["Monthly", "Quarterly", "Yearly"].map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={listFiscalYear} onValueChange={setListFiscalYear}>
                      <SelectTrigger className="w-32 bg-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {FISCAL_YEARS.map((y) => (
                          <SelectItem key={y} value={y}>FY {y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center gap-2 h-9"
                    onClick={openCreate}
                  >
                    <Plus className="w-4 h-4" />
                    New Budget
                  </Button>
                </div>

                <CustomTable
                  searchPlaceholder="Search budgets..."
                  tableTitle="Budgets"
                  columns={headerColumns}
                  data={budgetHeaders}
                  pageSize={20}
                  loading={budgetsLoading}
                  onRowClick={(row) => openView(row)}
                  display={{ filterComponent: false }}
                />
              </div>
            ),
          },
          {
            title: "Budget vs Actual",
            value: "budgetActual",
            content: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Period:</span>

                  <Select value={periodType} onValueChange={handlePeriodTypeChange}>
                    <SelectTrigger className="w-36 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["All", "Monthly", "Quarterly", "Yearly"].map((v) => (
                        <SelectItem key={v} value={v}>
                          {v === "All" ? "All Periods" : v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {periodType === "Monthly" && (
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {periodType === "Quarterly" && (
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger className="w-44 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUARTERS.map((q) => (
                          <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Select value={fiscalYear} onValueChange={setFiscalYear}>
                    <SelectTrigger className="w-32 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FISCAL_YEARS.map((y) => (
                        <SelectItem key={y} value={y}>FY {y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <CustomTable
                  searchPlaceholder="Search accounts..."
                  tableTitle="Budget vs Actual"
                  columns={createBudgetVsActualColumns(sym)}
                  data={vsActualRows}
                  pageSize={20}
                  loading={vsActualLoading}
                  display={{ filterComponent: false }}
                />
              </div>
            ),
          },
        ]}
      />

      {/* ── Budget Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={!!sheetMode} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto flex flex-col gap-0 p-0"
        >
          <SheetHeader className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {sheetMode === "view" ? (
                <Layers className="w-5 h-5 text-teal-600" />
              ) : sheetMode === "create" ? (
                <Plus className="w-5 h-5 text-teal-600" />
              ) : (
                <FileText className="w-5 h-5 text-teal-600" />
              )}
              <SheetTitle className="text-lg font-semibold text-gray-900">
                {sheetTitle}
              </SheetTitle>
            </div>
            {selectedBudget && (sheetMode === "view" || sheetMode === "edit") && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{selectedBudget.periodType}</Badge>
                <span className="text-xs text-gray-500">
                  {selectedBudget.period || selectedBudget.fiscalYear} · FY {selectedBudget.fiscalYear}
                </span>
              </div>
            )}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {sheetMode === "view" && selectedBudget && (
              <BudgetDetailView
                budgetId={selectedBudget.id}
                sym={sym}
                onEdit={() => setSheetMode("edit")}
              />
            )}

            {(sheetMode === "create" || sheetMode === "edit") && (
              <>
                {sheetMode === "edit" && detailLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                  </div>
                ) : (
                  <SetBudgetForm
                    existingBudget={sheetMode === "edit" ? budgetDetail : undefined}
                    onSuccess={closeSheet}
                  />
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      <CustomModal
        title={`Delete Budget: ${deleteTarget?.name ?? ""}`}
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        module={MODULES.BUDGET}
      >
        <ConfirmationForm
          title={`Delete "${deleteTarget?.name}"? This removes all ${deleteTarget?.accountCount ?? 0} account line${(deleteTarget?.accountCount ?? 0) !== 1 ? "s" : ""}. This cannot be undone.`}
          confirmText="Delete"
          onResult={(confirmed) => { if (confirmed) handleDeleteConfirm(); else setDeleteTarget(null); }}
          loading={deleteBudget.isPending}
        />
      </CustomModal>
    </div>
  );
}
