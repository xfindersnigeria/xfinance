"use client";


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This component now renders the four static cards as shown in the provided UI image
export default function InventoryStatCardSmall({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-sm text-muted-foreground font-normal">{title}</CardTitle>
              <div className=" text-gray-400">{icon}</div>
</CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-primary">{value}</div>
        {subtitle && (
          <div className="text-sm text-muted-foreground">{subtitle}</div>
        )}
      </CardContent>
    </Card>
  );
}
