"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { EntityPerformance } from "@/lib/api/services/analyticsService";

interface EntityPerformanceChartProps {
  data?: EntityPerformance[];
  loading?: boolean;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-3)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function EntityPerformanceChart({ data, loading }: EntityPerformanceChartProps) {
  const chartData = data?.map((item) => ({
    entity: item.entityName,
    revenue: item.revenue,
    expenses: item.expenses ?? 0,
  })) ?? [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Entity Performance</CardTitle>
          <CardDescription>Revenue vs expenses by entity</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity Performance</CardTitle>
        <CardDescription>Revenue vs expenses by entity</CardDescription>
      </CardHeader>
      <CardContent className="p-2">
        <ChartContainer  config={chartConfig}>
          <BarChart accessibilityLayer data={chartData} barCategoryGap="30%">
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="entity"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={100}
              interval={0}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="revenue" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
