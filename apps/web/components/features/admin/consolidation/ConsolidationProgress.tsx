"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Clock } from "lucide-react";

interface ProgressItem {
  title: string;
  percentage: number;
  isComplete: boolean;
}

const progressItems: ProgressItem[] = [
  { title: "Data Collection", percentage: 100, isComplete: true },
  { title: "Intercompany Matching", percentage: 100, isComplete: true },
  { title: "FX Translation", percentage: 100, isComplete: true },
  { title: "Eliminations", percentage: 75, isComplete: false },
  { title: "Final Review", percentage: 0, isComplete: false },
];

export default function ConsolidationProgress() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Consolidation Progress</CardTitle>
        <CardDescription>October 2025 - Period 10</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {progressItems.map((item, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="flex items-center gap-2 min-w-fit">
                {item.isComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : item.percentage > 0 ? (
                  <Clock className="h-5 w-5 text-primary" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
                <span className="text-sm font-medium w-32">{item.title}</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.isComplete ? "bg-green-500" : "bg-primary"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-muted-foreground w-12 text-right">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
