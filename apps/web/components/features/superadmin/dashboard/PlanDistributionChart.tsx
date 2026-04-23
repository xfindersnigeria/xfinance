'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { PlanDistributionData } from '@/lib/api/services/analyticsService';

const defaultData = [
  { name: 'Starter', value: 142 },
  { name: 'Professional', value: 78 },
  { name: 'Enterprise', value: 27 },
];

const PLAN_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)'];

const chartConfig = {
  plans: { label: 'Plans' },
} satisfies ChartConfig;

interface PlanDistributionChartProps {
  data?: PlanDistributionData[];
}

export function PlanDistributionChart({ data }: PlanDistributionChartProps) {
  const chartData = data || defaultData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Distribution</CardTitle>
        <CardDescription>Active subscriptions by plan</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => {
                const item = chartData.find((d) => d.name === value);
                return `${item?.name} ${item?.value}`;
              }}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
