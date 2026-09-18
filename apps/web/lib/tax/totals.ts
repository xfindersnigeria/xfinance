/**
 * Mirrors apps/api/src/sales/sales-tax.util.ts so forms preview exactly what
 * the server will save. Amounts are whole currency units.
 *
 * Exclusive: subtotal = sum of lines, tax added on top of taxable lines.
 * Inclusive (Settings → Tax "Tax Inclusive Pricing"): the lines already
 * contain the tax — it is extracted, and total = sum of lines.
 */
export function computeTaxTotals(
  lines: Array<{ total: number; taxable: boolean }>,
  ratePct: number,
  inclusive = false,
): { subtotal: number; tax: number; total: number } {
  const gross = lines.reduce((s, l) => s + (Number(l.total) || 0), 0);
  const taxable = lines.filter((l) => l.taxable).reduce((s, l) => s + (Number(l.total) || 0), 0);
  const rate = Number(ratePct) || 0;
  const tax = inclusive ? Math.round((taxable * rate) / (100 + rate)) : Math.round((taxable * rate) / 100);
  return inclusive ? { subtotal: gross - tax, tax, total: gross } : { subtotal: gross, tax, total: gross + tax };
}

/** "VAT (7.5%)", "Tax (10%, included)" */
export function taxLabel(taxName: string | null | undefined, rate: number, inclusive = false): string {
  const pct = `${Number((Number(rate) || 0).toFixed(4))}%`;
  return `${taxName || "Tax"} (${pct}${inclusive ? ", included" : ""})`;
}
