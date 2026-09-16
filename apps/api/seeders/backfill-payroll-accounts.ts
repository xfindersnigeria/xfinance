import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { seedDefaultChartOfAccounts } from './seed-account-chart';
import { seedDefaultEntityAccounts } from './seed-entity-accounts';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Backfills the new payroll payable subcategories (PAYE/Pension/NHF/NHIS/
 * Other Deductions Payable) onto every existing group's chart of accounts,
 * then creates the matching per-entity Account row for every entity.
 * Run once after deploying the chart change, BEFORE re-running
 * backfill-statutory-deductions.ts (which links each deduction to its
 * account and needs the accounts to already exist):
 *   npm run backfill:payroll-accounts   (from apps/api/)
 * Safe to re-run — both underlying seeders skip anything already present.
 */
async function main() {
  try {
    console.log('🌱 Backfilling payroll payable accounts for all groups/entities...\n');

    const groups = await prisma.group.findMany({
      select: { id: true, name: true, entities: { select: { id: true, name: true } } },
    });

    console.log(`Found ${groups.length} groups\n`);

    for (const group of groups) {
      console.log(`— Group: ${group.name} (${group.id})`);
      await seedDefaultChartOfAccounts(group.id);

      for (const entity of group.entities) {
        console.log(`  — Entity: ${entity.name} (${entity.id})`);
        await seedDefaultEntityAccounts(entity.id, group.id);
      }
    }

    console.log('✅ Backfill completed successfully');
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
