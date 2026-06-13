export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const QUARTERS = [
  { value: "Q1", label: "Q1 (Jan–Mar)" },
  { value: "Q2", label: "Q2 (Apr–Jun)" },
  { value: "Q3", label: "Q3 (Jul–Sep)" },
  { value: "Q4", label: "Q4 (Oct–Dec)" },
];

export type ReportPeriodType = "Monthly" | "Quarterly" | "Annual";

export const REPORT_PERIOD_TYPES: { value: ReportPeriodType; label: string }[] = [
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Annual", label: "Annual" },
];

/** Returns [currentYear - 2 … currentYear + 2] as numbers. */
export function getFiscalYears(): number[] {
  const current = new Date().getFullYear();
  return [current - 2, current - 1, current, current + 1, current + 2];
}

/** Returns "FY YYYY" strings centered on the current year. */
export function getFiscalYearLabels(): string[] {
  return getFiscalYears().map((y) => `FY ${y}`);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

const QUARTER_BOUNDS: Record<string, { sm: number; sd: number; em: number; ed: number }> = {
  Q1: { sm: 1, sd: 1, em: 3, ed: 31 },
  Q2: { sm: 4, sd: 1, em: 6, ed: 30 },
  Q3: { sm: 7, sd: 1, em: 9, ed: 30 },
  Q4: { sm: 10, sd: 1, em: 12, ed: 31 },
};

const QUARTER_END_LABEL: Record<string, string> = {
  Q1: "March 31",
  Q2: "June 30",
  Q3: "September 30",
  Q4: "December 31",
};

export function periodToDates(
  periodType: ReportPeriodType,
  period: string,
  year: number,
): { startDate: string; endDate: string } {
  if (periodType === "Monthly") {
    const monthIdx = MONTHS.indexOf(period) + 1;
    const lastDay = new Date(year, monthIdx, 0).getDate();
    return {
      startDate: `${year}-${pad(monthIdx)}-01`,
      endDate: `${year}-${pad(monthIdx)}-${pad(lastDay)}`,
    };
  }
  if (periodType === "Quarterly") {
    const b = QUARTER_BOUNDS[period] ?? QUARTER_BOUNDS.Q1;
    return {
      startDate: `${year}-${pad(b.sm)}-${pad(b.sd)}`,
      endDate: `${year}-${pad(b.em)}-${pad(b.ed)}`,
    };
  }
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

export function getPeriodEndLabel(
  periodType: ReportPeriodType,
  period: string,
  year: number,
): string {
  if (periodType === "Monthly") {
    const monthIdx = MONTHS.indexOf(period) + 1;
    const lastDay = new Date(year, monthIdx, 0).getDate();
    return `For the Month Ended ${period} ${lastDay}, ${year}`;
  }
  if (periodType === "Quarterly") {
    return `For the Quarter Ended ${QUARTER_END_LABEL[period] ?? ""}, ${year}`;
  }
  return `For the Year Ended December 31, ${year}`;
}

export function getPeriodDisplayLabel(
  periodType: ReportPeriodType,
  period: string,
  year: number,
): string {
  if (periodType === "Annual") return `FY ${year}`;
  return `${period} ${year}`;
}

export function defaultPeriodValue(periodType: ReportPeriodType): string {
  const now = new Date();
  if (periodType === "Monthly") return MONTHS[now.getMonth()];
  if (periodType === "Quarterly") return QUARTERS[Math.floor(now.getMonth() / 3)].value;
  return "";
}
