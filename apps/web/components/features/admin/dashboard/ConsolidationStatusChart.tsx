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
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";

const chartData = [
  { name: "Completed", value: 12, fill: "var(--chart-5)" },
  { name: "In Progress", value: 3, fill: "var(--chart-1)" },
  { name: "Pending", value: 1, fill: "var(--chart-4)" },
];

const chartConfig = {
  completed: {
    label: "Completed",
    color: "var(--chart-5)",
  },
  inProgress: {
    label: "In Progress",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export default function ConsolidationStatusChart() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Consolidation Status</CardTitle>
        <CardDescription>Current period progress</CardDescription>
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
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="text-sm font-medium">Completed</span>
            </div>
            <p className="mt-1 text-2xl font-bold">12</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--chart-1)" }} />
              <span className="text-sm font-medium">In Progress</span>
            </div>
            <p className="mt-1 text-2xl font-bold">3</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "var(--chart-4)" }} />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <p className="mt-1 text-2xl font-bold">1</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
