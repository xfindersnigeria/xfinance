"use client";
import React from "react";
import { ReportPeriodFilter } from "@/components/features/user/reports/ReportPeriodFilter";
import { ToggleChip } from "../shared";
import type { useEntityComparisonReport } from "./comparison-utils";

/** Period filter + "compare with previous period" toggle shared by the entity-comparison reports */
export function ComparisonControls({ r }: { r: ReturnType<typeof useEntityComparisonReport> }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ReportPeriodFilter
        periodType={r.periodType}
        period={r.period}
        year={r.year}
        onPeriodTypeChange={r.handlePeriodTypeChange}
        onPeriodChange={r.setPeriod}
        onYearChange={r.setYear}
      />
      <ToggleChip active={r.showComparison} onClick={() => r.setShowComparison((v) => !v)}>
        Compare with {r.comparisonLabel}
      </ToggleChip>
    </div>
  );
}
