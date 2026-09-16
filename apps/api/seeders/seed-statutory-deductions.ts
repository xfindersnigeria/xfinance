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
    // account code = {subCategory.code}-01, per seedDefaultEntityAccounts
    accountCode: '2180-01', // NHF Payable
  },
  {
    name: 'National Health Insurance Scheme (NHIS)',
    type: 'PERCENTAGE' as const,
    rate: 1.75,
    description: 'Statutory National Health Insurance Scheme contribution (1.75% of gross emoluments).',
    accountCode: '2190-01', // NHIS Payable
  },
  {
    name: 'Pension Contribution',
    type: 'PERCENTAGE' as const,
    rate: 8,
    description: 'Employee pension contribution (8% of gross salary).',
    accountCode: '2170-01', // Pension Payable - Employee
  },
  {
    name: 'PAYE Tax',
    type: 'TIERED' as const,
    tiers: PAYE_TIERS,
    description:
      'Pay-As-You-Earn tax under the progressive bands introduced by the Nigeria Tax Act 2025 (effective 2026). ' +
      'Edit the tiers below if the law changes — do not delete and recreate.',
    accountCode: '2160-01', // PAYE Payable
  },
];

/**
 * Seed the default statutory deductions (NHF, NHIS, Pension, PAYE) for one
 * entity, each linked to its default payable account (PAYE/Pension/NHF/NHIS
 * Payable — created by seedDefaultEntityAccounts from the chart-of-accounts
 * subcategories added in seed-account-chart.ts) so payroll approval postings
 * have somewhere to credit each deduction. Idempotent — skips creating a
 * deduction whose name already exists for this entity, but still fills in
 * accountId on an existing deduction if it's missing one (without touching
 * an accountId the admin has already set themselves). Safe to call on
 * entity creation and again during a manual backfill.
 */
async function seedDefaultStatutoryDeductions(entityId: string, groupId: string) {
  console.log(`Seeding statutory deductions for entity: ${entityId}`);

  const existing = await prisma.statutoryDeduction.findMany({
    where: { entityId },
    select: { id: true, name: true, type: true, rate: true, accountId: true },
  });
  const existingByName = new Map(existing.map((d) => [d.name, d]));

  let created = 0;
  let skipped = 0;
  let linked = 0;

  for (const ded of DEFAULT_DEDUCTIONS) {
    const account = await prisma.account.findFirst({
      where: { entityId, code: ded.accountCode },
      select: { id: true },
    });
    if (!account) {
      console.warn(`  ⚠ Default account ${ded.accountCode} not found for entity — run backfill-payroll-accounts.ts first. Skipping account link for ${ded.name}.`);
    }

    const existingDed = existingByName.get(ded.name);
    if (existingDed) {
      if (!existingDed.accountId && account) {
        await prisma.statutoryDeduction.update({
          where: { id: existingDed.id },
          data: { accountId: account.id },
        });
        console.log(`  • Already exists: ${ded.name} — linked to ${ded.accountCode}`);
        linked++;
      } else {
        console.log(`  • Already exists: ${ded.name}`);
      }
      skipped++;
      continue;
    }

    // Name not found — but an admin may have renamed a seeded default (e.g.
    // "PAYE Tax" -> "PAYE"). Creating another would double-deduct every
    // employee, so skip anything that looks like the same deduction, and don't
    // auto-link it either since the match is only a guess.
    const lookalike = existing.find((d) =>
      ded.type === 'TIERED'
        ? d.type === 'TIERED'
        : d.type === 'PERCENTAGE' && d.rate === ded.rate,
    );
    if (lookalike) {
      console.warn(`  ⚠ "${ded.name}" not found by name, but "${lookalike.name}" looks like it (same type/rate) — probably renamed. Not creating a duplicate or linking an account; set its account manually if needed.`);
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
        accountId: account?.id ?? null,
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
  console.log(`  Created: ${created}, Skipped: ${skipped}, Newly linked to account: ${linked}\n`);
}

export { seedDefaultStatutoryDeductions };
