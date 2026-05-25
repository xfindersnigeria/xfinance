'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomTable, Column } from '@/components/local/custom/custom-table';
import { useGroupBudgetVsActual } from '@/lib/api/hooks/useAccounts';
import { useGroupCurrencySymbol, fmtAmountCompact } from '@/lib/api/hooks/useCurrencyFormat';
import type { BudgetVsActualItem } from '@/lib/api/hooks/types/accountsTypes';

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

const PERIOD_TYPES = ['Monthly', 'Quarterly', 'Yearly'];

function currentMonth() {
  return MONTHS[new Date().getMonth()];
}

function currentYear() {
  return String(new Date().getFullYear());
}

type BudgetRow = BudgetVsActualItem & { id: string };

export function BudgetOverviewTable() {
  const sym = useGroupCurrencySymbol();
  const [periodType, setPeriodType] = useState('Monthly');
  const [period, setPeriod] = useState(currentMonth());
  const [fiscalYear, setFiscalYear] = useState(currentYear());

  const { data: vsActualResponse, isLoading } = useGroupBudgetVsActual({
    periodType,
    period,
    fiscalYear,
  });

  const rows: BudgetRow[] = (vsActualResponse?.data ?? []).map((item) => ({
    ...item,
    id: item.accountId,
  }));

  const summary = vsActualResponse?.summary;

  const handlePeriodTypeChange = (v: string) => {
    setPeriodType(v);
    if (v === 'Monthly') setPeriod(currentMonth());
    else if (v === 'Quarterly') setPeriod('Q1');
    else setPeriod('');
  };

  const columns: Column<BudgetRow>[] = [
    {
      key: 'account',
      title: 'Account',
      render: (v: string) => <span className="text-sm font-medium">{v}</span>,
    },
    {
      key: 'accountCategory',
      title: 'Category',
      render: (v: string) => v ? (
        <Badge className="text-xs bg-gray-100 text-gray-700">{v}</Badge>
      ) : null,
    },
    {
      key: 'budgeted',
      title: 'Budgeted',
      render: (v: number) => <span className="text-sm">{fmtAmountCompact(v, sym)}</span>,
    },
    {
      key: 'actual',
      title: 'Actual',
      render: (v: number) => <span className="text-sm">{fmtAmountCompact(v, sym)}</span>,
    },
    {
      key: 'variance',
      title: 'Variance',
      render: (v: number) => (
        <span className={`text-sm font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {v >= 0 ? '+' : ''}{fmtAmountCompact(v, sym)}
        </span>
      ),
    },
    {
      key: 'variancePercentage',
      title: 'Variance %',
      render: (v: number) => (
        <span className={`text-sm font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {v >= 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      ),
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={periodType} onValueChange={handlePeriodTypeChange}>
        <SelectTrigger className="h-8 text-xs w-28 rounded-2xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIOD_TYPES.map((pt) => (
            <SelectItem key={pt} value={pt} className="text-xs">{pt}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {periodType === 'Monthly' && (
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-8 text-xs w-32 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === 'Quarterly' && (
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="h-8 text-xs w-32 rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q) => (
              <SelectItem key={q.value} value={q.value} className="text-xs">{q.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={fiscalYear} onValueChange={setFiscalYear}>
        <SelectTrigger className="h-8 text-xs w-24 rounded-2xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FISCAL_YEARS.map((fy) => (
            <SelectItem key={fy} value={fy} className="text-xs">FY {fy}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && rows.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Budgeted', value: summary.totalBudgeted, color: 'green' },
            { label: 'Total Actual', value: summary.totalActual, color: 'blue' },
            { label: 'Variance', value: summary.totalVariance, color: 'neutral' },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className={`rounded-xl border p-4 ${
                color === 'green'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : color === 'blue'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : value >= 0
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <p className="text-xs font-medium opacity-80">{label}</p>
              <p className="text-xl font-bold mt-1">
                {color === 'neutral' && value > 0 ? '+' : ''}
                {fmtAmountCompact(Math.abs(value), sym)}
              </p>
            </div>
          ))}
        </div>
      )}

      <CustomTable<BudgetRow>
        columns={columns}
        data={rows}
        tableTitle="Group Budget vs Actual"
        loading={isLoading}
        pageSize={20}
        headerActions={headerActions}
        display={{
          searchComponent: false,
          filterComponent: false,
          statusComponent: false,
        }}
      />
    </div>
  );
}
