"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from "recharts";
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
import { CashFlowData, FilterOption } from "@/lib/api/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";

interface CashFlowProps {
  data?: CashFlowData[];
  filter?: FilterOption;
  onFilterChange?: (filter: FilterOption) => void;
  loading?: boolean;
}

const chartConfig = {
  balance: {
    label: "Cash Balance",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function CashFlow({
  data,
  filter = "THIS_FISCAL_YEAR",
  onFilterChange,
  loading,
}: CashFlowProps) {
  const chartData = data?.map((item) => ({
    month: item.month,
    balance: item.balance,
  })) ?? [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>Running cash balance over time</CardDescription>
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
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>Running cash balance over time</CardDescription>
        </div>
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-45">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="THIS_FISCAL_YEAR">This Fiscal Year</SelectItem>
            <SelectItem value="LAST_FISCAL_YEAR">Last Fiscal Year</SelectItem>
            <SelectItem value="THIS_YEAR">This Calendar Year</SelectItem>
            <SelectItem value="LAST_12_MONTHS">Last 12 Months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart accessibilityLayer data={chartData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis tickLine={false} axisLine={false} />
            <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="balance"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              dot={false}
              name="Cash Balance"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
