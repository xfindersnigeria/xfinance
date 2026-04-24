"use client";

import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { useProjectAnalysis } from "@/lib/api/hooks/useProjects";
import { useEntityCurrencySymbol } from "@/lib/api/hooks/useCurrencyFormat";

interface ProjectAnalysisProps {
  projectId: string;
}

export default function ProjectAnalysis({ projectId }: ProjectAnalysisProps) {
  const sym = useEntityCurrencySymbol();
  const { data, isLoading } = useProjectAnalysis(projectId);

  function fmt(n: number): string {
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (abs >= 1_000) return `${sym}${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return `${sym}${n}`;
  }

  const actualRevenue: number = (data as any)?.actualRevenue ?? 0;
  const budgetedRevenue: number = (data as any)?.budgetedRevenue ?? 0;
  const actualCost: number = (data as any)?.actualCost ?? 0;
  const budgetedCost: number = (data as any)?.budgetedCost ?? 0;
  const actualProfit: number = (data as any)?.actualProfit ?? 0;
  const budgetProfit: number = (data as any)?.budgetProfit ?? 0;
  const progress: number = (data as any)?.progress ?? 0;
  const costVariance: number = (data as any)?.costVariance ?? 0;
  const costVariancePct: number = (data as any)?.costVariancePercent ?? 0;
  const cpi: number = (data as any)?.costPerformanceIndex ?? 0;
  const projectedRevenue: number = (data as any)?.projectedRevenue ?? 0;
  const projectedCost: number = (data as any)?.projectedCost ?? 0;
  const projectedProfit: number = (data as any)?.projectedProfit ?? 0;
  const projectedMargin: number = (data as any)?.projectedMargin ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pieData = [
    { name: `Costs: ${fmt(actualCost)}`, value: Math.max(actualCost, 0) },
    { name: `Profit: ${fmt(actualProfit)}`, value: Math.max(actualProfit, 0) },
  ];
  const PIE_COLORS = ["var(--expense)", "var(--revenue)"];

  const bars = [
    {
      label: "Revenue",
      projected: projectedRevenue,
      budget: budgetedRevenue,
      color: projectedRevenue >= budgetedRevenue ? "var(--revenue)" : "var(--expense)",
    },
    {
      label: "Costs",
      projected: projectedCost,
      budget: budgetedCost,
      color: projectedCost > budgetedCost ? "var(--expense)" : "var(--revenue)",
    },
    {
      label: "Profit",
      projected: projectedProfit,
      budget: budgetProfit,
      color: projectedProfit >= budgetProfit ? "var(--revenue)" : "var(--expense)",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cost Variance Analysis */}
      <div className="bg-card rounded-2xl border p-5">
        <h3 className="text-sm font-medium text-foreground mb-5">Cost Variance Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Cost Variance</p>
            <p className={`text-2xl font-bold ${costVariance >= 0 ? "text-revenue" : "text-expense"}`}>
              {costVariance >= 0 ? "+" : ""}{fmt(costVariance)}
            </p>
            <p className={`text-sm mt-1 ${costVariancePct <= 0 ? "text-revenue" : "text-expense"}`}>
              {costVariancePct >= 0 ? "+" : ""}{costVariancePct.toFixed(1)}%
            </p>
          </div>

          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Schedule Performance</p>
            <p className="text-2xl font-bold text-primary">{progress}%</p>
            <p className="text-sm text-muted-foreground mt-1">Milestone completion</p>
          </div>

          <div className="bg-muted rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Cost Performance Index</p>
            <p className={`text-2xl font-bold ${cpi >= 1 ? "text-revenue" : "text-expense"}`}>
              {cpi.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {cpi >= 1 ? "Under budget" : cpi === 0 ? "No cost data" : "Over budget"}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Profit Breakdown pie */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="text-sm font-medium text-foreground mb-4">Profit Breakdown</h3>
          {actualRevenue === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No revenue data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={110}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  label={({ name, cx, x, y }) => (
                    <text
                      x={x}
                      y={y}
                      fill={name.startsWith("Profit") ? "var(--revenue)" : "var(--expense)"}
                      fontSize={12}
                      textAnchor={x > cx ? "start" : "end"}
                      dominantBaseline="central"
                    >
                      {name}
                    </text>
                  )}
                  labelLine
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    fontSize: "12px",
                    backgroundColor: "var(--background)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Projected vs Budget */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="text-sm font-medium text-foreground mb-6">Projected vs Budget</h3>
          {progress === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Projections available once progress is recorded
            </p>
          ) : (
            <div className="space-y-5">
              {bars.map(({ label, projected, budget, color }) => {
                const pct = budget > 0 ? Math.min((Math.abs(projected) / Math.abs(budget)) * 100, 100) : 0;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {fmt(projected)} / {fmt(budget)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Projected Margin</span>
            <span className={`text-sm font-bold ${projectedMargin >= 0 ? "text-revenue" : "text-expense"}`}>
              {projectedMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
