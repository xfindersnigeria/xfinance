import { computeDocumentTotals, computeSalesTax, effectiveGroupRate, splitNetRevenue } from './sales-tax.util';

describe('sales tax', () => {
  const lines = [
    { total: 10000, taxable: true },
    { total: 5000, taxable: false },
  ];

  it('adds tax on top of taxable lines (exclusive pricing)', () => {
    expect(computeSalesTax(lines, 7.5)).toBe(750);
    expect(computeDocumentTotals(lines, 7.5)).toEqual({ subtotal: 15000, tax: 750, total: 15750 });
  });

  it('extracts tax from taxable lines (inclusive pricing)', () => {
    // 10,750 includes 7.5% VAT of 750
    const incl = [{ total: 10750, taxable: true }];
    expect(computeDocumentTotals(incl, 7.5, true)).toEqual({ subtotal: 10000, tax: 750, total: 10750 });
  });

  it('combines group rates simply or compounded', () => {
    expect(effectiveGroupRate([5, 10], false)).toBe(15);
    // 1.05 * 1.10 = 1.155 → 15.5%
    expect(effectiveGroupRate([5, 10], true)).toBe(15.5);
  });

  it('splits net revenue so the journal balances', () => {
    const split = splitNetRevenue(10750, 5375, 15000);
    expect(split.product + split.service).toBe(15000);
    expect(splitNetRevenue(0, 0, 500)).toEqual({ product: 0, service: 500 });
  });
});
