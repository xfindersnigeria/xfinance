"use client";

import React, { useState } from "react";
import {
  AccountsReceivableAging,
  AccountsPayableAging,
  CashFlow,
  DashboardHeader,
  RecentTransactions,
  RevenueExpensesChart,
  StatsGrid,
  TopExpenses,
} from "@/components/features/user/dashboard";
import { useDashboardData } from "@/lib/api/hooks/useAnalytics";
import { useSessionStore } from "@/lib/store/session";
import { FilterOption } from "@/lib/api/services/analyticsService";
import { Loader2 } from "lucide-react";

export default function UserDashboard() {
  const { entity } = useSessionStore();
  const [filters, setFilters] = useState({
    monthlyFilter: "THIS_YEAR" as FilterOption,
    cashFlowFilter: "LAST_12_MONTHS" as FilterOption,
    expensesFilter: "THIS_YEAR" as FilterOption,
  });

  const { data, isLoading, error } = useDashboardData(filters);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Failed to load dashboard</p>
          <p className="text-gray-600">{error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <DashboardHeader entity={entity} filters={filters} onFiltersChange={setFilters} />

      <StatsGrid data={data?.kpis} loading={isLoading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueExpensesChart
          data={data?.monthlyBreakdown}
          filter={filters.monthlyFilter}
          onFilterChange={(filter) => setFilters((prev) => ({ ...prev, monthlyFilter: filter }))}
          loading={isLoading}
        />
        <CashFlow
          data={data?.cashFlow}
          filter={filters.cashFlowFilter}
          onFilterChange={(filter) => setFilters((prev) => ({ ...prev, cashFlowFilter: filter }))}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        <TopExpenses
          data={data?.topExpenses}
          filter={filters.expensesFilter}
          onFilterChange={(filter) => setFilters((prev) => ({ ...prev, expensesFilter: filter }))}
          loading={isLoading}
        />
        <RecentTransactions data={data?.recentTransactions} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AccountsReceivableAging data={data?.receivableAging} loading={isLoading} />
        <AccountsPayableAging data={data?.payableAging} loading={isLoading} />
      </div>
    </div>
  );
}