"use client";

import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

export const description = "A bar chart";



const chartConfig = {
  amount: {
    label: "Amount",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface ChartData {
  month: string;
  amount: number; // Assuming API returns 'amount' or similar, I'll map to 'desktop' equivalent
}

export function AccountsReceivableAgingChart({ data }: { data?: any }) {
  // Transform object data { "0-30": 100, "31-60": 0 } to array
  const chartData = data
    ? Object.keys(data).map(key => ({
      month: key, // Using 'month' as the XAxis key based on previous config, or rename to 'range'
      amount: data[key] || 0
    }))
    : [
      { month: "0-30 days", amount: 0 },
      { month: "31-60 days", amount: 0 },
      { month: "61-90 days", amount: 0 },
      { month: "90+ days", amount: 0 },
    ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts Receivable Aging</CardTitle>
        <CardDescription>
          Outstanding invoices by age (in thousands)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 ">
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel={false} />}
            />
            <YAxis />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
