"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useProjectOverview } from "@/lib/api/hooks/useProjects";

interface ProjectOverviewProps {
  projectId: string;
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}

export default function ProjectOverview({ projectId }: ProjectOverviewProps) {
  const { data, isLoading } = useProjectOverview(projectId);

  const burnData: any[] = (data as any)?.burnRate ?? [];
  const progress: number = (data as any)?.progress ?? 0;
  const completedMilestoneCount: number = (data as any)?.completedMilestoneCount ?? 0;
  const inProgressMilestoneCount: number = (data as any)?.inProgressMilestoneCount ?? 0;
  const upcomingMilestoneCount: number = (data as any)?.upcomingMilestoneCount ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Monthly Burn Rate */}
      <div className="bg-card rounded-lg border p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Monthly Burn Rate</h3>
        {burnData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No burn rate data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={burnData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip
                formatter={(value: number) => `₦${value.toLocaleString()}`}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "12px",
                  backgroundColor: "var(--background)",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
              />
              <Line
                type="monotone"
                dataKey="budgeted"
                name="Budgeted"
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: "var(--muted-foreground)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="var(--expense)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--expense)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Project Progress */}
      <div className="bg-card rounded-lg border p-5">
        <h3 className="text-sm font-medium text-foreground mb-5">Project Progress</h3>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Overall Completion</span>
            <span className="text-sm font-medium text-foreground">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-revenue/10 p-4 text-center">
            <div className="text-2xl font-bold text-revenue mb-1">{completedMilestoneCount}</div>
            <div className="text-xs text-muted-foreground">Completed Milestones</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">{inProgressMilestoneCount}</div>
            <div className="text-xs text-muted-foreground">In Progress</div>
          </div>
          <div className="rounded-lg bg-muted p-4 text-center">
            <div className="text-2xl font-bold text-foreground mb-1">{upcomingMilestoneCount}</div>
            <div className="text-xs text-muted-foreground">Upcoming</div>
          </div>
        </div>
      </div>
    </div>
  );
}
