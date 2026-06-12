"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const actions = [
  {
    title: "Run Consolidation",
    description: "Process current period",
    icon: "⚙️",
  },
  {
    title: "Review Eliminations",
    description: "Intercompany adjustments",
    icon: "🔀",
  },
  {
    title: "Generate Group Reports",
    description: "P&L, Balance Sheet, Cash Flow",
    icon: "📊",
  },
  {
    title: "Update FX Rates",
    description: "Refresh exchange rates",
    icon: "💱",
  },
];

export default function QuickActionsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common workflows</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-between h-auto py-3 px-4"
            >
              <div className="flex items-start gap-3 text-left">
                <span className="text-lg pt-0.5">{action.icon}</span>
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
