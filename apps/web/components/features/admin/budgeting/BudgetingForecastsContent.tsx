'use client';

import React, { useState } from 'react';
import { CustomTabs, Tab } from '@/components/local/custom/tabs';
import { CustomTable, Column } from '@/components/local/custom/custom-table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CustomModal } from '@/components/local/custom/modal';
import ConfirmationForm from '@/components/local/shared/ConfirmationForm';
import { MODULES } from '@/lib/types/enums';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGroupCurrencySymbol, fmtAmountCompact } from '@/lib/api/hooks/useCurrencyFormat';
import {
  useGroupBudgets,
  useGroupBudgetHeader,
  useGroupBudgetVsActual,
  useDeleteGroupBudget,
} from '@/lib/api/hooks/useAccounts';
import { createBudgetHeaderColumns, createBudgetVsActualColumns } from '@/components/features/user/accounts/Budget/BudgetColumn';
import { SetGroupBudgetForm } from './SetGroupBudgetForm';
import { ForecastsTable } from './ForecastsTable';
import { Plus, Layers, FileText, Loader2 } from 'lucide-react';
import type {
  BudgetHeaderListItem,
  BudgetHeaderLine,
} from '@/lib/api/hooks/types/accountsTypes';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTERS = [
  { value: 'Q1', label: 'Q1 (Jan–Mar)' },
  { value: 'Q2', label: 'Q2 (Apr–Jun)' },
  { value: 'Q3', label: 'Q3 (Jul–Sep)' },
  { value: 'Q4', label: 'Q4 (Oct–Dec)' },
];

const FISCAL_YEARS = ['2023', '2024', '2025', '2026', '2027'];

type SheetMode = 'create' | 'edit' | 'view' | null;

function currentYear() { return String(new Date().getFullYear()); }
function currentMonth() { return MONTHS[new Date().getMonth()]; }

// ── Group Budget Detail View ──────────────────────────────────────────────

