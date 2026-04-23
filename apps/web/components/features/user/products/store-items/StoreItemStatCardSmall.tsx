"use client";


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This component now renders the four static cards as shown in the provided UI image
export default function StoreItemStatCardSmall({
  title,
  value,
  subtitle
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-xl shadow-sm gap-0">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
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
