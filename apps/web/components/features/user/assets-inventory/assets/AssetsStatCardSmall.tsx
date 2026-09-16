"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssetsStatCardSmall({
  title,
  value,
  subtitle,
  loading,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold sm:text-3xl">{value}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
