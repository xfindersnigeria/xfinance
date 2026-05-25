'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2 } from 'lucide-react';
import { useForecasts, useDeleteForecast } from '@/lib/api/hooks/useAccounts';
import { useGroupCurrencySymbol, fmtAmountCompact } from '@/lib/api/hooks/useCurrencyFormat';
import type { ForecastItem } from '@/lib/api/hooks/types/accountsTypes';

const CONFIDENCE_BADGE: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-purple-100 text-purple-800',
  Low: 'bg-red-100 text-red-800',
  Speculative: 'bg-yellow-100 text-yellow-800',
};

const HEADERS = ['Period', 'Revenue', 'Expenses', 'Net Profit', 'Margin %', 'Confidence', 'Actions'];

export function ForecastsTable() {
  const sym = useGroupCurrencySymbol();
  const { data, isLoading } = useForecasts({ limit: 50 });
  const deleteForecast = useDeleteForecast();

  const rows: ForecastItem[] = data?.data ?? [];

  const handleDelete = (row: ForecastItem) => {
    if (!confirm(`Delete forecast "${row.name}" for ${row.periodLabel}?`)) return;
    deleteForecast.mutate({
      periodType: row.periodType,
      period: row.period,
      fiscalYear: row.fiscalYear,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Table header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-800">Financial Forecasts</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Projected financial performance based on current trends
          </p>
        </div>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {isLoading ? (
            <tr>
              <td colSpan={HEADERS.length} className="px-5 py-8 text-center text-sm text-gray-400">
                Loading...
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={HEADERS.length} className="px-5 py-8 text-center text-sm text-gray-400">
                No forecasts yet. Create your first forecast to get started.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-4 font-medium text-gray-800">{row.periodLabel}</td>
                <td className="px-5 py-4 text-gray-600">{fmtAmountCompact(row.revenue, sym)}</td>
                <td className="px-5 py-4 text-gray-600">{fmtAmountCompact(row.expenses, sym)}</td>
                <td className={`px-5 py-4 font-medium ${row.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {row.netProfit >= 0 ? '' : '-'}{fmtAmountCompact(Math.abs(row.netProfit), sym)}
                </td>
                <td className="px-5 py-4 text-gray-600">{row.marginPct}%</td>
                <td className="px-5 py-4">
                  <Badge
                    className={`${CONFIDENCE_BADGE[row.confidenceLevel] ?? 'bg-gray-100 text-gray-700'} text-xs font-medium px-2`}
                  >
                    {row.confidenceLevel}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-gray-600">
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(row)}
                      disabled={deleteForecast.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
