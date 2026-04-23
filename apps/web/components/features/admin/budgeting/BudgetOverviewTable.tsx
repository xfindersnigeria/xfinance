'use client';

import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { CustomTable, Column } from '@/components/local/custom/custom-table';
import { useEntities } from '@/lib/api/hooks/useEntity';

// Dummy variance data per entity slot — replaced when GET budgets API is ready
const DUMMY_SLOTS = [
  { budgeted: 5_400_000, actual: 5_120_000, variance: -280_000, variancePct: -5.2 },
  { budgeted: 3_200_000, actual: 3_450_000, variance: 250_000, variancePct: 7.8 },
  { budgeted: 2_800_000, actual: 2_650_000, variance: -150_000, variancePct: -5.4 },
  { budgeted: 1_900_000, actual: 1_820_000, variance: -80_000, variancePct: -4.2 },
];

const FY_OPTIONS = ['FY 2025', 'FY 2024', 'FY 2023'];

interface BudgetRow {
  id: string;
  entity: string;
  budgeted: number;
  actual: number;
  variance: number;
  variancePct: number;
  status: string;
}

function fmt(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

export function BudgetOverviewTable() {
  const [fy, setFy] = useState('FY 2025');
  const { data: entitiesResponse, isLoading } = useEntities({ limit: 20 });

  const rows: BudgetRow[] = useMemo(() => {
    const entities: any[] = (entitiesResponse as any)?.data ?? [];
    const source = entities.length > 0 ? entities : DUMMY_SLOTS.map((_, i) => ({ id: `dummy-${i}`, name: `Entity ${i + 1}` }));
    return source.slice(0, 4).map((entity, i) => ({
      id: entity.id,
      entity: entity.name,
      ...(DUMMY_SLOTS[i] ?? DUMMY_SLOTS[0]),
      status: 'Attention',
    }));
  }, [entitiesResponse]);

  const columns: Column<BudgetRow>[] = [
    {
      key: 'entity',
      title: 'Entity',
    },
    {
      key: 'budgeted',
      title: 'Budgeted',
      render: (v: number) => <span className="text-sm">{fmt(v)}</span>,
    },
    {
      key: 'actual',
      title: 'Actual',
      render: (v: number) => <span className="text-sm">{fmt(v)}</span>,
    },
    {
      key: 'variance',
      title: 'Variance',
      render: (v: number) => (
        <span className={`text-sm font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {fmt(v)}
        </span>
      ),
    },
    {
      key: 'variancePct',
      title: 'Variance %',
      render: (v: number) => (
        <span className={`text-sm font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {v >= 0 ? '+' : ''}{v.toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (v: string) => (
        <Badge className="bg-amber-100 text-amber-800 text-xs font-medium">{v}</Badge>
      ),
    },
  ];

  const headerActions = (
    <div className="flex items-center gap-2">
      <Select value={fy} onValueChange={setFy}>
        <SelectTrigger className="h-8 text-xs w-28 rounded-2xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FY_OPTIONS.map((f) => (
            <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-2xl">
        <Filter className="w-3.5 h-3.5" />
        Filter
      </Button>
    </div>
  );

  return (
    <CustomTable<BudgetRow>
      columns={columns}
      data={rows}
      tableTitle="Budget vs Actual by Entity"
      loading={isLoading}
      pageSize={10}
      headerActions={headerActions}
      display={{
        searchComponent: false,
        filterComponent: false,
        statusComponent: false,
      }}
    />
  );
}
