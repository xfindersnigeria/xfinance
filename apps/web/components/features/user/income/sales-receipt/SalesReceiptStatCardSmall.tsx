"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SalesReceiptStatCardSmall({
  title,
  value,
  subtitle,
  icon,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0 relative p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
      <CardContent className="p-0 mt-3">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="text-xl font-bold text-indigo-700">{value}</div>
            {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
