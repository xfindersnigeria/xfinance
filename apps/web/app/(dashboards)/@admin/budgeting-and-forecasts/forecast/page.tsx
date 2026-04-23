'use client';

import React from 'react';
import {
  BudgetingForecastsHeader,
  ForecastsTable,
} from '@/components/features/admin/budgeting';

export default function ForecastPage() {
  return (
    <div className="space-y-6">
      <BudgetingForecastsHeader variant="forecast" />
      <ForecastsTable />
    </div>
  );
}
