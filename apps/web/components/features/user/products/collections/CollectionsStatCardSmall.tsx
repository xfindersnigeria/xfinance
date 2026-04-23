"use client";


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This component now renders the four static cards as shown in the provided UI image
export default function CollectionsStatCardSmall({
  title,
  value,
  subtitle
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <Card className="bg-white rounded-2xl shadow-sm border p-3 min-w-55 flex flex-col justify-between gap-0" style={{ minHeight: 100 }}>
      <CardHeader className="p-0 mb-2 border-0">
      <CardTitle className="text-gray-500 text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col justify-between">
      <div className="text-3xl font-bold text-blue-800 mb-1">{value}</div>
      {subtitle && (
        <div className="text-gray-400 text-sm font-normal">{subtitle}</div>
      )}
      </CardContent>
    </Card>
  );
}
