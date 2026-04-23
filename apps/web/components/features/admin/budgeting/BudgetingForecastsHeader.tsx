'use client';

import React from 'react';
import { Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface BudgetingForecastsHeaderProps {
  /** Controls which action button is shown. Defaults to 'budget'. */
  variant?: 'budget' | 'forecast';
}

export function BudgetingForecastsHeader({ variant = 'budget' }: BudgetingForecastsHeaderProps) {
  const router = useRouter();

  const isBudget = variant === 'budget';
  const actionLabel = isBudget ? 'New Budget' : 'Create Forecast';
  const actionRoute = isBudget
    ? '/budgeting-and-forecasts/budget-overview/new'
    : '/budgeting-and-forecasts/forecast/new';

  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Budgeting &amp; Forecasts</h1>
        <p className="text-sm text-muted-foreground">
          Group-wide budget planning and financial forecasting
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => toast.info('Export coming soon')}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => router.push(actionRoute)}
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
