import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../prisma/generated/client';
import 'dotenv/config';
import { seedDefaultChartOfAccounts } from './seed-account-chart';
import { seedDefaultEntityAccounts } from './seed-entity-accounts';
import { seedDefaultTaxSettings } from './seed-tax-defaults';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

/**
 * Backfills what the tax settings + POS work needs on existing groups/entities:
 *   - the "Cost of Goods Sold" (5140) account POS sales post COGS to
 *   - the default tax setup (VAT rate, Nigeria jurisdiction, exemptions)
 * Run once after deploying migration 20260919000000_tax_email_orders_free_text:
 *   npm run backfill:sales-setup   (from apps/api/)
 * Safe to re-run — every seeder skips anything already present.
 */
async function main() {
  try {
    console.log('🌱 Backfilling COGS account + tax settings for all groups/entities...\n');

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
        await seedDefaultTaxSettings(entity.id, group.id);
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
