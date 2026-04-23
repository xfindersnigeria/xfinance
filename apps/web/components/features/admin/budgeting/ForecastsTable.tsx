'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';

interface ForecastRow {
  id: string;
  period: string;
  revenue: string;
  expenses: string;
  netProfit: string;
  marginPct: number;
  confidence: 'High' | 'Medium' | 'Low';
}

// Hardcoded — replaced when GET forecasts API hook is available
const FORECAST_DATA: ForecastRow[] = [
  {
    id: '1',
    period: 'Q4 2025',
    revenue: '$12.4M',
    expenses: '$9.2M',
    netProfit: '$3.2M',
    marginPct: 25.8,
    confidence: 'High',
  },
  {
    id: '2',
    period: 'Q1 2026',
    revenue: '$13.5M',
    expenses: '$9.8M',
    netProfit: '$3.7M',
    marginPct: 27.4,
    confidence: 'Medium',
  },
  {
    id: '3',
    period: 'Q2 2026',
    revenue: '$14.2M',
    expenses: '$10.2M',
    netProfit: '$4.0M',
    marginPct: 28.2,
    confidence: 'Medium',
  },
];

const CONFIDENCE_BADGE: Record<string, string> = {
  High: 'bg-green-100 text-green-800',
  Medium: 'bg-purple-100 text-purple-800',
  Low: 'bg-red-100 text-red-800',
};

export function ForecastsTable() {
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
            {['Period', 'Revenue', 'Expenses', 'Net Profit', 'Margin %', 'Confidence', 'Actions'].map(
              (h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {FORECAST_DATA.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-4 font-medium text-gray-800">{row.period}</td>
              <td className="px-5 py-4 text-gray-600">{row.revenue}</td>
              <td className="px-5 py-4 text-gray-600">{row.expenses}</td>
              <td className="px-5 py-4 font-medium text-green-700">{row.netProfit}</td>
              <td className="px-5 py-4 text-gray-600">{row.marginPct}%</td>
              <td className="px-5 py-4">
                <Badge
                  className={`${CONFIDENCE_BADGE[row.confidence]} text-xs font-medium px-2`}
                >
                  {row.confidence}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-gray-600">
                  <Eye className="w-3.5 h-3.5" />
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
