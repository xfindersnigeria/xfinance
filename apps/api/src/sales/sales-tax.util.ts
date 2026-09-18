import { PrismaService } from '@/prisma/prisma.service';

/**
 * Tax for invoices, income receipts, POS/online orders and bills.
 *
 * Settings → Tax drives the defaults:
 *   - Enable Tax Calculation: new documents get the entity's default tax rate
 *     (otherwise they default to no tax — the user can still pick one).
 *   - Tax Inclusive Pricing: line rates on sales documents already include
 *     tax; tax is extracted from them instead of added on top.
 *   - Compound Tax: tax groups apply each rate on top of the previous ones.
 *   - Reverse Charge VAT: bills can be marked reverse charge (see bills).
 *
 * A document stores the rate it was taxed at (taxRate), where it came from
 * (taxName) and whether its prices were tax-inclusive, so editing it later
 * recomputes the same way even if the settings change in between.
 *
 * Tax applies only to taxable lines — catalog items flagged taxable, plus
 * free-text lines (which have no catalog flag, so the chosen rate applies).
 */

export interface EntityTaxSettings {
  taxCalculation: boolean;
  taxInclusive: boolean;
  compoundTax: boolean;
  reverseChargeVat: boolean;
}

export interface ResolvedTax {
  rate: number;
  name: string | null;
  inclusive: boolean;
}

export async function getEntityTaxSettings(
  prisma: PrismaService,
  entityId: string,
): Promise<EntityTaxSettings> {
  const settings = await prisma.settings.findFirst({
    where: { entityId },
    select: { taxCalculation: true, taxInclusive: true, compoundTax: true, reverseChargeVat: true },
  });
  return {
    taxCalculation: settings?.taxCalculation ?? true,
    taxInclusive: settings?.taxInclusive ?? false,
    compoundTax: settings?.compoundTax ?? false,
    reverseChargeVat: settings?.reverseChargeVat ?? false,
  };
}

/** The entity's default tax: its default active tax rate, else the legacy Settings.taxRate. */
export async function getDefaultTax(
  prisma: PrismaService,
  entityId: string,
): Promise<{ rate: number; name: string | null }> {
  const defaultRate = await prisma.taxRate.findFirst({
    where: { entityId, isDefault: true, isActive: true },
    select: { rate: true, name: true },
  });
  if (defaultRate) return { rate: defaultRate.rate, name: defaultRate.name };
  const settings = await prisma.settings.findFirst({
    where: { entityId },
    select: { taxRate: true },
  });
  return { rate: settings?.taxRate ?? 0, name: null };
}

/**
 * Resolve the tax for a NEW document. An explicit rate from the user wins;
 * otherwise the default applies when tax calculation is enabled.
 */
export async function resolveDocumentTax(
  prisma: PrismaService,
  entityId: string,
  requested: { taxRate?: number | null; taxName?: string | null },
): Promise<ResolvedTax> {
  const settings = await getEntityTaxSettings(prisma, entityId);
  if (requested.taxRate !== undefined && requested.taxRate !== null) {
    return {
      rate: requested.taxRate,
      name: requested.taxName?.trim() || null,
      inclusive: settings.taxInclusive,
    };
  }
  if (!settings.taxCalculation) {
    return { rate: 0, name: null, inclusive: settings.taxInclusive };
  }
  const def = await getDefaultTax(prisma, entityId);
  return { ...def, inclusive: settings.taxInclusive };
}

/** Kept for callers that only need the rate (explicit rate, else default). */
export async function resolveSalesTaxRate(
  prisma: PrismaService,
  entityId: string,
  requested?: number | null,
): Promise<number> {
  return (await resolveDocumentTax(prisma, entityId, { taxRate: requested })).rate;
}

export function computeSalesTax(
  lines: Array<{ total: number; taxable: boolean }>,
  ratePct: number,
  inclusive = false,
): number {
  const taxableBase = lines.filter((l) => l.taxable).reduce((s, l) => s + l.total, 0);
  // Amounts are stored as whole units (Int columns)
  if (inclusive) return Math.round((taxableBase * ratePct) / (100 + ratePct));
  return Math.round((taxableBase * ratePct) / 100);
}

/**
 * Document totals. Exclusive: subtotal = sum of lines, total = subtotal + tax.
 * Inclusive: the lines already contain the tax, so total = sum of lines and
 * subtotal = total − tax.
 */
export function computeDocumentTotals(
  lines: Array<{ total: number; taxable: boolean }>,
  ratePct: number,
  inclusive = false,
): { subtotal: number; tax: number; total: number } {
  const gross = lines.reduce((s, l) => s + l.total, 0);
  const tax = computeSalesTax(lines, ratePct, inclusive);
  return inclusive
    ? { subtotal: gross - tax, tax, total: gross }
    : { subtotal: gross, tax, total: gross + tax };
}

/**
 * Combined rate of a tax group. Simple: rates add up. Compound: each rate is
 * charged on the amount plus the taxes before it (tax-on-tax).
 */
export function effectiveGroupRate(rates: number[], compound: boolean): number {
  const combined = compound
    ? (rates.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100
    : rates.reduce((acc, r) => acc + r, 0);
  return Math.round(combined * 10000) / 10000;
}

/**
 * Split net revenue (total − tax) between product and service revenue in
 * proportion to their line amounts. Line amounts are gross when prices are
 * tax-inclusive, so the journal would not balance if they were credited as-is.
 */
export function splitNetRevenue(
  productLines: number,
  serviceLines: number,
  netRevenue: number,
): { product: number; service: number } {
  const lines = productLines + serviceLines;
  if (lines <= 0) return { product: 0, service: netRevenue };
  const product = Math.round((productLines * netRevenue) / lines);
  return { product, service: netRevenue - product };
}
