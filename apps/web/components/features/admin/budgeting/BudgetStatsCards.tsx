'use client';

import React from 'react';
import { TrendingUp, Target, AlertCircle, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useGroupCurrencySymbol, fmtAmountCompact } from '@/lib/api/hooks/useCurrencyFormat';
import { useGroupBudgetVsActual } from '@/lib/api/hooks/useAccounts';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
}

function StatCard({ title, value, subtitle, icon, className = '' }: StatCardProps) {
  return (
    <Card className={`border border-gray-200 bg-white p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function BudgetStatsCards() {
  const sym = useGroupCurrencySymbol();
  const currentYear = String(new Date().getFullYear());

  const { data: vsActual, isLoading } = useGroupBudgetVsActual({
    periodType: 'Yearly',
    period: currentYear,
    fiscalYear: currentYear,
  });

  const summary = vsActual?.summary;
  const budgeted = summary?.totalBudgeted ?? 0;
  const actual = summary?.totalActual ?? 0;
  const variance = summary?.totalVariance ?? 0;
  const utilization = budgeted > 0 ? ((actual / budgeted) * 100).toFixed(1) : '—';

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border border-gray-200 bg-white p-6 animate-pulse">
            <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-32 bg-gray-200 rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title={`Group Budget FY${currentYear}`}
        value={fmtAmountCompact(budgeted, sym)}
        subtitle="Annual allocation"
        icon={<Target className="h-5 w-5 text-primary" />}
        className="border-indigo-200 bg-indigo-50"
      />
      <StatCard
        title="YTD Actual"
        value={fmtAmountCompact(actual, sym)}
        subtitle="Year-to-date spending"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        className="border-green-200 bg-green-50"
      />
      <StatCard
        title="Variance"
        value={`${variance >= 0 ? '+' : ''}${fmtAmountCompact(Math.abs(variance), sym)}`}
        subtitle={variance >= 0 ? 'Positive variance' : 'Negative variance'}
        icon={<AlertCircle className={`h-5 w-5 ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
        className={variance >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}
      />
      <StatCard
        title="Budget Utilization"
        value={budgeted > 0 ? `${utilization}%` : '—'}
        subtitle="Of allocated budget"
        icon={<Percent className="h-5 w-5 text-primary" />}
        className="border-indigo-200 bg-indigo-50"
      />
    </div>
  );
}
