"use client";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PayrollRecordsStatCardSmall({
  title,
  value,
  subtitle,
  loading
}: {
  title: any;
  value: any;
  subtitle?: any;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium text-gray-500 flex items-center gap-2">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-16" />
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-primary">{value}</div>
            {subtitle && <div className="text-sm text-gray-400 mt-1">{subtitle}</div>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
