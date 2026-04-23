"use client";

import React, { useState } from "react";
import {
  AdminDashboardHeader,
  AdminStatsGrid,
  RevenueAndProfitTrendChart,
  EntityPerformanceChart,
  ConsolidationStatusChart,
  FXImpactSummaryCard,
  QuickActionsCard,
} from "@/components/features/admin/dashboard";
import { useAdminDashboard } from "@/lib/api/hooks/useAnalytics";
import { FilterOption } from "@/lib/api/services/analyticsService";
import { Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const [filter, setFilter] = useState<FilterOption>("THIS_YEAR");
  const { data, isLoading, error } = useAdminDashboard(filter);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Failed to load dashboard</p>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <AdminDashboardHeader />
      <AdminStatsGrid data={data?.kpis} loading={isLoading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueAndProfitTrendChart
          data={data?.monthlyBreakdown}
          filter={filter}
          onFilterChange={setFilter}
          loading={isLoading}
        />
        <EntityPerformanceChart
          data={data?.entityPerformance}
          loading={isLoading}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ConsolidationStatusChart />
        <FXImpactSummaryCard />
        <QuickActionsCard />
      </div>
    </div>
  );
}
