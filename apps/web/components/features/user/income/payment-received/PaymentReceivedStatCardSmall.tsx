"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PaymentReceivedStatCardSmall({
  title,
  value,
  subtitle,
  color = "blue",
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  color?: "blue" | "green" | "orange";
}) {
  const colorMap: Record<string, { bg: string; dot: string }> = {
    blue: { bg: "bg-blue-50", dot: "bg-blue-600" },
    green: { bg: "bg-green-50", dot: "bg-green-600" },
    orange: { bg: "bg-orange-50", dot: "bg-orange-400" },
  };
  const { bg, dot } = colorMap[color] || colorMap.bue;
  return (
    <Card className="rounded-xl shadow-sm gap-0 relative p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
        <div
          className={`rounded-xl flex items-center justify-center w-12 h-12 ${bg}`}
        >
          <span className={`w-6 h-6 rounded-xl ${dot} block`}></span>
        </div>
      </div>
      <CardContent className="p-0 mt-0">
      <div className="text-xl font-medium">{value}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
