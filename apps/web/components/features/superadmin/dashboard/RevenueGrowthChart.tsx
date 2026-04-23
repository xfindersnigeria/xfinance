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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { RevenueGrowthData } from '@/lib/api/services/analyticsService';

const defaultData = [
  { month: 'Jan', revenue: 1.9 },
  { month: 'Feb', revenue: 2.1 },
  { month: 'Mar', revenue: 2.15 },
  { month: 'Apr', revenue: 2.3 },
  { month: 'May', revenue: 2.5 },
  { month: 'Jun', revenue: 2.75 },
  { month: 'Jul', revenue: 2.8 },
];

const chartConfig = {
  revenue: {
    label: 'Revenue (₦M)',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

interface RevenueGrowthChartProps {
  data?: RevenueGrowthData[];
}

export function RevenueGrowthChart({ data }: RevenueGrowthChartProps) {
  const chartData = data
    ? data.map((d) => ({ month: d.month, revenue: d.revenue / 1_000_000 }))
    : defaultData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Growth</CardTitle>
        <CardDescription>Monthly revenue trend</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₦${v}M`}
              width={55}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) =>
                    `₦${typeof value === 'number' ? value.toFixed(2) : value}M`
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-1)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
