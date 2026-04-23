"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp } from "lucide-react";
import React from "react";

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  value: string;
  percentage: number;
  isPositive: boolean;
}

export default function StatCard({
  title,
  icon,
  value,
  percentage,
  isPositive,
}: StatCardProps) {
  return (
    <Card className="rounded-2xl shadow-sm gap-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent className="">
        <div className="text-3xl font-bold text-primary">{value}</div>
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {isPositive ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {percentage}% vs last month
        </p>
      </CardContent>
    </Card>
  );
}
