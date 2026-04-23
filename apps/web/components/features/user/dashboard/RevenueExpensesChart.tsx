"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Legend } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type ChartConfig,
} from "@/components/ui/chart";
import { MonthlyBreakdown, FilterOption } from "@/lib/api/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";

interface RevenueExpensesChartProps {
  data?: MonthlyBreakdown[];
  filter?: FilterOption;
  onFilterChange?: (filter: FilterOption) => void;
  loading?: boolean;
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--revenue)",
  },
  expenses: {
    label: "Expenses",
    color: "var(--expense)",
  },
} satisfies ChartConfig;

export function RevenueExpensesChart({
  data,
  filter = "THIS_YEAR",
  onFilterChange,
  loading,
}: RevenueExpensesChartProps) {
  const chartData = data?.map((item) => ({
    month: item.month,
    revenue: item.revenue,
    expenses: item.expenses,
  })) ?? [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Expenses</CardTitle>
          <CardDescription>Monthly breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Revenue & Expenses</CardTitle>
          <CardDescription>Monthly breakdown</CardDescription>
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
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Legend />
            <Bar dataKey="revenue" fill="var(--revenue)" radius={4} name="Revenue" />
            <Bar dataKey="expenses" fill="var(--expense)" radius={4} name="Expenses" />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
