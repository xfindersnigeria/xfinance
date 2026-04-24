'use client';

import React from 'react';
import { CustomTabs, Tab } from '@/components/local/custom/tabs';
import { CustomTable, Column } from '@/components/local/custom/custom-table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGroupCurrencySymbol, fmtAmountCompact } from '@/lib/api/hooks/useCurrencyFormat';

// Budget Overview Data
interface BudgetOverviewRow {
  id: string;
  entity: string;
  budgeted: string;
  actual: string;
  variance: string;
  variancePercent: string;
  status: string;
}


// Forecasts Data
interface ForecastsRow {
  id: string;
  period: string;
  revenue: string;
  expenses: string;
  netProfit: string;
  marginPercent: string;
  confidence: string;
}


// Department Budgets Data
interface DepartmentBudget {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
  percentage: number;
  remaining: number;
}

const departmentBudgetsData: DepartmentBudget[] = [
  {
    id: '1',
    name: 'Sales & Marketing',
    budgeted: 2000000,
    actual: 1750000,
    percentage: 87.5,
    remaining: 250000,
  },
  {
    id: '2',
    name: 'Operations',
    budgeted: 3200000,
    actual: 3040000,
    percentage: 95.0,
    remaining: 160000,
  },
  {
    id: '3',
    name: 'Technology',
    budgeted: 1800000,
    actual: 1650600,
    percentage: 91.7,
    remaining: 149400,
  },
  {
    id: '4',
    name: 'Administration',
    budgeted: 1400000,
    actual: 1260000,
    percentage: 90.0,
    remaining: 140000,
  },
];

