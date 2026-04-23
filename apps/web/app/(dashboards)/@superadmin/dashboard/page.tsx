'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSuperadminDashboard } from '@/lib/api/hooks/useAnalytics';
import {
  SaasDashboardHeader,
  SaasDashboardStatCards,
  RevenueGrowthChart,
  PlanDistributionChart,
  SubscriptionGrowthChart,
  RecentSignupsSection,
} from '@/components/features/superadmin/dashboard';

export default function SuperadminDashboard() {
  const { data: dashboardData, isLoading } = useSuperadminDashboard();

  if (isLoading) {
    return (
      <div className="space-y-8 p-4">
        {/* Header */}
        <SaasDashboardHeader />

        {/* Stat Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg bg-white p-6">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-8 w-24" />
              <Skeleton className="mt-2 h-4 w-16" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="border border-gray-200 rounded-lg bg-white p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-80 w-full" />
          </div>
          <div className="border border-gray-200 rounded-lg bg-white p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-4 h-80 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      {/* Header */}
      <SaasDashboardHeader />

      {/* Stat Cards */}
      <SaasDashboardStatCards data={dashboardData?.cards} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueGrowthChart data={dashboardData?.revenueGrowth} />
        <PlanDistributionChart data={dashboardData?.planDistribution} />
      </div>

      {/* Subscription Growth */}
      <SubscriptionGrowthChart data={dashboardData?.subscriptionGrowth} />

      {/* Recent Sign-ups */}
      <RecentSignupsSection data={dashboardData?.recentSignups} />
    </div>
  );
}
