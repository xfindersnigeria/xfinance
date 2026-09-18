import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { seedDefaultChartOfAccounts } from './seed-account-chart';
import { seedDefaultEntityAccounts } from './seed-entity-accounts';
import { seedStandardEntityAccounts } from './seed-standard-entity-accounts';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Adds the client's standard accounts (seed-standard-entity-accounts.ts) to
 * every existing entity:
 *   npm run backfill:standard-accounts   (from apps/api/)
 * Adds the new 5280 "General & Administrative Expenses" subcategory to each
 * group's chart first. Safe to re-run — accounts an entity already has (same
 * code, or same name under another code) are skipped, never duplicated.
 */
async function main() {
  try {
    console.log('🌱 Backfilling standard accounts for all groups/entities...\n');

    const groups = await prisma.group.findMany({
      select: { id: true, name: true, entities: { select: { id: true, name: true } } },
    });

    for (const group of groups) {
      console.log(`— Group: ${group.name} (${group.id})`);
      await seedDefaultChartOfAccounts(group.id);

      for (const entity of group.entities) {
        console.log(`  — Entity: ${entity.name} (${entity.id})`);
        // Standard accounts first: the default seeder then skips subcategories
        // that already have an account (so 5280-01 stays "Audit Fees")
        await seedStandardEntityAccounts(entity.id, group.id);
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
