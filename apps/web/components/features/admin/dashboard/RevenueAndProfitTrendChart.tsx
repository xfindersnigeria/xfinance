"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterOption, MonthlyBreakdownWithProfit } from "@/lib/api/services/analyticsService";

interface RevenueAndProfitTrendChartProps {
  data?: MonthlyBreakdownWithProfit[];
  filter?: FilterOption;
  onFilterChange?: (filter: FilterOption) => void;
  loading?: boolean;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function RevenueAndProfitTrendChart({
  data,
  filter = "THIS_YEAR",
  onFilterChange,
  loading,
}: RevenueAndProfitTrendChartProps) {
  const chartData = data?.map((item) => ({
    month: item.month,
    revenue: item.revenue,
    profit: item.profit,
  })) ?? [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Profit Trend</CardTitle>
          <CardDescription>Group consolidated monthly trend</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Revenue & Profit Trend</CardTitle>
          <CardDescription>Group consolidated monthly trend</CardDescription>
        </div>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="THIS_YEAR">This Year</SelectItem>
            <SelectItem value="THIS_FISCAL_YEAR">This Fiscal Year</SelectItem>
            <SelectItem value="LAST_FISCAL_YEAR">Last Fiscal Year</SelectItem>
            <SelectItem value="LAST_12_MONTHS">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="revenue"
              type="monotone"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              dataKey="profit"
              type="monotone"
              stroke="var(--chart-2)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
