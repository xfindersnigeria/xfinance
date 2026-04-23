"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LeaveManagementStatCardSmall({
  title,
  value,
  subtitle,
  loading,
  icon,
}: {
  title: string;
  value: any;
  subtitle?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground">
            {title}
          </CardTitle>
          {icon && <span className="text-gray-400">{icon}</span>}
        </div>
      </CardHeader>
      <CardContent className="">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold text-primary">{value}</div>
            {subtitle && (
              <div className="text-sm text-muted-foreground">{subtitle}</div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
