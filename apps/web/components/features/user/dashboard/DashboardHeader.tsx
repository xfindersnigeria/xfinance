"use client";

import { Button } from "@/components/ui/button";
import { Entity, EntityImpersonationPayload } from "@/lib/types";
import { FilterOption } from "@/lib/api/services/analyticsService";

interface DashboardHeaderProps {
  entity: EntityImpersonationPayload | null;
  filters?: {
    monthlyFilter: FilterOption;
    cashFlowFilter: FilterOption;
    expensesFilter: FilterOption;
  };
  onFiltersChange?: (filters: {
    monthlyFilter: FilterOption;
    cashFlowFilter: FilterOption;
    expensesFilter: FilterOption;
  }) => void;
}

export default function DashboardHeader({
  entity,
  filters,
  onFiltersChange,
}: DashboardHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary">
          {entity?.entityName || "Entity Name"}
        </h1>
        <p className="text-muted-foreground">
          Entity-level financial overview and operations
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="rounded-full">
          Currency: {"NGN"}
        </Button>
        <Button variant="outline" className="rounded-full">
          FY {new Date().getFullYear()}
        </Button>
      </div>
    </div>
  );
}
