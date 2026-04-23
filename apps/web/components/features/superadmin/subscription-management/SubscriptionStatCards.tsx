'use client';

import React from 'react';
import { DollarSign, ShoppingCart, Percent, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useDashboardStats } from '@/lib/api/hooks/useSubscription';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

function StatCard({ title, value, icon, className = '', isLoading = false }: StatCardProps) {
  return (
    <Card className={`border border-gray-200 bg-white p-6 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-bold text-primary">{value}</p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
          {icon}
        </div>
      </div>
    </Card>
  );
}

export function SubscriptionStatCards() {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total MRR"
        value={stats?.totalMRRFormatted ?? '₦0.00'}
        icon={<DollarSign className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Active Subscriptions"
        value={stats?.activeSubscriptions?.toString() ?? '0'}
        icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Trial Conversions"
        value={`${stats?.trialConversions ?? 0}%`}
        icon={<Percent className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Avg Revenue/Customer"
        value={stats?.avgRevenuePerCustomerFormatted ?? '₦0.00'}
        icon={<Users className="h-5 w-5 text-primary" />}
        isLoading={isLoading}
      />
    </div>
  );
}
