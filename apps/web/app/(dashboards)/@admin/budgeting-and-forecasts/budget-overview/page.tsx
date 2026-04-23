'use client';

import React from 'react';
import {
  BudgetingForecastsHeader,
  BudgetOverviewTable,
} from '@/components/features/admin/budgeting';

export default function BudgetOverviewPage() {
  return (
    <div className="space-y-6">
      <BudgetingForecastsHeader variant="budget" />
      <BudgetOverviewTable />
    </div>
  );
}
