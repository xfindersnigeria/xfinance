'use client';

import React from 'react';
import { Building2, Users, DollarSign, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { DashboardCard } from '@/lib/api/services/analyticsService';

interface StatCardProps {
  title: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  className?: string;
}

interface CardsData {
  totalCompanies: DashboardCard;
  activeUsers: DashboardCard;
  monthlyRevenue: DashboardCard;
  churnRate: DashboardCard;
}

function StatCard({ title, value, trend, icon, className = '' }: StatCardProps) {
  const isPositive = trend >= 0;

  return (
    <Card className={`border border-gray-200 bg-white p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <div className="flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span
              className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
            >
              {isPositive ? '+' : ''}{trend}%
            </span>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function SaasDashboardStatCards({ data }: { data?: CardsData }) {
  // Format revenue value
  const formatRevenue = (value: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fallback to mock data if no data provided
  const displayData = data || {
    totalCompanies: { value: 247, growth: 12, icon: 'building' },
    activeUsers: { value: 1800, growth: 18, icon: 'users' },
    monthlyRevenue: { value: 2800000, growth: 22, icon: 'dollar' },
    churnRate: { value: 2.4, growth: 0, icon: 'trending-down' },
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Companies"
        value={displayData.totalCompanies.value.toLocaleString('en-NG')}
        trend={displayData.totalCompanies.growth}
        icon={<Building2 className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Active Users"
        value={(displayData.activeUsers.value / 1000).toFixed(1) + 'k'}
        trend={displayData.activeUsers.growth}
        icon={<Users className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Monthly Revenue"
        value={formatRevenue(displayData.monthlyRevenue.value)}
        trend={displayData.monthlyRevenue.growth}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
      />
      <StatCard
        title="Churn Rate"
        value={displayData.churnRate.value.toFixed(1) + '%'}
        trend={displayData.churnRate.growth}
        icon={<Briefcase className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}
