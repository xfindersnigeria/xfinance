import {
  depreciateForYear,
  fiscalYearFor,
  fiscalYearsBetween,
  parseYearEnd,
} from './depreciation.util';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('parseYearEnd', () => {
  it('parses both stored formats and falls back to Dec 31', () => {
    expect(parseYearEnd('December 31')).toEqual({ month: 12, day: 31 });
    expect(parseYearEnd('March 31')).toEqual({ month: 3, day: 31 });
    expect(parseYearEnd('06-30')).toEqual({ month: 6, day: 30 });
    expect(parseYearEnd('Sep 30')).toEqual({ month: 9, day: 30 });
    expect(parseYearEnd(null)).toEqual({ month: 12, day: 31 });
    expect(parseYearEnd('garbage')).toEqual({ month: 12, day: 31 });
    expect(parseYearEnd('13-40')).toEqual({ month: 12, day: 31 });
  });
});

describe('fiscalYearFor', () => {
  it('calendar year end', () => {
    const fy = fiscalYearFor(d('2026-09-16'), { month: 12, day: 31 });
    expect([iso(fy.start), iso(fy.end)]).toEqual(['2026-01-01', '2026-12-31']);
  });

  it('March 31 year end, before and after the boundary', () => {
    const ye = { month: 3, day: 31 };
    let fy = fiscalYearFor(d('2026-09-16'), ye);
    expect([iso(fy.start), iso(fy.end)]).toEqual(['2026-04-01', '2027-03-31']);
    fy = fiscalYearFor(d('2026-03-31'), ye);
    expect([iso(fy.start), iso(fy.end)]).toEqual(['2025-04-01', '2026-03-31']);
  });

  it('clamps February 29 in non-leap years', () => {
    const fy = fiscalYearFor(d('2026-09-16'), { month: 2, day: 29 });
    expect([iso(fy.start), iso(fy.end)]).toEqual(['2026-03-01', '2027-02-28']);
  });

  it('counts whole fiscal years between dates', () => {
    const ye = { month: 12, day: 31 };
    expect(fiscalYearsBetween(d('2023-06-01'), d('2026-01-01'), ye)).toBe(3);
    expect(fiscalYearsBetween(d('2026-02-01'), d('2026-01-01'), ye)).toBe(0);
  });
});

describe('depreciateForYear', () => {
  const ye = { month: 12, day: 31 };
  const fy = fiscalYearFor(d('2026-09-16'), ye);

  it('charges a full year on an addition (matches the reference register)', () => {
    const r = depreciateForYear(
      { purchaseCost: 25_000_000, purchaseDate: d('2026-08-28'), ratePercent: 20 },
      fy,
      ye,
    )!;
    expect(r).toMatchObject({
      isAddition: true,
      openingAccum: 0,
      chargeForYear: 5_000_000,
      totalAccum: 5_000_000,
      netBookValue: 20_000_000,
    });
  });

  it('accumulates prior years for an asset bought before the fiscal year', () => {
    // Bought 2023 → full charges for 2023, 2024, 2025 brought forward
    const r = depreciateForYear(
      { purchaseCost: 10_000_000, purchaseDate: d('2023-11-15'), ratePercent: 10 },
      fy,
      ye,
    )!;
    expect(r).toMatchObject({
      isAddition: false,
      openingAccum: 3_000_000,
      chargeForYear: 1_000_000,
      totalAccum: 4_000_000,
      netBookValue: 6_000_000,
    });
  });

  it('caps accumulated depreciation at cost', () => {
    const r = depreciateForYear(
      { purchaseCost: 1_000_000, purchaseDate: d('2021-01-01'), ratePercent: 25 },
      fy,
      ye,
    )!;
    // 2021-2024 fully depreciate it; nothing left to charge in 2025/2026
    expect(r).toMatchObject({
      openingAccum: 1_000_000,
      chargeForYear: 0,
      netBookValue: 0,
      fullyDepreciated: true,
    });

    const partial = depreciateForYear(
      { purchaseCost: 1_000_000, purchaseDate: d('2023-01-01'), ratePercent: 30 },
      fy,
      ye,
    )!;
    // 3 years × 300k = 900k opening; only 100k left to charge
    expect(partial).toMatchObject({ openingAccum: 900_000, chargeForYear: 100_000, netBookValue: 0 });
  });

  it('uses the carried-over opening accumulated depreciation when given', () => {
    const base = {
      purchaseCost: 120_000_000,
      purchaseDate: d('2015-05-01'),
      ratePercent: 2,
      openingAccumulatedDepreciation: 7_200_000,
      openingAccumAsOf: d('2026-01-01'),
    };
    expect(depreciateForYear(base, fy, ye)).toMatchObject({
      openingAccum: 7_200_000,
      chargeForYear: 2_400_000,
      totalAccum: 9_600_000,
    });

    // One fiscal year later the carried figure rolls forward by one charge
    const nextFy = fiscalYearFor(d('2027-06-01'), ye);
    expect(depreciateForYear(base, nextFy, ye)).toMatchObject({ openingAccum: 9_600_000 });
  });

  it('leaves uncategorised assets undepreciated and excludes future purchases', () => {
    const r = depreciateForYear(
      { purchaseCost: 500_000, purchaseDate: d('2024-01-01'), ratePercent: null },
      fy,
      ye,
    )!;
    expect(r).toMatchObject({ chargeForYear: 0, netBookValue: 500_000, fullyDepreciated: false });

    expect(
      depreciateForYear({ purchaseCost: 1, purchaseDate: d('2027-01-05'), ratePercent: 10 }, fy, ye),
    ).toBeNull();
  });
});
