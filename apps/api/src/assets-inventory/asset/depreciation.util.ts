/**
 * Fixed-asset depreciation maths — pure functions, no DB access.
 *
 * Convention (agreed with the business):
 *  - Straight-line on cost at the asset category's annual rate.
 *  - Full year's charge in the fiscal year of purchase, regardless of the
 *    purchase date within that year.
 *  - Accumulated depreciation never exceeds cost.
 *  - The schedule always shows the full charge for the fiscal year containing
 *    "today" (not year-to-date).
 *
 * All dates are handled in UTC, matching how purchase dates are stored
 * (the frontend sends `new Date('YYYY-MM-DD').toISOString()`).
 */

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

export interface YearEnd {
  month: number; // 1-12
  day: number; // 1-31
}

export interface FiscalYear {
  start: Date; // inclusive, 00:00 UTC
  end: Date; // inclusive, 00:00 UTC of the last day
}

const DEFAULT_YEAR_END: YearEnd = { month: 12, day: 31 };

/**
 * `Entity.yearEnd` is a free string saved in two shapes: the API documents
 * "MM-DD" ("12-31") while the settings UIs save labels ("December 31").
 * Accepts both (plus "Dec 31"); anything unparseable falls back to Dec 31.
 */
export function parseYearEnd(raw?: string | null): YearEnd {
  if (!raw) return DEFAULT_YEAR_END;
  const value = raw.trim().toLowerCase();

  const numeric = value.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (numeric) {
    const month = Number(numeric[1]);
    const day = Number(numeric[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
    return DEFAULT_YEAR_END;
  }

  const label = value.match(/^([a-z]+)\.?\s+(\d{1,2})$/);
  if (label) {
    const month = MONTHS.findIndex((m) => m.startsWith(label[1].slice(0, 3))) + 1;
    const day = Number(label[2]);
    if (month >= 1 && day >= 1 && day <= 31) return { month, day };
  }

  return DEFAULT_YEAR_END;
}

function utcDate(year: number, month: number, day: number): Date {
  // Clamp to the month's length so e.g. "February 29" works in non-leap years
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 1, Math.min(day, daysInMonth)));
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** The fiscal year that contains `date`. */
export function fiscalYearFor(date: Date, yearEnd: YearEnd): FiscalYear {
  const day = startOfUtcDay(date);
  let end = utcDate(day.getUTCFullYear(), yearEnd.month, yearEnd.day);
  if (day > end) end = utcDate(day.getUTCFullYear() + 1, yearEnd.month, yearEnd.day);
  const previousEnd = utcDate(end.getUTCFullYear() - 1, yearEnd.month, yearEnd.day);
  return { start: addUtcDays(previousEnd, 1), end };
}

/**
 * Number of whole fiscal years from the one containing `from` up to (not
 * including) the one containing `to`. Fiscal years are labelled by the
 * calendar year they end in, so this is a difference of end-years.
 */
export function fiscalYearsBetween(from: Date, to: Date, yearEnd: YearEnd): number {
  const a = fiscalYearFor(from, yearEnd).end.getUTCFullYear();
  const b = fiscalYearFor(to, yearEnd).end.getUTCFullYear();
  return Math.max(0, b - a);
}

export function annualCharge(cost: number, ratePercent: number): number {
  return Math.round((cost * ratePercent) / 100);
}

export interface DepreciableAsset {
  purchaseCost: number;
  purchaseDate: Date;
  /** Category annual rate in percent; null when the asset has no category. */
  ratePercent: number | null;
  /**
   * Accumulated depreciation carried over from the client's previous books,
   * as at the start of the fiscal year containing `openingAccumAsOf`.
   */
  openingAccumulatedDepreciation?: number | null;
  openingAccumAsOf?: Date | null;
}

export interface AssetDepreciation {
  /** true when the asset was bought on/after the fiscal year start */
  isAddition: boolean;
  /** Accumulated depreciation at the start of the fiscal year */
  openingAccum: number;
  /** Charge for the fiscal year */
  chargeForYear: number;
  /** openingAccum + chargeForYear */
  totalAccum: number;
  /** cost − totalAccum */
  netBookValue: number;
  fullyDepreciated: boolean;
}

/**
 * Depreciation position of one asset for fiscal year `fy`.
 * Returns null for assets bought after the fiscal year ends — they are not
 * part of this year's schedule.
 */
export function depreciateForYear(
  asset: DepreciableAsset,
  fy: FiscalYear,
  yearEnd: YearEnd,
): AssetDepreciation | null {
  const purchaseDay = startOfUtcDay(asset.purchaseDate);
  if (purchaseDay > fy.end) return null;

  const cost = asset.purchaseCost;
  const rate = asset.ratePercent ?? 0;
  const annual = annualCharge(cost, rate);
  const isAddition = purchaseDay >= fy.start;

  let openingAccum = 0;
  if (!isAddition) {
    const override = asset.openingAccumulatedDepreciation;
    if (override != null && asset.openingAccumAsOf) {
      // Carried-over figure, plus a full charge for every fiscal year since
      const years = fiscalYearsBetween(asset.openingAccumAsOf, fy.start, yearEnd);
      openingAccum = override + annual * years;
    } else {
      // Full charge for each fiscal year from the purchase year up to this one
      openingAccum = annual * fiscalYearsBetween(purchaseDay, fy.start, yearEnd);
    }
  }
  openingAccum = Math.min(Math.max(openingAccum, 0), cost);

  const chargeForYear = Math.min(annual, cost - openingAccum);
  const totalAccum = openingAccum + chargeForYear;

  return {
    isAddition,
    openingAccum,
    chargeForYear,
    totalAccum,
    netBookValue: cost - totalAccum,
    fullyDepreciated: cost > 0 && totalAccum >= cost,
  };
}
