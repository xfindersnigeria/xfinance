"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminDashboardHeaderProps {
  filter: string;
  onFilterChange: (value: string) => void;
}

function getLast12MonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const label = d.toLocaleString("default", { month: "short", year: "numeric" });
    options.push({ value: `MONTH_${year}_${month}`, label });
  }
  return options;
}

export default function AdminDashboardHeader({ filter, onFilterChange }: AdminDashboardHeaderProps) {
  const monthOptions = getLast12MonthOptions();

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary">Group Overview</h1>
        <p className="text-muted-foreground">
          Consolidated financial performance across all entities
        </p>
      </div>
      <Select value={filter} onValueChange={onFilterChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Preset Ranges</SelectLabel>
            <SelectItem value="THIS_MONTH">This Month</SelectItem>
            <SelectItem value="THIS_YEAR">This Year</SelectItem>
            <SelectItem value="THIS_FISCAL_YEAR">This Fiscal Year</SelectItem>
            <SelectItem value="LAST_FISCAL_YEAR">Last Fiscal Year</SelectItem>
            <SelectItem value="LAST_12_MONTHS">Last 12 Months</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Calendar Months</SelectLabel>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
