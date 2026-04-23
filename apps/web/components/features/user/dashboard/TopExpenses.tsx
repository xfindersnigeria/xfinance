"use client";

import { Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopExpense, FilterOption } from "@/lib/api/services/analyticsService";
import { Skeleton } from "@/components/ui/skeleton";

interface TopExpensesProps {
  data?: TopExpense[];
  filter?: FilterOption;
  onFilterChange?: (filter: FilterOption) => void;
  loading?: boolean;
}

const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--expense)",
  "var(--finance-warning)",
  "var(--profit)",
];

const chartConfig = {
  value: {
    label: "Amount",
  },
} satisfies ChartConfig;

const formatCurrency = (amount: number) => {
  return `₦${amount.toLocaleString()}`;
};

export function TopExpenses({
  data,
  filter = "THIS_YEAR",
  onFilterChange,
  loading,
}: TopExpensesProps) {
  const chartData = data?.map((item, index) => ({
    name: item.category,
    value: item.amount,
    fill: SERIES_COLORS[index % SERIES_COLORS.length],
  })) ?? [];

  if (loading) {
    return (
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Top Expenses</CardTitle>
          <CardDescription>Expense breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Top Expenses</CardTitle>
          <CardDescription>Top expenses by category</CardDescription>
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
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-62.5"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-4 text-sm">
        <div className="w-full space-y-2">
          {chartData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-muted-foreground">{item.name}</span>
              </div>
              <span className="font-medium text-foreground">
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