function GroupBudgetDetailView({
  budgetId,
  sym,
  onEdit,
}: { budgetId: string; sym: string; onEdit: () => void }) {
  const { data: detail, isLoading } = useGroupBudgetHeader(budgetId);
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }
  if (!detail) return null;
  const total = detail.lines.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
        <div><p className="text-xs text-gray-500 mb-0.5">Period Type</p><Badge variant="outline">{detail.periodType}</Badge></div>
        <div><p className="text-xs text-gray-500 mb-0.5">Period</p><p className="text-sm font-medium">{detail.period || '—'}</p></div>
        <div><p className="text-xs text-gray-500 mb-0.5">Fiscal Year</p><p className="text-sm font-medium">FY {detail.fiscalYear}</p></div>
        <div><p className="text-xs text-gray-500 mb-0.5">Accounts</p><p className="text-sm font-medium">{detail.lines.length}</p></div>
        {detail.note && <div className="col-span-2"><p className="text-xs text-gray-500 mb-0.5">Notes</p><p className="text-sm">{detail.note}</p></div>}
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-green-50 rounded-lg border border-green-200">
        <span className="text-sm font-medium text-green-800">Total Budget</span>
        <span className="text-xl font-bold text-green-900">
          {sym}{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto] text-xs font-medium text-gray-500 uppercase tracking-wide px-4 py-2.5 bg-gray-50 border-b">
          <span className="w-16">Code</span><span>Account</span><span className="text-right">Amount</span>
        </div>
        <div className="divide-y">
          {detail.lines.map((line: BudgetHeaderLine) => (
            <div key={line.id} className="grid grid-cols-[auto_1fr_auto] items-center px-4 py-3 hover:bg-gray-50">
              <span className="w-16 text-xs font-mono text-gray-500">{line.accountCode}</span>
              <div><p className="text-sm font-medium">{line.accountName}</p><p className="text-xs text-gray-400">{line.accountCategory}</p></div>
              <span className="text-sm font-semibold text-right">{sym}{line.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={onEdit}>Edit Budget</Button>
      </div>
    </div>
  );
}

// ── Group Budgets Manager Tab ─────────────────────────────────────────────

function GroupBudgetsManager() {
  const sym = useGroupCurrencySymbol();

  // "all" is the sentinel for "no filter"
  const [listFiscalYear, setListFiscalYear] = useState(currentYear());
  const [listPeriodType, setListPeriodType] = useState('all');
  const { data: budgetsResponse, isLoading: budgetsLoading } = useGroupBudgets({
    fiscalYear: listFiscalYear === 'all' ? undefined : listFiscalYear,
    periodType: listPeriodType === 'all' ? undefined : listPeriodType,
  });
  const budgetHeaders = budgetsResponse?.data ?? [];

  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetHeaderListItem | null>(null);
  const { data: budgetDetail, isLoading: detailLoading } = useGroupBudgetHeader(
    (sheetMode === 'edit' || sheetMode === 'view') && selectedBudget ? selectedBudget.id : null,
  );

  const [deleteTarget, setDeleteTarget] = useState<BudgetHeaderListItem | null>(null);
  const deleteBudget = useDeleteGroupBudget();

  const closeSheet = () => { setSheetMode(null); setSelectedBudget(null); };

  const headerColumns = createBudgetHeaderColumns(
    sym,
    (row) => { setSelectedBudget(row); setSheetMode('view'); },
    (row) => { setSelectedBudget(row); setSheetMode('edit'); },
    (row) => setDeleteTarget(row),
  );

  const sheetTitle =
    sheetMode === 'create' ? 'New Group Budget'
    : sheetMode === 'edit' ? 'Edit Group Budget'
    : selectedBudget?.name ?? 'Budget Details';

  return (
    <div className="space-y-4">
      {/* Filters + New */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 p-3 bg-gray-50 rounded-xl border">
          <span className="text-sm font-medium text-gray-600">Filter:</span>
          <Select value={listPeriodType} onValueChange={setListPeriodType}>
            <SelectTrigger className="w-36 bg-white h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {['Monthly', 'Quarterly', 'Yearly'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={listFiscalYear} onValueChange={setListFiscalYear}>
            <SelectTrigger className="w-32 bg-white h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {FISCAL_YEARS.map((y) => <SelectItem key={y} value={y}>FY {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center gap-2 h-9"
          onClick={() => { setSelectedBudget(null); setSheetMode('create'); }}
        >
          <Plus className="w-4 h-4" />
          New Group Budget
        </Button>
      </div>

      <CustomTable
        searchPlaceholder="Search budgets..."
        tableTitle="Group Budgets"
        columns={headerColumns}
        data={budgetHeaders}
        pageSize={20}
        loading={budgetsLoading}
        onRowClick={(row) => { setSelectedBudget(row); setSheetMode('view'); }}
        display={{ filterComponent: false }}
      />

      {/* Sheet */}
      <Sheet open={!!sheetMode} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-5 border-b bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {sheetMode === 'view' ? <Layers className="w-5 h-5 text-green-600" />
                : sheetMode === 'create' ? <Plus className="w-5 h-5 text-green-600" />
                : <FileText className="w-5 h-5 text-green-600" />}
              <SheetTitle className="text-lg font-semibold">{sheetTitle}</SheetTitle>
            </div>
            {selectedBudget && (sheetMode === 'view' || sheetMode === 'edit') && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{selectedBudget.periodType}</Badge>
                <span className="text-xs text-gray-500">
                  {selectedBudget.period || selectedBudget.fiscalYear} · FY {selectedBudget.fiscalYear}
                </span>
              </div>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {sheetMode === 'view' && selectedBudget && (
              <GroupBudgetDetailView budgetId={selectedBudget.id} sym={sym} onEdit={() => setSheetMode('edit')} />
            )}
            {(sheetMode === 'create' || sheetMode === 'edit') && (
              sheetMode === 'edit' && detailLoading
                ? <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>
                : <SetGroupBudgetForm existingBudget={sheetMode === 'edit' ? budgetDetail : undefined} onSuccess={closeSheet} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <CustomModal
        title={`Delete Budget: ${deleteTarget?.name ?? ''}`}
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        module={MODULES.BUDGET}
      >
        <ConfirmationForm
          title={`Delete "${deleteTarget?.name}"? This removes all ${deleteTarget?.accountCount ?? 0} account line${(deleteTarget?.accountCount ?? 0) !== 1 ? 's' : ''}. This cannot be undone.`}
          confirmText="Delete"
          onResult={async (confirmed) => {
            if (confirmed && deleteTarget) { await deleteBudget.mutateAsync(deleteTarget.id); setDeleteTarget(null); }
            else setDeleteTarget(null);
          }}
          loading={deleteBudget.isPending}
        />
      </CustomModal>
    </div>
  );
}

// ── Budget vs Actual (Group) ──────────────────────────────────────────────

function GroupBudgetVsActualTab() {
  const sym = useGroupCurrencySymbol();
  const [periodType, setPeriodType] = useState('All');
  const [period, setPeriod] = useState('');
  const [fiscalYear, setFiscalYear] = useState(currentYear());

  const { data: vsActual, isLoading } = useGroupBudgetVsActual(
    periodType === 'All' ? { fiscalYear } : { periodType, period, fiscalYear },
  );
  const rows = vsActual?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-xl border">
        <span className="text-sm font-medium text-gray-600">Period:</span>
        <Select value={periodType} onValueChange={(v) => { setPeriodType(v); if (v === 'Monthly') setPeriod(currentMonth()); else if (v === 'Quarterly') setPeriod('Q1'); else setPeriod(''); }}>
          <SelectTrigger className="w-36 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['All', 'Monthly', 'Quarterly', 'Yearly'].map((v) => <SelectItem key={v} value={v}>{v === 'All' ? 'All Periods' : v}</SelectItem>)}
          </SelectContent>
        </Select>
        {periodType === 'Monthly' && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {periodType === 'Quarterly' && (
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent>{QUARTERS.map((q) => <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <Select value={fiscalYear} onValueChange={setFiscalYear}>
          <SelectTrigger className="w-32 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent>{FISCAL_YEARS.map((y) => <SelectItem key={y} value={y}>FY {y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <CustomTable
        searchPlaceholder="Search accounts..."
        tableTitle="Group Budget vs Actual"
        columns={createBudgetVsActualColumns(sym)}
        data={rows}
        pageSize={20}
        loading={isLoading}
        display={{ filterComponent: false }}
      />
    </div>
  );
}

// ── Department Budgets (mock) ─────────────────────────────────────────────

interface DeptBudget { id: string; name: string; budgeted: number; actual: number; percentage: number; remaining: number; }
const deptData: DeptBudget[] = [
  { id: '1', name: 'Sales & Marketing', budgeted: 2000000, actual: 1750000, percentage: 87.5, remaining: 250000 },
  { id: '2', name: 'Operations', budgeted: 3200000, actual: 3040000, percentage: 95.0, remaining: 160000 },
  { id: '3', name: 'Technology', budgeted: 1800000, actual: 1650600, percentage: 91.7, remaining: 149400 },
  { id: '4', name: 'Administration', budgeted: 1400000, actual: 1260000, percentage: 90.0, remaining: 140000 },
];

function DepartmentBudgetsCards() {
  const sym = useGroupCurrencySymbol();
  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-base font-semibold text-gray-900">Department Budget</h2>
      {deptData.map((dept) => {
        const color = dept.percentage >= 95 ? 'bg-red-500' : dept.percentage >= 90 ? 'bg-orange-500' : 'bg-primary';
        return (
          <Card key={dept.id} className="shadow-none border p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{dept.name}</p>
                  <p className="text-sm text-gray-600">{fmtAmountCompact(dept.actual, sym)} / {fmtAmountCompact(dept.budgeted, sym)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{dept.percentage}%</p>
                  <p className="text-xs text-gray-500">{fmtAmountCompact(dept.remaining, sym)} remaining</p>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div className={`h-full transition-all ${color}`} style={{ width: `${dept.percentage}%` }} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────

export function BudgetingForecastsContent() {
  const tabs: Tab[] = [
    {
      title: 'Group Budgets',
      value: 'group-budgets',
      content: <GroupBudgetsManager />,
    },
    {
      title: 'Budget vs Actual',
      value: 'budget-vs-actual',
      content: <GroupBudgetVsActualTab />,
    },
    {
      title: 'Forecasts',
      value: 'forecasts',
      content: <ForecastsTable />,
    },
    {
      title: 'Department Budgets',
      value: 'department-budgets',
      content: <DepartmentBudgetsCards />,
    },
  ];

  return <CustomTabs tabs={tabs} storageKey="budgeting-forecasts-tab" />;
}
