"use client";

import { Button } from "@/components/ui/button";

export default function AdminDashboardHeader() {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary">Group Overview</h1>
        <p className="text-muted-foreground">
          Consolidated financial performance across all entities
        </p>
      </div>
    </div>
  );
}
