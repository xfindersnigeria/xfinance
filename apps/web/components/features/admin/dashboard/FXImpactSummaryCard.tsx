"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Globe } from "lucide-react";

const fxData = [
  { currency: "NGN Base", exposure: "₦12.5M", icon: "🏦" },
  { currency: "GBP Exposure", exposure: "-₦85K", icon: "🇬🇧", isNegative: true },
  { currency: "EUR Exposure", exposure: "-₦65K", icon: "🇪🇺", isNegative: true },
  { currency: "SGD Exposure", exposure: "-₦33K", icon: "🇸🇬", isNegative: true },
];

export default function FXImpactSummaryCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>FX Impact Summary</CardTitle>
            <CardDescription>Currency exposure analysis</CardDescription>
          </div>
          <Globe className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fxData.map((item, index) => (
            <div key={index} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-muted-foreground">
                  {item.currency}
                </span>
              </div>
              <span
                className={`text-sm font-semibold ${
                  item.isNegative ? "text-red-600" : "text-green-600"
                }`}
              >
                {item.exposure}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
