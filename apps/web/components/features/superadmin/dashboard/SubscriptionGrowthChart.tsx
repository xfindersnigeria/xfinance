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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { SubscriptionGrowthData } from '@/lib/api/services/analyticsService';

const defaultData = [
  { month: 'Jan', subscriptions: 180 },
  { month: 'Feb', subscriptions: 190 },
  { month: 'Mar', subscriptions: 200 },
  { month: 'Apr', subscriptions: 220 },
  { month: 'May', subscriptions: 240 },
  { month: 'Jun', subscriptions: 255 },
  { month: 'Jul', subscriptions: 265 },
];

const chartConfig = {
  subscriptions: {
    label: 'Subscriptions',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

interface SubscriptionGrowthChartProps {
  data?: SubscriptionGrowthData[];
}

export function SubscriptionGrowthChart({ data }: SubscriptionGrowthChartProps) {
  const chartData = data
    ? data.map((d) => ({ month: d.month, subscriptions: d.count }))
    : defaultData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Growth</CardTitle>
        <CardDescription>Total active subscriptions</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
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
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="subscriptions" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