// Budget Overview Table
function BudgetOverviewTable() {
  const sym = useGroupCurrencySymbol();

  const budgetOverviewData: BudgetOverviewRow[] = [
    {
      id: '1',
      entity: 'Hunslow Inc US',
      budgeted: `${sym}6,200,000`,
      actual: `${sym}6,100,000`,
      variance: `${sym}100,000`,
      variancePercent: '+1.6%',
      status: 'On Track',
    },
    {
      id: '2',
      entity: 'Hunslow Ltd UK',
      budgeted: `${sym}3,800,000`,
      actual: `${sym}4,050,000`,
      variance: `-${sym}250,000`,
      variancePercent: '-6.6%',
      status: 'Attention',
    },
    {
      id: '3',
      entity: 'Hunslow GmbH DE',
      budgeted: `${sym}1,400,000`,
      actual: `${sym}1,070,000`,
      variance: `${sym}330,000`,
      variancePercent: '+23.6%',
      status: 'On Track',
    },
  ];

  const columns: Column<BudgetOverviewRow>[] = [
    {
      key: 'entity',
      title: 'ENTITY',
      className: 'text-sm font-medium',
    },
    {
      key: 'budgeted',
      title: 'BUDGETED',
      className: 'text-sm',
    },
    {
      key: 'actual',
      title: 'ACTUAL',
      className: 'text-sm',
    },
    {
      key: 'variance',
      title: 'VARIANCE',
      className: 'text-sm',
      render: (value: string) => {
        const isNegative = value.startsWith('-');
        return (
          <span className={isNegative ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'variancePercent',
      title: 'VARIANCE %',
      className: 'text-sm',
      render: (value: string) => {
        const isNegative = value.startsWith('-');
        return (
          <span className={isNegative ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: 'STATUS',
      className: 'text-sm',
      render: (value: string) => {
        let variant: 'default' | 'secondary' | 'outline' = 'default';
        let color = 'bg-green-100 text-green-800';
        
        if (value === 'Attention') {
          color = 'bg-yellow-100 text-yellow-800';
        }
        
        return <Badge className={`${color} text-xs font-medium`}>{value}</Badge>;
      },
    },
  ];

  return <CustomTable columns={columns} data={budgetOverviewData} tableTitle="Budget vs Actual by Entity" pageSize={10} display={{ searchComponent: false, filterComponent: false, statusComponent: true }} />;
}

// Forecasts Table
function ForecastsTable() {
  const sym = useGroupCurrencySymbol();

  const forecastsData: ForecastsRow[] = [
    {
      id: '1',
      period: 'Q4 2025',
      revenue: fmtAmountCompact(12400000, sym),
      expenses: fmtAmountCompact(9200000, sym),
      netProfit: fmtAmountCompact(3200000, sym),
      marginPercent: '25.8%',
      confidence: 'High',
    },
    {
      id: '2',
      period: 'Q1 2026',
      revenue: fmtAmountCompact(13500000, sym),
      expenses: fmtAmountCompact(10000000, sym),
      netProfit: fmtAmountCompact(3500000, sym),
      marginPercent: '25.9%',
      confidence: 'High',
    },
    {
      id: '3',
      period: 'Q2 2026',
      revenue: fmtAmountCompact(14200000, sym),
      expenses: fmtAmountCompact(10500000, sym),
      netProfit: fmtAmountCompact(3700000, sym),
      marginPercent: '26.1%',
      confidence: 'Medium',
    },
  ];

  const columns: Column<ForecastsRow>[] = [
    {
      key: 'period',
      title: 'PERIOD',
      className: 'text-sm font-medium',
    },
    {
      key: 'revenue',
      title: 'REVENUE',
      className: 'text-sm',
    },
    {
      key: 'expenses',
      title: 'EXPENSES',
      className: 'text-sm',
    },
    {
      key: 'netProfit',
      title: 'NET PROFIT',
      className: 'text-sm font-medium text-green-700',
    },
    {
      key: 'marginPercent',
      title: 'MARGIN %',
      className: 'text-sm',
    },
    {
      key: 'confidence',
      title: 'CONFIDENCE',
      className: 'text-sm',
      render: (value: string) => {
        const color = value === 'High' ? 'bg-green-100 text-green-800' : 'bg-indigo-100 text-indigo-800';
        return <Badge className={`${color} text-xs font-medium`}>{value}</Badge>;
      },
    },
  ];

  return <CustomTable columns={columns} data={forecastsData} tableTitle="Financial Forecasts" tableSubtitle="Projected financial performance based on current trends" pageSize={10} display={{ searchComponent: false, filterComponent: false }} />;
}

// Department Budgets Cards
function DepartmentBudgetsCards() {
  const sym = useGroupCurrencySymbol();

  return (
    <div className="space-y-4 bg-white p-4 rounded-lg shadow-lg">
      <h2 className="text-base font-semibold text-gray-900">Department Budget</h2>
      {departmentBudgetsData.map((dept) => {
        const getProgressColor = (percentage: number) => {
          if (percentage >= 95) return 'bg-red-500';
          if (percentage >= 90) return 'bg-orange-500';
          return 'bg-primary';
        };

        return (
          <Card key={dept.id} className="shadow-none  border border-gray-200 p-4">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{dept.name}</p>
                  <p className="text-sm text-gray-600">
                    {fmtAmountCompact(dept.actual, sym)} / {fmtAmountCompact(dept.budgeted, sym)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{dept.percentage}%</p>
                  <p className="text-xs text-gray-500">
                    {fmtAmountCompact(dept.remaining, sym)} remaining
                  </p>
                </div>
              </div>
              <div className="w-full">
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full transition-all duration-300 ${getProgressColor(dept.percentage)}`}
                    style={{ width: `${dept.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export function BudgetingForecastsContent() {
  const tabs: Tab[] = [
    {
      title: 'Budget Overview',
      value: 'budget-overview',
      content: <BudgetOverviewTable />,
    },
    {
      title: 'Forecasts',
      value: 'forecasts',
      content: <ForecastsTable />,
    },
    {
      title: 'Department Budgets',
      value: 'department-budgets',
      content: <DepartmentBudgetsCards />,
    },
  ];

  return <CustomTabs tabs={tabs} storageKey="budgeting-forecasts-tab" />;
}
