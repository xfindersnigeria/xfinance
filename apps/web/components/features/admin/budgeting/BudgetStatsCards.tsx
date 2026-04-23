'use client';

import React from 'react';
import { TrendingUp, Target, AlertCircle, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Group Budget FY2025"
        value="₦11.4M"
        subtitle="Annual allocation"
        icon={<Target className="h-5 w-5 text-primary" />}
        className="border-indigo-200 bg-indigo-50"
      />
      <StatCard
        title="YTD Actual"
        value="₦11.22M"
        subtitle="Year-to-date spending"
        icon={<TrendingUp className="h-5 w-5 text-green-600" />}
        className="border-green-200 bg-green-50"
      />
      <StatCard
        title="Variance"
        value="₦180K"
        subtitle="Positive variance"
        icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
        className="border-orange-200 bg-orange-50"
      />
      <StatCard
        title="Budget Utilization"
        value="98.4%"
        subtitle="Of allocated budget"
        icon={<Percent className="h-5 w-5 text-primary" />}
        className="border-indigo-200 bg-indigo-50"
      />
    </div>
  );
}
