import { PrismaService } from '@/prisma/prisma.service';

/**
 * Sales tax (VAT) for invoices and receipts.
 *
 * The rate is chosen per document by the user; when omitted it falls back to
 * the entity's default sales tax rate (Settings.taxRate), then 0. Tax applies
 * only to taxable lines — catalog items flagged `isTaxable`, plus free-text
 * lines (which have no catalog flag, so the user's rate is taken at face value).
 */
export async function resolveSalesTaxRate(
  prisma: PrismaService,
  entityId: string,
  requested?: number | null,
): Promise<number> {
  if (requested !== undefined && requested !== null) return requested;
  const settings = await prisma.settings.findFirst({
    where: { entityId },
    select: { taxRate: true },
  });
  return settings?.taxRate ?? 0;
}

export function computeSalesTax(
  lines: Array<{ total: number; taxable: boolean }>,
  ratePct: number,
): number {
  const taxableBase = lines.filter((l) => l.taxable).reduce((s, l) => s + l.total, 0);
  // Invoice/Receipt amounts are stored as whole units (Int columns)
  return Math.round((taxableBase * ratePct) / 100);
}
