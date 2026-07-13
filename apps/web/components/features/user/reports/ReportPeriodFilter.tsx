"use client";
import React from "react";
import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MONTHS,
  QUARTERS,
  REPORT_PERIOD_TYPES,
  ReportPeriodType,
  getFiscalYears,
  getISOWeeks,
} from "@/lib/period-utils";

interface ReportPeriodFilterProps {
  periodType: ReportPeriodType;
  period: string;
  year: number;
  onPeriodTypeChange: (t: ReportPeriodType) => void;
  onPeriodChange: (p: string) => void;
  onYearChange: (y: number) => void;
}

const FISCAL_YEARS = getFiscalYears();

export function ReportPeriodFilter({
  periodType,
  period,
  year,
  onPeriodTypeChange,
  onPeriodChange,
  onYearChange,
}: ReportPeriodFilterProps) {
  const isoWeeks = periodType === "Weekly" ? getISOWeeks(year) : [];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-gray-500" />
        <Select
          value={periodType}
          onValueChange={(v) => onPeriodTypeChange(v as ReportPeriodType)}
        >
          <SelectTrigger className="w-32 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_PERIOD_TYPES.map((pt) => (
              <SelectItem key={pt.value} value={pt.value}>
                {pt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {periodType === "Daily" && (
        <input
          type="date"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="h-9 text-sm bg-gray-100 border-0 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      )}

      {periodType === "Weekly" && (
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-52 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {isoWeeks.map((w) => (
              <SelectItem key={w.value} value={w.value}>
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "Monthly" && (
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType === "Quarterly" && (
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-36 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {QUARTERS.map((q) => (
              <SelectItem key={q.value} value={q.value}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {periodType !== "Daily" && (
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="w-24 h-9 text-sm bg-gray-100 border-0 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FISCAL_YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
