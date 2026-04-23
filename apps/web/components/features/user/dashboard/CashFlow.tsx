"use client";

import { Line, LineChart, CartesianGrid, XAxis, Legend } from "recharts";
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
  inflow: {
    label: "Cash Inflow",
    color: "var(--revenue)",
  },
  outflow: {
    label: "Cash Outflow",
    color: "var(--expense)",
  },
} satisfies ChartConfig;

export function CashFlow({
  data,
  filter = "LAST_12_MONTHS",
  onFilterChange,
  loading,
}: CashFlowProps) {
  const chartData = data?.map((item) => ({
    month: item.month,
    inflow: item.inflow,
    outflow: item.outflow,
  })) ?? [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
          <CardDescription>Inflow vs outflow</CardDescription>
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
          <CardDescription>Inflow vs outflow</CardDescription>
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
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dashed" />}
            />
            <Legend />
            <Line
              dataKey="inflow"
              stroke="var(--revenue)"
              strokeWidth={2}
              dot={false}
              name="Inflow"
            />
            <Line
              dataKey="outflow"
              stroke="var(--expense)"
              strokeWidth={2}
              dot={false}
              name="Outflow"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
