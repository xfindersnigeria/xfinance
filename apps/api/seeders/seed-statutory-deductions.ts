import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Nigeria Tax Act 2025 PAYE bands (effective 2026), applied to chargeable
 * income (annual gross minus rent relief and eligible deductions below).
 * `to: null` on the last tier means "and above" (no upper bound).
 */
const PAYE_TIERS = [
  { from: 0, to: 800000, rate: 0 },
  { from: 800000, to: 3000000, rate: 15 },
  { from: 3000000, to: 12000000, rate: 18 },
  { from: 12000000, to: 25000000, rate: 21 },
  { from: 25000000, to: 50000000, rate: 23 },
  { from: 50000000, to: null, rate: 25 },
];

const DEFAULT_DEDUCTIONS = [
  {
    name: 'National Housing Fund (NHF)',
    type: 'PERCENTAGE' as const,
    rate: 2.5,
    description: 'Statutory National Housing Fund contribution (2.5% of gross emoluments).',
  },
  {
    name: 'National Health Insurance Scheme (NHIS)',
    type: 'PERCENTAGE' as const,
    rate: 1.75,
    description: 'Statutory National Health Insurance Scheme contribution (1.75% of gross emoluments).',
  },
  {
    name: 'Pension Contribution',
    type: 'PERCENTAGE' as const,
    rate: 8,
    description: 'Employee pension contribution (8% of gross salary).',
  },
  {
    name: 'PAYE Tax',
    type: 'TIERED' as const,
    tiers: PAYE_TIERS,
    description:
      'Pay-As-You-Earn tax under the progressive bands introduced by the Nigeria Tax Act 2025 (effective 2026). ' +
      'Edit the tiers below if the law changes — do not delete and recreate.',
  },
];

/**
 * Seed the default statutory deductions (NHF, NHIS, Pension, PAYE) for one
 * entity. Idempotent — skips any deduction whose name already exists for
 * this entity, so it is safe to call on entity creation and again during a
 * manual backfill without creating duplicates.
 */
async function seedDefaultStatutoryDeductions(entityId: string, groupId: string) {
  console.log(`Seeding statutory deductions for entity: ${entityId}`);

  const existing = await prisma.statutoryDeduction.findMany({
    where: { entityId },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((d) => d.name));

  let created = 0;
  let skipped = 0;

  for (const ded of DEFAULT_DEDUCTIONS) {
    if (existingNames.has(ded.name)) {
      console.log(`  • Already exists: ${ded.name}`);
      skipped++;
      continue;
    }

    await prisma.statutoryDeduction.create({
      data: {
        name: ded.name,
        type: ded.type,
        rate: ded.type === 'PERCENTAGE' ? ded.rate : null,
        description: ded.description,
        status: 'active',
        entityId,
        groupId,
        ...(ded.type === 'TIERED' && ded.tiers
          ? { tiers: { create: ded.tiers.map((t) => ({ from: t.from, to: t.to ?? null, rate: t.rate })) } }
          : {}),
      },
    });
    console.log(`  ✓ Created: ${ded.name}`);
    created++;
  }

  console.log(`✓ Statutory deduction seeding completed for entity: ${entityId}`);
  console.log(`  Created: ${created}, Skipped: ${skipped}\n`);
}

export { seedDefaultStatutoryDeductions };
