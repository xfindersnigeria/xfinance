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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [periodType, setPeriodType] = useState('All');
  const [period, setPeriod] = useState('');
  const [fiscalYear, setFiscalYear] = useState(currentYear());

  const { data: vsActualResponse, isLoading } = useGroupBudgetVsActual(
    periodType === 'All'
      ? { fiscalYear }
      : { periodType, period, fiscalYear },
  );

  const rows: BudgetRow[] = (vsActualResponse?.data ?? []).map((item) => ({
    ...item,
    id: item.subCategoryId ?? item.accountId,
  }));

  const summary = vsActualResponse?.summary;

  const handlePeriodTypeChange = (v: string) => {
    setPeriodType(v);
    if (v === 'Monthly') setPeriod(currentMonth());
    else if (v === 'Quarterly') setPeriod('Q1');
    else setPeriod(''); // All or Yearly
  };

  const columns: Column<BudgetRow>[] = [
    {
      key: 'account',
      title: 'Sub-Category',
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
          <SelectItem value="All" className="text-xs">All Periods</SelectItem>
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

  const chartData = rows.map((r) => ({
    name: r.accountName.length > 20 ? r.accountName.slice(0, 18) + '…' : r.accountName,
    fullName: r.accountName,
    Budgeted: r.budgeted,
    Actual: r.actual,
  }));

  return (
    <div className="space-y-4">
      {/* Comparison Bar Chart */}
      {rows.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-700 mb-1">Budget vs Actual — Sub-Category Comparison</div>
          <div className="text-xs text-muted-foreground mb-3">
            Budgeted amounts compared to actual utilisation across all entities
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => fmtAmountCompact(v, sym)}
              />
              <Tooltip
                formatter={(value: number, name: string) => [fmtAmountCompact(value, sym), name]}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName ?? label}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Budgeted" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Actual" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

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
