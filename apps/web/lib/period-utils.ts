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

export type ReportPeriodType = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual";

export const REPORT_PERIOD_TYPES: { value: ReportPeriodType; label: string }[] = [
  { value: "Daily",     label: "Daily" },
  { value: "Weekly",    label: "Weekly" },
  { value: "Monthly",   label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
  { value: "Annual",    label: "Annual" },
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

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isoWeekToDates(week: string, year: number): { startDate: string; endDate: string } {
  const weekNum = parseInt(week.slice(1), 10);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - (jan4Day - 1) + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: dateStr(monday), endDate: dateStr(sunday) };
}

/** Returns all ISO weeks in a given year as selectable options. */
export function getISOWeeks(year: number): { value: string; label: string }[] {
  const weeks: { value: string; label: string }[] = [];
  for (let w = 1; w <= 53; w++) {
    const key = `W${String(w).padStart(2, "0")}`;
    const { startDate, endDate } = isoWeekToDates(key, year);
    if (new Date(startDate).getFullYear() > year) break;
    weeks.push({ value: key, label: `Week ${w}  (${startDate.slice(5)} – ${endDate.slice(5)})` });
  }
  return weeks;
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
  if (periodType === "Daily") {
    return { startDate: period, endDate: period };
  }
  if (periodType === "Weekly") {
    return isoWeekToDates(period, year);
  }
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
  if (periodType === "Daily") {
    return `As of ${period}`;
  }
  if (periodType === "Weekly") {
    const { startDate, endDate } = isoWeekToDates(period, year);
    return `For the Week ${startDate} – ${endDate}`;
  }
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
  if (periodType === "Daily") return period;
  if (periodType === "Weekly") return `${period} ${year}`;
  if (periodType === "Annual") return `FY ${year}`;
  return `${period} ${year}`;
}

/** Step N periods back from (periodType, period, year). */
export function stepPeriodBack(
  periodType: ReportPeriodType,
  period: string,
  year: number,
  steps: number,
): { period: string; year: number } {
  if (periodType === "Quarterly") {
    const quarters = ["Q1", "Q2", "Q3", "Q4"];
    let idx = quarters.indexOf(period);
    let y = year;
    for (let i = 0; i < steps; i++) {
      idx--;
      if (idx < 0) { idx = 3; y--; }
    }
    return { period: quarters[idx], year: y };
  }
  if (periodType === "Monthly") {
    let idx = MONTHS.indexOf(period);
    let y = year;
    for (let i = 0; i < steps; i++) {
      idx--;
      if (idx < 0) { idx = 11; y--; }
    }
    return { period: MONTHS[idx], year: y };
  }
  if (periodType === "Annual") {
    return { period: "", year: year - steps };
  }
  if (periodType === "Daily") {
    const d = new Date(period);
    d.setDate(d.getDate() - steps);
    return { period: dateStr(d), year: d.getFullYear() };
  }
  // Weekly
  const weekNum = parseInt(period.slice(1), 10) - steps;
  if (weekNum > 0) return { period: `W${String(weekNum).padStart(2, "0")}`, year };
  const wrapped = 52 + weekNum;
  return { period: `W${String(Math.max(wrapped, 1)).padStart(2, "0")}`, year: year - 1 };
}

/** Short label for trend chart X-axis (e.g. "Q3", "Jul", "2024", "W28"). */
export function getPeriodShortLabel(
  periodType: ReportPeriodType,
  period: string,
  year: number,
): string {
  if (periodType === "Annual") return String(year);
  if (periodType === "Monthly") return period.slice(0, 3);
  if (periodType === "Daily") return period.slice(5); // MM-DD
  return period; // Quarterly "Q3" or Weekly "W28"
}

export function defaultPeriodValue(periodType: ReportPeriodType): string {
  const now = new Date();
  if (periodType === "Daily") return dateStr(now);
  if (periodType === "Weekly") return `W${String(getISOWeekNumber(now)).padStart(2, "0")}`;
  if (periodType === "Monthly") return MONTHS[now.getMonth()];
  if (periodType === "Quarterly") return QUARTERS[Math.floor(now.getMonth() / 3)].value;
  return "";
}
